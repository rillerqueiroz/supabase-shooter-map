import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import {
  useTitulosTudoBelo,
  useTitulosTudoBeloOptions,
  useBulkUpdateTitulosTudoBelo,
  TitulosFilters,
  TituloTudoBelo,
} from "@/hooks/useTitulosTudoBelo";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { useInserirCedrusWebhook } from "@/hooks/useInserirCedrusWebhook";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { TitulosBulkEditModal } from "@/components/TitulosTudoBelo/TitulosBulkEditModal";
import { BulkInsercaoCedrusModal } from "@/components/TitulosTudoBelo/BulkInsercaoCedrusModal";
import { CedrusConfirmDialog } from "@/components/TitulosTudoBelo/CedrusConfirmDialog";
import { AtualizarCedrusPreviewDialog } from "@/components/TitulosTudoBelo/AtualizarCedrusPreviewDialog";
import { useAtualizarCedrus, CedrusSyncResult } from "@/hooks/useAtualizarCedrus";
import { Progress } from "@/components/ui/progress";
import { exportTitulosToExcel, exportTitulosToPDF } from "@/utils/exportTitulosTudoBelo";
import {
  Search,
  FileSpreadsheet,
  FileText,
  Filter,
  Edit,
  ChevronUp,
  ChevronDown,
  Loader2,
  X,
  Trash2,
  Send,
  Upload,
  Lock,
  LockOpen,
  Unlock,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

interface TitulosPendentesTabProps {
  tableName?: string;
}

export function TitulosPendentesTab({ tableName = 'base_tudobelo_intermediaria' }: TitulosPendentesTabProps) {
  const [filters, setFilters] = useState<TitulosFilters>({ processadoInternamente: false });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkInsercaoOpen, setBulkInsercaoOpen] = useState(false);
  const [removingCedrusId, setRemovingCedrusId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [cedrusSyncOpen, setCedrusSyncOpen] = useState(false);
  const [cedrusSyncResults, setCedrusSyncResults] = useState<CedrusSyncResult[]>([]);
  const [cedrusSyncRunning, setCedrusSyncRunning] = useState(false);
  const [cedrusSyncProgress, setCedrusSyncProgress] = useState({ done: 0, total: 0 });
  const { consultar: consultarCedrus } = useAtualizarCedrus();
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    actionType: "inserir" | "cancelar" | "marcar_pago";
    titulo: TituloTudoBelo | null;
  }>({ open: false, actionType: "inserir", titulo: null });

  const { data: titulos, isLoading, error } = useTitulosTudoBelo(filters, tableName);
  const { data: options } = useTitulosTudoBeloOptions(tableName);
  const { mutate: inserirCedrus, isPending: isInserindo } = useInserirCedrusWebhook();
  const bulkUpdateMutation = useBulkUpdateTitulosTudoBelo(tableName);

  const { sortedData, sortConfig, requestSort } = useSortableTable(titulos || []);

  const {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    totalItems,
  } = usePagination<TituloTudoBelo>({ data: sortedData, initialPageSize: 100 });

  const metrics = useMemo(() => {
    if (!titulos) return { total: 0, saldoTotal: 0, cedrus: 0 };
    return {
      total: titulos.length,
      saldoTotal: titulos.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0),
      cedrus: titulos.filter((t) => t.inserido_cedrus).length,
    };
  }, [titulos]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedData.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleRowClick = (titulo: TituloTudoBelo) => {
    setSelectedTitulo(titulo);
    setDetailsOpen(true);
  };

  const handleRemoverCedrus = async (titulo: TituloTudoBelo) => {
    setRemovingCedrusId(titulo.id);
    try {
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cancelar-titulo-tudobelo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(titulo),
      });
      
      if (response.ok) {
        toast.success(`Título ${titulo.documento} enviado para remoção com sucesso.`);
      } else {
        throw new Error('Falha ao remover do Cedrus');
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar remover o título do Cedrus.");
    } finally {
      setRemovingCedrusId(null);
      setConfirmDialog({ open: false, actionType: "cancelar", titulo: null });
    }
  };

  const handleMarcarPago = async (titulo: TituloTudoBelo, valorPagoApurado?: number, dataPagamento?: string) => {
    setMarkingPaidId(titulo.id);
    try {
      const payload = {
        ...titulo,
        valor_pago_apurado_manualmente: valorPagoApurado,
        data_pagamento_manual: dataPagamento,
      };
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/marcar-titulo-como-pago-tudobelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        toast.success(`Título ${titulo.documento} marcado como pago.`);
      } else {
        throw new Error('Falha');
      }
    } catch (error) {
      toast.error("Erro ao marcar título como pago.");
    } finally {
      setMarkingPaidId(null);
      setConfirmDialog({ open: false, actionType: "marcar_pago", titulo: null });
    }
  };

  const handleInserirCedrusConfirmed = (titulo: TituloTudoBelo) => {
    inserirCedrus(titulo);
    setConfirmDialog({ open: false, actionType: "inserir", titulo: null });
  };

  const handleConfirmAction = (valorPago?: number, dataPagamento?: string) => {
    if (!confirmDialog.titulo) return;
    
    switch (confirmDialog.actionType) {
      case "inserir":
        handleInserirCedrusConfirmed(confirmDialog.titulo);
        break;
      case "cancelar":
        handleRemoverCedrus(confirmDialog.titulo);
        break;
      case "marcar_pago":
        handleMarcarPago(confirmDialog.titulo, valorPago, dataPagamento);
        break;
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleAtualizarCedrus = async () => {
    const alvos = (sortedData || []).filter(
      (t) => t.inserido_cedrus || t.id_titulo_cedrus
    );
    if (alvos.length === 0) {
      toast.info("Nenhum título com vínculo Cedrus na lista atual.");
      return;
    }
    setCedrusSyncRunning(true);
    setCedrusSyncProgress({ done: 0, total: alvos.length });
    try {
      const results = await consultarCedrus(alvos, (done, total) =>
        setCedrusSyncProgress({ done, total })
      );
      setCedrusSyncResults(results);
      setCedrusSyncOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao consultar Cedrus");
    } finally {
      setCedrusSyncRunning(false);
    }
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => requestSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig?.key === column && (
          sortConfig.direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </TableHead>
  );

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.saldoTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Cedrus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.cedrus.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-2 items-center">
        {cedrusSyncRunning && (
          <div className="flex items-center gap-2 mr-2 min-w-[220px]">
            <Progress
              value={cedrusSyncProgress.total ? (cedrusSyncProgress.done / cedrusSyncProgress.total) * 100 : 0}
              className="h-2 w-40"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {cedrusSyncProgress.done}/{cedrusSyncProgress.total}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAtualizarCedrus}
          disabled={cedrusSyncRunning}
          className="text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          {cedrusSyncRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Atualizar Cedrus
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportTitulosToExcel(titulos || [])}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportTitulosToPDF(titulos || [])}>
          <FileText className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento, parceiro ou CNPJ..."
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" onClick={() => setBulkEditOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar {selectedIds.length} selecionados
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    bulkUpdateMutation.mutate(
                      { ids: selectedIds, updates: { bloqueado: true } },
                      { onSuccess: () => setSelectedIds([]) }
                    );
                  }}
                  disabled={bulkUpdateMutation.isPending}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Bloquear selecionados
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    bulkUpdateMutation.mutate(
                      { ids: selectedIds, updates: { bloqueado: false } },
                      { onSuccess: () => setSelectedIds([]) }
                    );
                  }}
                  disabled={bulkUpdateMutation.isPending}
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <Unlock className="h-4 w-4 mr-1" />
                  Desbloquear selecionados
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkInsercaoOpen(true)}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Inserir no Cedrus em massa
                </Button>
              </>
            )}
            {Object.keys(filters).filter((k) => filters[k as keyof TitulosFilters]).length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <MultiSelectFilter
                title="Parceiro"
                options={options?.nomesParceiros || []}
                selectedValues={filters.nomesParceiros || []}
                onSelectionChange={(v) => setFilters({ ...filters, nomesParceiros: v })}
              />
              <MultiSelectFilter
                title="Status Título"
                options={options?.statusTitulo || []}
                selectedValues={filters.statusTitulo || []}
                onSelectionChange={(v) => setFilters({ ...filters, statusTitulo: v })}
              />
              <MultiSelectFilter
                title="Filial"
                options={options?.filiais || []}
                selectedValues={filters.filiais || []}
                onSelectionChange={(v) => setFilters({ ...filters, filiais: v })}
              />
              <MultiSelectFilter
                title="Vendedor"
                options={options?.vendedores || []}
                selectedValues={filters.vendedores || []}
                onSelectionChange={(v) => setFilters({ ...filters, vendedores: v })}
              />
              <MultiSelectFilter
                title="Tipo Título"
                options={options?.tiposTitulo || []}
                selectedValues={filters.tiposTitulo || []}
                onSelectionChange={(v) => setFilters({ ...filters, tiposTitulo: v })}
              />
              <MultiSelectFilter
                title="UF"
                options={options?.ufs || []}
                selectedValues={filters.ufs || []}
                onSelectionChange={(v) => setFilters({ ...filters, ufs: v })}
              />
              <MultiSelectFilter
                title="Forma Pagamento"
                options={options?.formasPagamento || []}
                selectedValues={filters.formasPagamento || []}
                onSelectionChange={(v) => setFilters({ ...filters, formasPagamento: v })}
              />
              <DateFilterSelect
                label="Data Vencimento"
                value={filters.dataVencimentoRange}
                onChange={(v) => setFilters({ ...filters, dataVencimentoRange: v })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Inserido Cedrus</label>
                <Select
                  value={filters.inseridoCedrus === null || filters.inseridoCedrus === undefined ? "todos" : filters.inseridoCedrus ? "sim" : "nao"}
                  onValueChange={(v) => setFilters({ 
                    ...filters, 
                    inseridoCedrus: v === "todos" ? null : v === "sim" 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Processado Internamente</label>
                <Select
                  value={filters.processadoInternamente === null || filters.processadoInternamente === undefined ? "todos" : filters.processadoInternamente ? "sim" : "nao"}
                  onValueChange={(v) => setFilters({ 
                    ...filters, 
                    processadoInternamente: v === "todos" ? null : v === "sim" 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bloqueado</label>
                <Select
                  value={filters.bloqueado === null || filters.bloqueado === undefined ? "todos" : filters.bloqueado ? "sim" : "nao"}
                  onValueChange={(v) => setFilters({ 
                    ...filters, 
                    bloqueado: v === "todos" ? null : v === "sim" 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Bloqueados</SelectItem>
                    <SelectItem value="nao">Desbloqueados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Auditado</label>
                <Select
                  value={filters.auditado === null || filters.auditado === undefined ? "todos" : filters.auditado ? "sim" : "nao"}
                  onValueChange={(v) => setFilters({ 
                    ...filters, 
                    auditado: v === "todos" ? null : v === "sim" 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Auditados</SelectItem>
                    <SelectItem value="nao">Não auditados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Resumo dos filtros aplicados */}
          {(() => {
            const activeFilters: { label: string; value: string }[] = [];
            if (filters.search) activeFilters.push({ label: "Busca", value: filters.search });
            if (filters.nomesParceiros?.length) activeFilters.push({ label: "Parceiro", value: `${filters.nomesParceiros.length} selecionado(s)` });
            if (filters.statusTitulo?.length) activeFilters.push({ label: "Status", value: filters.statusTitulo.join(", ") });
            if (filters.filiais?.length) activeFilters.push({ label: "Filial", value: filters.filiais.join(", ") });
            if (filters.vendedores?.length) activeFilters.push({ label: "Vendedor", value: `${filters.vendedores.length} selecionado(s)` });
            if (filters.tiposTitulo?.length) activeFilters.push({ label: "Tipo Título", value: filters.tiposTitulo.join(", ") });
            if (filters.ufs?.length) activeFilters.push({ label: "UF", value: filters.ufs.join(", ") });
            if (filters.formasPagamento?.length) activeFilters.push({ label: "Forma Pgto", value: filters.formasPagamento.join(", ") });
            if (filters.etapas?.length) activeFilters.push({ label: "Etapa", value: filters.etapas.join(", ") });
            if (filters.tipoTitulo?.length) activeFilters.push({ label: "Tipo", value: filters.tipoTitulo.join(", ") });
            if (filters.dataVencimentoRange?.from || filters.dataVencimentoRange?.to) {
              const from = filters.dataVencimentoRange?.from ? format(filters.dataVencimentoRange.from, "dd/MM/yy") : "...";
              const to = filters.dataVencimentoRange?.to ? format(filters.dataVencimentoRange.to, "dd/MM/yy") : "...";
              activeFilters.push({ label: "Vencimento", value: `${from} → ${to}` });
            }
            if (filters.inseridoCedrus !== null && filters.inseridoCedrus !== undefined) activeFilters.push({ label: "Cedrus", value: filters.inseridoCedrus ? "Sim" : "Não" });
            if (filters.processadoInternamente !== null && filters.processadoInternamente !== undefined) activeFilters.push({ label: "Processado", value: filters.processadoInternamente ? "Sim" : "Não" });
            if (filters.bloqueado !== null && filters.bloqueado !== undefined) activeFilters.push({ label: "Bloqueado", value: filters.bloqueado ? "Sim" : "Não" });
            if (filters.auditado !== null && filters.auditado !== undefined) activeFilters.push({ label: "Auditado", value: filters.auditado ? "Sim" : "Não" });

            if (activeFilters.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground self-center mr-1">Filtros ativos:</span>
                {activeFilters.map((f) => (
                  <Badge key={f.label} variant="secondary" className="text-xs">
                    {f.label}: {f.value}
                  </Badge>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <SortableHeader column="id" label="ID" />
                      <SortableHeader column="nome_parceiro" label="Parceiro" />
                      <SortableHeader column="cnpj_cpf" label="CNPJ/CPF" />
                      <SortableHeader column="saldo_parcela" label="Saldo" />
                      <SortableHeader column="forma_pagamento" label="Forma Pagamento" />
                      <SortableHeader column="data_vencimento" label="Vencimento" />
                      <SortableHeader column="status_titulo" label="Status" />
                      <SortableHeader column="status_cedrus" label="St. Cedrus" />
                      <SortableHeader column="processado_internamente" label="Status Interno" />
                      <TableHead>Cedrus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((titulo) => (
                      <TableRow
                        key={titulo.id}
                        className={`cursor-pointer hover:bg-muted/50 ${titulo.bloqueado ? 'opacity-75 bg-muted/30' : ''}`}
                        onClick={() => handleRowClick(titulo)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              checked={selectedIds.includes(titulo.id)}
                              onCheckedChange={(checked) => handleSelectOne(titulo.id, !!checked)}
                            />
                            {titulo.bloqueado ? (
                              <Lock className="h-4 w-4 text-amber-600" />
                            ) : (
                              <LockOpen className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs max-w-[120px] truncate" title={titulo.id}>{titulo.id}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{titulo.nome_parceiro || "-"}</TableCell>
                        <TableCell>{titulo.cnpj_cpf || "-"}</TableCell>
                        <TableCell>{formatCurrency(titulo.saldo_parcela)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{titulo.forma_pagamento || "-"}</span>
                            {titulo.credor_cedrus && (
                              <span className="text-xs text-muted-foreground">Credor Cedrus: {titulo.credor_cedrus}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(titulo.data_vencimento)}</TableCell>
                        <TableCell>
                          <Badge variant={titulo.status_titulo === "Pago em dia" || titulo.status_titulo === "Pago via renegociação" ? "default" : "secondary"}>
                            {titulo.status_titulo || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {titulo.status_cedrus ? (
                            <Badge variant="outline" className="text-xs">
                              {titulo.status_cedrus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {titulo.processado_internamente ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Processado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-1">
                            {titulo.inserido_cedrus ? (
                              <>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Sim
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                  disabled={markingPaidId === titulo.id || !!titulo.bloqueado}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({ open: true, actionType: "marcar_pago", titulo });
                                  }}
                                >
                                  {markingPaidId === titulo.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                  <span>Marcar como Pago</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={removingCedrusId === titulo.id || !!titulo.bloqueado}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({ open: true, actionType: "cancelar", titulo });
                                  }}
                                >
                                  {removingCedrusId === titulo.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="h-3 w-3" />
                                      <span>Cancelar</span>
                                    </>
                                  )}
                                </Button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="bg-gray-50 text-gray-500">
                                  Não
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  disabled={isInserindo || !!titulo.bloqueado}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({ open: true, actionType: "inserir", titulo });
                                  }}
                                >
                                  {isInserindo ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                  <span>Inserir</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                          Nenhum título encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t p-4">
                <DataTablePagination
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  pageCount={pageCount}
                  totalItems={totalItems}
                  canPreviousPage={canPreviousPage}
                  canNextPage={canNextPage}
                  gotoPage={gotoPage}
                  previousPage={previousPage}
                  nextPage={nextPage}
                  setPageSize={setPageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onTituloUpdated={setSelectedTitulo}
      />

      <TitulosBulkEditModal
        selectedIds={selectedIds}
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        onSuccess={() => setSelectedIds([])}
        blockedIds={(titulos || []).filter(t => selectedIds.includes(t.id) && t.bloqueado).map(t => t.id)}
      />

      <BulkInsercaoCedrusModal
        titulos={(titulos || []).filter(t => selectedIds.includes(t.id))}
        open={bulkInsercaoOpen}
        onOpenChange={setBulkInsercaoOpen}
        onComplete={() => setSelectedIds([])}
      />

      <CedrusConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        actionType={confirmDialog.actionType}
        documentoTitulo={confirmDialog.titulo?.documento || null}
        tituloInfo={confirmDialog.titulo}
        onConfirm={handleConfirmAction}
        isLoading={
          (confirmDialog.actionType === "inserir" && isInserindo) ||
          (confirmDialog.actionType === "cancelar" && removingCedrusId === confirmDialog.titulo?.id) ||
          (confirmDialog.actionType === "marcar_pago" && markingPaidId === confirmDialog.titulo?.id)
        }
      />
    </div>
  );
}
