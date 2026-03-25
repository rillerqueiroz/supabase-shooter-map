import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useTitulosBaixados } from "@/hooks/useTitulosBaixados";
import { usePagination } from "@/hooks/usePagination";
import { useSortableTable } from "@/hooks/useSortableTable";
import { TituloDetailsModal } from "./TituloDetailsModal";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { Search, Loader2, ChevronUp, ChevronDown, Filter, X, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

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
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

interface BaixadosFilters {
  search: string;
  nomesParceiros: string[];
  statusTitulo: string[];
  vendedores: string[];
  formasPagamento: string[];
  ufs: string[];
  etapas: string[];
  statusCedrus: string[];
  dataBaixaRange?: { from?: Date; to?: Date };
  dataVencimentoRange?: { from?: Date; to?: Date };
}

const emptyFilters: BaixadosFilters = {
  search: "",
  nomesParceiros: [],
  statusTitulo: [],
  vendedores: [],
  formasPagamento: [],
  ufs: [],
  etapas: [],
  statusCedrus: [],
};

interface TitulosBaixadosTabProps {
  tableName?: string;
}

export function TitulosBaixadosTab({ tableName = 'base_tudobelo_intermediaria' }: TitulosBaixadosTabProps) {
  const [filters, setFilters] = useState<BaixadosFilters>({ ...emptyFilters });
  const [showFilters, setShowFilters] = useState(false);
  const { data: baixados, isLoading } = useTitulosBaixados(tableName);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    if (!baixados) return { parceiros: [], status: [], vendedores: [], formas: [], ufs: [], etapas: [], statusCedrus: [] };
    const set = (arr: (string | null | undefined)[]) => [...new Set(arr.filter(Boolean) as string[])].sort();
    return {
      parceiros: set(baixados.map(b => b.titulo?.nome_parceiro)),
      status: set(baixados.map(b => b.titulo?.status_titulo)),
      vendedores: set(baixados.map(b => b.titulo?.vendedor)),
      formas: set(baixados.map(b => b.titulo?.forma_pagamento)),
      ufs: set(baixados.map(b => b.titulo?.uf_cobranca)),
      etapas: set(baixados.map(b => b.titulo?.etapa)),
      statusCedrus: set(baixados.map(b => b.titulo?.status_cedrus)),
    };
  }, [baixados]);

  // Apply all filters
  const filteredData = useMemo(() => {
    if (!baixados) return [];
    return baixados.filter(row => {
      const t = row.titulo;

      // Search
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const match =
          row.id_titulo_cedrus?.toLowerCase().includes(s) ||
          t?.documento?.toLowerCase().includes(s) ||
          t?.nome_parceiro?.toLowerCase().includes(s) ||
          t?.cnpj_cpf?.toLowerCase().includes(s);
        if (!match) return false;
      }

      // Multi-selects
      if (filters.nomesParceiros.length && (!t?.nome_parceiro || !filters.nomesParceiros.includes(t.nome_parceiro))) return false;
      if (filters.statusTitulo.length && (!t?.status_titulo || !filters.statusTitulo.includes(t.status_titulo))) return false;
      if (filters.vendedores.length && (!t?.vendedor || !filters.vendedores.includes(t.vendedor))) return false;
      if (filters.formasPagamento.length && (!t?.forma_pagamento || !filters.formasPagamento.includes(t.forma_pagamento))) return false;
      if (filters.ufs.length && (!t?.uf_cobranca || !filters.ufs.includes(t.uf_cobranca))) return false;
      if (filters.etapas.length && (!t?.etapa || !filters.etapas.includes(t.etapa))) return false;
      if (filters.statusCedrus.length && (!t?.status_cedrus || !filters.statusCedrus.includes(t.status_cedrus))) return false;

      // Date range - Data Baixa
      if (filters.dataBaixaRange?.from || filters.dataBaixaRange?.to) {
        if (!row.data_baixa) return false;
        const dateParts = row.data_baixa.split("T")[0].split("-").map(Number);
        const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        if (filters.dataBaixaRange.from && d < filters.dataBaixaRange.from) return false;
        if (filters.dataBaixaRange.to && d > filters.dataBaixaRange.to) return false;
      }

      // Date range - Data Vencimento
      if (filters.dataVencimentoRange?.from || filters.dataVencimentoRange?.to) {
        if (!t?.data_vencimento) return false;
        const dateParts = t.data_vencimento.split("T")[0].split("-").map(Number);
        const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        if (filters.dataVencimentoRange.from && d < filters.dataVencimentoRange.from) return false;
        if (filters.dataVencimentoRange.to && d > filters.dataVencimentoRange.to) return false;
      }

      return true;
    });
  }, [baixados, filters]);

  // Flatten data for sorting
  const flatData = useMemo(() => {
    return filteredData.map(b => ({
      ...b,
      documento: b.titulo?.documento || null,
      nome_parceiro: b.titulo?.nome_parceiro || null,
      cnpj_cpf: b.titulo?.cnpj_cpf || null,
      valor_parcela: b.titulo?.valor_parcela || null,
      saldo_parcela: b.titulo?.saldo_parcela || null,
      data_vencimento: b.titulo?.data_vencimento || null,
      status_titulo: b.titulo?.status_titulo || null,
      status_cedrus: b.titulo?.status_cedrus || null,
      etapa: b.titulo?.etapa || null,
      forma_pagamento: b.titulo?.forma_pagamento || null,
      negativado: b.titulo?.negativado ?? null,
    }));
  }, [filteredData]);

  const { sortedData, sortConfig, requestSort } = useSortableTable(flatData);

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
  } = usePagination({ data: sortedData, initialPageSize: 100 });

  const metrics = useMemo(() => {
    return {
      total: filteredData.length,
      valorTotalPago: filteredData.reduce((sum, b) => sum + (b.valor_pago || 0), 0),
    };
  }, [filteredData]);

  const hasActiveFilters = filters.nomesParceiros.length > 0 || filters.statusTitulo.length > 0 ||
    filters.vendedores.length > 0 || filters.formasPagamento.length > 0 || filters.ufs.length > 0 ||
    filters.etapas.length > 0 || filters.statusCedrus.length > 0 ||
    filters.dataBaixaRange?.from || filters.dataBaixaRange?.to ||
    filters.dataVencimentoRange?.from || filters.dataVencimentoRange?.to;

  const clearFilters = () => setFilters({ ...emptyFilters });

  const handleRowClick = (row: any) => {
    if (row.titulo) {
      setSelectedTitulo(row.titulo as TituloTudoBelo);
      setDetailsOpen(true);
    }
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => requestSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig?.key === column &&
          (sortConfig.direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Títulos Baixados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.valorTotalPago)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento, parceiro, CNPJ ou ID Cedrus..."
                value={filters.search}
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
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Date filters always visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <DateFilterSelect
              label="Data Baixa"
              value={filters.dataBaixaRange}
              onChange={(v) => setFilters({ ...filters, dataBaixaRange: v })}
            />
            <DateFilterSelect
              label="Data Vencimento"
              value={filters.dataVencimentoRange}
              onChange={(v) => setFilters({ ...filters, dataVencimentoRange: v })}
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <MultiSelectFilter
                title="Parceiro"
                options={filterOptions.parceiros}
                selectedValues={filters.nomesParceiros}
                onSelectionChange={(v) => setFilters({ ...filters, nomesParceiros: v })}
              />
              <MultiSelectFilter
                title="Status Título"
                options={filterOptions.status}
                selectedValues={filters.statusTitulo}
                onSelectionChange={(v) => setFilters({ ...filters, statusTitulo: v })}
              />
              <MultiSelectFilter
                title="Vendedor"
                options={filterOptions.vendedores}
                selectedValues={filters.vendedores}
                onSelectionChange={(v) => setFilters({ ...filters, vendedores: v })}
              />
              <MultiSelectFilter
                title="Forma Pagamento"
                options={filterOptions.formas}
                selectedValues={filters.formasPagamento}
                onSelectionChange={(v) => setFilters({ ...filters, formasPagamento: v })}
              />
              <MultiSelectFilter
                title="UF"
                options={filterOptions.ufs}
                selectedValues={filters.ufs}
                onSelectionChange={(v) => setFilters({ ...filters, ufs: v })}
              />
              <MultiSelectFilter
                title="Etapa"
                options={filterOptions.etapas}
                selectedValues={filters.etapas}
                onSelectionChange={(v) => setFilters({ ...filters, etapas: v })}
              />
              <MultiSelectFilter
                title="Status Cedrus"
                options={filterOptions.statusCedrus}
                selectedValues={filters.statusCedrus}
                onSelectionChange={(v) => setFilters({ ...filters, statusCedrus: v })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
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
                      <SortableHeader column="documento" label="Documento" />
                      <SortableHeader column="nome_parceiro" label="Parceiro" />
                      <SortableHeader column="cnpj_cpf" label="CNPJ/CPF" />
                      <SortableHeader column="valor_parcela" label="Valor Parcela" />
                      <SortableHeader column="valor_pago" label="Valor Pago (Baixa)" />
                      <SortableHeader column="data_baixa" label="Data Baixa" />
                      <SortableHeader column="data_vencimento" label="Vencimento" />
                      <SortableHeader column="status_titulo" label="Status Título" />
                      <SortableHeader column="status_cedrus" label="Status Cedrus" />
                      <SortableHeader column="etapa" label="Etapa / Negativado" />
                      <SortableHeader column="forma_pagamento" label="Forma Pgto." />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Nenhum título baixado encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row) => (
                        <TableRow
                          key={row.id}
                          className={`${row.titulo ? "cursor-pointer hover:bg-muted/50" : ""}`}
                          onClick={() => handleRowClick(row)}
                        >
                          <TableCell className="font-medium">{row.documento || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {row.nome_parceiro || "-"}
                          </TableCell>
                          <TableCell>{row.cnpj_cpf || "-"}</TableCell>
                          <TableCell>{formatCurrency(row.valor_parcela)}</TableCell>
                          <TableCell className="font-semibold text-green-700">
                            {formatCurrency(row.valor_pago)}
                          </TableCell>
                          <TableCell>{formatDate(row.data_baixa)}</TableCell>
                          <TableCell>{formatDate(row.data_vencimento)}</TableCell>
                          <TableCell>
                            {row.status_titulo ? (
                              <Badge variant="secondary">{row.status_titulo}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {row.status_cedrus ? (
                              <Badge variant="outline" className="text-xs">
                                {row.status_cedrus}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {row.etapa ? (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-500/10 text-purple-700 border-purple-500/30"
                                >
                                  {row.etapa}
                                </Badge>
                              ) : null}
                              <Badge
                                variant="outline"
                                className={row.negativado
                                  ? "bg-red-500/10 text-red-700 border-red-500/30"
                                  : "bg-green-500/10 text-green-700 border-green-500/30"
                                }
                              >
                                {row.negativado ? "Negativado" : "Não negativado"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{row.forma_pagamento || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t">
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

      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onTituloUpdated={setSelectedTitulo}
      />
    </div>
  );
}
