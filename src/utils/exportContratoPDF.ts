import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoSuperavit from '@/assets/logo-superavit.png';

interface ContratoData {
  externalReference: string;
  nome: string;
  descricao: string | null;
  credor_cedrus: string;
  contratante_nome: string;
  contratante_cpf_cnpj: string | null;
  contratante_email: string | null;
  contratante_telefone: string | null;
  contratante_endereco: string | null;
  contratante_bairro: string | null;
  contratante_cidade: string | null;
  contratante_estado: string | null;
  contratante_cep: string | null;
  valor_total: number | null;
  valor_boleto: number | null;
  numero_boletos: number;
  data_primeiro_boleto: string | null;
  tipo_geracao: string;
  tem_desconto_pontualidade: boolean;
  tipo_desconto: string | null;
  valor_desconto: number | null;
  dias_antecedencia_desconto: number | null;
  objeto_contrato: string | null;
  observacoes: string | null;
  cobranca_gerada: boolean;
  contrato_assinado: boolean;
  created_at: string;
  etapa_atual?: { nome: string; cor: string } | null;
  projeto?: { nome: string } | null;
}

interface CobrancaVinculada {
  descricao: string | null;
  nome: string | null;
  vencimento: string | null;
  data_pagamento: string | null;
  valor: number | null;
  valor_liquido: number | null;
  status: string | null;
  forma_pagamento: string | null;
  deleted?: boolean;
}

const DARK_GRAY: [number, number, number] = [55, 55, 55];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const d = dateString.split('T')[0];
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch {
    return '-';
  }
};

const getStatusLabel = (status: string | null, deleted?: boolean): string => {
  if (deleted) return 'Apagada';
  switch (status) {
    case 'RECEIVED': return 'Recebido';
    case 'RECEIVED_IN_CASH': return 'Recebido em Dinheiro';
    case 'PENDING': return 'Pendente';
    case 'OVERDUE': return 'Vencida';
    case 'CONFIRMED': return 'Confirmado';
    default: return status || '-';
  }
};

const getTipoGeracaoLabel = (tipo: string): string => {
  switch (tipo) {
    case 'contrato': return 'Apenas Contrato';
    case 'contrato_boleto': return 'Contrato e Boletos';
    case 'boleto': return 'Apenas Boletos';
    default: return tipo;
  }
};

const addLogoToPDF = (doc: jsPDF, yPosition: number = 12): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const maxW = 50, maxH = 18;
          const ratio = Math.min(maxW / img.width, maxH / img.height);
          const w = img.width * ratio, h = img.height * ratio;
          const x = (doc.internal.pageSize.getWidth() - w) / 2;
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, yPosition, w, h);
          resolve(yPosition + h + 6);
        } else resolve(yPosition);
      } catch { resolve(yPosition); }
    };
    img.onerror = () => resolve(yPosition);
    img.src = logoSuperavit;
  });
};

