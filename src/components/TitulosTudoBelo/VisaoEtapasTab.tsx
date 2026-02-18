import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import { useTitulosTudoBelo, useTitulosTudoBeloOptions, TitulosFilters, TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { usePagination } from "@/hooks/usePagination";
import { useSortableTable } from "@/hooks/useSortableTable";
import { useInserirCedrusWebhook } from "@/hooks/useInserirCedrusWebhook";
import { TituloDetailsModal } from "./TituloDetailsModal";
import { TitulosBulkEditModal } from "./TitulosBulkEditModal";
import { BulkInsercaoCedrusModal } from "./BulkInsercaoCedrusModal";
import { CedrusConfirmDialog } from "./CedrusConfirmDialog";
import { exportVisaoEtapasToPDF, exportTitulosToExcel } from "@/utils/exportTitulosTudoBelo";
import { Search, Loader2, FolderOpen, DollarSign, FileText, Edit, Info, Send, Check, X, Filter, ChevronUp, ChevronDown, FileSpreadsheet, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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

export function VisaoEtapasTab() {
  const [filters, setFilters] = useState<TitulosFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: titulos, isLoading: loadingTitulos } = useTitulosTudoBelo(filters);
  const { data: options } = useTitulosTudoBeloOptions();
  const { data: etapas, isLoading: loadingEtapas } = useTitulosEtapas();
  const { mutate: inserirCedrus, isPending: isInserindo } = useInserirCedrusWebhook();
  
  const [selectedEtapa, setSelectedEtapa] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkInsercaoOpen, setBulkInsercaoOpen] = useState(false);
  const [incluirNegociacao, setIncluirNegociacao] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    actionType: "inserir" | "cancelar" | "marcar_pago";
    titulo: TituloTudoBelo | null;
  }>({ open: false, actionType: "inserir", titulo: null });

  const handleRemoverCedrus = async (titulo: TituloTudoBelo) => {
    setRemovingId(titulo.id);
    try {
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cancelar-titulo-tudobelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setRemovingId(null);
      setConfirmDialog({ open: false, actionType: "cancelar", titulo: null });
    }
  };

  const handleMarcarPago = async (titulo: TituloTudoBelo, valorPagoApurado?: number) => {
    setMarkingPaidId(titulo.id);
    try {
      const payload = {
        ...titulo,
        valor_pago_apurado_manualmente: valorPagoApurado,
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

  const handleConfirmAction = (valorPago?: number) => {
    if (!confirmDialog.titulo) return;
    switch (confirmDialog.actionType) {
      case "inserir":
        handleInserirCedrusConfirmed(confirmDialog.titulo);
        break;
      case "cancelar":
        handleRemoverCedrus(confirmDialog.titulo);
        break;
      case "marcar_pago":
        handleMarcarPago(confirmDialog.titulo, valorPago);
        break;
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value === null || value === undefined) return false;
      return true;
    }).length;
  }, [filters]);
  const titulosFiltradosPorTipo = useMemo(() => {
    if (!titulos) return [];
    
    if (incluirNegociacao) {
      return titulos;
    }
    
    // Apenas títulos com tipo_titulo = "Original" ou null/vazio
    return titulos.filter(t => 
      !t.tipo_titulo || 
      t.tipo_titulo === "Original" || 
      t.tipo_titulo.trim() === ""
    );
  }, [titulos, incluirNegociacao]);

  // Agrupar títulos por etapa
  const titulosPorEtapa = useMemo(() => {
    const grouped: Record<string, TituloTudoBelo[]> = {
      "Sem etapa": [],
    };

    titulosFiltradosPorTipo.forEach((titulo) => {
      const etapa = titulo.etapa || "Sem etapa";
      if (!grouped[etapa]) {
        grouped[etapa] = [];
      }
      grouped[etapa].push(titulo);
    });

    return grouped;
  }, [titulosFiltradosPorTipo]);

  // Métricas por etapa
  const metricasPorEtapa = useMemo(() => {
    const metrics: Record<string, { count: number; saldo: number; valor: number }> = {};
    
    Object.entries(titulosPorEtapa).forEach(([etapa, titulosEtapa]) => {
      metrics[etapa] = {
        count: titulosEtapa.length,
        saldo: titulosEtapa.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0),
        valor: titulosEtapa.reduce((sum, t) => sum + (t.valor_parcela || 0), 0),
      };
    });

    return metrics;
  }, [titulosPorEtapa]);

  // Títulos filtrados
  const filteredTitulos = useMemo(() => {
    let result = selectedEtapa === "todos" 
      ? titulosFiltradosPorTipo
      : (titulosPorEtapa[selectedEtapa] || []);

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.documento?.toLowerCase().includes(searchLower) ||
        t.nome_parceiro?.toLowerCase().includes(searchLower) ||
        t.cnpj_cpf?.toLowerCase().includes(searchLower) ||
        t.observacoes?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [titulosFiltradosPorTipo, selectedEtapa, titulosPorEtapa, search]);

  // Ordenação
  const { sortedData, sortConfig, requestSort } = useSortableTable(filteredTitulos);

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

  const handleRowClick = (titulo: TituloTudoBelo) => {
    setSelectedTitulo(titulo);
    setDetailsOpen(true);
  };

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

  const isLoading = loadingTitulos || loadingEtapas;

  // Lista de todas as etapas (do banco + as encontradas nos títulos)
  const todasEtapas = useMemo(() => {
    const etapasSet = new Set<string>();
    
    etapas?.forEach(e => {
      if (e.etapa) etapasSet.add(e.etapa);
    });
    
    Object.keys(titulosPorEtapa).forEach(etapa => {
      if (etapa !== "Sem etapa") etapasSet.add(etapa);
    });

    return Array.from(etapasSet).sort();
  }, [etapas, titulosPorEtapa]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle para incluir negociação e botão de exportar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="incluir-negociacao"
                checked={incluirNegociacao}
                onCheckedChange={setIncluirNegociacao}
              />
              <Label htmlFor="incluir-negociacao" className="cursor-pointer">
                Considerar títulos de negociação
              </Label>
            </div>
            <div className="flex items-center gap-3">
              {!incluirNegociacao && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                  <Info className="h-4 w-4" />
                  <span>Somente títulos Originais - Os títulos de negociação estão ocultos</span>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const metricas = Object.entries(metricasPorEtapa).map(([etapa, m]) => ({
                    etapa,
                    count: m.count,
                    saldo: m.saldo,
                  }));
                  const totalSaldo = titulosFiltradosPorTipo.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0);
                  exportVisaoEtapasToPDF(metricas, titulosFiltradosPorTipo.length, totalSaldo, incluirNegociacao);
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo por etapa */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${selectedEtapa === "todos" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
          onClick={() => setSelectedEtapa("todos")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Todos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{titulosFiltradosPorTipo.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(titulosFiltradosPorTipo.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0))}
            </p>
          </CardContent>
        </Card>

        {todasEtapas.map((etapa) => (
          <Card 
            key={etapa}
            className={`cursor-pointer transition-all ${selectedEtapa === etapa ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setSelectedEtapa(etapa)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate" title={etapa}>
                {etapa}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metricasPorEtapa[etapa]?.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metricasPorEtapa[etapa]?.saldo || 0)}
              </p>
            </CardContent>
          </Card>
        ))}

        {titulosPorEtapa["Sem etapa"]?.length > 0 && (
          <Card 
            className={`cursor-pointer transition-all ${selectedEtapa === "Sem etapa" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setSelectedEtapa("Sem etapa")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Sem etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metricasPorEtapa["Sem etapa"]?.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metricasPorEtapa["Sem etapa"]?.saldo || 0)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resumo da etapa selecionada */}
      {selectedEtapa !== "todos" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Etapa: {selectedEtapa}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Títulos</p>
                  <p className="text-xl font-bold">{filteredTitulos.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Total</p>
                  <p className="text-xl font-bold">{formatCurrency(filteredTitulos.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca e Ações */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento, parceiro ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFiltersCount}
                </Badge>
              )}
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
                  onClick={() => setBulkInsercaoOpen(true)}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Inserir no Cedrus em massa
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportTitulosToExcel(filteredTitulos)}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Exportar Excel
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-2">
                  <Checkbox
                    checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader column="documento" label="Doc." />
                <SortableHeader column="nome_parceiro" label="Parceiro" />
                <SortableHeader column="saldo_parcela" label="Saldo" />
                <SortableHeader column="data_vencimento" label="Vencimento" />
                <SortableHeader column="status_titulo" label="Status" />
                <SortableHeader column="status_cedrus" label="St. Cedrus" />
                <SortableHeader column="etapa" label="Etapa" />
                <SortableHeader column="forma_pagamento" label="Forma Pgto." />
                <TableHead className="text-center">Cedrus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((titulo) => (
                <TableRow
                  key={titulo.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(titulo)}
                >
                  <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(titulo.id)}
                      onCheckedChange={(checked) => handleSelectOne(titulo.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-xs">{titulo.documento || "-"}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm" title={titulo.nome_parceiro || ""}>
                    {titulo.nome_parceiro || "-"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(titulo.saldo_parcela)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(titulo.data_vencimento)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {titulo.status_titulo || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {titulo.status_cedrus ? (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {titulo.status_cedrus}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                      {titulo.etapa || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs">{titulo.forma_pagamento || "-"}</span>
                      {titulo.credor_cedrus && (
                        <span className="text-xs text-muted-foreground">Credor Cedrus: {titulo.credor_cedrus}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    {titulo.etapa === "A faturar - Negociação realizada" ? (
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={`text-xs px-1.5 py-0.5 ${titulo.inserido_cedrus ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                          {titulo.inserido_cedrus ? <><Check className="h-3 w-3 mr-1" />Inserido</> : 'Não inserido'}
                        </Badge>
                        {titulo.inserido_cedrus && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                            disabled={markingPaidId === titulo.id}
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
                        )}
                        {titulo.inserido_cedrus && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            disabled={removingId === titulo.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({ open: true, actionType: "cancelar", titulo });
                            }}
                          >
                            {removingId === titulo.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3 w-3" />
                                <span>Cancelar</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : titulo.inserido_cedrus ? (
                      <div className="flex flex-col items-center gap-1">
                        <Badge className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 border-green-300">
                          <Check className="h-3 w-3" />
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                          disabled={markingPaidId === titulo.id}
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
                          disabled={removingId === titulo.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDialog({ open: true, actionType: "cancelar", titulo });
                          }}
                        >
                          {removingId === titulo.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              <span>Cancelar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 gap-1"
                        disabled={isInserindo && insertingId === titulo.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({ open: true, actionType: "inserir", titulo });
                        }}
                      >
                        {isInserindo && insertingId === titulo.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3" />
                            <span>Inserir</span>
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhum título encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="p-4 border-t">
            <DataTablePagination
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              pageCount={pageCount}
              totalItems={totalItems}
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
              gotoPage={gotoPage}
              nextPage={nextPage}
              previousPage={previousPage}
              setPageSize={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <TitulosBulkEditModal
        selectedIds={selectedIds}
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        onSuccess={() => setSelectedIds([])}
      />

      <BulkInsercaoCedrusModal
        open={bulkInsercaoOpen}
        onOpenChange={setBulkInsercaoOpen}
        titulos={filteredTitulos.filter(t => selectedIds.includes(t.id) && !t.inserido_cedrus)}
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
          (confirmDialog.actionType === "cancelar" && removingId === confirmDialog.titulo?.id) ||
          (confirmDialog.actionType === "marcar_pago" && markingPaidId === confirmDialog.titulo?.id) ||
          (confirmDialog.actionType === "inserir" && isInserindo)
        }
      />
    </div>
  );
}