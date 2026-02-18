import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ValoresRecebidos/StatusBadge";
import { DetalhesModal } from "@/components/ValoresRecebidos/DetalhesModal";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import { useCobrancasSemSplits } from "@/hooks/useCobrancasSemSplits";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDateFromDatabase } from "@/lib/utils";
import { getStatusConfig } from "@/utils/statusMapping";
import { exportCobrancasToExcel } from "@/utils/exportToExcel";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGestaoSplitsScreenPermissions } from "@/hooks/useGestaoSplitsScreenPermissions";
import { Search, AlertCircle, Unlink, RefreshCw, Download, FileSpreadsheet } from "lucide-react";

interface Filters {
  nomes: string[];
  unidades: string[];
  formasPagamento: string[];
  statusList: string[];
  projetos: string[];
  searchTerm: string;
  dataVencimentoRange?: { from?: Date; to?: Date };
}

export function CobrancasSemSplitsTab() {
  const { user } = useAuth();
  const { data: permissions } = useGestaoSplitsScreenPermissions(user?.id, 'todas-cobrancas');
  const canUpdate = permissions?.canUpdate ?? false;
  const navigate = useNavigate();
  
  const { data: cobrancas, isLoading, error, filterOptions } = useCobrancasSemSplits();
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [showAllData, setShowAllData] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    nomes: [],
    unidades: [],
    formasPagamento: [],
    statusList: [],
    projetos: [],
    searchTerm: '',
    dataVencimentoRange: undefined
  });

  // Aplicar filtros locais
  const filteredData = useMemo(() => {
    if (!cobrancas) return [];
    
    let result = [...cobrancas];

    if (filters.nomes.length > 0) {
      result = result.filter(item => filters.nomes.includes(item.nome || ''));
    }

    if (filters.unidades.length > 0) {
      result = result.filter(item => filters.unidades.includes(item.credor_cedrus || ''));
    }

    if (filters.formasPagamento.length > 0) {
      result = result.filter(item => filters.formasPagamento.includes(item.forma_pagamento || ''));
    }

    if (filters.statusList.length > 0) {
      result = result.filter(item => filters.statusList.includes(item.status || ''));
    }

    if (filters.projetos.length > 0) {
      result = result.filter(item => {
        const projetoItem = item.projeto && item.projeto.trim() !== '' ? item.projeto : 'Sem Projeto';
        return filters.projetos.includes(projetoItem);
      });
    }

    if (filters.dataVencimentoRange?.from || filters.dataVencimentoRange?.to) {
      result = result.filter(item => {
        if (!item.vencimento) return false;
        try {
          const itemDateStr = item.vencimento.split('T')[0];
          if (filters.dataVencimentoRange!.from) {
            const fromDateStr = filters.dataVencimentoRange!.from.toISOString().split('T')[0];
            if (itemDateStr < fromDateStr) return false;
          }
          if (filters.dataVencimentoRange!.to) {
            const toDateStr = filters.dataVencimentoRange!.to.toISOString().split('T')[0];
            if (itemDateStr > toDateStr) return false;
          }
          return true;
        } catch {
          return false;
        }
      });
    }

    if (filters.searchTerm.trim() !== '') {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        (item.nome && item.nome.toLowerCase().includes(searchLower)) ||
        (item.descricao && item.descricao.toLowerCase().includes(searchLower)) ||
        (item.Identificador && item.Identificador.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [cobrancas, filters]);

  // Ordenação
  const { sortedData, requestSort, getSortIcon } = useSortableTable(filteredData);

  // Paginação
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
  } = usePagination({ 
    data: sortedData, 
    initialPageSize: showAllData ? sortedData.length : 50 
  });

  const displayData = showAllData ? sortedData : paginatedData;

  // Total geral das cobranças sem splits
  const totalGeral = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.valor || 0), 0);
  }, [filteredData]);

  // Status options com labels
  const statusOptionsWithLabels = useMemo(() => {
    return filterOptions.statusList.map(status => {
      const config = getStatusConfig(status);
      return { value: status, label: config.label };
    });
  }, [filterOptions.statusList]);

  const statusLabels = useMemo(() => statusOptionsWithLabels.map(s => s.label), [statusOptionsWithLabels]);

  const labelsToValues = (labels: string[]) => {
    return labels.map(label => {
      const found = statusOptionsWithLabels.find(s => s.label === label);
      return found?.value || label;
    });
  };

  const valuesToLabels = (values: string[]) => {
    return values.map(value => {
      const found = statusOptionsWithLabels.find(s => s.value === value);
      return found?.label || value;
    });
  };

  // Dados para modal
  const selectedRegistro = useMemo(() => {
    if (!selectedDetailId) return null;
    return cobrancas?.find(v => v.Identificador === selectedDetailId) || null;
  }, [selectedDetailId, cobrancas]);

  // Funções de formatação
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

  const handleClearFilters = () => {
    setFilters({
      nomes: [],
      unidades: [],
      formasPagamento: [],
      statusList: [],
      projetos: [],
      searchTerm: '',
      dataVencimentoRange: undefined
    });
    setShowAllData(false);
    toast({
      title: "Filtros limpos",
      description: "Todos os filtros foram removidos"
    });
  };

  const handleLoadAll = () => {
    setShowAllData(true);
    setPageSize(sortedData.length);
    toast({
      title: "Todos os dados carregados",
      description: `${filteredData.length} cobranças carregadas`
    });
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao carregar cobranças sem splits</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com métricas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Unlink className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobranças sem Splits</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{filteredData.length}</p>
                  <Badge variant="outline" className="text-muted-foreground">
                    {formatCurrency(totalGeral)}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs text-right">
              Cobranças que não possuem configuração de split (divisão) de valores.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <MultiSelectFilter
              title="Nome"
              options={filterOptions.nomes}
              selectedValues={filters.nomes}
              onSelectionChange={(values) => setFilters({...filters, nomes: values})}
              placeholder="Selecionar nomes..."
            />

            <MultiSelectFilter
              title="Empresa"
              options={filterOptions.unidades}
              selectedValues={filters.unidades}
              onSelectionChange={(values) => setFilters({...filters, unidades: values})}
              placeholder="Selecionar empresas..."
            />

            <MultiSelectFilter
              title="Status"
              options={statusLabels}
              selectedValues={valuesToLabels(filters.statusList)}
              onSelectionChange={(labels) => setFilters({...filters, statusList: labelsToValues(labels)})}
              placeholder="Selecionar status..."
            />

            <MultiSelectFilter
              title="Forma de Pagamento"
              options={filterOptions.formasPagamento}
              selectedValues={filters.formasPagamento}
              onSelectionChange={(values) => setFilters({...filters, formasPagamento: values})}
              placeholder="Selecionar formas..."
            />

            <MultiSelectFilter
              title="Projeto"
              options={filterOptions.projetos}
              selectedValues={filters.projetos}
              onSelectionChange={(values) => setFilters({...filters, projetos: values})}
              placeholder="Selecionar projetos..."
            />

            <DateFilterSelect
              label="Data de Vencimento"
              value={filters.dataVencimentoRange}
              onChange={(value) => setFilters({...filters, dataVencimentoRange: value})}
            />
          </div>

          {/* Campo de busca */}
          <div className="space-y-2">
            <Label className="mobile-text-sm">Buscar por Nome, Descrição ou ID</Label>
            <Input
              placeholder="Digite para buscar..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              className="w-full mobile-text-sm"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleClearFilters} variant="outline" size="sm" className="mobile-button">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
            <Button 
              onClick={handleLoadAll} 
              variant="outline"
              size="sm"
              disabled={showAllData}
              className="mobile-button"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Carregar Todos</span>
            </Button>
            <Button 
              onClick={() => {
                const result = exportCobrancasToExcel(filteredData, {});
                if (result.success) {
                  toast({
                    title: "Excel exportado",
                    description: `${filteredData.length} cobranças exportadas com sucesso`
                  });
                } else {
                  toast({
                    title: "Erro na exportação",
                    description: "Ocorreu um erro ao exportar o Excel",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              size="sm"
              disabled={filteredData.length === 0}
              className="mobile-button"
            >
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm min-w-[200px]"
                        onClick={() => requestSort('descricao')}
                      >
                        Descrição {getSortIcon('descricao')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('nome')}
                      >
                        Nome {getSortIcon('nome')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('credor_cedrus')}
                      >
                        Empresa {getSortIcon('credor_cedrus')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('status')}
                      >
                        Status {getSortIcon('status')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('vencimento')}
                      >
                        Vencimento {getSortIcon('vencimento')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('forma_pagamento')}
                      >
                        Forma Pag. {getSortIcon('forma_pagamento')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('valor')}
                      >
                        Valor {getSortIcon('valor')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Unlink className="h-8 w-8 text-muted-foreground/50" />
                            <span>Nenhuma cobrança sem split encontrada</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayData.map((item) => {
                        const isOverdueNegociado = item.status === 'OVERDUE' && item.status_cedrus === 'N';
                        const isReceivedSuperavit = item.status === 'RECEIVED_IN_CASH' && item.status_cedrus === 'N';
                        
                        let rowHighlight = '';
                        if (isOverdueNegociado) {
                          rowHighlight = 'bg-purple-50 dark:bg-purple-950/30 border-l-4 border-l-purple-500';
                        } else if (isReceivedSuperavit) {
                          rowHighlight = 'bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500';
                        }
                        
                        return (
                          <TableRow 
                            key={item.Identificador}
                            className={rowHighlight}
                          >
                            <TableCell 
                              className="cursor-pointer text-primary hover:underline mobile-text-sm"
                              onClick={() => setSelectedDetailId(item.Identificador)}
                            >
                              <span className="line-clamp-2">{item.descricao || "-"}</span>
                            </TableCell>
                            <TableCell 
                              className="font-medium cursor-pointer text-primary hover:underline mobile-text-sm whitespace-nowrap"
                              onClick={() => navigate(`/valores-recebidos-cliente?nome=${encodeURIComponent(item.nome || '')}`)}
                            >
                              {item.nome || "-"}
                            </TableCell>
                            <TableCell className="mobile-text-sm whitespace-nowrap">
                              {item.credor_cedrus || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={item.status} size="sm" />
                                {isOverdueNegociado && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-medium">
                                    Negociado
                                  </span>
                                )}
                                {isReceivedSuperavit && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium">
                                    Superavit
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="mobile-text-sm whitespace-nowrap">{formatDate(item.vencimento)}</TableCell>
                            <TableCell className="mobile-text-sm whitespace-nowrap">{item.forma_pagamento || "-"}</TableCell>
                            <TableCell className="text-right font-medium mobile-text-sm whitespace-nowrap">
                              {formatCurrency(item.valor || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                  {displayData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="text-right font-bold">
                          Total ({filteredData.length} cobranças sem splits):
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalGeral)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>

              {/* Paginação */}
              {!showAllData && displayData.length > 0 && (
                <div className="p-4 border-t">
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <DetalhesModal
        isOpen={!!selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
        registro={selectedRegistro}
        canUpdate={canUpdate}
      />
    </div>
  );
}
