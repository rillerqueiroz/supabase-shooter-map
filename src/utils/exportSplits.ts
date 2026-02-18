import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SplitDetalhado, SplitsFilters } from "@/hooks/useSplits";
import { format } from "date-fns";
import { formatDateFromDatabase } from "@/lib/utils";

// Função auxiliar para formatar valores
const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatDate = (date: string | null): string => formatDateFromDatabase(date);

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmado",
    DONE: "Pago",
    CANCELLED: "Cancelado",
    UNKNOWN: "Desconhecido",
  };
  return labels[status] || "Desconhecido";
}

// Exportar para Excel
export function exportSplitsToExcel(splits: SplitDetalhado[], filters: SplitsFilters) {
  const dados = splits.map((split) => ({
    "Pagador": split.nomePagador || "N/A",
    "Cliente": split.credorCedrus || "N/A",
    "Identificador": split.identificador || "N/A",
    "Wallet ID": split.walletId || "N/A",
    "Data Pagamento": formatDate(split.dataPagamento),
    "Valor da Cobrança": formatCurrency(split.valorCobranca),
    "% Split": split.percentualValue ? `${split.percentualValue}%` : "Fixo",
    "Valor do Split": formatCurrency(split.totalValue),
    "Status": getStatusLabel(split.status),
    "Descrição": split.description || "N/A",
  }));

  // Calcular totais
  const totalValorCobranca = splits.reduce((sum, split) => sum + (split.valorCobranca || 0), 0);
  const totalValorSplit = splits.reduce((sum, split) => sum + split.totalValue, 0);

  // Adicionar linha de totais
  dados.push({
    "Pagador": "TOTAL",
    "Cliente": "",
    "Identificador": "",
    "Wallet ID": "",
    "Data Pagamento": "",
    "Valor da Cobrança": formatCurrency(totalValorCobranca),
    "% Split": "",
    "Valor do Split": formatCurrency(totalValorSplit),
    "Status": "",
    "Descrição": "",
  });

  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Splits");

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 30 }, // Pagador
    { wch: 30 }, // Cliente
    { wch: 20 }, // Identificador
    { wch: 40 }, // Wallet ID
    { wch: 15 }, // Data Pagamento
    { wch: 18 }, // Valor da Cobrança
    { wch: 12 }, // % Split
    { wch: 18 }, // Valor do Split
    { wch: 15 }, // Status
    { wch: 40 }, // Descrição
  ];
  worksheet["!cols"] = colWidths;

  const fileName = `gestao-splits-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Exportar para PDF
export function exportSplitsToPDF(splits: SplitDetalhado[], filters: SplitsFilters, totalValue: number) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Título
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Gestão de Splits", 14, 20);

  // Data de geração
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 27);

  // Informações de filtros aplicados
  let yPos = 32;
  if (filters.status && filters.status.length > 0) {
    doc.text(`Status: ${filters.status.map(getStatusLabel).join(", ")}`, 14, yPos);
    yPos += 5;
  }
  if (filters.pagadores && filters.pagadores.length > 0) {
    doc.text(`Pagadores: ${filters.pagadores.join(", ")}`, 14, yPos);
    yPos += 5;
  }
  if (filters.walletIds && filters.walletIds.length > 0) {
    doc.text(`Wallet IDs: ${filters.walletIds.join(", ")}`, 14, yPos);
    yPos += 5;
  }
  if (filters.clientes && filters.clientes.length > 0) {
    doc.text(`Clientes: ${filters.clientes.join(", ")}`, 14, yPos);
    yPos += 5;
  }
  if (filters.dateRange?.from || filters.dateRange?.to) {
    const from = filters.dateRange.from ? formatDateFromDatabase(filters.dateRange.from.toISOString(), 'pt-BR') : "Início";
    const to = filters.dateRange.to ? formatDateFromDatabase(filters.dateRange.to.toISOString(), 'pt-BR') : "Fim";
    doc.text(`Período: ${from} até ${to}`, 14, yPos);
    yPos += 5;
  }

  // Resumo
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  yPos += 5;
  doc.text(`Total de Splits: ${splits.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Valor Total: ${formatCurrency(totalValue)}`, 14, yPos);

  // Cabeçalhos da tabela
  const headers = [
    "Pagador",
    "Cliente",
    "Identificador",
    "Wallet ID",
    "Data Pag.",
    "Valor Cobrança",
    "Valor Split",
    "Status",
  ];

  // Dados da tabela
  const body = splits.map((split) => [
    split.nomePagador || "N/A",
    split.credorCedrus || "N/A",
    split.identificador || "N/A",
    split.walletId || "N/A",
    formatDate(split.dataPagamento),
    formatCurrency(split.valorCobranca),
    formatCurrency(split.totalValue),
    getStatusLabel(split.status),
  ]);

  // Calcular totais
  const totalValorCobranca = splits.reduce((sum, split) => sum + (split.valorCobranca || 0), 0);
  const totalValorSplit = splits.reduce((sum, split) => sum + split.totalValue, 0);

  // Adicionar linha de totais
  body.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    formatCurrency(totalValorCobranca),
    formatCurrency(totalValorSplit),
    "",
  ]);

  autoTable(doc, {
    startY: yPos + 10,
    head: [headers],
    body: body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 30 },  // Pagador
      1: { cellWidth: 30 },  // Cliente
      2: { cellWidth: 25 },  // Identificador
      3: { cellWidth: 30 },  // Wallet ID
      4: { cellWidth: 20 },  // Data Pag.
      5: { cellWidth: 25, halign: "right" },  // Valor Cobrança
      6: { cellWidth: 25, halign: "right" },  // Valor Split
      7: { cellWidth: 20, halign: "center" },  // Status
    },
    margin: { top: 10 },
    didParseCell: (data) => {
      // Destacar "Sem Split" em amarelo na coluna Wallet ID (índice 3)
      if (data.section === "body" && data.column.index === 3 && data.cell.raw === "Sem Split") {
        data.cell.styles.fillColor = [255, 235, 59]; // Amarelo
        data.cell.styles.textColor = [0, 0, 0]; // Texto preto
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const fileName = `gestao-splits-${format(new Date(), "yyyy-MM-dd-HHmmss")}.pdf`;
  doc.save(fileName);
}
