import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoSuperavit from '@/assets/logo-superavit.png';
import { getStatusConfig } from '@/utils/statusMapping';

interface CobrancaItem {
  nome: string | null;
  descricao: string | null;
  credor_cedrus: string | null;
  status: string | null;
  vencimento: string | null;
  forma_pagamento: string | null;
  valor: number | null;
  valor_liquido: number | null;
  data_pagamento: string | null;
  desconto_pontualidade: string | null;
  projeto: string | null;
}

export type GroupingType = 'none' | 'projeto' | 'status';

export interface ExportPDFOptions {
  showEmpresa: boolean;
  showDesconto: boolean;
  showProjeto: boolean;
  grouping: GroupingType;
}

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    const d = dateString.split('T')[0];
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch {
    return '-';
  }
};

const calcularValorComDesconto = (item: CobrancaItem): number => {
  const valorBase = Number(item.valor) || 0;
  if (!item.desconto_pontualidade) return valorBase;
  try {
    const desconto = JSON.parse(item.desconto_pontualidade);
    if (desconto.type === 'FIXED') return Math.max(0, valorBase - Number(desconto.value));
    if (desconto.type === 'PERCENTAGE') return Math.max(0, valorBase * (1 - Number(desconto.value) / 100));
    return valorBase;
  } catch {
    return valorBase;
  }
};

const isRecebido = (status: string | null): boolean =>
  ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED', 'ANTICIPATED'].includes(status || '');

const isVencido = (status: string | null): boolean => status === 'OVERDUE';

const isPendente = (status: string | null): boolean =>
  ['PENDING', 'CREATED', 'AWAITING_RISK_ANALYSIS', 'AUTHORIZED'].includes(status || '');

const getValorRecebido = (item: CobrancaItem): number => {
  if (isRecebido(item.status)) return Number(item.valor_liquido) || Number(item.valor) || 0;
  return 0;
};

