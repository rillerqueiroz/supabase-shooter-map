import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useSortableTable } from "@/hooks/useSortableTable";
import { useSetorSulClientes, useDeleteSetorSulCliente, SetorSulCliente } from "@/hooks/useSetorSulClientes";
import { exportClientesToExcel } from "@/utils/exportToExcel";
import { exportTableToPDF } from "@/utils/exportToPDF";
import { ClientesEditModal } from "./ClientesEditModal";
import { ClientesFilters } from "./ClientesFilters";
import { ClienteDetailsModal } from "./ClienteDetailsModal";
import { Plus, Search, Download, FileText, Edit, Trash2, Phone, ArrowUpDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { inferClientesFieldMap, ClientesFieldMap } from "@/utils/fieldMapping";

export function ClientesTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<SetorSulCliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<SetorSulCliente | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { toast } = useToast();
  const { data: clientes = [], isLoading, error } = useSetorSulClientes();
  const deleteMutation = useDeleteSetorSulCliente();

  const fieldMap = useMemo(() => inferClientesFieldMap(clientes as any[]), [clientes]);
  const keyMap: Record<string, string | undefined> = {
    nome: fieldMap.nomeKey,
    cpf: fieldMap.cpfKey,
    telefone: fieldMap.telefoneKey,
    email: fieldMap.emailKey,
    situacao: fieldMap.situacaoKey,
    lote: fieldMap.loteKey,
    quadra: fieldMap.quadraKey,
  };

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!clientes) return [];
    
    return clientes.filter((cliente: SetorSulCliente) => {
      // Busca por texto
      const searchMatch = !searchTerm || 
        Object.values(cliente).some(value => 
          String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Aplicar filtros específicos
      const filterMatch = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        
        // Filtros especiais para telefones separados por vírgula
        if (key === 'telefone' && cliente.telefone) {
          const telefones = cliente.telefone.split(',').map(t => t.trim());
          return telefones.some(tel => tel.toLowerCase().includes(String(value).toLowerCase()));
        }
        
        return !cliente[key] || String(cliente[key]).toLowerCase().includes(String(value).toLowerCase());
      });

      return searchMatch && filterMatch;
    });
  }, [clientes, searchTerm, filters]);

  // Ordenação
  const { sortedData, requestSort, getSortIcon } = useSortableTable(filteredData);

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
  } = usePagination({ data: sortedData });

  const handleEdit = (cliente: SetorSulCliente) => {
    setEditingCliente(cliente);
    setIsEditModalOpen(true);
  };

  const handleShowDetails = (cliente: SetorSulCliente) => {
    setSelectedCliente(cliente);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteId(null);
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const handleExportExcel = () => {
    const result = exportClientesToExcel(filteredData, filters);
    if (result.success) {
      toast({
        title: "Sucesso!",
        description: `Arquivo Excel exportado: ${result.filename}`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Falha ao exportar Excel.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    const headers = ['ID', 'Nome', 'CPF', 'Telefone', 'Email', 'Tipo'];
    const data = sortedData.map(item => ({
      id: item.id || '-',
      nome: item.name || item.nome || '-',
      cpf: item.cpf || '-',
      telefone: formatTelefonesForExport(item.phones),
      email: item.email || '-',
      tipo: item.person_type || '-'
    }));

    exportTableToPDF(data, headers, 'Clientes Setor Sul');

    toast({
      title: "Sucesso!",
      description: "Relatório PDF gerado com sucesso.",
    });
  };

  // Função para formatar telefones do JSON
  const formatTelefones = (phones: string | undefined) => {
    if (!phones) return '-';
    try {
      const phoneArray = JSON.parse(phones);
      if (!Array.isArray(phoneArray)) return phones;
      
      const validPhones = phoneArray.filter(p => p && p.trim());
      if (validPhones.length === 0) return '-';
      
      return validPhones.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {validPhones.map((tel, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              <Phone className="w-3 h-3 mr-1" />
              {tel}
            </Badge>
          ))}
        </div>
      ) : validPhones[0];
    } catch {
      return phones.split(',').map(t => t.trim()).join(', ');
    }
  };

  // Função para formatar telefones para exportação
  const formatTelefonesForExport = (phones: string | undefined) => {
    if (!phones) return '-';
    try {
      const phoneArray = JSON.parse(phones);
      if (!Array.isArray(phoneArray)) return phones;
      return phoneArray.filter(p => p && p.trim()).join(', ') || '-';
    } catch {
      return phones;
    }
  };

  if (isLoading) {
    return <div>Carregando clientes...</div>;
  }

  if (error) {
    return <div>Erro ao carregar clientes: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredData.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredData.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            onClick={() => {
              setEditingCliente(null);
              setIsEditModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <ClientesFilters onFiltersChange={setFilters} data={clientes} />

      {/* Estatísticas */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {totalItems} clientes</span>
        <span>•</span>
        <span>Página {pagination.pageIndex + 1} de {pageCount}</span>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('id')}
              >
                <div className="flex items-center gap-1">
                  ID
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('id')}</span>
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center gap-1">
                  Nome
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('name')}</span>
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('cpf')}
              >
                <div className="flex items-center gap-1">
                  CPF
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('cpf')}</span>
                </div>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('email')}
              >
                <div className="flex items-center gap-1">
                  Email
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('email')}</span>
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('person_type')}
              >
                <div className="flex items-center gap-1">
                  Tipo
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('person_type')}</span>
                </div>
              </TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((cliente: SetorSulCliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-mono text-sm">#{cliente.id}</TableCell>
                <TableCell 
                  className="font-medium cursor-pointer hover:text-primary hover:underline"
                  onClick={() => handleShowDetails(cliente)}
                >
                  {cliente.name || cliente.nome || 'Nome não informado'}
                </TableCell>
                <TableCell className="font-mono text-sm">{cliente.cpf || '-'}</TableCell>
                <TableCell className="max-w-[200px]">
                  {formatTelefones(cliente.phones)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{cliente.email || '-'}</TableCell>
                <TableCell>
                  <Badge variant={cliente.person_type === 'Física' ? 'default' : 'secondary'}>
                    {cliente.person_type || 'Não informado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(cliente)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cliente.id && handleDelete(cliente.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
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

      {/* Modal de edição */}
      <ClientesEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCliente(null);
        }}
        cliente={editingCliente}
      />

      {/* Modal de detalhes */}
      <ClienteDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedCliente(null);
        }}
        cliente={selectedCliente}
        onEdit={(cliente) => {
          setIsDetailsModalOpen(false);
          setSelectedCliente(null);
          handleEdit(cliente);
        }}
      />
    </div>
  );
}