export async function exportContratoPDF(contrato: ContratoData, cobrancas: CobrancaVinculada[]) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const geradoEm = new Date().toLocaleString('pt-BR');
  const margin = 15;

  // === HEADER ===
  let y = await addLogoToPDF(doc, 12);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhes do Contrato', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${geradoEm}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // === INFORMAÇÕES DO CONTRATO ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 55, 55);
  doc.text('Informações do Contrato', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 2;

  const valorTotal = contrato.valor_total
    ? formatCurrency(contrato.valor_total)
    : contrato.valor_boleto && contrato.numero_boletos
      ? formatCurrency(contrato.valor_boleto * contrato.numero_boletos)
      : 'R$ 0,00';

  const infoRows: string[][] = [
    ['Identificador', contrato.externalReference],
    ['Nome', contrato.nome],
    ['Credor', contrato.credor_cedrus],
    ['Tipo de Geração', getTipoGeracaoLabel(contrato.tipo_geracao)],
    ['Valor Total', valorTotal],
    ['Parcelas', `${contrato.numero_boletos}x de ${formatCurrency(contrato.valor_boleto)}`],
    ['Data Primeiro Boleto', formatDate(contrato.data_primeiro_boleto)],
    ['Criado em', formatDate(contrato.created_at)],
  ];

  if (contrato.etapa_atual) {
    infoRows.push(['Etapa Atual', contrato.etapa_atual.nome]);
  }
  if (contrato.projeto) {
    infoRows.push(['Projeto', contrato.projeto.nome]);
  }
  if (contrato.objeto_contrato) {
    infoRows.push(['Objeto do Contrato', contrato.objeto_contrato]);
  }
  if (contrato.descricao) {
    infoRows.push(['Descrição', contrato.descricao]);
  }
  if (contrato.observacoes) {
    infoRows.push(['Observações', contrato.observacoes]);
  }
  if (contrato.tem_desconto_pontualidade) {
    const tipoDesc = contrato.tipo_desconto === 'fixo' ? 'Fixo' : 'Percentual';
    const valorDesc = contrato.tipo_desconto === 'fixo'
      ? formatCurrency(contrato.valor_desconto)
      : `${contrato.valor_desconto}%`;
    infoRows.push(['Desconto Pontualidade', `${tipoDesc}: ${valorDesc} (${contrato.dias_antecedencia_desconto} dias)`]);
  }

  // Status flags
  const statusItems: string[] = [];
  if (contrato.cobranca_gerada) statusItems.push('Cobrança Gerada');
  if (contrato.contrato_assinado) statusItems.push('Contrato Assinado');
  if (statusItems.length > 0) {
    infoRows.push(['Status', statusItems.join(' | ')]);
  }

  autoTable(doc, {
    startY: y,
    body: infoRows,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [100, 100, 100] },
      1: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    theme: 'plain',
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // === DADOS DO CONTRATANTE ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 55, 55);
  doc.text('Dados do Contratante', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 2;

  const contratanteRows: string[][] = [
    ['Nome', contrato.contratante_nome],
    ['CPF/CNPJ', contrato.contratante_cpf_cnpj || '-'],
  ];
  if (contrato.contratante_email) contratanteRows.push(['E-mail', contrato.contratante_email]);
  if (contrato.contratante_telefone) contratanteRows.push(['Telefone', contrato.contratante_telefone]);

  const enderecoPartes = [
    contrato.contratante_endereco,
    contrato.contratante_bairro,
    [contrato.contratante_cidade, contrato.contratante_estado].filter(Boolean).join(' - '),
    contrato.contratante_cep ? `CEP: ${contrato.contratante_cep}` : null,
  ].filter(Boolean);
  if (enderecoPartes.length > 0) {
    contratanteRows.push(['Endereço', enderecoPartes.join(', ')]);
  }

  autoTable(doc, {
    startY: y,
    body: contratanteRows,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [100, 100, 100] },
      1: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    theme: 'plain',
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // === COBRANÇAS VINCULADAS ===
  if (cobrancas.length > 0) {
    // Check if we need a new page
    if (y > 220) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 55, 55);
    doc.text(`Cobranças Vinculadas (${cobrancas.length})`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 2;

    const totalCobrancas = cobrancas.reduce((s, c) => s + (c.valor || 0), 0);
    const totalRecebido = cobrancas
      .filter(c => c.status === 'RECEIVED' || c.status === 'RECEIVED_IN_CASH')
      .reduce((s, c) => s + (c.valor_liquido || c.valor || 0), 0);
    const totalPendente = cobrancas
      .filter(c => c.status === 'PENDING' || c.status === 'OVERDUE')
      .reduce((s, c) => s + (c.valor || 0), 0);

    // Summary row
    autoTable(doc, {
      startY: y,
      body: [
        ['Total', formatCurrency(totalCobrancas), 'Recebido', formatCurrency(totalRecebido), 'Pendente', formatCurrency(totalPendente)],
      ],
      styles: { fontSize: 9, cellPadding: 3, fontStyle: 'bold' },
      columnStyles: {
        0: { textColor: [100, 100, 100] },
        1: { halign: 'right' },
        2: { textColor: [22, 163, 74] },
        3: { halign: 'right', textColor: [22, 163, 74] },
        4: { textColor: [202, 138, 4] },
        5: { halign: 'right', textColor: [202, 138, 4] },
      },
      theme: 'plain',
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 2;

    // Cobranças table
    const cobrancaHeaders = ['Descrição', 'Vencimento', 'Pagamento', 'Valor', 'Status', 'Forma Pgto.'];
    const cobrancaRows = cobrancas.map(c => [
      (c.descricao || c.nome || '-').substring(0, 40),
      formatDate(c.vencimento),
      formatDate(c.data_pagamento),
      formatCurrency(c.valor),
      getStatusLabel(c.status, c.deleted),
      c.forma_pagamento || '-',
    ]);

    autoTable(doc, {
      startY: y,
      head: [cobrancaHeaders],
      body: cobrancaRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: DARK_GRAY, fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: {
        3: { halign: 'right' },
      },
      theme: 'grid',
      margin: { left: margin, right: margin },
    });
  }

  doc.save(`contrato-${contrato.externalReference}_${new Date().toISOString().split('T')[0]}.pdf`);
}