const addLogoToPDF = (doc: jsPDF, yPosition: number = 15): Promise<number> => {
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

const DARK_GRAY: [number, number, number] = [55, 55, 55];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

function buildHeadCols(options: ExportPDFOptions): string[] {
  const cols: string[] = ['Nome', 'Descrição'];
  if (options.showEmpresa) cols.push('Empresa');
  if (options.showProjeto) cols.push('Projeto');
  cols.push('Status', 'Vencimento', 'Forma Pgto.', 'Valor');
  if (options.showDesconto) cols.push('Valor c/ Desc.');
  cols.push('Valor Recebido');
  return cols;
}

function buildRow(item: CobrancaItem, options: ExportPDFOptions): string[] {
  const row: string[] = [
    (item.nome || '-').substring(0, 22),
    (item.descricao || '-').replace(/;/g, ';\n').replace(/ - /g, '\n'),
  ];
  if (options.showEmpresa) row.push(item.credor_cedrus || '-');
  if (options.showProjeto) row.push(item.projeto || '-');
  row.push(
    getStatusConfig(item.status).label,
    formatDate(item.vencimento),
    item.forma_pagamento || '-',
    formatCurrency(Number(item.valor) || 0),
  );
  if (options.showDesconto) row.push(formatCurrency(calcularValorComDesconto(item)));
  row.push(formatCurrency(getValorRecebido(item)));
  return row;
}

function buildColStyles(options: ExportPDFOptions): Record<number, any> {
  const colStyles: Record<number, any> = {};
  colStyles[1] = { cellWidth: 45 }; // Descrição
  let colIdx = 2;
  if (options.showEmpresa) colIdx++;
  if (options.showProjeto) colIdx++;
  colIdx += 3; // Status, Vencimento, Forma
  colStyles[colIdx] = { halign: 'right' }; // Valor
  colIdx++;
  if (options.showDesconto) { colStyles[colIdx] = { halign: 'right' }; colIdx++; }
  colStyles[colIdx] = { halign: 'right' }; // Valor Recebido
  return colStyles;
}

function calcSummary(items: CobrancaItem[], options: ExportPDFOptions): string[][] {
  const totalRecebido = items.reduce((s, i) => s + getValorRecebido(i), 0);
  const aReceberSemDesconto = items.filter(i => isPendente(i.status)).reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const aReceberComDesconto = items.filter(i => isPendente(i.status)).reduce((s, i) => s + calcularValorComDesconto(i), 0);
  const totalVencido = items.filter(i => isVencido(i.status)).reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const totalVencidoComDesconto = items.filter(i => isVencido(i.status)).reduce((s, i) => s + calcularValorComDesconto(i), 0);
  const totalGeral = items.reduce((s, i) => s + (Number(i.valor) || 0), 0);

  const rows: string[][] = [
    ['Valor Total das Cobranças', formatCurrency(totalGeral)],
    ['Valor Total Recebido', formatCurrency(totalRecebido)],
    ['Valor a Receber (sem desconto)', formatCurrency(aReceberSemDesconto)],
  ];
  if (options.showDesconto) rows.push(['Valor a Receber (com desconto pontualidade)', formatCurrency(aReceberComDesconto)]);
  rows.push(['Valor Vencido (sem desconto)', formatCurrency(totalVencido)]);
  if (options.showDesconto) rows.push(['Valor Vencido (com desconto pontualidade)', formatCurrency(totalVencidoComDesconto)]);
  return rows;
}

function addSummaryTable(doc: jsPDF, summaryRows: string[][], startY: number) {
  autoTable(doc, {
    startY,
    head: [['Descrição', 'Valor']],
    body: summaryRows,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: DARK_GRAY, fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles: { 0: { cellWidth: 160 }, 1: { halign: 'right', fontStyle: 'bold' } },
    theme: 'grid',
    margin: { left: 40, right: 40 },
  });
}

function renderDataTable(doc: jsPDF, items: CobrancaItem[], options: ExportPDFOptions, startY: number) {
  const sorted = [...items].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  const headCols = buildHeadCols(options);
  const rows = sorted.map(item => buildRow(item, options));
  const colStyles = buildColStyles(options);

  autoTable(doc, {
    startY,
    head: [headCols],
    body: rows,
    styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: DARK_GRAY, fontSize: 6.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles: colStyles,
    theme: 'grid',
    margin: { left: 8, right: 8 },
  });
}

export async function exportCobrancasPDF(data: CobrancaItem[], options: ExportPDFOptions) {
  const { showEmpresa, showDesconto, showProjeto, grouping } = options;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const geradoEm = new Date().toLocaleString('pt-BR');
  const credores = [...new Set(data.map(d => d.credor_cedrus).filter(Boolean))].sort();
  const credorInfo = credores.length > 0 ? credores.join(', ') : 'Todos';

  // === HEADER ===
  let y = await addLogoToPDF(doc, 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Contas a Receber - Superavit', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Empresa(s): ${credorInfo}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Gerado em: ${geradoEm}  |  Total: ${data.length} cobranças`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 8;

  // === DATA TABLES ===
  if (grouping === 'none') {
    renderDataTable(doc, data, options, y);
  } else if (grouping === 'projeto') {
    const groups = new Map<string, CobrancaItem[]>();
    data.forEach(item => {
      const key = item.projeto || 'Sem Projeto';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    let firstGroup = true;
    for (const key of sortedKeys) {
      if (!firstGroup) doc.addPage();
      const gy = firstGroup ? y : 15;
      firstGroup = false;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 55, 55);
      doc.text(`Projeto: ${key}`, 8, gy);
      doc.setTextColor(0, 0, 0);
      renderDataTable(doc, groups.get(key)!, options, gy + 4);
    }
  } else if (grouping === 'status') {
    const vencidos = data.filter(i => isVencido(i.status));
    const aVencer = data.filter(i => isPendente(i.status));
    const recebidos = data.filter(i => isRecebido(i.status));
    const outros = data.filter(i => !isVencido(i.status) && !isPendente(i.status) && !isRecebido(i.status));

    const sections: { label: string; items: CobrancaItem[] }[] = [
      { label: 'Vencidos', items: vencidos },
      { label: 'A Vencer (Pendentes)', items: aVencer },
      { label: 'Recebidos', items: recebidos },
    ];
    if (outros.length > 0) sections.push({ label: 'Outros', items: outros });

    let firstSection = true;
    for (const section of sections) {
      if (section.items.length === 0) continue;
      if (!firstSection) doc.addPage();
      const sy = firstSection ? y : 15;
      firstSection = false;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 55, 55);
      doc.text(`${section.label} (${section.items.length})`, 8, sy);
      doc.setTextColor(0, 0, 0);
      renderDataTable(doc, section.items, options, sy + 4);
    }
  }

  // === SUMMARY PAGE ===
  doc.addPage();
  let sy = await addLogoToPDF(doc, 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Financeiro', doc.internal.pageSize.getWidth() / 2, sy, { align: 'center' });
  sy += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Empresa(s): ${credorInfo}`, doc.internal.pageSize.getWidth() / 2, sy, { align: 'center' });
  sy += 5;
  doc.text(`Gerado em: ${geradoEm}`, doc.internal.pageSize.getWidth() / 2, sy, { align: 'center' });
  sy += 10;

  if (grouping === 'none') {
    // Single summary
    addSummaryTable(doc, calcSummary(data, options), sy);
  } else if (grouping === 'projeto') {
    // Summary per project
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', doc.internal.pageSize.getWidth() / 2, sy, { align: 'center' });
    sy += 4;
    addSummaryTable(doc, calcSummary(data, options), sy);

    const groups = new Map<string, CobrancaItem[]>();
    data.forEach(item => {
      const key = item.projeto || 'Sem Projeto';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    for (const key of sortedKeys) {
      doc.addPage();
      let py = 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 55, 55);
      doc.text(`Resumo - Projeto: ${key}`, doc.internal.pageSize.getWidth() / 2, py, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      py += 6;
      addSummaryTable(doc, calcSummary(groups.get(key)!, options), py);
    }
  } else if (grouping === 'status') {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', doc.internal.pageSize.getWidth() / 2, sy, { align: 'center' });
    sy += 4;
    addSummaryTable(doc, calcSummary(data, options), sy);

    const sections: { label: string; items: CobrancaItem[] }[] = [
      { label: 'Vencidos', items: data.filter(i => isVencido(i.status)) },
      { label: 'A Vencer (Pendentes)', items: data.filter(i => isPendente(i.status)) },
      { label: 'Recebidos', items: data.filter(i => isRecebido(i.status)) },
    ];
    for (const section of sections) {
      if (section.items.length === 0) continue;
      doc.addPage();
      let ssy = 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 55, 55);
      doc.text(`Resumo - ${section.label} (${section.items.length})`, doc.internal.pageSize.getWidth() / 2, ssy, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      ssy += 6;
      addSummaryTable(doc, calcSummary(section.items, options), ssy);
    }
  }

  doc.save(`relatorio-contas-receber-superavit_${new Date().toISOString().split('T')[0]}.pdf`);
  return { success: true };
}
