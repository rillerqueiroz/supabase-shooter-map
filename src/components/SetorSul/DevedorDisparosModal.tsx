import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGestaoDisparos } from "@/hooks/useGestaoDisparos";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDateFromDatabase } from "@/lib/utils";
import { Download, Calendar as CalendarIcon, ArrowUpDown, Filter, MessageCircle, X, Clock, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";

interface DevedorDisparosModalProps {
  isOpen: boolean;
  onClose: () => void;
  devedorNome: string;
}

interface DisparoFilters {
  cliente?: string;
  tipoDisparo?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export function DevedorDisparosModal({ isOpen, onClose, devedorNome }: DevedorDisparosModalProps) {
  const { toast } = useToast();
  const { data: disparos = [], isLoading } = useGestaoDisparos();
  const [filters, setFilters] = useState<DisparoFilters>({});
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const [isDataInicioOpen, setIsDataInicioOpen] = useState(false);
  const [isDataFimOpen, setIsDataFimOpen] = useState(false);

  // Filtrar disparos do devedor
  const devedorDisparos = useMemo(() => {
    return disparos.filter(disparo => 
      disparo.devedor?.toLowerCase().includes(devedorNome.toLowerCase())
    );
  }, [disparos, devedorNome]);

  // Aplicar filtros
  const filteredDisparos = useMemo(() => {
    return devedorDisparos.filter(disparo => {
      // Filtro por cliente
      if (filters.cliente && filters.cliente !== 'all' && !disparo.cliente?.toLowerCase().includes(filters.cliente.toLowerCase())) {
        return false;
      }

      // Filtro por tipo de disparo
      if (filters.tipoDisparo && filters.tipoDisparo !== 'all' && disparo.tipo_disparo !== filters.tipoDisparo) {
        return false;
      }

      // Filtro por data
      if (filters.dataInicio || filters.dataFim) {
        const disparoDate = disparo.data_disparo ? new Date(disparo.data_disparo) : null;
        if (!disparoDate) return false;

        if (filters.dataInicio && disparoDate < filters.dataInicio) return false;
        if (filters.dataFim && disparoDate > filters.dataFim) return false;
      }

      return true;
    });
  }, [devedorDisparos, filters]);

  // Aplicar ordenação
  const { sortedData, requestSort, getSortIcon } = useSortableTable(filteredDisparos);

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
  } = usePagination({ data: sortedData, initialPageSize: 20 });

  // Opções para filtros
  const clienteOptions = useMemo(() => {
    const clientes = [...new Set(devedorDisparos.map(d => d.cliente).filter(Boolean))];
    return clientes.sort();
  }, [devedorDisparos]);

  const tiposDisparoOptions = useMemo(() => {
    const tipos = [...new Set(devedorDisparos.map(d => d.tipo_disparo).filter(Boolean))];
    return tipos.sort();
  }, [devedorDisparos]);

  const handleFilterChange = (key: keyof DisparoFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setIsDataInicioOpen(false);
    setIsDataFimOpen(false);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== '' && value !== 'all'
  );

  const toggleMessageExpansion = (id: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const removeEmojis = (text: string) => {
    if (!text) return '';
    return text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    const clean = removeEmojis(message || '');
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  };
  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Histórico de Disparos - ${devedorNome}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Linha divisória
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    // Estatísticas com melhor espaçamento
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 20, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Total de disparos: ${filteredDisparos.length}`, 25, yPosition);
    yPosition += 7;
    doc.text(`Clientes únicos: ${new Set(filteredDisparos.map(d => d.cliente)).size}`, 25, yPosition);
    yPosition += 7;
    doc.text(`Tipos de disparo únicos: ${new Set(filteredDisparos.map(d => d.tipo_disparo)).size}`, 25, yPosition);
    yPosition += 12;

    // Linha divisória
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    // Cabeçalho da tabela "Disparos Realizados"
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Disparos Realizados', 20, yPosition);
    yPosition += 8;

    // Cabeçalhos das colunas
    doc.setFontSize(9);
    doc.text('Data/Hora', 20, yPosition);
    doc.text('Cliente', 60, yPosition);
    doc.text('Tipo', 110, yPosition);
    doc.text('Número', 145, yPosition);
    doc.text('Mensagem', 185, yPosition);
    yPosition += 2;

    // Linha divisória do cabeçalho
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    // Dados
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filteredDisparos.forEach((disparo, index) => {
      const dataHora = `${formatDateFromDatabase(disparo.data_disparo)} ${disparo.hora_disparo || ''}`;
      const cliente = (disparo.cliente || '').substring(0, 25);
      const tipo = (disparo.tipo_disparo || '').substring(0, 15);
      const numero = (disparo.numero_enviado || '').substring(0, 18);
      const mensagemCompleta = removeEmojis(disparo.mensagem || '');
      
      // Quebrar mensagem em linhas de 40 caracteres
      const mensagemLines = [];
      for (let i = 0; i < mensagemCompleta.length; i += 40) {
        mensagemLines.push(mensagemCompleta.substring(i, i + 40));
      }
      
      // Verificar espaço necessário (altura do registro)
      const recordHeight = 4 + (mensagemLines.length > 0 ? (mensagemLines.length - 1) * 4 : 0);
      
      if (yPosition + recordHeight > 180) {
        doc.addPage();
        yPosition = 20;
        
        // Repetir cabeçalho
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Data/Hora', 20, yPosition);
        doc.text('Cliente', 60, yPosition);
        doc.text('Tipo', 110, yPosition);
        doc.text('Número', 145, yPosition);
        doc.text('Mensagem', 185, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      doc.text(dataHora, 20, yPosition);
      doc.text(cliente, 60, yPosition);
      doc.text(tipo, 110, yPosition);
      doc.text(numero, 145, yPosition);
      
      // Mensagem com quebras de linha
      if (mensagemLines.length > 0) {
        doc.setFont('helvetica', 'italic');
        mensagemLines.forEach((line, idx) => {
          doc.text(line, 185, yPosition + (idx * 4));
        });
        doc.setFont('helvetica', 'normal');
        yPosition += recordHeight;
      } else {
        yPosition += 6;
      }
      
      // Linha divisória leve
      doc.setDrawColor(230, 230, 230);
      doc.line(20, yPosition - 1, pageWidth - 20, yPosition - 1);
    });

    doc.save(`historico-disparos-${devedorNome.replace(/\s+/g, '-')}.pdf`);
    
    toast({
      title: "PDF exportado com sucesso!",
      description: "O histórico foi baixado para seu computador"
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Histórico de Disparos - {devedorNome}
            </div>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros Rápidos de Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const today = new Date();
                  handleFilterChange('dataInicio', today);
                  handleFilterChange('dataFim', today);
                }}>
                  <Calendar className="h-3 w-3 mr-2" />
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  handleFilterChange('dataInicio', yesterday);
                  handleFilterChange('dataFim', yesterday);
                }}>
                  <Calendar className="h-3 w-3 mr-2" />
                  Ontem
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const weekStart = new Date();
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                  handleFilterChange('dataInicio', weekStart);
                  handleFilterChange('dataFim', new Date());
                }}>
                  <Clock className="h-3 w-3 mr-2" />
                  Esta Semana
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const lastWeekStart = new Date();
                  lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
                  const lastWeekEnd = new Date(lastWeekStart);
                  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
                  handleFilterChange('dataInicio', lastWeekStart);
                  handleFilterChange('dataFim', lastWeekEnd);
                }}>
                  <Clock className="h-3 w-3 mr-2" />
                  Semana Passada
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const monthStart = new Date();
                  monthStart.setDate(1);
                  handleFilterChange('dataInicio', monthStart);
                  handleFilterChange('dataFim', new Date());
                }}>
                  <CalendarRange className="h-3 w-3 mr-2" />
                  Este Mês
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filtros Detalhados */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros Detalhados
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Cliente */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={filters.cliente || 'all'} onValueChange={(value) => handleFilterChange('cliente', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clienteOptions.map(cliente => (
                        <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Disparo */}
                <div className="space-y-2">
                  <Label>Tipo de Disparo</Label>
                  <Select value={filters.tipoDisparo || 'all'} onValueChange={(value) => handleFilterChange('tipoDisparo', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {tiposDisparoOptions.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Início */}
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover open={isDataInicioOpen} onOpenChange={setIsDataInicioOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dataInicio ? format(filters.dataInicio, "dd/MM/yyyy", { locale: pt }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dataInicio}
                        onSelect={(date) => {
                          handleFilterChange('dataInicio', date);
                          setIsDataInicioOpen(false);
                        }}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Fim */}
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover open={isDataFimOpen} onOpenChange={setIsDataFimOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dataFim ? format(filters.dataFim, "dd/MM/yyyy", { locale: pt }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dataFim}
                        onSelect={(date) => {
                          handleFilterChange('dataFim', date);
                          setIsDataFimOpen(false);
                        }}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{filteredDisparos.length}</div>
                <p className="text-xs text-muted-foreground">Total de Disparos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {new Set(filteredDisparos.map(d => d.cliente)).size}
                </div>
                <p className="text-xs text-muted-foreground">Clientes Únicos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {new Set(filteredDisparos.map(d => d.tipo_disparo)).size}
                </div>
                <p className="text-xs text-muted-foreground">Tipos de Disparo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {filteredDisparos.length > 0 ? formatDateFromDatabase(filteredDisparos[filteredDisparos.length - 1]?.data_disparo) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Último Disparo</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico Detalhado ({totalItems} registros)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => requestSort('data_disparo')}
                              className="h-auto p-0 font-semibold"
                            >
                              Data/Hora
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                              {getSortIcon('data_disparo') && <span className="ml-1">{getSortIcon('data_disparo')}</span>}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => requestSort('cliente')}
                              className="h-auto p-0 font-semibold"
                            >
                              Cliente
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                              {getSortIcon('cliente') && <span className="ml-1">{getSortIcon('cliente')}</span>}
                            </Button>
                          </TableHead>
                          <TableHead>Tipo de Disparo</TableHead>
                          <TableHead>Número</TableHead>
                          <TableHead>Mensagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((disparo) => (
                          <TableRow key={disparo.id}>
                            <TableCell>
                              <div className="font-mono text-sm">
                                <div>{formatDateFromDatabase(disparo.data_disparo)}</div>
                                <div className="text-xs text-muted-foreground">{disparo.hora_disparo || '-'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {disparo.cliente}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {disparo.tipo_disparo}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                            {disparo.numero_enviado}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="space-y-2">
                                <p className="text-sm">
                                  {expandedMessages.has(disparo.id) 
                                    ? removeEmojis(disparo.mensagem || "") 
                                    : truncateMessage(disparo.mensagem || '', 100)
                                  }
                                </p>
                                {disparo.mensagem && disparo.mensagem.length > 100 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleMessageExpansion(disparo.id)}
                                    className="h-auto p-0 text-xs text-primary"
                                  >
                                    {expandedMessages.has(disparo.id) ? 'Ver menos' : 'Ver mais'}
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}