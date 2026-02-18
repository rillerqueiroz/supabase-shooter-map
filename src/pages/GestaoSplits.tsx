import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSplits, SplitsFilters, SplitDetalhado } from "@/hooks/useSplits";
import { MetricsCards } from "@/components/Splits/MetricsCards";
import { SplitDetailsModal } from "@/components/Splits/SplitDetailsModal";
import { SplitsAnalytics } from "@/components/Splits/SplitsAnalytics";
import { exportSplitsToExcel, exportSplitsToPDF } from "@/utils/exportSplits";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import { Download, FileSpreadsheet, RefreshCw, Search, X, BarChart3, FileText } from "lucide-react";
import { formatDateFromDatabase } from "@/lib/utils";
import logoSuperavit from "@/assets/logo-superavit.png";

const ANALYTICS_WALLET_ID = "5866286a-aac3-4013-b09d-2013384ad2b7";

export default function GestaoSplits() {
  const [filters, setFilters] = useState<SplitsFilters>({
    pagadores: [],
    walletIds: [],
    clientes: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSplit, setSelectedSplit] = useState<SplitDetalhado | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("report");
  const [savedFiltersBeforeAnalytics, setSavedFiltersBeforeAnalytics] = useState<SplitsFilters | null>(null);

  const { splits, allSplits, isLoading, refetch, filterOptions, metrics } = useSplits({
    ...filters,
    searchTerm,
  });

  const { sortedData, sortConfig, requestSort } = useSortableTable(splits);

  const {
    paginatedData,
    pagination,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    setPageSize,
    totalItems,
  } = usePagination({ data: sortedData, initialPageSize: 50 });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R$ 0,00";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (date: string | null) => formatDateFromDatabase(date);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      PENDING: { label: "Pendente", variant: "secondary" },
      CONFIRMED: { label: "Confirmado", variant: "default" },
      DONE: { label: "Pago", variant: "default" },
      CANCELLED: { label: "Cancelado", variant: "destructive" },
      UNKNOWN: { label: "Desconhecido", variant: "outline" },
    };

    const config = statusMap[status] || statusMap.UNKNOWN;
    
    if (status === "DONE") {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent">{config.label}</Badge>;
    }
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleClearFilters = () => {
    setFilters({ pagadores: [], walletIds: [], clientes: [] });
    setSearchTerm("");
  };

  const handleLoadAll = () => {
    handleClearFilters();
    refetch();
  };

  const handleExportExcel = () => {
    exportSplitsToExcel(splits, filters);
  };

  const handleExportPDF = () => {
    exportSplitsToPDF(splits, filters, metrics.valorTotal);
  };

  const handleRowClick = (split: SplitDetalhado) => {
    setSelectedSplit(split);
    setDetailsModalOpen(true);
  };

  const getSortIcon = (column: string) => {
    if (sortConfig.key !== column) return "↕️";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const handleTabChange = (value: string) => {
    if (value === "analytics") {
      // Salvar filtros atuais antes de aplicar o filtro de Analytics
      setSavedFiltersBeforeAnalytics(filters);
      
      // Aplicar filtro de wallet específico
      setFilters({
        ...filters,
        walletIds: [ANALYTICS_WALLET_ID]
      });
    } else if (value === "report" && savedFiltersBeforeAnalytics) {
      // Restaurar filtros anteriores ao voltar para Relatório
      setFilters(savedFiltersBeforeAnalytics);
      setSavedFiltersBeforeAnalytics(null);
    }
    
    setActiveTab(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando splits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mobile-container py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
        <img src={logoSuperavit} alt="Superávit" className="h-8 sm:h-10 md:h-12 w-auto" />
        <div className="min-w-0">
          <h1 className="mobile-heading font-bold truncate">Gestão de Splits</h1>
          <p className="mobile-text-sm text-muted-foreground hidden sm:block">Visualize e gerencie todas as transferências</p>
        </div>
      </div>

      {/* Métricas */}
      <MetricsCards
        total={metrics.total}
        valorTotal={metrics.valorTotal}
        pendentes={metrics.pendentes}
        confirmados={metrics.confirmados}
        cancelados={metrics.cancelados}
      />

      {/* Tabs: Relatório e Análises */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="report">
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Aba: Relatório */}
        <TabsContent value="report" className="space-y-6">
          {/* Filtros */}
          <Card className="mobile-card-padding">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="mobile-text-base font-semibold">Filtros</h3>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Limpar</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Filtro de Status */}
                <MultiSelectFilter
                  title="Status"
                  options={filterOptions.statuses}
                  selectedValues={filters.status || []}
                  onSelectionChange={(values) => setFilters({ ...filters, status: values })}
                  placeholder="Todos os status"
                />

                {/* Filtro de Pagador */}
                <MultiSelectFilter
                  title="Pagador"
                  options={filterOptions.pagadores}
                  selectedValues={filters.pagadores || []}
                  onSelectionChange={(values) =>
                    setFilters({ ...filters, pagadores: values })
                  }
                  placeholder="Todos os pagadores"
                />

                {/* Filtro de Wallet ID */}
                <MultiSelectFilter
                  title="Wallet ID"
                  options={filterOptions.walletIds}
                  selectedValues={filters.walletIds || []}
                  onSelectionChange={(values) =>
                    setFilters({ ...filters, walletIds: values })
                  }
                  placeholder="Todos os wallets"
                />

                {/* Filtro de Cliente */}
                <MultiSelectFilter
                  title="Cliente"
                  options={filterOptions.clientes}
                  selectedValues={filters.clientes || []}
                  onSelectionChange={(values) =>
                    setFilters({ ...filters, clientes: values })
                  }
                  placeholder="Todos os clientes"
                />

                {/* Filtro de Período */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <DateFilterSelect
                    value={filters.dateRange}
                    onChange={(dateRange) => setFilters({ ...filters, dateRange })}
                  />
                </div>
              </div>

              {/* Busca Livre */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pagador, identificador, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </Card>

          {/* Ações */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="mobile-text-sm text-muted-foreground">
              {splits.length} de {allSplits.length} splits
            </div>
            <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto">
              <Button variant="outline" size="sm" onClick={handleLoadAll} className="px-2 sm:px-4">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Carregar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="px-2 sm:px-4">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="px-2 sm:px-4">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">PDF</span>
              </Button>
            </div>
          </div>

          {/* Tabela Desktop */}
          <Card className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("nomePagador")}
                  >
                    Pagador {getSortIcon("nomePagador")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("credorCedrus")}
                  >
                    Cliente {getSortIcon("credorCedrus")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("identificador")}
                  >
                    ID {getSortIcon("identificador")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("walletId")}
                  >
                    Wallet {getSortIcon("walletId")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("dataPagamento")}
                  >
                    Data {getSortIcon("dataPagamento")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("valorCobranca")}
                  >
                    Cobrança {getSortIcon("valorCobranca")}
                  </TableHead>
                  <TableHead className="text-center mobile-text-sm">%</TableHead>
                  <TableHead
                    className="cursor-pointer text-right mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("totalValue")}
                  >
                    Split {getSortIcon("totalValue")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-center mobile-text-sm whitespace-nowrap"
                    onClick={() => requestSort("status")}
                  >
                    Status {getSortIcon("status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum split encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paginatedData.map((split: SplitDetalhado) => (
                      <TableRow
                        key={split.splitId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(split)}
                      >
                        <TableCell className="font-medium mobile-text-sm whitespace-nowrap">
                          <span className="line-clamp-1">{split.nomePagador || "N/A"}</span>
                        </TableCell>
                        <TableCell className="mobile-text-sm whitespace-nowrap">
                          <span className="line-clamp-1">{split.credorCedrus || "N/A"}</span>
                        </TableCell>
                        <TableCell className="mobile-text-sm whitespace-nowrap">
                          {split.identificador || "N/A"}
                        </TableCell>
                        <TableCell className="mobile-text-sm">
                          {split.walletId === "Sem Split" ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 text-xs">
                              Sem Split
                            </Badge>
                          ) : (
                            <span className="line-clamp-1">{split.walletId || "N/A"}</span>
                          )}
                        </TableCell>
                        <TableCell className="mobile-text-sm whitespace-nowrap">{formatDate(split.dataPagamento)}</TableCell>
                        <TableCell className="text-right mobile-text-sm whitespace-nowrap">
                          {formatCurrency(split.valorCobranca)}
                        </TableCell>
                        <TableCell className="text-center mobile-text-sm">
                          {split.percentualValue ? `${split.percentualValue}%` : "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-medium mobile-text-sm whitespace-nowrap">
                          {formatCurrency(split.totalValue)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(split.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={5} className="text-right">
                        Total:
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          paginatedData.reduce((sum, split) => sum + (split.valorCobranca || 0), 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          paginatedData.reduce((sum, split) => sum + split.totalValue, 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Cards Mobile */}
          <div className="sm:hidden space-y-3">
            {paginatedData.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                Nenhum split encontrado com os filtros aplicados.
              </Card>
            ) : (
              <>
                {paginatedData.map((split: SplitDetalhado) => (
                  <Card 
                    key={split.splitId} 
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(split)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{split.nomePagador || "N/A"}</p>
                          <p className="text-xs text-muted-foreground truncate">{split.credorCedrus || "N/A"}</p>
                        </div>
                        {getStatusBadge(split.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <p className="font-medium truncate">{split.identificador || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <p className="font-medium">{formatDate(split.dataPagamento)}</p>
                        </div>
                      </div>

                      <div className="text-xs">
                        <span className="text-muted-foreground">Wallet:</span>
                        {split.walletId === "Sem Split" ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 w-fit text-xs mt-1">
                            Sem Split
                          </Badge>
                        ) : (
                          <p className="font-mono text-[10px] break-all">{split.walletId || "N/A"}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Cobrança</p>
                          <p className="font-medium text-sm">{formatCurrency(split.valorCobranca)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">%</p>
                          <p className="font-medium text-sm">{split.percentualValue ? `${split.percentualValue}%` : "N/A"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Split</p>
                          <p className="font-semibold text-sm">{formatCurrency(split.totalValue)}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Total Mobile */}
                <Card className="p-3 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Total:</span>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Cobrança: {formatCurrency(paginatedData.reduce((sum, split) => sum + (split.valorCobranca || 0), 0))}</p>
                      <p className="font-semibold">Split: {formatCurrency(paginatedData.reduce((sum, split) => sum + split.totalValue, 0))}</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Paginação */}
          {splits.length > 0 && (
            <DataTablePagination
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              pageCount={pageCount}
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
              gotoPage={gotoPage}
              previousPage={previousPage}
              nextPage={nextPage}
              setPageSize={setPageSize}
              totalItems={totalItems}
            />
          )}
        </TabsContent>

        {/* Aba: Análises de BI */}
        <TabsContent value="analytics" className="space-y-6">
          {activeTab === "analytics" && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-primary/10">
                  Filtro Automático
                </Badge>
                <span className="text-muted-foreground">
                  Exibindo apenas dados do wallet: <span className="font-mono font-medium">{ANALYTICS_WALLET_ID}</span>
                </span>
              </div>
            </Card>
          )}
          <SplitsAnalytics splits={splits} />
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes */}
      <SplitDetailsModal
        split={selectedSplit}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </div>
  );
}
