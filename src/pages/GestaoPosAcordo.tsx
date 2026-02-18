import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { FileSignature, Search, Phone, ExternalLink, Filter, X, LayoutGrid, List, FileText, Trash2, History, BarChart3 } from "lucide-react";
import { useControleZapsign, ControleZapsign } from "@/hooks/useControleZapsign";
import { useDeleteZapsignDocuments } from "@/hooks/useDeleteZapsignDocuments";
import { useUpdateStatusNegociacao } from "@/hooks/useUpdateStatusNegociacao";
import { usePagination } from "@/hooks/usePagination";
import { useSortableTable } from "@/hooks/useSortableTable";
import { KanbanBoard, StatusType } from "@/components/PosAcordo/KanbanBoard";
import { DateFilters } from "@/components/PosAcordo/DateFilters";
import { DocumentoZapsignModal } from "@/components/PosAcordo/DocumentoZapsignModal";
import { DeleteConfirmationDialog } from "@/components/PosAcordo/DeleteConfirmationDialog";
import { InlineMultiSelect } from "@/components/PosAcordo/InlineMultiSelect";
import { PosAcordoAnalytics } from "@/components/PosAcordo/PosAcordoAnalytics";
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function GestaoPosAcordo() {
  const [activeTab, setActiveTab] = useState<'dados' | 'relatorios'>('dados');
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: registros, isLoading, error } = useControleZapsign(showDeleted);
  const { deleteDocuments, isDeleting } = useDeleteZapsignDocuments();
  const updateStatusNegociacao = useUpdateStatusNegociacao();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCredores, setFilterCredores] = useState<string[]>([]);
  const [filterAssinados, setFilterAssinados] = useState<string[]>([]);
  const [filterOrigens, setFilterOrigens] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ativos');
  const [filterResponsaveis, setFilterResponsaveis] = useState<string[]>([]);
  const [filterStatusNegociacao, setFilterStatusNegociacao] = useState<string[]>([]);
  const [filterNome, setFilterNome] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [documentoModalOpen, setDocumentoModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleVisualizarDocumento = (token: string) => {
    setSelectedToken(token);
    setDocumentoModalOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = (paginatedData as ControleZapsign[]).map(r => r.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    const documentsToDelete = (registros || [])
      .filter(r => selectedIds.has(r.id) && r.codigo_interno_zapsign)
      .map(r => ({
        id: r.id,
        token: r.codigo_interno_zapsign!,
        nome: r.nome,
      }));

    if (documentsToDelete.length === 0) {
      toast.error('Nenhum documento selecionado possui token válido');
      return;
    }

    await deleteDocuments(documentsToDelete);
    setSelectedIds(new Set());
    setDeleteDialogOpen(false);
  };

  // Extrair opções únicas para os filtros (ordenados alfabeticamente)
  const filterOptions = useMemo(() => {
    if (!registros) return { credores: [], origens: [], responsaveis: [], statusAssinatura: [], statusNegociacao: [] };
    
    const credores = [...new Set(registros.map(r => r.credor_cedrus).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'pt-BR')) as string[];
    const origens = [...new Set(registros.map(r => r.origem).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'pt-BR')) as string[];
    const responsaveis = [...new Set(registros.map(r => r.responsavel).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'pt-BR')) as string[];
    const statusAssinatura = ['Assinado', 'Não Assinado', 'Pendente'];
    const statusNegociacao = [...new Set(registros.map(r => r.status_negociacao).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'pt-BR')) as string[];
    
    return { credores, origens, responsaveis, statusAssinatura, statusNegociacao };
  }, [registros]);

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!registros) return [];
    
    return registros.filter(registro => {
      // Filtro de busca
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        registro.nome?.toLowerCase().includes(searchLower) ||
        registro.cpf_cnpj?.toLowerCase().includes(searchLower) ||
        registro.telefone_devedor?.toLowerCase().includes(searchLower) ||
        registro.negociacao_cedrus?.toLowerCase().includes(searchLower) ||
        registro.responsavel?.toLowerCase().includes(searchLower);
      
      // Filtro de nome específico (quando clica em um nome)
      const matchesNome = !filterNome || 
        registro.nome?.toLowerCase() === filterNome.toLowerCase();
      
      // Filtro de credor (multi-select)
      const matchesCredor = filterCredores.length === 0 || 
        (registro.credor_cedrus && filterCredores.includes(registro.credor_cedrus));
      
      // Filtro de assinatura (multi-select)
      let matchesAssinado = filterAssinados.length === 0;
      if (!matchesAssinado) {
        if (filterAssinados.includes('Assinado') && registro.assinado_zapsign === true) matchesAssinado = true;
        if (filterAssinados.includes('Não Assinado') && registro.assinado_zapsign === false) matchesAssinado = true;
        if (filterAssinados.includes('Pendente') && registro.assinado_zapsign === null) matchesAssinado = true;
      }
      
      // Filtro de origem (multi-select)
      const matchesOrigem = filterOrigens.length === 0 || 
        (registro.origem && filterOrigens.includes(registro.origem));
      
      // Filtro de responsável (multi-select)
      const matchesResponsavel = filterResponsaveis.length === 0 || 
        (registro.responsavel && filterResponsaveis.includes(registro.responsavel));
      
      // Filtro de status de negociação (multi-select)
      const matchesStatusNegociacao = filterStatusNegociacao.length === 0 || 
        (registro.status_negociacao && filterStatusNegociacao.includes(registro.status_negociacao));
      
      // Filtro de status do documento (ativo/apagado)
      let matchesStatus = true;
      if (filterStatus === 'ativos') {
        matchesStatus = !registro.status_documento || registro.status_documento !== 'apagado';
      } else if (filterStatus === 'apagados') {
        matchesStatus = registro.status_documento === 'apagado';
      }
      // filterStatus === 'todos' -> matchesStatus stays true
      
      // Filtro de data
      let matchesDate = true;
      if (startDate || endDate) {
        if (registro.data_criacao) {
          try {
            const registroDate = parseISO(registro.data_criacao);
            const start = startDate ? startOfDay(startDate) : new Date(0);
            const end = endDate ? endOfDay(endDate) : new Date(9999, 11, 31);
            matchesDate = isWithinInterval(registroDate, { start, end });
          } catch {
            matchesDate = true;
          }
        } else {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesNome && matchesCredor && matchesAssinado && matchesOrigem && matchesResponsavel && matchesStatusNegociacao && matchesStatus && matchesDate;
    });
  }, [registros, searchTerm, filterNome, filterCredores, filterAssinados, filterOrigens, filterResponsaveis, filterStatusNegociacao, filterStatus, startDate, endDate]);

  // Ordenação
  const { sortedData, sortConfig, requestSort, getSortIcon } = useSortableTable(filteredData);

  // Paginação
  const {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    gotoPage,
    previousPage,
    nextPage,
    setPageSize,
    totalItems,
  } = usePagination({ data: sortedData, initialPageSize: 25 });

  const hasActiveFilters = filterCredores.length > 0 || filterAssinados.length > 0 || filterOrigens.length > 0 || filterResponsaveis.length > 0 || filterStatusNegociacao.length > 0 || filterStatus !== 'ativos' || filterNome !== '' || startDate !== null || endDate !== null;

  const clearFilters = () => {
    setFilterCredores([]);
    setFilterAssinados([]);
    setFilterOrigens([]);
    setFilterResponsaveis([]);
    setFilterStatusNegociacao([]);
    setFilterStatus('ativos');
    setFilterNome('');
    setSearchTerm('');
    setStartDate(null);
    setEndDate(null);
    setShowDeleted(false);
  };

  const handleStatusNegociacaoChange = (id: number, newStatus: string) => {
    const status = newStatus === '__clear__' ? null : newStatus;
    updateStatusNegociacao.mutate({ id, status_negociacao: status });
  };

  const handleStatusFilterChange = (value: string) => {
    setFilterStatus(value);
    // Update showDeleted to include deleted records when needed
    setShowDeleted(value === 'apagados' || value === 'todos');
  };

  const handleCobrarDevedor = (registro: ControleZapsign) => {
    console.log('📞 Cobrar devedor:', registro);
    // Ação será configurada posteriormente
  };

  const handleNameClick = (nome: string) => {
    setFilterNome(nome);
    setSearchTerm('');
    toast.info(`Filtrando por: ${formatName(nome)}`);
  };

  const handleCredorClick = (credor: string) => {
    setFilterCredores([credor]);
    toast.info(`Filtrando por credor: ${credor}`);
  };

  const handleStatusChange = (id: number, newStatus: StatusType) => {
    // Por enquanto, só mostra um toast informando a mudança
    // Implementar a atualização no banco quando necessário
    const statusLabels: Record<StatusType, string> = {
      assinado: 'Assinado',
      nao_assinado: 'Não Assinado',
      pendente: 'Pendente',
    };
    toast.info(`Status alterado para: ${statusLabels[newStatus]}`, {
      description: 'Para persistir a alteração, é necessário implementar a integração com o banco de dados.',
    });
  };

  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined) return '-';
    
    let num: number;
    if (typeof value === 'number') {
      num = value;
    } else {
      num = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
    }
    
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Format name for better readability
  const formatName = (name: string | null) => {
    if (!name) return '-';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format phone number (handles arrays, objects, and strings)
  const formatPhone = (phone: unknown): string => {
    if (!phone) return '-';
    
    // Handle array of phones
    if (Array.isArray(phone)) {
      const phones = phone
        .map((p) => {
          if (typeof p === 'string') return p;
          if (typeof p === 'object' && p !== null) {
            // Handle object with phone property
            return (p as Record<string, unknown>).phone || (p as Record<string, unknown>).telefone || (p as Record<string, unknown>).numero || '';
          }
          return '';
        })
        .filter(Boolean);
      return phones.join(', ') || '-';
    }
    
    // Handle object
    if (typeof phone === 'object' && phone !== null) {
      const obj = phone as Record<string, unknown>;
      return String(obj.phone || obj.telefone || obj.numero || '-');
    }
    
    // Handle JSON string that looks like an array or object
    if (typeof phone === 'string' && (phone.startsWith('[') || phone.startsWith('{'))) {
      try {
        const parsed = JSON.parse(phone);
        return formatPhone(parsed);
      } catch {
        // Not valid JSON, continue with string
      }
    }
    
    return String(phone);
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar dados: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto mobile-container py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="mobile-heading font-bold tracking-tight">Gestão de Pós Acordo</h1>
          <p className="mobile-text-sm text-muted-foreground">
            Controle de assinaturas de termos de acordo via Zapsign
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dados' | 'relatorios')}>
            <TabsList>
              <TabsTrigger value="dados" className="gap-2">
                <List className="h-4 w-4" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Relatórios
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" asChild>
            <a href="/logs-zapsign" className="gap-2">
              <History className="h-4 w-4" />
              Ver Logs
            </a>
          </Button>
        </div>
      </div>

      {activeTab === 'relatorios' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Relatórios e Análises
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros aplicados também aos relatórios */}
            <div className="mb-6 space-y-4">
              <DateFilters
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClear={() => {
                  setStartDate(null);
                  setEndDate(null);
                }}
              />
              
              <div className="flex flex-wrap gap-2 items-center">
                <Filter className="h-4 w-4 text-muted-foreground" />
                
                <InlineMultiSelect
                  placeholder="Credor"
                  options={filterOptions.credores}
                  selectedValues={filterCredores}
                  onSelectionChange={setFilterCredores}
                  className="w-[180px]"
                />
                
                <InlineMultiSelect
                  placeholder="Status Assinatura"
                  options={filterOptions.statusAssinatura}
                  selectedValues={filterAssinados}
                  onSelectionChange={setFilterAssinados}
                  className="w-[180px]"
                />
                
                <InlineMultiSelect
                  placeholder="Origem"
                  options={filterOptions.origens}
                  selectedValues={filterOrigens}
                  onSelectionChange={setFilterOrigens}
                  className="w-[180px]"
                />
                
                <InlineMultiSelect
                  placeholder="Responsável"
                  options={filterOptions.responsaveis}
                  selectedValues={filterResponsaveis}
                  onSelectionChange={setFilterResponsaveis}
                  className="w-[180px]"
                />
                
                <InlineMultiSelect
                  placeholder="Status Negociação"
                  options={filterOptions.statusNegociacao}
                  selectedValues={filterStatusNegociacao}
                  onSelectionChange={setFilterStatusNegociacao}
                  className="w-[180px]"
                />
                
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                Analisando {filteredData.length} registros
              </div>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <PosAcordoAnalytics registros={filteredData} />
            )}
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Controle de Assinaturas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="gap-1"
              >
                <List className="h-4 w-4" />
                Tabela
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de Data */}
          <DateFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => {
              setStartDate(null);
              setEndDate(null);
            }}
          />

          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ, telefone, negociação ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {filterNome && (
                <Badge variant="secondary" className="gap-1">
                  Nome: {formatName(filterNome)}
                  <button onClick={() => setFilterNome('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              <InlineMultiSelect
                placeholder="Credor"
                options={filterOptions.credores}
                selectedValues={filterCredores}
                onSelectionChange={setFilterCredores}
                className="w-[180px]"
              />
              
              <InlineMultiSelect
                placeholder="Status Assinatura"
                options={filterOptions.statusAssinatura}
                selectedValues={filterAssinados}
                onSelectionChange={setFilterAssinados}
                className="w-[180px]"
              />
              
              <InlineMultiSelect
                placeholder="Origem"
                options={filterOptions.origens}
                selectedValues={filterOrigens}
                onSelectionChange={setFilterOrigens}
                className="w-[180px]"
              />
              
              <InlineMultiSelect
                placeholder="Responsável"
                options={filterOptions.responsaveis}
                selectedValues={filterResponsaveis}
                onSelectionChange={setFilterResponsaveis}
                className="w-[180px]"
              />
              
              <InlineMultiSelect
                placeholder="Status Negociação"
                options={filterOptions.statusNegociacao}
                selectedValues={filterStatusNegociacao}
                onSelectionChange={setFilterStatusNegociacao}
                className="w-[180px]"
              />
              
              <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status Documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Documentos Ativos</SelectItem>
                  <SelectItem value="apagados">Documentos Apagados</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>

          {/* Contagem de Resultados e Ações em Massa */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Exibindo {viewMode === 'table' ? paginatedData.length : filteredData.length} de {totalItems} registros
              {selectedIds.size > 0 && (
                <span className="ml-2 text-primary font-medium">
                  ({selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''})
                </span>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Apagar Selecionados ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Conteúdo baseado no modo de visualização */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              registros={filteredData}
              onStatusChange={handleStatusChange}
              onNameClick={handleNameClick}
              onCredorClick={handleCredorClick}
            />
          ) : (
            <>
              {/* Tabela */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            (paginatedData as ControleZapsign[]).length > 0 &&
                            (paginatedData as ControleZapsign[]).every(r => selectedIds.has(r.id))
                          }
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => requestSort('nome')}
                      >
                        Nome / CPF {getSortIcon('nome')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => requestSort('valor_total_negociado')}
                      >
                        Valor {getSortIcon('valor_total_negociado')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => requestSort('credor_cedrus')}
                      >
                        Credor {getSortIcon('credor_cedrus')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => requestSort('data_criacao')}
                      >
                        Data {getSortIcon('data_criacao')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => requestSort('assinado_zapsign')}
                      >
                        Assinado {getSortIcon('assinado_zapsign')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => requestSort('status_negociacao')}
                      >
                        Status Negoc. {getSortIcon('status_negociacao')}
                      </TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paginatedData as ControleZapsign[]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      (paginatedData as ControleZapsign[]).map((registro) => (
                        <TableRow 
                          key={registro.id} 
                          className={`${selectedIds.has(registro.id) ? 'bg-muted/50' : ''} ${registro.status_documento === 'apagado' ? 'opacity-60' : ''}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(registro.id)}
                              onCheckedChange={(checked) => handleSelectOne(registro.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <div className="space-y-0.5">
                              <button
                                onClick={() => registro.nome && handleNameClick(registro.nome)}
                                className="text-left hover:text-primary hover:underline transition-colors truncate block w-full font-medium text-sm"
                                title={registro.nome || undefined}
                              >
                                {formatName(registro.nome)}
                              </button>
                              <div className="text-xs text-muted-foreground">
                                {registro.cpf_cnpj || '-'}
                              </div>
                              {registro.responsavel && (
                                <div className="text-xs text-muted-foreground/70">
                                  Resp: {registro.responsavel}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(registro.valor_total_negociado)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => registro.credor_cedrus && handleCredorClick(registro.credor_cedrus)}
                              className="hover:text-primary hover:underline transition-colors text-sm"
                            >
                              {registro.credor_cedrus || '-'}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(registro.data_criacao)}
                          </TableCell>
                          <TableCell>
                            {registro.status_documento === 'apagado' ? (
                              <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive bg-destructive/10">
                                <Trash2 className="h-3 w-3" />
                                Apagado
                              </Badge>
                            ) : registro.assinado_zapsign === true ? (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                Assinado
                              </Badge>
                            ) : registro.assinado_zapsign === false ? (
                              <Badge variant="destructive">
                                Não Assinado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {registro.status_negociacao || 'Não identificado'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm truncate max-w-[140px]" title={formatPhone(registro.telefone_devedor)}>
                                {formatPhone(registro.telefone_devedor)}
                              </div>
                              {registro.link_assinatura_zapsign && (
                                <a 
                                  href={registro.link_assinatura_zapsign} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 text-xs"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Link Assinatura
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {registro.codigo_interno_zapsign && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleVisualizarDocumento(registro.codigo_interno_zapsign!)}
                                  title="Ver Documento"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCobrarDevedor(registro)}
                                title="Cobrar Devedor"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {!isLoading && totalItems > 0 && (
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
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Modal de Visualização do Documento */}
      <DocumentoZapsignModal
        open={documentoModalOpen}
        onOpenChange={setDocumentoModalOpen}
        token={selectedToken}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        count={selectedIds.size}
        isLoading={isDeleting}
      />
    </div>
  );
}
