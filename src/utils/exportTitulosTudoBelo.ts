import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

export function exportTitulosToExcel(data: TituloTudoBelo[]) {
  const exportData = data.map((item) => ({
    ID: item.id || "",
    Documento: item.documento || "",
    "Tipo Documento": item.tipo_documento || "",
    Série: item.serie_documento || "",
    "Código Parceiro": item.codigo_parceiro || "",
    "Cód Devedor Cedrus": item.cod_devedor_cedrus || "",
    "Nome Parceiro": item.nome_parceiro || "",
    "Nome Fantasia": item.nome_fantasia || "",
    "CNPJ/CPF": item.cnpj_cpf || "",
    "Telefone 1": item.fone1 || "",
    "Telefone 2": item.fone2 || "",
    "Email": item.email || "",
    "Tipo Negócio": item.tipo_negocio || "",
    "Endereço": item.endereco || "",
    "Número": item.numero_endereco || "",
    "Complemento": item.complemento || "",
    "Bairro": item.bairro || "",
    "Cidade": item.cidade || "",
    "UF": item.uf || "",
    "Nº Parcela": item.numero_parcela || "",
    "Valor Parcela": item.valor_parcela || 0,
    "Saldo Parcela": item.saldo_parcela || 0,
    "Data Documento": formatDate(item.data_documento),
    "Data Vencimento": formatDate(item.data_vencimento),
    "Dias Atraso": item.dias_atraso || "",
    Observações: item.observacoes || "",
    "Forma Pagamento": item.forma_pagamento || "",
    "Status Boleto": item.status_boleto || "",
    Filial: item.filial || "",
    Vendedor: item.vendedor || "",
    "UF Cobrança": item.uf_cobranca || "",
    "Município Cobrança": item.municipio_cobranca || "",
    "Status Título": item.status_titulo || "",
    "Status Cedrus": item.status_cedrus || "",
    "Inserido Cedrus": item.inserido_cedrus ? "Sim" : "Não",
    "ID Título Cedrus": item.id_titulo_cedrus || "",
    "Credor Cedrus": item.credor_cedrus || "",
    "Processado Internamente": item.processado_internamente ? "Sim" : "Não",
    "Data Criação": formatDate(item.data_criacao),
    "Última Atualização": formatDate(item.ultima_atualizacao),
    "Valor Pago": item.valor_pago || 0,
    "Data Pagamento": formatDate(item.data_pagamento),
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Títulos Tudo Belo");

  // Ajustar largura das colunas
  const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  ws["!cols"] = colWidths;

  const filename = `titulos-tudobelo-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { success: true, filename };
}

export function exportTitulosToPDF(data: TituloTudoBelo[]) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text("Gestão de Títulos - Tudo Belo", 14, 22);

  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);
  doc.text(`Total de registros: ${data.length}`, 14, 36);

  // Calcular totais
  const totalValor = data.reduce((sum, item) => sum + (item.valor_parcela || 0), 0);
  const totalSaldo = data.reduce((sum, item) => sum + (item.saldo_parcela || 0), 0);

  doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 14, 42);
  doc.text(`Saldo Total: ${formatCurrency(totalSaldo)}`, 100, 42);

  const tableData = data.map((item) => [
    item.documento || "-",
    item.nome_parceiro?.substring(0, 20) || "-",
    formatCurrency(item.valor_parcela),
    formatCurrency(item.saldo_parcela),
    formatDate(item.data_vencimento),
    item.dias_atraso || "-",
    item.status_titulo || "-",
    item.status_cedrus || "-",
    item.inserido_cedrus ? "Sim" : "Não",
  ]);

  autoTable(doc, {
    startY: 50,
    head: [
      [
        "Documento",
        "Parceiro",
        "Valor",
        "Saldo",
        "Vencimento",
        "Atraso",
        "Status",
        "Cedrus",
        "Inserido",
      ],
    ],
    body: tableData,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const filename = `titulos-tudobelo-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
  doc.save(filename);

  return { success: true, filename };
}

// Interface para métricas por etapa
export interface EtapaMetrics {
  etapa: string;
  count: number;
  saldo: number;
}

// Exportar resumo da Visão por Etapas (apenas cards, sem tabela)
export function exportVisaoEtapasToPDF(
  metricas: EtapaMetrics[],
  totalTitulos: number,
  totalSaldo: number,
  incluiNegociacao: boolean
) {
  const doc = new jsPDF({ orientation: "landscape" });
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text("Visão por Etapas - Tudo Belo", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);
  
  // Indicador de filtro
  if (!incluiNegociacao) {
    doc.setTextColor(180, 83, 9);
    doc.text("Somente títulos Originais - Títulos de negociação estão ocultos", 14, 36);
  } else {
    doc.setTextColor(22, 163, 74);
    doc.text("Incluindo títulos de negociação", 14, 36);
  }

  // Card principal - Totais
  let yPos = 48;
  
  // Desenhar card de resumo geral
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, yPos, 260, 35, 3, 3, "FD");
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("RESUMO GERAL", 24, yPos + 12);
  
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalTitulos.toLocaleString("pt-BR")} títulos`, 24, yPos + 26);
  
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(totalSaldo), 150, yPos + 26);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Saldo Total", 150, yPos + 12);

  yPos += 45;

  // Título da seção de etapas
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Distribuição por Etapa", 14, yPos);
  yPos += 10;

  // Desenhar cards de etapas em grid
  const cardWidth = 82;
  const cardHeight = 40;
  const cardSpacing = 6;
  const cardsPerRow = 3;
  let cardIndex = 0;

  // Ordenar por saldo decrescente
  const metricasOrdenadas = [...metricas].sort((a, b) => b.saldo - a.saldo);

  metricasOrdenadas.forEach((metrica) => {
    const col = cardIndex % cardsPerRow;
    const row = Math.floor(cardIndex / cardsPerRow);
    
    const xPos = 14 + col * (cardWidth + cardSpacing);
    const cardYPos = yPos + row * (cardHeight + cardSpacing);

    // Verificar se precisa de nova página
    if (cardYPos + cardHeight > 190) {
      doc.addPage();
      yPos = 20;
      cardIndex = 0;
      return;
    }

    // Desenhar card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(xPos, cardYPos, cardWidth, cardHeight, 2, 2, "FD");

    // Nome da etapa
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const etapaNome = metrica.etapa.length > 25 ? metrica.etapa.substring(0, 22) + "..." : metrica.etapa;
    doc.text(etapaNome, xPos + 6, cardYPos + 12);

    // Quantidade
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`${metrica.count.toLocaleString("pt-BR")}`, xPos + 6, cardYPos + 26);

    // Saldo
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(formatCurrency(metrica.saldo), xPos + 6, cardYPos + 34);

    cardIndex++;
  });

  const filename = `visao-etapas-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
  doc.save(filename);

  return { success: true, filename };
}
