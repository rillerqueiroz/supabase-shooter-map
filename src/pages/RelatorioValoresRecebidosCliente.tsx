import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import { MetricsCards } from "@/components/ValoresRecebidos/MetricsCards";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DetalhesModal } from "@/components/ValoresRecebidos/DetalhesModal";
import { useValoresRecebidosComFiltros, ValoresRecebidosFilters, ValorRecebido } from "@/hooks/useValoresRecebidosAsaas";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { exportValoresRecebidosToExcel, exportValoresRecebidosToPDF } from "@/utils/exportValoresRecebidos";
import { toast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth } from "date-fns";
import { Search, Download, FileSpreadsheet, FileText, RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDateFromDatabase } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useGestaoSplitsScreenPermissions } from "@/hooks/useGestaoSplitsScreenPermissions";
import logo from "@/assets/logo-superavit.png";

export default function RelatorioValoresRecebidosCliente() {
  const [searchParams] = useSearchParams();
  const nomeCliente = searchParams.get('nome') || '';
  const navigate = useNavigate();

  // Auth e Permissões
  const { user } = useAuth();
  const { data: permissions } = useGestaoSplitsScreenPermissions(user?.id, 'valores-recebidos');
  const canUpdate = permissions?.canUpdate ?? false;

  // Estado de filtros (iniciar com "Este mês" e nome do cliente)
  const [filters, setFilters] = useState<ValoresRecebidosFilters>({
    dateRange: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    },
    nomes: nomeCliente ? [nomeCliente] : [],
    unidades: [],
    formasPagamento: [],
    meiosPagamento: [],
    searchTerm: ''
  });

  // Atualizar filtro quando o nome mudar
  useEffect(() => {
    if (nomeCliente) {
      setFilters(prev => ({
        ...prev,
        nomes: [nomeCliente]
      }));
    }
  }, [nomeCliente]);

  // Estado para carregar todos os dados
  const [showAllData, setShowAllData] = useState(false);
  
  // Estado para modal de detalhes
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Buscar dados com filtros
  const { data: valores, isLoading, filterOptions } = useValoresRecebidosComFiltros(filters);

  // Ordenação
  const { sortedData, requestSort, getSortIcon } = useSortableTable(valores || []);

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

  // Dados finais para exibir
  const displayData = showAllData ? sortedData : paginatedData;

  // Total geral
  const totalGeral = useMemo(() => {
    return (valores || []).reduce((sum, item) => sum + (item.valor || 0), 0);
  }, [valores]);

  // Funções de formatação
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

  const getMeioPagamento = (status: string | null) => {
    if (!status) return "-";
    if (status === "RECEIVED") return "Normal";
    if (status === "RECEIVED_IN_CASH") return "Excepcional";
    return status;
  };

  // Dados para modal
  const selectedRegistro = useMemo(() => {
    if (!selectedDetailId) return null;
    return valores?.find(v => v.Identificador === selectedDetailId) || null;
  }, [selectedDetailId, valores]);

  // Limpar filtros
  const handleClearFilters = () => {
    setFilters({
      dateRange: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      },
      nomes: nomeCliente ? [nomeCliente] : [],
      unidades: [],
      formasPagamento: [],
      meiosPagamento: [],
      searchTerm: ''
    });
    setShowAllData(false);
    toast({
      title: "Filtros limpos",
      description: "Os filtros foram resetados para 'Este mês'"
    });
  };

  // Carregar todos os dados
  const handleLoadAll = () => {
    setShowAllData(true);
    setPageSize(sortedData.length);
    toast({
      title: "Todos os dados carregados",
      description: `${valores?.length || 0} registros carregados`
    });
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (!valores || valores.length === 0) {
      toast({
        title: "Erro",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    const result = exportValoresRecebidosToExcel(valores, filters);
    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Arquivo Excel exportado com sucesso"
      });
    } else {
      toast({
        title: "Erro",
        description: "Falha ao exportar para Excel",
        variant: "destructive"
      });
    }
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!valores || valores.length === 0) {
      toast({
        title: "Erro",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Gerando PDF",
      description: "Aguarde um momento..."
    });

    const result = await exportValoresRecebidosToPDF(valores, filters, totalGeral);
    if (result.success) {
      toast({
        title: "Sucesso",
        description: "PDF exportado com sucesso"
      });
    } else {
      toast({
        title: "Erro",
        description: "Falha ao exportar PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header com Breadcrumb */}
      <div className="flex flex-col items-center space-y-2 mb-6">
        <img src={logo} alt="Superávit Logo" className="h-16 object-contain" />
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/relatorio-valores-recebidos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Relatório Geral
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-center">VALORES RECEBIDOS</h1>
        <p className="text-xl text-muted-foreground">Cliente: {nomeCliente}</p>
      </div>

      {/* Métricas */}
      <MetricsCards data={valores || []} />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Filtro Nome (pré-selecionado) */}
            <MultiSelectFilter
              title="Nome"
              options={filterOptions.nomes}
              selectedValues={filters.nomes || []}
              onSelectionChange={(values) => setFilters({...filters, nomes: values, dateRange: undefined})}
              placeholder="Selecionar nomes..."
            />

            {/* Filtro Empresa */}
            <MultiSelectFilter
              title="Empresa"
              options={filterOptions.unidades}
              selectedValues={filters.unidades || []}
              onSelectionChange={(values) => setFilters({...filters, unidades: values})}
              placeholder="Selecionar empresas..."
            />

            {/* Filtro Forma de Pagamento */}
            <MultiSelectFilter
              title="Forma de Pagamento"
              options={filterOptions.formasPagamento}
              selectedValues={filters.formasPagamento || []}
              onSelectionChange={(values) => setFilters({...filters, formasPagamento: values})}
              placeholder="Selecionar formas..."
            />

            {/* Filtro Meio de Pagamento */}
            <MultiSelectFilter
              title="Meio de Pagamento"
              options={filterOptions.meiosPagamento}
              selectedValues={filters.meiosPagamento || []}
              onSelectionChange={(values) => setFilters({...filters, meiosPagamento: values})}
              placeholder="Selecionar meios..."
            />

            {/* Filtro de Data */}
            <DateFilterSelect
              label="Data de Pagamento"
              value={filters.dateRange}
              onChange={(value) => setFilters({...filters, dateRange: value})}
            />
          </div>

          {/* Campo de busca livre */}
          <div className="space-y-2">
            <Label>Buscar por Nome ou Descrição</Label>
            <Input
              placeholder="Digite para buscar..."
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              className="max-w-md"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleClearFilters} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button 
              onClick={handleLoadAll} 
              variant="outline"
              disabled={showAllData}
            >
              <Download className="mr-2 h-4 w-4" />
              Carregar Todos
            </Button>
            <Button onClick={handleExportExcel} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('nome')}
                      >
                        Nome {getSortIcon('nome')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('descricao')}
                      >
                        Descrição {getSortIcon('descricao')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('unidade')}
                      >
                        Cliente {getSortIcon('unidade')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('data_pagamento')}
                      >
                        Data Pagamento {getSortIcon('data_pagamento')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('vencimento')}
                      >
                        Vencimento {getSortIcon('vencimento')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('forma_pagamento')}
                      >
                        Forma Pagamento {getSortIcon('forma_pagamento')}
                      </TableHead>
                      <TableHead className="font-bold">
                        Meio de Pagamento
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer font-bold hover:bg-muted/50"
                        onClick={() => requestSort('valor')}
                      >
                        Valor {getSortIcon('valor')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayData.map((item) => (
                        <TableRow key={item.Identificador}>
                <TableCell 
                  className="font-medium cursor-pointer text-primary hover:underline"
                  onClick={() => navigate(`/valores-recebidos-cliente?nome=${encodeURIComponent(item.nome || '')}`)}
                >
                  {item.nome || "-"}
                </TableCell>
                          <TableCell 
                            className="max-w-md cursor-pointer text-primary hover:underline"
                            onClick={() => setSelectedDetailId(item.Identificador)}
                          >
                            {item.descricao || "-"}
                          </TableCell>
                          <TableCell 
                            className="cursor-pointer text-primary hover:underline"
                            onClick={() => setFilters({...filters, unidades: [item.unidade || '']})}
                          >
                            {item.unidade || "-"}
                          </TableCell>
                          <TableCell>{formatDate(item.data_pagamento)}</TableCell>
                          <TableCell>{formatDate(item.vencimento)}</TableCell>
                          <TableCell>{item.forma_pagamento || "-"}</TableCell>
                          <TableCell>
                            <Badge className={item.status === "RECEIVED" ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600 text-black"}>
                              {getMeioPagamento(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.valor || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {displayData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="text-right font-bold">
                          Total Geral:
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
