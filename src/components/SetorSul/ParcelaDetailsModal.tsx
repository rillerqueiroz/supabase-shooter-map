import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SetorSulParcela } from "@/hooks/useSetorSulParcelas";
import { Edit, Calendar, DollarSign, FileText, Building, User, Download } from "lucide-react";
import { formatDateFromDatabase } from "@/lib/utils";
import jsPDF from 'jspdf';

interface ParcelaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcela: SetorSulParcela | null;
  onEdit: (parcela: SetorSulParcela) => void;
}

export function ParcelaDetailsModal({ isOpen, onClose, parcela, onEdit }: ParcelaDetailsModalProps) {
  if (!parcela) return null;

  const formatCurrency = (value: number | string | null | undefined) => {
    if (!value) return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const formatDate = (dateString: string | null | undefined) => {
    return formatDateFromDatabase(dateString);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      case 'a vencer':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ficha da Parcela', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Informações da parcela
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Documento: ${parcela.documento || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Título: ${parcela.titulo || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Parcela: ${parcela.parc || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Status: ${parcela.status || 'Não informado'}`, 20, yPosition);
    yPosition += 15;

    doc.text(`Cliente: ${parcela.cliente || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Código do Cliente: ${parcela.cd_cliente || 'Não informado'}`, 20, yPosition);
    yPosition += 15;

    doc.text(`Data de Vencimento: ${formatDate(parcela.data_vecto)}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Valor Original: ${formatCurrency(parcela.valor_original)}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total: ${formatCurrency(parcela.total)}`, 20, yPosition);
    yPosition += 10;

    if (parcela.saldo_atual) {
      doc.text(`Saldo Atual: ${formatCurrency(parcela.saldo_atual)}`, 20, yPosition);
      yPosition += 10;
    }

    if (parcela.juros) {
      doc.text(`Juros: ${formatCurrency(parcela.juros)}`, 20, yPosition);
      yPosition += 10;
    }

    if (parcela.multas) {
      doc.text(`Multas: ${formatCurrency(parcela.multas)}`, 20, yPosition);
      yPosition += 10;
    }

    yPosition += 10;
    doc.text(`Empresa: ${parcela.nome_empresa || 'Não informado'}`, 20, yPosition);
    yPosition += 10;

    if (parcela.cd_empresa) {
      doc.text(`Código da Empresa: ${parcela.cd_empresa}`, 20, yPosition);
    }

    doc.save(`ficha-parcela-${parcela.documento || parcela.id}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes da Parcela
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(parcela)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Título */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Informações do Título
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Documento</label>
                <p className="text-sm mt-1 font-mono">{parcela.documento || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Título</label>
                <p className="text-sm mt-1">{parcela.titulo || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Parcela</label>
                <p className="text-sm mt-1">{parcela.parc || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(parcela.status)}>
                    {parcela.status || 'Status não informado'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações do Cliente */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-sm mt-1">{parcela.cliente || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Código do Cliente</label>
                <p className="text-sm mt-1">#{parcela.cd_cliente || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unidade</label>
                <p className="text-sm mt-1">{parcela.unid_princ || 'Não informado'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações Financeiras */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Informações Financeiras
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{formatDate(parcela.data_vecto)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Original</label>
                <p className="text-sm mt-1 font-semibold text-green-600">
                  {formatCurrency(parcela.valor_original)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total</label>
                <p className="text-sm mt-1 font-semibold text-blue-600">
                  {formatCurrency(parcela.total)}
                </p>
              </div>
              {parcela.saldo_atual && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Saldo Atual</label>
                  <p className="text-sm mt-1 font-semibold">
                    {formatCurrency(parcela.saldo_atual)}
                  </p>
                </div>
              )}
              {parcela.juros && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Juros</label>
                  <p className="text-sm mt-1">{formatCurrency(parcela.juros)}</p>
                </div>
              )}
              {parcela.multas && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Multas</label>
                  <p className="text-sm mt-1">{formatCurrency(parcela.multas)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações da Empresa */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Empresa
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome da Empresa</label>
                <p className="text-sm mt-1">{parcela.nome_empresa || 'Não informado'}</p>
              </div>
              {parcela.cd_empresa && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código da Empresa</label>
                  <p className="text-sm mt-1">#{parcela.cd_empresa}</p>
                </div>
              )}
            </div>
          </div>

          {parcela.id_titulo_unico && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Identificação Única</h3>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Título Único</label>
                  <p className="text-sm mt-1 font-mono">{parcela.id_titulo_unico}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}