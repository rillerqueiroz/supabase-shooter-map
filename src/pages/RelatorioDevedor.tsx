
import React, { useState, useMemo } from "react";
import { useGestaoDisparos } from "@/hooks/useGestaoDisparos";
import { FilterBar, FilterState } from "@/components/Dashboard/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportToPDF, exportTableToPDF } from "@/utils/exportToPDF";
import { exportToExcel } from "@/utils/exportToExcel";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, BarChart3, Download, FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { Link } from "react-router-dom";
import { DevedorDisparosModal } from "@/components/SetorSul/DevedorDisparosModal";

const RelatorioDevedor = () => {
  const { toast } = useToast();
  const { data: disparos, isLoading } = useGestaoDisparos();
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {}
  });
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedTiposDisparo, setSelectedTiposDisparo] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedDevedor, setSelectedDevedor] = useState<string>('');
  const [isDevedorModalOpen, setIsDevedorModalOpen] = useState(false);

  // Filtrar disparos primeiro por data
  const filteredDisparosByDate = useMemo(() => {
    if (!disparos) return [];
    
    return disparos.filter(disparo => {
      // Filtro de data - usando apenas data_disparo do Supabase
      if (filters.dateRange?.from || filters.dateRange?.to) {
        // Usar apenas a coluna data_disparo do Supabase
        if (!disparo.data_disparo) {
          return false; // Excluir registros sem data_disparo
        }
        
        // Converter data_disparo para Date
        const disparoDate = new Date(disparo.data_disparo);
        
        // Validar se a data é válida
        if (isNaN(disparoDate.getTime())) {
          console.warn('⚠️ Data inválida encontrada na data_disparo:', disparo.data_disparo);
          return false;
        }
        
        const disparoDateOnly = new Date(disparoDate.getFullYear(), disparoDate.getMonth(), disparoDate.getDate());
        
        if (filters.dateRange.from) {
          const fromDate = new Date(filters.dateRange.from.getFullYear(), filters.dateRange.from.getMonth(), filters.dateRange.from.getDate());
          if (disparoDateOnly < fromDate) {
            return false;
          }
        }
        
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to.getFullYear(), filters.dateRange.to.getMonth(), filters.dateRange.to.getDate());
          if (disparoDateOnly > toDate) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [disparos, filters.dateRange]);

  // Processar dados dos devedores - agrupados por nome
  const devedorStats = useMemo(() => {
    if (!filteredDisparosByDate.length) return [];
    
    // Agrupar por devedor
    const devedoresMap = new Map();
    
    filteredDisparosByDate.forEach(disparo => {
      const nomeDevedor = disparo.devedor || 'Devedor não informado';
      
      if (!devedoresMap.has(nomeDevedor)) {
        devedoresMap.set(nomeDevedor, {
          nome: nomeDevedor,
          quantidadeDisparos: 0,
          numeros: new Set(),
          tiposDisparo: new Set(),
          clientes: new Set(),
          ultimoDisparo: disparo.data_disparo || disparo.created_at
        });
      }
      
      const devedor = devedoresMap.get(nomeDevedor);
      devedor.quantidadeDisparos++;
      
      if (disparo.numero_enviado) {
        devedor.numeros.add(disparo.numero_enviado);
      }
      if (disparo.tipo_disparo) {
        devedor.tiposDisparo.add(disparo.tipo_disparo);
      }
      if (disparo.cliente) {
        devedor.clientes.add(disparo.cliente);
      }
    });
    
    // Converter Sets para arrays e formatar
    return Array.from(devedoresMap.values()).map(devedor => ({
      nome: devedor.nome,
      quantidadeDisparos: devedor.quantidadeDisparos,
      numeros: Array.from(devedor.numeros),
      tiposDisparo: Array.from(devedor.tiposDisparo),
      clientes: Array.from(devedor.clientes),
      ultimoDisparo: devedor.ultimoDisparo
    }));
  }, [filteredDisparosByDate]);

  // Aplicar filtros
  const filteredDevedores = useMemo(() => {
    return devedorStats.filter(devedor => {
      // Filtro de clientes selecionados
      if (selectedClientes.length > 0) {
        const hasSelectedCliente = devedor.clientes.some((c: string) => selectedClientes.includes(c));
        if (!hasSelectedCliente) return false;
      }
      
      // Filtro de tipos de disparo
      if (selectedTiposDisparo.length > 0) {
        const hasSelectedTipo = devedor.tiposDisparo.some((t: string) => selectedTiposDisparo.includes(t));
        if (!hasSelectedTipo) return false;
      }
      
      return true;
    });
  }, [devedorStats, selectedClientes, selectedTiposDisparo]);

  // Ordenação
  const sortedDevedores = useMemo(() => {
    const sorted = [...filteredDevedores];
    
    if (!sortField) {
      // Ordenação padrão: maior quantidade de disparos primeiro
      return sorted.sort((a, b) => b.quantidadeDisparos - a.quantidadeDisparos);
    }

    return sorted.sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];

      // Ordenação numérica para quantidade
      if (sortField === 'quantidadeDisparos') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Ordenação string para outros campos
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDevedores, sortField, sortDirection]);

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
  } = usePagination({ data: sortedDevedores, initialPageSize: 50 });

  // Listas para filtros
  const clienteOptions = useMemo(() => {
    if (!disparos) return [];
    const clientes = [...new Set(disparos.map(d => d.cliente).filter(Boolean))];
    return clientes.sort();
  }, [disparos]);

  const tiposDisparoOptions = useMemo(() => {
    if (!disparos) return [];
    const tipos = [...new Set(disparos.map(d => d.tipo_disparo).filter(Boolean))];
    return tipos.sort();
  }, [disparos]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Dados para gráfico - Top 10 devedores
  const chartData = useMemo(() => {
    return sortedDevedores
      .slice(0, 10)
      .map(devedor => ({ 
        nome: devedor.nome, 
        total: devedor.quantidadeDisparos 
      }));
  }, [sortedDevedores]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('relatorio-devedor-content', {
        filename: 'relatorio_devedores_whatsapp',
        title: 'Relatório por Devedor - Gestão de Disparos WhatsApp'
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

  const handleExportTable = () => {
    try {
      exportTableToPDF(
        sortedDevedores,
        ['Devedor', 'Cliente', 'Total Disparos', 'Tipo de Disparo'],
        'Relatório de Devedores'
      );
      toast({
        title: "Tabela exportada com sucesso!",
        description: "O arquivo foi baixado para seu computador"
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar tabela",
        description: "Não foi possível gerar o arquivo PDF",
        variant: "destructive"
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const formattedData = sortedDevedores.map(devedor => ({
        'Devedor': devedor.nome,
        'Quantidade de Disparos': devedor.quantidadeDisparos,
        'Números': devedor.numeros.join(', '),
        'Tipos de Disparo': devedor.tiposDisparo.join(', '),
        'Clientes': devedor.clientes.join(', ')
      }));

      exportToExcel({
        filename: `relatorio-devedores-${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Devedores',
        data: formattedData
      });

      toast({
        title: "Excel exportado com sucesso!",
        description: "O arquivo foi baixado para seu computador"
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar Excel",
        description: "Não foi possível gerar o arquivo Excel",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="relatorio-devedor-content" className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <UserCheck className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Relatório por Devedor</h1>
      </div>

      <FilterBar 
        filters={filters}
        onFiltersChange={setFilters}
        onExportPDF={handleExportPDF}
      />

      {/* Filtros específicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Filtros Específicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MultiSelectFilter
              title="Cliente"
              options={clienteOptions}
              selectedValues={selectedClientes}
              onSelectionChange={setSelectedClientes}
              placeholder="Selecionar clientes..."
            />
            
            <MultiSelectFilter
              title="Tipo de Disparo"
              options={tiposDisparoOptions}
              selectedValues={selectedTiposDisparo}
              onSelectionChange={setSelectedTiposDisparo}
              placeholder="Selecionar tipos..."
            />
            
            <div className="flex items-end gap-2">
              <Button 
                onClick={handleExportTable}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Button 
                onClick={handleExportExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sortedDevedores.reduce((acc, d) => acc + d.quantidadeDisparos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de Disparos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sortedDevedores.length}
            </div>
            <p className="text-xs text-muted-foreground">Devedores Únicos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(sortedDevedores.flatMap(d => d.tiposDisparo)).size}
            </div>
            <p className="text-xs text-muted-foreground">Tipos de Disparo Únicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 10 Devedores por Disparos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="nome" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
               <Tooltip />
               <Bar dataKey="total" fill="#3b82f6" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Disparos por Devedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('nome')}
                      className="h-auto p-0 font-semibold"
                    >
                      Devedor
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('quantidadeDisparos')}
                      className="h-auto p-0 font-semibold"
                    >
                      Quantidade de Disparos
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Número(s) do Devedor</TableHead>
                  <TableHead>Tipos de Disparo</TableHead>
                  <TableHead>Cliente(s)</TableHead>
                </TableRow>
               </TableHeader>
               <TableBody>
                 {paginatedData.map((devedor, index) => (
                   <TableRow key={`${devedor.nome}-${index}`}>
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary hover:underline"
                          onClick={() => {
                            setSelectedDevedor(devedor.nome);
                            setIsDevedorModalOpen(true);
                          }}
                        >
                          {devedor.nome}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-lg text-primary">
                          {devedor.quantidadeDisparos}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {devedor.numeros.slice(0, 3).map((num: string, idx: number) => (
                            <span key={idx} className="font-mono text-sm">{num}</span>
                          ))}
                          {devedor.numeros.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{devedor.numeros.length - 3} mais
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {devedor.tiposDisparo.map((tipo: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tipo}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {devedor.clientes.slice(0, 2).join(', ')}
                          {devedor.clientes.length > 2 && (
                            <span className="text-muted-foreground"> +{devedor.clientes.length - 2}</span>
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

      {/* Modal de Histórico do Devedor */}
      <DevedorDisparosModal
        isOpen={isDevedorModalOpen}
        onClose={() => setIsDevedorModalOpen(false)}
        devedorNome={selectedDevedor}
      />
    </div>
  );
};

export default RelatorioDevedor;
