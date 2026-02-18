import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ControleZapsign } from '@/hooks/useControleZapsign';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper functions
const formatCurrency = (value: string | number | null): string => {
  if (value === null || value === undefined) return 'R$ 0,00';

  const numValue = (() => {
    if (typeof value === 'number') return value;

    const raw = String(value).replace(/[R$\s]/g, '').trim();
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    const num = parseFloat(normalized.replace(/[^\d.-]/g, ''));
    return Number.isFinite(num) ? num : 0;
  })();

  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateString;
  }
};

const getStatusAssinatura = (assinado: boolean | null): string => {
  if (assinado === true) return 'Assinado';
  if (assinado === false) return 'Não Assinado';
  return 'Pendente';
};

// Excel Export
export function exportPosAcordoToExcel(registros: ControleZapsign[], filtros?: any) {
  const formattedData = registros.map(r => ({
    'Nome': r.nome || '',
    'CPF/CNPJ': r.cpf_cnpj || '',
    'Telefone': r.telefone_devedor || '',
    'Credor': r.credor_cedrus || '',
    'Valor Negociado': formatCurrency(r.valor_total_negociado),
    'Status Assinatura': getStatusAssinatura(r.assinado_zapsign),
    'Status Negociação': r.status_negociacao || '',
    'Origem': r.origem || '',
    'Responsável': r.responsavel || '',
    'Data Criação': formatDate(r.data_criacao),
    'Negociação Cedrus': r.negociacao_cedrus || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formattedData);

  // Ajustar largura das colunas
  ws['!cols'] = [
    { width: 30 }, // Nome
    { width: 18 }, // CPF/CNPJ
    { width: 15 }, // Telefone
    { width: 25 }, // Credor
    { width: 18 }, // Valor Negociado
    { width: 15 }, // Status Assinatura
    { width: 18 }, // Status Negociação
    { width: 15 }, // Origem
    { width: 20 }, // Responsável
    { width: 12 }, // Data Criação
    { width: 20 }, // Negociação Cedrus
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Pós Acordo');

  const fileName = `pos_acordo_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return { success: true, filename: fileName };
}

// PDF Export
export async function exportPosAcordoToPDF(
  registros: ControleZapsign[],
  analytics: {
    totalRegistros: number;
    taxaAssinatura: number;
    valorTotal: number;
    assinados: number;
    pendentes: number;
    naoAssinados: number;
    statusNegociacaoData: { name: string; value: number }[];
    credorData: { name: string; count: number; valor: number }[];
  }
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header com logo (tentativa)
  try {
    const logoUrl = '/logo-superavit.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000);
      img.onload = () => {
        clearTimeout(timeout);
        const imgWidth = 40;
        const imgHeight = (img.height / img.width) * imgWidth;
        doc.addImage(img, 'PNG', 14, 8, imgWidth, imgHeight);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
      img.src = logoUrl;
    });
  } catch {
    // Fallback sem logo
  }

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Pós Acordo - ZapSign', pageWidth / 2, 20, { align: 'center' });

  // Data de geração
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });

  // Métricas resumidas
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Geral', 14, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const formatCurrencyValue = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const metricsY = 50;
  doc.text(`Total de Registros: ${analytics.totalRegistros}`, 14, metricsY);
  doc.text(`Taxa de Assinatura: ${analytics.taxaAssinatura}%`, 80, metricsY);
  doc.text(`Valor Total Negociado: ${formatCurrencyValue(analytics.valorTotal)}`, 150, metricsY);
  
  doc.text(`Assinados: ${analytics.assinados}`, 14, metricsY + 7);
  doc.text(`Pendentes: ${analytics.pendentes}`, 80, metricsY + 7);
  doc.text(`Não Assinados: ${analytics.naoAssinados}`, 150, metricsY + 7);

  // Status de Negociação
  if (analytics.statusNegociacaoData.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição por Status de Negociação', 14, metricsY + 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let statusY = metricsY + 28;
    analytics.statusNegociacaoData.forEach((item, index) => {
      if (index < 6) { // Máximo 6 status na primeira linha
        const x = 14 + (index * 45);
        doc.text(`${item.name}: ${item.value}`, x, statusY);
      }
    });
  }

  // Top 5 Credores
  if (analytics.credorData.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Credores', 14, metricsY + 38);
    
    const credorTableData = analytics.credorData.slice(0, 5).map(c => [
      c.name.length > 30 ? c.name.slice(0, 30) + '...' : c.name,
      c.count.toString(),
      formatCurrencyValue(c.valor)
    ]);

    (doc as any).autoTable({
      startY: metricsY + 42,
      head: [['Credor', 'Quantidade', 'Valor']],
      body: credorTableData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 14 },
    });
  }

  // Nova página para a tabela de dados
  doc.addPage();

  // Título da tabela
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento dos Registros', 14, 20);

  // Tabela principal
  const tableData = registros.map(r => [
    (r.nome || '').length > 25 ? (r.nome || '').slice(0, 25) + '...' : (r.nome || ''),
    r.cpf_cnpj || '',
    (r.credor_cedrus || '').length > 20 ? (r.credor_cedrus || '').slice(0, 20) + '...' : (r.credor_cedrus || ''),
    formatCurrency(r.valor_total_negociado),
    getStatusAssinatura(r.assinado_zapsign),
    r.status_negociacao || '',
    r.responsavel || '',
    formatDate(r.data_criacao),
  ]);

  (doc as any).autoTable({
    startY: 28,
    head: [['Nome', 'Documento', 'Credor', 'Valor', 'Status Ass.', 'Status Neg.', 'Responsável', 'Data']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 28 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 30 },
      7: { cellWidth: 22, halign: 'center' },
    },
    didDrawCell: (data: any) => {
      // Colorir status de assinatura
      if (data.column.index === 4 && data.section === 'body') {
        const value = data.cell.raw;
        if (value === 'Assinado') {
          doc.setTextColor(34, 197, 94);
        } else if (value === 'Não Assinado') {
          doc.setTextColor(239, 68, 68);
        } else {
          doc.setTextColor(245, 158, 11);
        }
      }
    },
    didParseCell: (data: any) => {
      if (data.column.index === 4 && data.section === 'body') {
        const value = data.cell.raw;
        if (value === 'Assinado') {
          data.cell.styles.textColor = [34, 197, 94];
        } else if (value === 'Não Assinado') {
          data.cell.styles.textColor = [239, 68, 68];
        } else {
          data.cell.styles.textColor = [245, 158, 11];
        }
      }
    },
  });

  // Rodapé com total
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de registros: ${registros.length}`, 14, finalY + 10);

  const fileName = `pos_acordo_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(fileName);

  return { success: true, filename: fileName };
}
