import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DetalhesModal } from "@/components/ValoresRecebidos/DetalhesModal";
import { StatusBadge } from "@/components/ValoresRecebidos/StatusBadge";
import { CobrancasAnalytics } from "@/components/TodasCobrancas/CobrancasAnalytics";
import { BulkEditModal } from "@/components/TodasCobrancas/BulkEditModal";

import { CobrancasSemSplitsTab } from "@/components/TodasCobrancas/CobrancasSemSplitsTab";
import { CobrancasApagadasTab } from "@/components/TodasCobrancas/CobrancasApagadasTab";
import { BulkInsercaoCedrusCobrancasModal } from "@/components/TodasCobrancas/BulkInsercaoCedrusCobrancasModal";
import { useTodasCobrancasComFiltros, TodasCobrancasFilters } from "@/hooks/useTodasCobrancas";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { getStatusConfig, STATUS_CONFIG } from "@/utils/statusMapping";
import { toast } from "@/hooks/use-toast";
import { exportCobrancasToExcel } from "@/utils/exportToExcel";
import { exportCobrancasPDF, ExportPDFOptions } from "@/utils/exportCobrancasPDF";
import { ExportPDFDialog } from "@/components/TodasCobrancas/ExportPDFDialog";
import { Search, Download, RefreshCw, Receipt, Clock, Check, AlertTriangle, ArrowDownLeft, TableIcon, BarChart3, Banknote, Edit, X, FileSpreadsheet, FileText as FileTextIcon, Trash2, Unlink, Upload, Ban, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { BulkCancelamentoModal } from "@/components/TodasCobrancas/BulkCancelamentoModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { formatDateFromDatabase } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useGestaoSplitsScreenPermissions } from "@/hooks/useGestaoSplitsScreenPermissions";
import logo from "@/assets/logo-superavit.png";

export default function TodasCobrancas() {
  const { user } = useAuth();
  const { data: permissions } = useGestaoSplitsScreenPermissions(user?.id, 'todas-cobrancas');
  const canUpdate = permissions?.canUpdate ?? false;

  // Estado de filtros
  const [filters, setFilters] = useState<TodasCobrancasFilters>({
    nomes: [],
    unidades: [],
    formasPagamento: [],
    statusList: [],
    statusCedrusList: [],
    projetos: [],
    searchTerm: '',
    dataCriacaoRange: undefined,
    dataVencimentoRange: undefined,
    dataCreditoRange: undefined
  });

  const [showAllData, setShowAllData] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [useDescontoValor, setUseDescontoValor] = useState(false);
  const [isExportPDFOpen, setIsExportPDFOpen] = useState(false);
  const [isBulkCedrusOpen, setIsBulkCedrusOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const navigate = useNavigate();

  // Buscar dados com filtros
  const { data: cobrancas, isLoading, filterOptions, metrics } = useTodasCobrancasComFiltros(filters);

  // Ordenação
  const { sortedData, requestSort, getSortIcon } = useSortableTable(cobrancas || []);

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

  // Função para calcular valor com desconto de pontualidade
  const calcularValorComDesconto = (item: any): number => {
    const valorBase = Number(item.valor) || 0;
    if (!item.desconto_pontualidade) return valorBase;
    
    try {
      const desconto = JSON.parse(item.desconto_pontualidade);
      if (desconto.type === 'FIXED') {
        return Math.max(0, valorBase - Number(desconto.value));
      } else if (desconto.type === 'PERCENTAGE') {
        return Math.max(0, valorBase * (1 - Number(desconto.value) / 100));
      }
      return valorBase;
    } catch {
      return valorBase;
    }
  };

  // Função para obter o valor considerando o toggle
  const getValorExibicao = (item: any): number => {
    if (useDescontoValor) {
      return calcularValorComDesconto(item);
    }
    return Number(item.valor) || 0;
  };

  // Total geral dos dados filtrados
  const totalGeral = useMemo(() => {
    return (cobrancas || []).reduce((sum, item) => sum + getValorExibicao(item), 0);
  }, [cobrancas, useDescontoValor]);

  // Função auxiliar para calcular valor com desconto (dentro do useMemo)
  const calcularValorComDescontoLocal = (item: any): number => {
    const valorBase = Number(item.valor) || 0;
    if (!item.desconto_pontualidade) return valorBase;
    
    try {
      const desconto = JSON.parse(item.desconto_pontualidade);
      if (desconto.type === 'FIXED') {
        return Math.max(0, valorBase - Number(desconto.value));
      } else if (desconto.type === 'PERCENTAGE') {
        return Math.max(0, valorBase * (1 - Number(desconto.value) / 100));
      }
      return valorBase;
    } catch {
      return valorBase;
    }
  };

  // Métricas recalculadas com base no toggle de desconto
  const metricsAjustadas = useMemo(() => {
    if (!cobrancas) return metrics;
    
    // Sempre recalcular para usar o valor correto baseado no toggle
    const statusPositivos = ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED', 'ANTICIPATED'];
    const statusPendentes = ['PENDING', 'CREATED', 'AWAITING_RISK_ANALYSIS', 'AUTHORIZED'];
    const statusVencidos = ['OVERDUE'];
    const recebidosSuperavit = cobrancas.filter(d => d.status === 'RECEIVED_IN_CASH' && d.status_cedrus === 'N');
    
    // Função local para obter o valor considerando o toggle
    const obterValor = (item: any): number => {
      if (useDescontoValor) {
        return calcularValorComDescontoLocal(item);
      }
      return Number(item.valor) || 0;
    };
    
    return {
      ...metrics,
      valorTotal: cobrancas.reduce((sum, d) => sum + obterValor(d), 0),
      valorRecebido: cobrancas
        .filter(d => statusPositivos.includes(d.status || ''))
        .reduce((sum, d) => sum + obterValor(d), 0),
      valorPendente: cobrancas
        .filter(d => statusPendentes.includes(d.status || ''))
        .reduce((sum, d) => sum + obterValor(d), 0),
      valorVencido: cobrancas
        .filter(d => statusVencidos.includes(d.status || ''))
        .reduce((sum, d) => sum + obterValor(d), 0),
      valorRecebidoSuperavit: recebidosSuperavit.reduce((sum, d) => sum + obterValor(d), 0)
    };
  }, [cobrancas, metrics, useDescontoValor]);

  // Funções de formatação
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

  // Dados para modal
  const selectedRegistro = useMemo(() => {
    if (!selectedDetailId) return null;
    return cobrancas?.find(v => v.Identificador === selectedDetailId) || null;
  }, [selectedDetailId, cobrancas]);

  // Opções de status para o filtro (usando labels traduzidos)
  const statusOptionsWithLabels = useMemo(() => {
    return filterOptions.statusList.map(status => {
      const config = getStatusConfig(status);
      return { value: status, label: config.label };
    });
  }, [filterOptions.statusList]);

  // Labels traduzidos para exibição no filtro
  const statusLabels = useMemo(() => statusOptionsWithLabels.map(s => s.label), [statusOptionsWithLabels]);

  // Converter labels selecionados de volta para valores originais
  const labelsToValues = (labels: string[]) => {
    return labels.map(label => {
      const found = statusOptionsWithLabels.find(s => s.label === label);
      return found?.value || label;
    });
  };

  // Converter valores para labels para exibição
  const valuesToLabels = (values: string[]) => {
    return values.map(value => {
      const found = statusOptionsWithLabels.find(s => s.value === value);
      return found?.label || value;
    });
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setFilters({
      nomes: [],
      unidades: [],
      formasPagamento: [],
      statusList: [],
      statusCedrusList: [],
      projetos: [],
      searchTerm: '',
      dataCriacaoRange: undefined,
      dataVencimentoRange: undefined,
      dataCreditoRange: undefined
    });
    setShowAllData(false);
    toast({
      title: "Filtros limpos",
      description: "Todos os filtros foram removidos"
    });
  };

  // Seleção em lote
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayData.map(item => item.Identificador));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkEditSuccess = () => {
    setSelectedIds([]);
  };

  const isAllSelected = displayData.length > 0 && selectedIds.length === displayData.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < displayData.length;

  // Mapeamento de labels para status Cedrus
  const STATUS_CEDRUS_LABELS: Record<string, string> = {
    'A': 'Aberto',
    'C': 'Cancelado', 
    'N': 'Negociado'
  };

  // Carregar todos os dados
  const handleLoadAll = () => {
    setShowAllData(true);
    setPageSize(sortedData.length);
    toast({
      title: "Todos os dados carregados",
      description: `${cobrancas?.length || 0} cobranças carregadas`
    });
  };

  // Handler para filtro de data do Analytics
  const handleAnalyticsDateFilter = (dateRange: { from?: Date; to?: Date }) => {
    setFilters({ ...filters, dataVencimentoRange: dateRange });
  };

  return (
    <div className="container mx-auto mobile-container py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center space-y-2 mb-4 sm:mb-6">
        <img src={logo} alt="Superávit Logo" className="h-12 sm:h-16 object-contain" />
        <h1 className="mobile-heading font-bold text-center">TODAS AS COBRANÇAS</h1>
      </div>


      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{metricsAjustadas.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-500/10">
                <Clock className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-bold">{metricsAjustadas.pendentes}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(metricsAjustadas.valorPendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recebidos</p>
                <p className="text-lg font-bold">{metricsAjustadas.recebidos}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(metricsAjustadas.valorRecebido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencidos</p>
                <p className="text-lg font-bold">{metricsAjustadas.vencidos}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(metricsAjustadas.valorVencido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <ArrowDownLeft className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estornados</p>
                <p className="text-lg font-bold">{metricsAjustadas.estornados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-600/10">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rec. Superavit</p>
                <p className="text-lg font-bold">{metricsAjustadas.recebidosSuperavit}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(metricsAjustadas.valorRecebidoSuperavit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Abas */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="sem-splits" className="flex items-center gap-2">
            <Unlink className="h-4 w-4" />
            <span className="hidden sm:inline">Sem Splits</span>
          </TabsTrigger>
          <TabsTrigger value="apagadas" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Apagadas</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba de Dados */}
        <TabsContent value="dados" className="space-y-4 mt-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="mobile-card-padding space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                <MultiSelectFilter
                  title="Nome"
                  options={filterOptions.nomes}
                  selectedValues={filters.nomes || []}
                  onSelectionChange={(values) => setFilters({...filters, nomes: values})}
                  placeholder="Selecionar nomes..."
                />

                <MultiSelectFilter
                  title="Empresa"
                  options={filterOptions.unidades}
                  selectedValues={filters.unidades || []}
                  onSelectionChange={(values) => setFilters({...filters, unidades: values})}
                  placeholder="Selecionar empresas..."
                />

                <MultiSelectFilter
                  title="Status (Asaas)"
                  options={statusLabels}
                  selectedValues={valuesToLabels(filters.statusList || [])}
                  onSelectionChange={(labels) => setFilters({...filters, statusList: labelsToValues(labels)})}
                  placeholder="Selecionar status..."
                />

                {/* Filtro de Status Cedrus - aparece apenas quando OVERDUE está selecionado */}
                {filters.statusList?.includes('OVERDUE') && filterOptions.statusCedrusList && filterOptions.statusCedrusList.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Status da Cobrança (Cedrus)</Label>
                    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30">
                      {filterOptions.statusCedrusList.map((status) => {
                        const isSelected = filters.statusCedrusList?.includes(status);
                        return (
                          <Button
                            key={status}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const current = filters.statusCedrusList || [];
                              const newList = isSelected 
                                ? current.filter(s => s !== status)
                                : [...current, status];
                              setFilters({...filters, statusCedrusList: newList});
                            }}
                          >
                            {STATUS_CEDRUS_LABELS[status] || status}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <MultiSelectFilter
                  title="Forma de Pagamento"
                  options={filterOptions.formasPagamento}
                  selectedValues={filters.formasPagamento || []}
                  onSelectionChange={(values) => setFilters({...filters, formasPagamento: values})}
                  placeholder="Selecionar formas..."
                />

                <MultiSelectFilter
                  title="Projeto"
                  options={filterOptions.projetos}
                  selectedValues={filters.projetos || []}
                  onSelectionChange={(values) => setFilters({...filters, projetos: values})}
                  placeholder="Selecionar projetos..."
                />

                <DateFilterSelect
                  label="Data de Criação"
                  value={filters.dataCriacaoRange}
                  onChange={(value) => setFilters({...filters, dataCriacaoRange: value})}
                />

                <DateFilterSelect
                  label="Data de Vencimento"
                  value={filters.dataVencimentoRange}
                  onChange={(value) => setFilters({...filters, dataVencimentoRange: value})}
                />

                <DateFilterSelect
                  label="Data de Crédito"
                  value={filters.dataCreditoRange}
                  onChange={(value) => setFilters({...filters, dataCreditoRange: value})}
                />
              </div>

              {/* Campo de busca livre */}
              <div className="space-y-2">
                <Label className="mobile-text-sm">Buscar por Nome, Descrição ou ID</Label>
                <Input
                  placeholder="Digite para buscar..."
                  value={filters.searchTerm || ''}
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
                    const result = exportCobrancasToExcel(cobrancas || [], filters);
                    if (result.success) {
                      toast({
                        title: "Excel exportado",
                        description: `${cobrancas?.length || 0} cobranças exportadas com sucesso`
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
                  disabled={!cobrancas || cobrancas.length === 0}
                  className="mobile-button"
                >
                  <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </Button>
                <Button
                  onClick={() => setIsExportPDFOpen(true)}
                  variant="outline"
                  size="sm"
                  disabled={!cobrancas || cobrancas.length === 0}
                  className="mobile-button"
                >
                  <FileTextIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                </Button>
                <Button
                  variant={useDescontoValor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseDescontoValor(!useDescontoValor)}
                  className="mobile-button flex items-center gap-1"
                >
                  {useDescontoValor ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Valor c/ Desconto</span>
                    </>
                  ) : (
                    <span className="hidden sm:inline">Valor Cheio → c/ Desconto</span>
                  )}
                  {!useDescontoValor && <span className="sm:hidden">Desc.</span>}
                </Button>
                
                {/* Botões de edição em lote */}
                {selectedIds.length > 0 && (
                  <>
                    <Button 
                      onClick={() => setIsBulkEditOpen(true)}
                      size="sm"
                      className="mobile-button"
                    >
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Editar</span> ({selectedIds.length})
                    </Button>
                    <Button 
                      onClick={() => setIsBulkCedrusOpen(true)}
                      size="sm"
                      variant="secondary"
                      className="mobile-button"
                    >
                      <Upload className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Inserir no Cedrus</span> ({selectedIds.length})
                    </Button>
                    <Button 
                      onClick={() => setShowCancelModal(true)}
                      size="sm"
                      variant="destructive"
                      className="mobile-button"
                    >
                      <Ban className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Cancelar Cobranças</span> ({selectedIds.length})
                    </Button>
                    <Button 
                      onClick={() => setSelectedIds([])}
                      variant="ghost"
                      size="sm"
                      className="mobile-button"
                    >
                      <X className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Limpar seleção</span>
                    </Button>
                  </>
                )}
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
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                              aria-label="Selecionar todos"
                              className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                            />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm w-[30%]"
                            onClick={() => requestSort('descricao')}
                          >
                            Descrição {getSortIcon('descricao')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm w-[22%]"
                            onClick={() => requestSort('nome')}
                          >
                            Nome {getSortIcon('nome')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap w-[14%]"
                            onClick={() => requestSort('credor_cedrus')}
                          >
                            Empresa {getSortIcon('credor_cedrus')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap w-[14%]"
                            onClick={() => requestSort('vencimento')}
                          >
                            Vencimento {getSortIcon('vencimento')}
                          </TableHead>
                          <TableHead 
                            className="text-right cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap w-[12%]"
                            onClick={() => requestSort('valor')}
                          >
                            {useDescontoValor ? 'Valor c/ Desc.' : 'Valor'} {getSortIcon('valor')}
                          </TableHead>
                          
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhuma cobrança encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayData.map((item) => {
                            const isOverdueNegociado = item.status === 'OVERDUE' && item.status_cedrus === 'N';
                            const isReceivedSuperavit = item.status === 'RECEIVED_IN_CASH' && item.status_cedrus === 'N';
                            const isSelected = selectedIds.includes(item.Identificador);
                            
                            // Determinar classe de destaque da linha
                            let rowHighlight = '';
                            if (isSelected) {
                              rowHighlight = 'bg-primary/10';
                            } else if (isOverdueNegociado) {
                              rowHighlight = 'bg-purple-50 dark:bg-purple-950/30 border-l-4 border-l-purple-500';
                            } else if (isReceivedSuperavit) {
                              rowHighlight = 'bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500';
                            }
                            
                            return (
                              <TableRow 
                                key={item.Identificador}
                                className={rowHighlight}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleSelectItem(item.Identificador, checked === true)}
                                    aria-label={`Selecionar ${item.nome}`}
                                  />
                                </TableCell>
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
                                <TableCell 
                                  className="cursor-pointer text-primary hover:underline mobile-text-sm whitespace-nowrap"
                                  onClick={() => setFilters({...filters, unidades: [item.credor_cedrus || '']})}
                                >
                                  {item.credor_cedrus || "-"}
                                </TableCell>
                                <TableCell className="mobile-text-sm">
                                  <div className="whitespace-nowrap">{formatDate(item.vencimento)}</div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <StatusBadge status={item.status} size="sm" />
                                    {isOverdueNegociado && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-medium">
                                        Negociado
                                      </span>
                                    )}
                                    {isReceivedSuperavit && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium">
                                        Superavit
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium mobile-text-sm whitespace-nowrap">
                                  <div>{formatCurrency(getValorExibicao(item))}</div>
                                  <div className="text-xs text-muted-foreground">{item.forma_pagamento || "-"}</div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                      {displayData.length > 0 && (
                        <TableFooter>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={5} className="text-right font-bold">
                              Total ({cobrancas?.length || 0} cobranças):
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
        </TabsContent>

        {/* Aba de Analytics */}
        <TabsContent value="analytics" className="mt-4">
          <CobrancasAnalytics 
            cobrancas={cobrancas || []} 
            onDateFilterChange={handleAnalyticsDateFilter}
            useDescontoValor={useDescontoValor}
            onToggleDesconto={() => setUseDescontoValor(!useDescontoValor)}
          />
        </TabsContent>

        {/* Aba de Cobranças Sem Splits */}
        <TabsContent value="sem-splits" className="mt-4">
          <CobrancasSemSplitsTab />
        </TabsContent>

        {/* Aba de Cobranças Apagadas */}
        <TabsContent value="apagadas" className="mt-4">
          <CobrancasApagadasTab />
        </TabsContent>

      </Tabs>

      {/* Modal de Detalhes */}
      <DetalhesModal
        isOpen={!!selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
        registro={selectedRegistro}
        canUpdate={canUpdate}
      />

      {/* Modal de Edição em Lote */}
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
        empresas={filterOptions.unidades}
        onSuccess={handleBulkEditSuccess}
      />
      <ExportPDFDialog
        open={isExportPDFOpen}
        onOpenChange={setIsExportPDFOpen}
        onConfirm={async (options) => {
          try {
            await exportCobrancasPDF(cobrancas || [], options);
            toast({ title: "PDF exportado", description: "Relatório gerado com sucesso" });
          } catch {
            toast({ title: "Erro", description: "Falha ao gerar PDF", variant: "destructive" });
          }
        }}
      />

      {/* Modal de Inserção em Massa no Cedrus */}
      <BulkInsercaoCedrusCobrancasModal
        open={isBulkCedrusOpen}
        onOpenChange={setIsBulkCedrusOpen}
        cobrancas={(cobrancas || []).filter(c => selectedIds.includes(c.Identificador))}
        onComplete={() => setSelectedIds([])}
      />

      {/* Modal de Cancelamento em Massa */}
      <BulkCancelamentoModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        cobrancas={(cobrancas || []).filter(c => selectedIds.includes(c.Identificador))}
        onComplete={() => setSelectedIds([])}
      />
    </div>
  );
}
