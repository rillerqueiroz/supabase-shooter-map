
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
import { Building, BarChart3, Download, FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { Link } from "react-router-dom";

const RelatorioCliente = () => {
  const { toast } = useToast();
  const { data: disparos, isLoading } = useGestaoDisparos();
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {}
  });
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedTiposDisparo, setSelectedTiposDisparo] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Agrupar disparos filtrados por cliente
  const clienteStats = useMemo(() => {
    if (!filteredDisparosByDate) return [];

    const grouped = filteredDisparosByDate.reduce((acc, disparo) => {
      const cliente = disparo.cliente || 'Cliente não informado';
      
      if (!acc[cliente]) {
        acc[cliente] = {
          nome: cliente,
          totalDisparos: 0,
          tiposDisparo: new Set(),
          devedores: new Set(),
          primeiroDisparo: disparo.data_disparo || disparo.created_at
        };
      }

      acc[cliente].totalDisparos++;
      
      if (disparo.tipo_disparo) {
        acc[cliente].tiposDisparo.add(disparo.tipo_disparo);
      }

      if (disparo.devedor) {
        acc[cliente].devedores.add(disparo.devedor);
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((cliente: any) => ({
      ...cliente,
      tiposDisparoStr: Array.from(cliente.tiposDisparo).join(', '),
      totalDevedores: cliente.devedores.size
    }));
  }, [filteredDisparosByDate]);

  // Aplicar filtros
  const filteredClientes = useMemo(() => {
    return clienteStats.filter(cliente => {
      if (selectedClientes.length > 0 && !selectedClientes.includes(cliente.nome)) {
        return false;
      }
      
      if (selectedTiposDisparo.length > 0) {
        const clienteTipos = Array.from(cliente.tiposDisparo);
        if (!selectedTiposDisparo.some(tipo => clienteTipos.includes(tipo))) {
          return false;
        }
      }
      
      return true;
    });
  }, [clienteStats, selectedClientes, selectedTiposDisparo]);

  // Ordenação
  const sortedClientes = useMemo(() => {
    if (!sortField) return filteredClientes;

    return [...filteredClientes].sort((a, b) => {
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
  }, [filteredClientes, sortField, sortDirection]);

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
  } = usePagination({ data: sortedClientes, initialPageSize: 50 });

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

  // Dados para gráfico
  const chartData = useMemo(() => {
    return sortedClientes.slice(0, 10).map(cliente => ({
      nome: cliente.nome,
      total: cliente.totalDisparos
    }));
  }, [sortedClientes]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('relatorio-cliente-content', {
        filename: 'relatorio_clientes_whatsapp',
        title: 'Relatório por Cliente - Gestão de Disparos WhatsApp'
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
        sortedClientes,
        ['Cliente', 'Total Disparos', 'Devedores', 'Tipo de Disparo'],
        'Relatório de Clientes'
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
      const formattedData = sortedClientes.map(cliente => ({
        'Cliente': cliente.nome,
        'Total de Disparos': cliente.totalDisparos,
        'Total de Devedores': cliente.totalDevedores,
        'Tipos de Disparo': cliente.tiposDisparoStr
      }));

      exportToExcel({
        filename: `relatorio-clientes-${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Clientes',
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
    <div id="relatorio-cliente-content" className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Building className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Relatório por Cliente</h1>
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
            <div className="text-2xl font-bold">{sortedClientes.length}</div>
            <p className="text-xs text-muted-foreground">Total de Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sortedClientes.reduce((sum, c) => sum + c.totalDisparos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de Disparos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sortedClientes.reduce((sum, c) => sum + c.totalDevedores, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de Devedores</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 10 Clientes por Disparos
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
          <CardTitle>Detalhamento por Cliente</CardTitle>
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
                      Cliente
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('totalDisparos')}
                      className="h-auto p-0 font-semibold"
                    >
                      Total Disparos
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('totalDevedores')}
                      className="h-auto p-0 font-semibold"
                    >
                      Devedores
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Tipo de Disparo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((cliente, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/cliente-detalhes/${encodeURIComponent(cliente.nome)}`}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        {cliente.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{cliente.totalDisparos}</TableCell>
                    <TableCell className="text-center">{cliente.totalDevedores}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(cliente.tiposDisparo).map((tipo: string) => (
                          <Badge key={tipo} variant="outline" className="text-xs">
                            {tipo}
                          </Badge>
                        ))}
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

export default RelatorioCliente;
