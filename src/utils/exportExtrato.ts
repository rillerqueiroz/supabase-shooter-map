import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TransacaoFinanceira, ExtratoMetrics } from "@/hooks/useExtratosBancarios";
import { formatDateFromDatabase } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// Função para traduzir tipos de transação
const traduzirTipo = (type: string): string => {
  const tipos: Record<string, string> = {
    "INTERNAL_TRANSFER_CREDIT": "Transferência Interna (Crédito)",
    "INTERNAL_TRANSFER_DEBIT": "Transferência Interna (Débito)",
    "PAYMENT_RECEIVED": "Pagamento Recebido",
    "PAYMENT_FEE": "Taxa de Pagamento",
    "PAYMENT_REFUND": "Reembolso de Pagamento",
    "TRANSFER": "Transferência PIX",
    "BANK_SLIP_FEE": "Taxa de Boleto",
    "CREDIT_CARD_FEE": "Taxa de Cartão de Crédito",
    "PIX_FEE": "Taxa PIX",
  };
  return tipos[type] || type;
};

// Função para extrair invoice_number da descrição
const extractInvoiceNumber = (description: string | null | undefined): string | null => {
  if (!description) return null;
  const match = description.match(/fatura\s+nr\.?\s*(\d+)/i);
  return match ? match[1] : null;
};

export function exportExtratoToExcel(
  transacoes: TransacaoFinanceira[],
  clienteNome: string
): { success: boolean; filename?: string; error?: any } {
  try {
    if (transacoes.length === 0) {
      return { success: false, error: "Nenhuma transação para exportar" };
    }

    const headers = [
      "Data",
      "Tipo",
      "Descrição",
      "Valor",
      "Saldo",
      "Referência Externa",
      "Payment ID",
      "Split ID",
    ];

    const data = transacoes.map((t) => [
      formatDateFromDatabase(t.date),
      t.type,
      t.description || "-",
      Number(t.value),
      Number(t.balance),
      t.external_reference || "-",
      t.payment_id || "-",
      t.split_id || "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Configurar largura das colunas
    ws["!cols"] = [
      { wch: 12 }, // Data
      { wch: 30 }, // Tipo
      { wch: 50 }, // Descrição
      { wch: 15 }, // Valor
      { wch: 15 }, // Saldo
      { wch: 30 }, // Ref Externa
      { wch: 25 }, // Payment ID
      { wch: 25 }, // Split ID
    ];

    // Formatar valores monetários
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let row = 1; row <= range.e.r; row++) {
      const valorCell = XLSX.utils.encode_cell({ r: row, c: 3 });
      const saldoCell = XLSX.utils.encode_cell({ r: row, c: 4 });

      if (ws[valorCell]) {
        ws[valorCell].z = 'R$ #,##0.00';
      }
      if (ws[saldoCell]) {
        ws[saldoCell].z = 'R$ #,##0.00';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");

    const filename = `Extrato_${clienteNome.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    XLSX.writeFile(wb, filename);

    return { success: true, filename };
  } catch (error) {
    console.error("Erro ao exportar para Excel:", error);
    return { success: false, error };
  }
}

export async function exportExtratoToPDF(
  transacoes: TransacaoFinanceira[],
  clienteNome: string,
  metrics: ExtratoMetrics,
  devedoresCache: Record<string, string>
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Título
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Extrato Bancário", pageWidth / 2, 20, { align: "center" });

  // Cliente
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${clienteNome}`, 14, 35);
  doc.text(
    `Data de geração: ${new Date().toLocaleDateString("pt-BR")}`,
    14,
    42
  );

  // Métricas
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro:", 14, 52);

  doc.setFont("helvetica", "normal");
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  doc.text(`Total Créditos: ${formatCurrency(metrics.totalCreditos)}`, 14, 59);
  doc.text(`Total Débitos: ${formatCurrency(metrics.totalDebitos)}`, 14, 66);
  doc.text(`Saldo Atual: ${formatCurrency(metrics.saldoAtual)}`, 14, 73);
  doc.text(
    `Quantidade de Transações: ${metrics.quantidadeTransacoes}`,
    14,
    80
  );

  // Tabela de transações
  const tableData = transacoes.map((t) => {
    const tipoTraduzido = traduzirTipo(t.type);
    let descricao = t.description || "-";
    
    // Se for INTERNAL_TRANSFER_CREDIT, adicionar informação do devedor
    if (t.type === "INTERNAL_TRANSFER_CREDIT") {
      const invoiceNumber = extractInvoiceNumber(t.description);
      const nomeDevedor = invoiceNumber ? devedoresCache[invoiceNumber] : null;
      if (nomeDevedor) {
        descricao = `${descricao}\nRepasse de negociação - Devedor: ${nomeDevedor}`;
      }
    }
    
    return [
      formatDateFromDatabase(t.date),
      tipoTraduzido,
      descricao,
      formatCurrency(Number(t.value)),
      formatCurrency(Number(t.balance)),
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [["Data", "Tipo", "Descrição", "Valor", "Saldo"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
    },
    bodyStyles: {
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 80 },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
    },
  });

  const filename = `Extrato_${clienteNome.replace(/\s+/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(filename);
}
