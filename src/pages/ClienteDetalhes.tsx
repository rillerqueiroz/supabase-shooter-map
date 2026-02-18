
import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useGestaoDisparos } from "@/hooks/useGestaoDisparos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, MessageSquare, Calendar, Clock, Download, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { exportToPDF, exportTableToPDF } from "@/utils/exportToPDF";
import { useToast } from "@/hooks/use-toast";
import { formatDateFromDatabase, parseDateFromDatabase } from "@/lib/utils";

const ClienteDetalhes = () => {
  const { toast } = useToast();
  const { nomeCliente } = useParams<{ nomeCliente: string }>();
  const { data: disparos, isLoading } = useGestaoDisparos();
  const [sortField, setSortField] = React.useState<string>('');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  // Filtrar disparos do cliente específico
  const clienteDisparos = useMemo(() => {
    if (!disparos || !nomeCliente) {
      console.log('⚠️ Sem dados ou nome do cliente:', { disparos: disparos?.length, nomeCliente });
      return [];
    }
    
    const decodedName = decodeURIComponent(nomeCliente);
    console.log('🔍 Filtrando disparos para cliente:', decodedName);
    
    const filtered = disparos.filter(disparo => disparo.cliente === decodedName);
    console.log(`📋 Disparos encontrados para ${decodedName}:`, filtered.length);
    console.log('📅 Datas dos disparos:', filtered.map(d => ({
      id: d.id,
      data_disparo: d.data_disparo,
      created_at: d.created_at
    })));
    
    return filtered;
  }, [disparos, nomeCliente]);

  // Ordenação
  const sortedDisparos = useMemo(() => {
    if (!sortField) return clienteDisparos;

    return [...clienteDisparos].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clienteDisparos, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF('cliente-detalhes-content', {
        filename: `cliente_${decodeURIComponent(nomeCliente || '')}_detalhes`,
        title: `Detalhes do Cliente - ${decodeURIComponent(nomeCliente || '')}`
      });
      toast({
        title: "PDF exportado com sucesso!",
        description: "O arquivo foi baixado para seu computador"
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o arquivo PDF",
        variant: "destructive"
      });
    }
  };

  // Estatísticas do cliente
  const clienteStats = useMemo(() => {
    if (!clienteDisparos.length) return null;

    const tiposUnicos = new Set(clienteDisparos.map(d => d.tipo_disparo).filter(Boolean));
    const devedoresUnicos = new Set(clienteDisparos.map(d => d.devedor).filter(Boolean));
    
    return {
      totalDisparos: clienteDisparos.length,
      tiposDisparo: tiposUnicos.size,
      devedores: devedoresUnicos.size,
      primeiroDisparo: clienteDisparos.reduce((earliest, disparo) => {
        const date = parseDateFromDatabase(disparo.data_disparo) || parseDateFromDatabase(disparo.created_at) || new Date();
        return date < earliest ? date : earliest;
      }, new Date()),
      ultimoDisparo: clienteDisparos.reduce((latest, disparo) => {
        const date = parseDateFromDatabase(disparo.data_disparo) || parseDateFromDatabase(disparo.created_at) || new Date(0);
        return date > latest ? date : latest;
      }, new Date(0))
    };
  }, [clienteDisparos]);

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
  } = usePagination({ data: sortedDisparos, initialPageSize: 50 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!clienteStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/relatorio-cliente">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Cliente não encontrado</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Não foram encontrados registros para o cliente: {decodeURIComponent(nomeCliente || '')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="cliente-detalhes-content" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/relatorio-cliente">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              Detalhes do Cliente: {decodeURIComponent(nomeCliente || '')}
            </h1>
          </div>
        </div>
        
        <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Resumo Estatístico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{clienteStats.totalDisparos}</div>
                <p className="text-xs text-muted-foreground">Total de Disparos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{clienteStats.tiposDisparo}</div>
                <p className="text-xs text-muted-foreground">Tipos de Disparo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{clienteStats.devedores}</div>
                <p className="text-xs text-muted-foreground">Devedores Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-bold">
                  {clienteStats.primeiroDisparo.toLocaleDateString('pt-BR')}
                </div>
                <p className="text-xs text-muted-foreground">Primeiro Disparo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Disparos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Disparos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('devedor')}
                    >
                      Devedor <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('data_disparo')}
                    >
                      Data <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('hora_disparo')}
                    >
                      Hora <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('tipo_disparo')}
                    >
                      Tipo de Disparo <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('numero_enviado')}
                    >
                      Número Enviado <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((disparo, index) => (
                  <TableRow key={disparo.id || index}>
                    <TableCell className="font-medium">
                      {disparo.devedor || '-'}
                    </TableCell>
                    <TableCell>
                      {formatDateFromDatabase(disparo.data_disparo)}
                    </TableCell>
                    <TableCell>{disparo.hora_disparo || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const tipo = disparo.tipo_disparo || '-';
                        let badgeColor = "bg-muted text-muted-foreground";
                        
                        if (tipo.toLowerCase().includes('manual')) {
                          badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                        } else if (tipo.toLowerCase().includes('automático') || tipo.toLowerCase().includes('automatico')) {
                          badgeColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                        } else if (tipo.toLowerCase().includes('urgente')) {
                          badgeColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                        }
                        
                        return (
                          <Badge className={`text-xs ${badgeColor}`}>
                            {tipo}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{disparo.numero_enviado || '-'}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="relative">
                        <div 
                          className={`${expandedRows.has(index) ? '' : 'truncate'}`}
                          title={disparo.mensagem || ''}
                        >
                          {disparo.mensagem || '-'}
                        </div>
                        {(disparo.mensagem || '').length > 100 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary hover:bg-transparent"
                            onClick={() => {
                              const newExpanded = new Set(expandedRows);
                              if (newExpanded.has(index)) {
                                newExpanded.delete(index);
                              } else {
                                newExpanded.add(index);
                              }
                              setExpandedRows(newExpanded);
                            }}
                          >
                            {expandedRows.has(index) ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Mostrar menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Exibir mais
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DataTablePagination
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            pageCount={pageCount}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            gotoPage={gotoPage}
            nextPage={nextPage}
            previousPage={previousPage}
            setPageSize={setPageSize}
            totalItems={totalItems}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClienteDetalhes;
