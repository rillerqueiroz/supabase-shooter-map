import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ValorRecebido } from '@/hooks/useValoresRecebidosAsaas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoSuperavit from '@/assets/logo-superavit.png';
import { formatDateFromDatabase } from '@/lib/utils';

// Função para formatar moeda
const formatCurrency = (value: number | null) => {
  if (value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para formatar data
const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

// Exportação para Excel
export function exportValoresRecebidosToExcel(data: ValorRecebido[], filtros?: any) {
  try {
    const getMeioPagamento = (status: string | null) => {
      if (!status) return "-";
      if (status === "RECEIVED") return "Normal";
      if (status === "RECEIVED_IN_CASH") return "Excepcional";
      return status;
    };

    const exportData = data.map(item => ({
      'Nome': item.nome || '-',
      'Descrição': item.descricao || '-',
      'Cliente': item.unidade || '-',
      'Data Pagamento': formatDate(item.data_pagamento),
      'Vencimento': formatDate(item.vencimento),
      'Forma Pagamento': item.forma_pagamento || '-',
      'Meio de Pagamento': getMeioPagamento(item.status),
      'Valor': formatCurrency(item.valor)
    }));

    // Adicionar linha de total
    const totalGeral = data.reduce((sum, item) => sum + (item.valor || 0), 0);
    exportData.push({
      'Nome': '',
      'Descrição': '',
      'Cliente': '',
      'Data Pagamento': '',
      'Vencimento': '',
      'Forma Pagamento': '',
      'Meio de Pagamento': 'TOTAL GERAL',
      'Valor': formatCurrency(totalGeral)
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Definir largura das colunas
    ws['!cols'] = [
      { width: 30 }, // Nome
      { width: 40 }, // Descrição
      { width: 20 }, // Cliente
      { width: 15 }, // Data Pagamento
      { width: 15 }, // Vencimento
      { width: 20 }, // Forma Pagamento
      { width: 18 }, // Meio de Pagamento
      { width: 15 }  // Valor
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Valores Recebidos');
    XLSX.writeFile(wb, `valores_recebidos_${new Date().toISOString().split('T')[0]}.xlsx`);

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    return { success: false, error };
  }
}

// Exportação para PDF
export async function exportValoresRecebidosToPDF(
  data: ValorRecebido[], 
  filtros?: any, 
  totalGeral?: number
) {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo centralizado com timeout e fallback
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('✅ Logo carregado com sucesso');
          resolve(true);
        };
        img.onerror = (err) => {
          console.error('❌ Erro ao carregar logo:', err);
          reject(err);
        };
        img.src = logoSuperavit;
        
        // Timeout de 5 segundos
        setTimeout(() => reject(new Error('Timeout ao carregar logo')), 5000);
      });
      
      await loadPromise;
      
      const logoWidth = 50;
      const logoHeight = 18;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(img, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (error) {
      console.error('❌ Falha ao carregar logo - usando texto:', error);
      // Fallback: adicionar texto como logo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SUPERÁVIT SERVIÇOS', pageWidth / 2, 20, { align: 'center' });
    }

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO GERENCIAL - VALORES RECEBIDOS', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('DINAMYS', pageWidth / 2, 42, { align: 'center' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 48, { align: 'center' });

    // Resumo
    let yPos = 58;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    doc.text(`Total de registros: ${data.length}`, 20, yPos);
    yPos += 5;
    const total = totalGeral !== undefined ? totalGeral : data.reduce((sum, item) => sum + (item.valor || 0), 0);
    doc.text(`Total recebido: ${formatCurrency(total)}`, 20, yPos);
    yPos += 5;
    const media = data.length > 0 ? total / data.length : 0;
    doc.text(`Ticket médio: ${formatCurrency(media)}`, 20, yPos);

    // Filtros aplicados
    if (filtros && (filtros.nomes?.length || filtros.unidades?.length || filtros.formasPagamento?.length || filtros.meiosPagamento?.length || filtros.searchTerm)) {
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Filtros Aplicados:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 5;
      
      if (filtros.nomes?.length) {
        doc.text(`• Nomes: ${filtros.nomes.join(', ')}`, 20, yPos);
        yPos += 5;
      }
      if (filtros.unidades?.length) {
        doc.text(`• Unidades: ${filtros.unidades.join(', ')}`, 20, yPos);
        yPos += 5;
      }
      if (filtros.formasPagamento?.length) {
        doc.text(`• Formas de Pagamento: ${filtros.formasPagamento.join(', ')}`, 20, yPos);
        yPos += 5;
      }
      if (filtros.meiosPagamento?.length) {
        doc.text(`• Meios de Pagamento: ${filtros.meiosPagamento.join(', ')}`, 20, yPos);
        yPos += 5;
      }
      if (filtros.searchTerm) {
        doc.text(`• Busca: ${filtros.searchTerm}`, 20, yPos);
        yPos += 5;
      }
    }

    // Helper para meio de pagamento
    const getMeioPagamento = (status: string | null) => {
      if (!status) return "-";
      if (status === "RECEIVED") return "Normal";
      if (status === "RECEIVED_IN_CASH") return "Excepcional";
      return status;
    };

    // Tabela
    const tableData = data.map(item => [
      item.nome || '-',
      item.descricao || '-',
      item.unidade || '-',
      formatDate(item.data_pagamento),
      formatDate(item.vencimento),
      item.forma_pagamento || '-',
      getMeioPagamento(item.status),
      formatCurrency(item.valor)
    ]);

    // Adicionar linha de total
    tableData.push([
      '', '', '', '', '', '', 'TOTAL GERAL', formatCurrency(total)
    ]);

    autoTable(doc, {
      head: [['Nome', 'Descrição', 'Cliente', 'Data Pagto', 'Vencimento', 'Forma Pagto', 'Meio Pagto', 'Valor']],
      body: tableData,
      startY: yPos + 5,
      styles: { 
        fontSize: 9, 
        cellPadding: 2.5,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [60, 60, 60],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 38 }, // Nome
        1: { cellWidth: 60 }, // Descrição
        2: { cellWidth: 30 }, // Cliente
        3: { cellWidth: 22, halign: 'center' }, // Data Pagamento
        4: { cellWidth: 22, halign: 'center' }, // Vencimento
        5: { cellWidth: 32 }, // Forma Pagamento
        6: { cellWidth: 30 }, // Meio Pagamento
        7: { cellWidth: 27, halign: 'right' } // Valor
      },
      margin: { left: 10, right: 10 },
      // Destacar última linha (total)
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`relatorio_valores_recebidos_${new Date().toISOString().split('T')[0]}.pdf`);

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao exportar PDF:', error);
    return { success: false, error };
  }
}
