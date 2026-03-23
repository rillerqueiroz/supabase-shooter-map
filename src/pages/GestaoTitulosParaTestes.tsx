import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TitulosFilters,
  TituloTudoBelo,
} from "@/hooks/useTitulosTudoBelo";
import {
  useTitulosParaTestes,
  useTitulosParaTestesOptions,
} from "@/hooks/useTitulosParaTestes";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { useTitulosFormasPagamento } from "@/hooks/useTitulosFormasPagamento";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { TitulosBulkEditModal } from "@/components/TitulosTudoBelo/TitulosBulkEditModal";
import { InlineEtapaSelect } from "@/components/TitulosTudoBelo/InlineEtapaSelect";
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
  TableIcon,
  X,
  Lock,
  LockOpen,
  FlaskConical,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoSuperavit from "@/assets/logo-superavit.png";

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

const calcularDiasRecompra = (dataVencimento: string | null, prazoRecompra: number | null) => {
  if (!dataVencimento || prazoRecompra === null || prazoRecompra === undefined || prazoRecompra === 0) return null;
  try {
    const datePart = dataVencimento.split('T')[0];
    if (!datePart || datePart.split('-').length !== 3) return null;
    const [year, month, day] = datePart.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const vencimento = new Date(year, month - 1, day);
    if (isNaN(vencimento.getTime())) return null;
    const limiteRecompra = addDays(vencimento, prazoRecompra);
    if (isNaN(limiteRecompra.getTime())) return null;
    const hoje = new Date();
    const brasilOffset = -3 * 60;
    const localOffset = hoje.getTimezoneOffset();
    hoje.setMinutes(hoje.getMinutes() + localOffset + brasilOffset);
    hoje.setHours(0, 0, 0, 0);
    const diasRestantes = differenceInDays(limiteRecompra, hoje);
    return { diasRestantes, prazoTotal: prazoRecompra, dataLimite: limiteRecompra };
  } catch {
    return null;
  }
};

const getRecompraColorClasses = (diasRestantes: number, prazoTotal: number) => {
  if (diasRestantes <= 0) return "bg-red-600 text-white border-red-700";
  const porcentagemRestante = (diasRestantes / prazoTotal) * 100;
  if (porcentagemRestante > 66) return "bg-green-100 text-green-800 border-green-300";
  if (porcentagemRestante > 33) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (porcentagemRestante > 10) return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-red-100 text-red-800 border-red-300";
};

