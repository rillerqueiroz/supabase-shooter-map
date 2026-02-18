import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ValorRecebido } from '@/hooks/useValoresRecebidosAsaas';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoSuperavit from '@/assets/logo-superavit.png';
import { formatDateFromDatabase } from '@/lib/utils';

const formatCurrency = (value: number | null) => {
  if (value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'Informação indisponível';
  try {
    const date = parseISO(dateString);
    return format(date, "dd/MM/yyyy - HH:mm:ss", { locale: ptBR });
  } catch {
    return 'Informação indisponível';
  }
};

const getMeioPagamento = (status: string | null) => {
  if (!status) return "Informação indisponível";
  if (status === "RECEIVED") return "Normal";
  if (status === "RECEIVED_IN_CASH") return "Excepcional";
  return status;
};

const formatMsgEnviada = (value: any) => {
  if (value === null || value === undefined) return 'Informação indisponível';
  return value === true || value === 'true' || value === 1 ? 'Sim' : 'Não';
};

// Primary accent color (HSL converted to RGB)
const PRIMARY_COLOR: [number, number, number] = [30, 64, 175]; // blue-700
const SECTION_BG: [number, number, number] = [239, 246, 255]; // blue-50
const HEADER_TEXT: [number, number, number] = [30, 64, 175];

async function addLogo(doc: jsPDF, pageWidth: number): Promise<number> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = (err) => reject(err);
      img.src = logoSuperavit;
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    await loadPromise;

    const logoWidth = 50;
    const logoHeight = 18;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(img, 'PNG', logoX, 10, logoWidth, logoHeight);
    return 32;
  } catch {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('SUPERÁVIT SERVIÇOS', pageWidth / 2, 20, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    return 28;
  }
}

