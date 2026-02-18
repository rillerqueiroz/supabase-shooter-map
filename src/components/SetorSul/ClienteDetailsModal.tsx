import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SetorSulCliente } from "@/hooks/useSetorSulClientes";
import { useSetorSulParcelasCliente } from "@/hooks/useSetorSulParcelas";
import { useSortableTable } from "@/hooks/useSortableTable";
import { ParcelasFiltersModal, ParcelasFilters } from "./ParcelasFiltersModal";
import { Edit, Phone, Mail, MapPin, User, FileText, Download, Calendar, DollarSign, ArrowUpDown, Loader2 } from "lucide-react";
import { formatDateFromDatabase } from "@/lib/utils";
import jsPDF from 'jspdf';

interface ClienteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: SetorSulCliente | null;
  onEdit: (cliente: SetorSulCliente) => void;
}

export function ClienteDetailsModal({ isOpen, onClose, cliente, onEdit }: ClienteDetailsModalProps) {
  if (!cliente) return null;

  const { data: parcelasDoCliente = [], isLoading: isLoadingParcelas } = useSetorSulParcelasCliente(cliente.id);
  const [parcelasFilters, setParcelasFilters] = useState<ParcelasFilters>({});

  // Aplicar filtros nas parcelas
  const parcelasFiltradas = useMemo(() => {
    return parcelasDoCliente.filter(parcela => {
      // Filtro por documento
      if (parcelasFilters.documento && !parcela.documento?.toLowerCase().includes(parcelasFilters.documento.toLowerCase())) {
        return false;
      }

      // Filtro por status
      if (parcelasFilters.status && parcela.status !== parcelasFilters.status) {
        return false;
      }

      // Filtro por data de vencimento
      if (parcelasFilters.dataVencimentoInicio || parcelasFilters.dataVencimentoFim) {
        const dataVenc = parcela.data_vecto ? new Date(parcela.data_vecto) : null;
        if (!dataVenc) return false;

        if (parcelasFilters.dataVencimentoInicio && dataVenc < parcelasFilters.dataVencimentoInicio) return false;
        if (parcelasFilters.dataVencimentoFim && dataVenc > parcelasFilters.dataVencimentoFim) return false;
      }

      // Filtro por valor
      if (parcelasFilters.valorMinimo || parcelasFilters.valorMaximo) {
        const valor = parcela.total ? (typeof parcela.total === 'string' ? parseFloat(parcela.total) : parcela.total) : 0;
        if (parcelasFilters.valorMinimo && valor < parcelasFilters.valorMinimo) return false;
        if (parcelasFilters.valorMaximo && valor > parcelasFilters.valorMaximo) return false;
      }

      return true;
    });
  }, [parcelasDoCliente, parcelasFilters]);

  // Aplicar ordenação
  const { sortedData: parcelasOrdenadas, requestSort, getSortIcon } = useSortableTable(parcelasFiltradas);

  // Função para formatar telefones do array JSON
  const formatTelefones = (phones: string | undefined) => {
    if (!phones) return [];
    try {
      const phoneArray = JSON.parse(phones);
      return Array.isArray(phoneArray) ? phoneArray.filter(p => p && p.trim()) : [];
    } catch {
      return phones.split(',').map(p => p.trim()).filter(Boolean);
    }
  };

  const telefones = formatTelefones(cliente.phones);
  const nomeCompleto = cliente.name || cliente.nome || 'Nome não informado';
  const endereco = [
    cliente.address_street_name,
    cliente.address_number,
    cliente.address_complement,
    cliente.address_neighborhood,
    cliente.address_city,
    cliente.address_state,
    cliente.address_zip_code
  ].filter(Boolean).join(', ');

  const formatCurrency = (value: number | string | null | undefined) => {
    if (!value) return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ficha do Cliente', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Informações do cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${nomeCompleto}`, 20, yPosition);
    yPosition += 10;
    doc.text(`CPF: ${cliente.cpf || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Email: ${cliente.email || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Telefones: ${telefones.join(', ') || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Endereço: ${endereco || 'Não informado'}`, 20, yPosition);
    yPosition += 20;

    // Estatísticas das parcelas filtradas
    if (parcelasFiltradas.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo das Parcelas (Filtradas):', 20, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de parcelas: ${parcelasFiltradas.length}`, 20, yPosition);
      yPosition += 6;
      const valorTotal = parcelasFiltradas.reduce((sum, p) => {
        const valor = p.total ? (typeof p.total === 'string' ? parseFloat(p.total) : p.total) : 0;
        return sum + valor;
      }, 0);
      doc.text(`Valor total: ${formatCurrency(valorTotal)}`, 20, yPosition);
      yPosition += 15;

      doc.setFont('helvetica', 'bold');
      doc.text('Parcelas Detalhadas:', 20, yPosition);
      yPosition += 10;
      doc.setFont('helvetica', 'normal');

      parcelasFiltradas.forEach((parcela, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${index + 1}. Doc: ${parcela.documento || 'N/A'} - Venc: ${formatDateFromDatabase(parcela.data_vecto)} - Valor: ${formatCurrency(parcela.total)} - Status: ${parcela.status || 'N/A'}`, 20, yPosition);
        yPosition += 8;
      });
    }

    doc.save(`ficha-cliente-${cliente.id}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Detalhes do Cliente
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(cliente)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Pessoais */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-sm mt-1">{nomeCompleto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CPF</label>
                <p className="text-sm mt-1">{cliente.cpf || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Pessoa</label>
                <div className="mt-1">
                  <Badge variant={cliente.person_type === 'Física' ? 'default' : 'secondary'}>
                    {cliente.person_type || 'Não informado'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm mt-1">#{cliente.id}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contatos */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contatos
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{cliente.email || 'Não informado'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefones</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {telefones.length > 0 ? (
                    telefones.map((telefone, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {telefone}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum telefone informado</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Endereço Completo</label>
                <p className="text-sm mt-1">{endereco || 'Endereço não informado'}</p>
              </div>
              {cliente.address_street_name && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Logradouro</label>
                  <p className="text-sm mt-1">{cliente.address_street_name}</p>
                </div>
              )}
              {cliente.address_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número</label>
                  <p className="text-sm mt-1">{cliente.address_number}</p>
                </div>
              )}
              {cliente.address_complement && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Complemento</label>
                  <p className="text-sm mt-1">{cliente.address_complement}</p>
                </div>
              )}
              {cliente.address_neighborhood && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                  <p className="text-sm mt-1">{cliente.address_neighborhood}</p>
                </div>
              )}
              {cliente.address_city && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                  <p className="text-sm mt-1">{cliente.address_city}</p>
                </div>
              )}
              {cliente.address_state && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <p className="text-sm mt-1">{cliente.address_state}</p>
                </div>
              )}
              {cliente.address_zip_code && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP</label>
                  <p className="text-sm mt-1">{cliente.address_zip_code}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção de Parcelas */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Parcelas do Cliente
              {isLoadingParcelas && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            </h3>

            {isLoadingParcelas ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
                <div className="border rounded-lg">
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : parcelasDoCliente.length > 0 ? (
              <>
                {/* Filtros das Parcelas */}
                <ParcelasFiltersModal
                  filters={parcelasFilters}
                  onFiltersChange={setParcelasFilters}
                />
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {parcelasFiltradas.length} de {parcelasDoCliente.length} parcelas
                    </span>
                  </div>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => requestSort('documento')}
                              className="h-auto p-0 font-semibold"
                            >
                              Documento
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                              {getSortIcon('documento') && <span className="ml-1">{getSortIcon('documento')}</span>}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => requestSort('data_vecto')}
                              className="h-auto p-0 font-semibold"
                            >
                              Vencimento
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                              {getSortIcon('data_vecto') && <span className="ml-1">{getSortIcon('data_vecto')}</span>}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => requestSort('total')}
                              className="h-auto p-0 font-semibold"
                            >
                              Valor
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                              {getSortIcon('total') && <span className="ml-1">{getSortIcon('total')}</span>}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              onClick={() => requestSort('status')}
                              className="h-auto p-0 font-semibold"
                            >
                              Status
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                              {getSortIcon('status') && <span className="ml-1">{getSortIcon('status')}</span>}
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelasOrdenadas.map((parcela) => (
                          <TableRow key={parcela.id}>
                            <TableCell className="font-mono text-sm">
                              {parcela.documento || 'N/A'}
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {formatDateFromDatabase(parcela.data_vecto)}
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              {formatCurrency(parcela.total)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={parcela.status === 'Pago' ? 'default' : parcela.status === 'Vencido' ? 'destructive' : 'secondary'}>
                                {parcela.status || 'N/A'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parcelasFiltradas.length === 0 && parcelasDoCliente.length > 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhuma parcela encontrada com os filtros aplicados
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-muted-foreground border rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma parcela encontrada para este cliente</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}