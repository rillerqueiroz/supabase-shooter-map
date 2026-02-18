import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useSortableTable } from "@/hooks/useSortableTable";
import { useSetorSulParcelas, useDeleteSetorSulParcela, SetorSulParcela } from "@/hooks/useSetorSulParcelas";
import { useSetorSulClientes } from "@/hooks/useSetorSulClientes";
import { exportParcelasToExcel } from "@/utils/exportToExcel";
import { exportTableToPDF } from "@/utils/exportToPDF";
import { ParcelasEditModal } from "./ParcelasEditModal";
import { ParcelasFilters } from "./ParcelasFilters";
import { ParcelaDetailsModal } from "./ParcelaDetailsModal";
import { inferParcelasFieldMap } from "@/utils/fieldMapping";
import { Plus, Search, Download, FileText, Edit, Trash2, ArrowUpDown, Phone } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateFromDatabase } from "@/lib/utils";

export function ParcelasTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingParcela, setEditingParcela] = useState<SetorSulParcela | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<SetorSulParcela | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { toast } = useToast();
  const { data: parcelas = [], isLoading, error } = useSetorSulParcelas();
  const { data: clientes = [] } = useSetorSulClientes();
  const deleteMutation = useDeleteSetorSulParcela();

  // Mapa de cd_cliente -> phones para lookup rápido
  const clientesPhonesMap = useMemo(() => {
    const map = new Map<number, string>();
    clientes?.forEach(cliente => {
      if (cliente.id && cliente.phones) {
        map.set(cliente.id, cliente.phones);
      }
    });
    return map;
  }, [clientes]);

  // Função para formatar telefones do JSON array
  const formatPhones = (phones: string | undefined) => {
    if (!phones) return '-';
    try {
      const phoneArray = JSON.parse(phones);
      if (!Array.isArray(phoneArray)) return phones;
      return phoneArray.filter((p: string) => p?.trim()).join(', ') || '-';
    } catch {
      return phones;
    }
  };

  // Inferir mapeamento dos campos baseado nos dados reais
  const fieldMap = useMemo(() => {
    return inferParcelasFieldMap(parcelas);
  }, [parcelas]);

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!parcelas) return [];
    
    return parcelas.filter((parcela: SetorSulParcela) => {
      // Busca por texto
      const searchMatch = !searchTerm || 
        Object.values(parcela).some(value => 
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Aplicar filtros específicos
      const filterMatch = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        
        if (key === 'data_vencimento_start') {
          const vencimentoKey = fieldMap.vencimentoKey || 'data_vecto';
          return !parcela[vencimentoKey] || parcela[vencimentoKey] >= value;
        }
        if (key === 'data_vencimento_end') {
          const vencimentoKey = fieldMap.vencimentoKey || 'data_vecto';
          return !parcela[vencimentoKey] || parcela[vencimentoKey] <= value;
        }
        if (key === 'valor_min') {
          const valorKey = fieldMap.valorKey || 'total';
          return !parcela[valorKey] || Number(parcela[valorKey]) >= Number(value);
        }
        if (key === 'valor_max') {
          const valorKey = fieldMap.valorKey || 'total';
          return !parcela[valorKey] || Number(parcela[valorKey]) <= Number(value);
        }
        
        return !parcela[key] || String(parcela[key]).toLowerCase().includes(String(value).toLowerCase());
      });

      return searchMatch && filterMatch;
    });
  }, [parcelas, searchTerm, filters]);

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

  const handleEdit = (parcela: SetorSulParcela) => {
    setEditingParcela(parcela);
    setIsEditModalOpen(true);
  };

  const handleShowDetails = (parcela: SetorSulParcela) => {
    setSelectedParcela(parcela);
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
    // Adicionar telefone aos dados para exportação
    const dataWithPhones = filteredData.map(parcela => ({
      ...parcela,
      telefone_cliente: formatPhones(clientesPhonesMap.get(parcela.cd_cliente))
    }));
    
    const result = exportParcelasToExcel(dataWithPhones, filters);
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
    const headers = ['Data Vencimento', 'Cliente', 'Documento', 'Parcela', 'Valor Total', 'Status'];
    const data = sortedData.map(item => ({
      data_vencimento: formatDate(item.data_vecto),
      cliente: item.cliente || '-',
      documento: item.documento || '-',
      parcela: item.parc || '-',
      valor_total: formatCurrency(item.total || item.valor_original),
      status: item.status || '-'
    }));

    exportTableToPDF(data, headers, 'Parcelas Setor Sul');

    toast({
      title: "Sucesso!",
      description: "Relatório PDF gerado com sucesso.",
    });
  };

  // Função para formatar data
  const formatDate = (dateString: string | null | undefined) => {
    return formatDateFromDatabase(dateString);
  };

  // Função para formatar moeda
  const formatCurrency = (value: number | string | null | undefined) => {
    if (!value) return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  if (isLoading) {
    return <div>Carregando parcelas...</div>;
  }

  if (error) {
    return <div>Erro ao carregar parcelas: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar parcelas..."
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
              setEditingParcela(null);
              setIsEditModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Parcela
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <ParcelasFilters onFiltersChange={setFilters} data={parcelas} fieldMap={fieldMap} />

      {/* Estatísticas */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {totalItems} parcelas</span>
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
                onClick={() => requestSort('data_vecto')}
              >
                <div className="flex items-center gap-1">
                  Data Vencimento
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('data_vecto')}</span>
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('cliente')}
              >
                <div className="flex items-center gap-1">
                  Cliente
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('cliente')}</span>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Telefone
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('documento')}
              >
                <div className="flex items-center gap-1">
                  Documento
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('documento')}</span>
                </div>
              </TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('total')}
              >
                <div className="flex items-center gap-1">
                  Valor
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('total')}</span>
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => requestSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{getSortIcon('status')}</span>
                </div>
              </TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((parcela: SetorSulParcela, index: number) => (
              <TableRow key={parcela.id || index}>
                <TableCell className="font-medium">
                  {formatDate(parcela.data_vecto)}
                </TableCell>
                <TableCell 
                  className="cursor-pointer hover:text-primary hover:underline"
                  onClick={() => handleShowDetails(parcela)}
                >
                  {parcela.cliente || 'Cliente não informado'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatPhones(clientesPhonesMap.get(parcela.cd_cliente))}
                </TableCell>
                <TableCell className="font-mono text-sm">{parcela.documento || '-'}</TableCell>
                <TableCell>{parcela.parc || '-'}</TableCell>
                <TableCell>{parcela.unid_princ || '-'}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(parcela.total || parcela.valor_original)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      parcela.status === 'Pago' ? 'default' :
                      parcela.status === 'Vencido' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {parcela.status || 'A vencer'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(parcela)}
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
                            Tem certeza que deseja excluir esta parcela? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => parcela.id && handleDelete(parcela.id)}
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
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhuma parcela encontrada
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
      <ParcelasEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingParcela(null);
        }}
        parcela={editingParcela}
      />

      {/* Modal de detalhes */}
      <ParcelaDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedParcela(null);
        }}
        parcela={selectedParcela}
        onEdit={(parcela) => {
          setIsDetailsModalOpen(false);
          setSelectedParcela(null);
          handleEdit(parcela);
        }}
      />
    </div>
  );
}