export async function exportDetalhesPDF(registro: ValorRecebido, splits: any[] = []) {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Logo
    let yPos = await addLogo(doc, pageWidth);

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('DETALHES DA COBRANÇA', pageWidth / 2, yPos + 6, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(registro.nome || 'Cliente', pageWidth / 2, yPos + 14, { align: 'center' });

    // Identifier badge
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`${registro.Identificador}  •  Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPos + 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    yPos += 30;

    // Thin accent line
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    const checkPage = () => {
      if (yPos > 175) {
        doc.addPage();
        yPos = 15;
      }
    };

    // Section helper with styled header
    const addSection = (title: string, fields: [string, string][]) => {
      checkPage();
      // Section header with colored background
      doc.setFillColor(...SECTION_BG);
      doc.roundedRect(margin, yPos - 4, contentWidth, 9, 1.5, 1.5, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...HEADER_TEXT);
      doc.text(title, margin + 4, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 9;

      // Filter out empty values
      const filteredFields = fields.filter(([, v]) => v && v !== 'Informação indisponível' && v !== '-' && v !== 'R$ 0,00');

      if (filteredFields.length === 0) {
        yPos += 2;
        return;
      }

      autoTable(doc, {
        body: filteredFields,
        startY: yPos,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 }
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold', textColor: [100, 100, 100] },
          1: { cellWidth: contentWidth - 80 }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [250, 250, 252] }
      });

      yPos = (doc as any).lastAutoTable.finalY + 6;
      checkPage();
    };

    // === SECTIONS ===

    addSection('DADOS DO CLIENTE', [
      ['Nome', registro.nome || ''],
      ['CPF/CNPJ', registro.cpf_cnpj || ''],
      ['Email', registro.email || ''],
      ['Email Adicional', registro.email_adicional || ''],
      ['Celular', registro.celular || ''],
      ['Telefone', registro.fone || ''],
      ['Cliente', registro.unidade || ''],
    ]);

    addSection('DADOS DA COBRANÇA', [
      ['Identificador', registro.Identificador],
      ['Ref. Externa', registro.externalReference || ''],
      ['Tipo', registro.tipo_cobranca || ''],
      ['Nº Boleto', registro.numero_boleto || ''],
      ['Nº Fatura', registro.invoice_number || ''],
      ['Descrição', registro.descricao || ''],
      ['Status', registro.status || ''],
      ['Meio Pgto', getMeioPagamento(registro.status)],
    ]);

    addSection('VALORES', [
      ['Valor', formatCurrency(registro.valor)],
      ['Valor Original', formatCurrency(registro.valor_original)],
      ['Valor Líquido', formatCurrency(registro.valor_liquido)],
      ['Desconto Pontualidade', (() => {
        if (!registro.desconto_pontualidade) return '';
        try {
          const d = JSON.parse(registro.desconto_pontualidade);
          return `${d.type === 'FIXED' ? 'R$' : '%'} ${d.value}${d.dueDateLimitDays ? ` (${d.dueDateLimitDays} dias)` : ''}`;
        } catch { return formatCurrency(Number(registro.desconto_pontualidade)); }
      })()],
    ]);

    addSection('DATAS', [
      ['Vencimento', formatDate(registro.vencimento)],
      ['Vencimento Original', formatDate(registro.vencimento_original)],
      ['Pagamento', formatDate(registro.data_pagamento)],
      ['Criação', formatDate(registro.data_criacao)],
      ['Confirmação', formatDate(registro.data_confirmacao)],
      ['Crédito', formatDate(registro.data_credito)],
      ['Estimada', formatDate(registro.data_estimada)],
    ]);

    // === SPLITS SECTION ===
    if (splits.length > 0) {
      checkPage();

      // Section header
      doc.setFillColor(...SECTION_BG);
      doc.roundedRect(margin, yPos - 4, contentWidth, 9, 1.5, 1.5, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...HEADER_TEXT);
      doc.text(`SPLITS E COMISSÕES (${splits.length})`, margin + 4, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 9;

      const splitsTableData = splits.map((s: any) => {
        const isPercentual = s.tipo_valor === 'percentualValue';
        const valor = isPercentual ? (s.percentualValue || 0) : (s.fixedValue || 0);
        const valorCalculado = isPercentual && registro.valor ? (valor / 100) * registro.valor : null;
        const origemLabel = s.origem === 'projeto' ? 'Projeto' : s.origem === 'adicional' ? 'Adicional' : s.origem === 'manual' ? 'Manual' : '-';

        return [
          s.beneficiarioNome || s.walletId || 'Sem identificação',
          s.walletId || '-',
          origemLabel,
          s.description || '-',
          isPercentual ? `${valor}%` : formatCurrency(valor),
          valorCalculado !== null ? formatCurrency(valorCalculado) : '-'
        ];
      });

      autoTable(doc, {
        head: [['Beneficiário', 'Wallet ID', 'Origem', 'Descrição', 'Valor/Perc.', 'Valor Calc.']],
        body: splitsTableData,
        startY: yPos,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }
        },
        headStyles: {
          fillColor: PRIMARY_COLOR,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 45, fontSize: 8, textColor: [120, 120, 120] },
          2: { cellWidth: 25 },
          3: { cellWidth: 60 },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [250, 250, 252] }
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // Totalizador
      const totalPerc = splits
        .filter((s: any) => s.tipo_valor === 'percentualValue' || s.percentualValue)
        .reduce((acc: number, s: any) => acc + Number(s.percentualValue || 0), 0);

      if (totalPerc > 0) {
        const totalValor = registro.valor ? (totalPerc / 100) * registro.valor : null;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY_COLOR);
        const totalText = `Total Percentual: ${totalPerc.toFixed(1)}%${totalValor !== null ? `  =  ${formatCurrency(totalValor)}` : ''}`;
        doc.text(totalText, pageWidth - margin, yPos + 2, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPos += 8;
      }

      checkPage();
    }

    // === OTHER INFO ===
    addSection('OUTRAS INFORMAÇÕES', [
      ['Usuário', registro.usuario || ''],
      ['Forma de Inserção', registro.forma_insercao || ''],
      ['Credor Cedrus', registro.credor_cedrus || ''],
      ['Hora de Envio', formatDateTime(registro.hora_envio)],
      ['Msg Enviada', formatMsgEnviada(registro.msg_enviada)],
      ['Forma de Pagamento', registro.forma_pagamento || ''],
    ]);

    // Footer line
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Superávit Serviços — Documento gerado automaticamente', pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`detalhes_${registro.Identificador}_${new Date().toISOString().split('T')[0]}.pdf`);

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao exportar PDF:', error);
    return { success: false, error };
  }
}