export default function GestaoTitulosParaTestes() {
  const [filters, setFilters] = useState<TitulosFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const { data: titulos, isLoading, error } = useTitulosParaTestes(filters);
  const { data: options } = useTitulosParaTestesOptions();
  const { data: etapasDisponiveis } = useTitulosEtapas();
  const { data: formasPagamento } = useTitulosFormasPagamento();

  const prazoRecompraMap = useMemo(() => {
    if (!formasPagamento) return new Map<string, number>();
    const map = new Map<string, number>();
    formasPagamento.forEach((fp) => {
      if (fp.forma_pagamento && fp.prazo_recompra !== null) {
        map.set(fp.forma_pagamento, fp.prazo_recompra);
      }
    });
    return map;
  }, [formasPagamento]);

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
    if (!titulos) return { total: 0, valorTotal: 0, saldoTotal: 0, cedrus: 0 };
    return {
      total: titulos.length,
      valorTotal: titulos.reduce((sum, t) => sum + (t.valor_parcela || 0), 0),
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

  const clearFilters = () => {
    setFilters({});
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
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoSuperavit} alt="Superávit" className="h-10" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-amber-600" />
              Gestão de Títulos - Testes
            </h1>
            <p className="text-muted-foreground text-sm">
              Ambiente de testes — dados isolados da base principal
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 h-8 px-3">
            <FlaskConical className="h-3.5 w-3.5 mr-1" />
            AMBIENTE DE TESTES
          </Badge>
          <Button variant="outline" size="sm" onClick={() => exportTitulosToExcel(titulos || [])}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTitulosToPDF(titulos || [])}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

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

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por documento, parceiro, CNPJ ou ID Cedrus..."
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
                  <Button size="sm" onClick={() => setBulkEditOpen(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar {selectedIds.length} selecionados
                  </Button>
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
                    title="Vendedor"
                    options={options?.vendedores || []}
                    selectedValues={filters.vendedores || []}
                    onSelectionChange={(v) => setFilters({ ...filters, vendedores: v })}
                  />
                  <MultiSelectFilter
                    title="Tipo Documento"
                    options={options?.tiposTitulo || []}
                    selectedValues={filters.tiposTitulo || []}
                    onSelectionChange={(v) => setFilters({ ...filters, tiposTitulo: v })}
                  />
                  <MultiSelectFilter
                    title="Forma Pagamento"
                    options={options?.formasPagamento || []}
                    selectedValues={filters.formasPagamento || []}
                    onSelectionChange={(v) => setFilters({ ...filters, formasPagamento: v })}
                  />
                  <MultiSelectFilter
                    title="UF"
                    options={options?.ufs || []}
                    selectedValues={filters.ufs || []}
                    onSelectionChange={(v) => setFilters({ ...filters, ufs: v })}
                  />
                  <MultiSelectFilter
                    title="Etapa"
                    options={etapasDisponiveis?.map(e => e.etapa).filter(Boolean) as string[] || []}
                    selectedValues={filters.etapas || []}
                    onSelectionChange={(v) => setFilters({ ...filters, etapas: v })}
                  />
                  <MultiSelectFilter
                    title="Tipo Título"
                    options={options?.tiposTituloReal || ['Original', 'Negociação']}
                    selectedValues={filters.tipoTitulo || []}
                    onSelectionChange={(v) => setFilters({ ...filters, tipoTitulo: v })}
                  />
                  <DateFilterSelect
                    label="Data Vencimento"
                    value={filters.dataVencimentoRange}
                    onChange={(v) => setFilters({ ...filters, dataVencimentoRange: v })}
                  />
                  <DateFilterSelect
                    label="Data Pagamento"
                    value={filters.dataPagamentoRange}
                    onChange={(v) => setFilters({ ...filters, dataPagamentoRange: v })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Inserido Cedrus</label>
                    <Select
                      value={filters.inseridoCedrus === null || filters.inseridoCedrus === undefined ? "todos" : filters.inseridoCedrus ? "sim" : "nao"}
                      onValueChange={(v) => setFilters({ ...filters, inseridoCedrus: v === "todos" ? null : v === "sim" })}
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
                      onValueChange={(v) => setFilters({ ...filters, bloqueado: v === "todos" ? null : v === "sim" })}
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
                </div>
              )}
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
                          <SortableHeader column="documento" label="Documento" />
                          <SortableHeader column="nome_parceiro" label="Parceiro" />
                          <SortableHeader column="cnpj_cpf" label="CNPJ/CPF" />
                          <SortableHeader column="saldo_parcela" label="Saldo" />
                          <SortableHeader column="forma_pagamento" label="Forma Pagamento" />
                          <SortableHeader column="data_vencimento" label="Vencimento" />
                          <SortableHeader column="prazo_recompra" label="Dias Recompra" />
                          <SortableHeader column="status_titulo" label="Status / Etapa" />
                          <SortableHeader column="status_cedrus" label="Status Cedrus" />
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
                            <TableCell className="font-medium">{titulo.documento || "-"}</TableCell>
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
                            <TableCell className="text-center">
                              {(() => {
                                const prazoRecompra = titulo.forma_pagamento
                                  ? prazoRecompraMap.get(titulo.forma_pagamento) ?? null
                                  : null;
                                const recompraInfo = calcularDiasRecompra(titulo.data_vencimento, prazoRecompra);
                                if (!recompraInfo) return "-";
                                const colorClasses = getRecompraColorClasses(recompraInfo.diasRestantes, recompraInfo.prazoTotal);
                                return (
                                  <Badge variant="outline" className={`${colorClasses} font-semibold`}>
                                    {recompraInfo.diasRestantes <= 0
                                      ? `Vencido há ${Math.abs(recompraInfo.diasRestantes)} dias`
                                      : `${recompraInfo.diasRestantes} dias`
                                    }
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-1">
                                <Badge variant={titulo.status_titulo === "Pago em dia" || titulo.status_titulo === "Pago via renegociação" ? "default" : "secondary"}>
                                  {titulo.status_titulo || "-"}
                                </Badge>
                                <InlineEtapaSelect
                                  tituloId={titulo.id}
                                  currentEtapa={titulo.etapa}
                                  bloqueado={!!titulo.bloqueado}
                                />
                                <Badge variant="outline" className={`text-[10px] ${
                                  titulo.tipo_titulo === 'Negociação'
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                                }`}>
                                  {titulo.tipo_titulo || 'Original'}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${
                                  titulo.negativado
                                    ? 'bg-red-500/10 text-red-700 border-red-500/30'
                                    : 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                                }`}>
                                  {titulo.negativado ? 'Negativado' : 'Não Negativado'}
                                </Badge>
                              </div>
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
                          </TableRow>
                        ))}
                        {paginatedData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
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
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
