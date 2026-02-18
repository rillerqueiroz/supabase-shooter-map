import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransacaoFinanceira } from "@/hooks/useExtratosBancarios";
import { formatDateFromDatabase } from "@/lib/utils";
import { TipoTransacaoBadge } from "./TipoTransacaoBadge";
import { supabase } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
interface TransacaoDetailsModalProps {
  transacao: TransacaoFinanceira | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const extractInvoiceNumber = (description: string | null | undefined): string | null => {
  if (!description) return null;

  // Regex para capturar número após "fatura nr." ou "fatura nr "
  const match = description.match(/fatura\s+nr\.?\s*(\d+)/i);
  return match ? match[1] : null;
};
export function TransacaoDetailsModal({
  transacao,
  open,
  onOpenChange
}: TransacaoDetailsModalProps) {
  const [cobrancaDetalhes, setCobrancaDetalhes] = useState<any>(null);
  const [loadingCobranca, setLoadingCobranca] = useState(false);
  const [acordoDetalhes, setAcordoDetalhes] = useState<any>(null);
  const [loadingAcordo, setLoadingAcordo] = useState(false);
  const [erroAcordo, setErroAcordo] = useState(false);
  const fetchAcordoDetalhes = async (retry = 0) => {
    if (!cobrancaDetalhes) return;
    setLoadingAcordo(true);
    setErroAcordo(false);
    try {
      const response = await fetch("https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/consulta-negociacao-cedrus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invoice_number: cobrancaDetalhes["Número da fatura"],
          nome: cobrancaDetalhes["Nome"],
          cpf_cnpj: cobrancaDetalhes["CPF ou CNPJ"],
          identificador: cobrancaDetalhes["Identificador"]
        })
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar detalhes do acordo");
      }
      const data = await response.json();

      // Verificar se o webhook ainda está processando
      if (data.message === "Workflow was started") {
        // Se ainda não tentou 3 vezes, tentar novamente após 2 segundos
        if (retry < 3) {
          console.log(`Workflow iniciado, tentando novamente (${retry + 1}/3)...`);
          setTimeout(() => fetchAcordoDetalhes(retry + 1), 2000);
          return;
        } else {
          throw new Error("Timeout ao aguardar processamento do acordo");
        }
      }

      // Processar resposta: pode vir direto no body ou dentro de um objeto
      let acordoData = null;
      if (data.body) {
        // Resposta com estrutura completa
        acordoData = data.body;
      } else if (Array.isArray(data) && data.length > 0) {
        // Resposta em array
        acordoData = data[0].body || data[0];
      } else if (data.negociacao) {
        // Resposta direta
        acordoData = data;
      }
      setAcordoDetalhes(acordoData);
    } catch (err) {
      console.error("Erro ao buscar detalhes do acordo:", err);
      setErroAcordo(true);
      setAcordoDetalhes(null);
    } finally {
      setLoadingAcordo(false);
    }
  };
  useEffect(() => {
    const fetchCobrancaDetalhes = async () => {
      // Extrair número da fatura da descrição
      const invoiceNumber = extractInvoiceNumber(transacao?.description);
      if (!transacao || transacao.type !== "INTERNAL_TRANSFER_CREDIT" || !invoiceNumber) {
        setCobrancaDetalhes(null);
        setAcordoDetalhes(null);
        return;
      }
      setLoadingCobranca(true);
      try {
        const {
          data,
          error
        } = await supabase.from("Atualizar cobranças futuras com CEDRUS").select("*").eq('"Número da fatura"', invoiceNumber).maybeSingle();
        if (error) {
          console.error("Erro ao buscar detalhes da cobrança:", error);
          setCobrancaDetalhes(null);
        } else {
          setCobrancaDetalhes(data);
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes da cobrança:", err);
        setCobrancaDetalhes(null);
      } finally {
        setLoadingCobranca(false);
      }
    };
    if (open) {
      fetchCobrancaDetalhes();
      setAcordoDetalhes(null);
      setErroAcordo(false);
    }
  }, [transacao, open]);
  useEffect(() => {
    if (open && cobrancaDetalhes) {
      fetchAcordoDetalhes();
    }
  }, [cobrancaDetalhes, open]);
  if (!transacao) return null;
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return formatDateFromDatabase(dateString);
    } catch {
      return dateString;
    }
  };

  // Formatar valores monetários vindos do webhook (valores em centavos)
  const formatCurrencyFromCents = (value: string | number | null | undefined) => {
    if (!value) return "R$ 0,00";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(numValue / 100);
  };

  // Formatar datas do formato DD/MM/YYYY
  const formatDateBR = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return dateStr; // Já vem no formato brasileiro
  };

  // Mapear status para texto legível
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'P': 'Pago',
      'A': 'Aberto',
      'V': 'Vencido',
      'C': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  // Exportar acordo para Excel (completo)
  const exportarAcordoExcel = (acordo: any) => {
    try {
      const workbook = XLSX.utils.book_new();

      // Aba 0: Repasse para o Credor
      const repasseData = [["REPASSE PARA O CREDOR"], [], ["Cliente", transacao?.cliente_nome || "-"], ["Data", transacao ? formatDateFromDatabase(transacao.date) : "-"], ["Valor", transacao ? formatCurrency(transacao.value) : "-"], ["Saldo Após Transação", transacao ? formatCurrency(transacao.balance) : "-"], ["Descrição", transacao?.description || "-"]];
      const wsRepasse = XLSX.utils.aoa_to_sheet(repasseData);
      XLSX.utils.book_append_sheet(workbook, wsRepasse, "Repasse");

      // Aba 1: Resumo da Negociação
      const resumoData = [["RESUMO DA NEGOCIAÇÃO"], [], ["Número da Negociação", acordo.negociacao?.replace(/^005329-000000/, "") || "-"], ["Credor", acordo.credor || "-"], ["Nome do Devedor", acordo.nome_devedor || "-"], ["Data da Negociação", formatDateBR(acordo.dt_negociacao)], ["Operador", acordo.operador || "-"], ["Status", getStatusText(acordo.status)], ["Número de Parcelas", acordo.num_parcelas || "-"], [], ["VALORES"], ["Saldo Original", formatCurrencyFromCents(acordo.vl_saldo_original)], ["Valor Total Negociado", formatCurrencyFromCents(acordo.vl_total_negociado)], ["Desconto", formatCurrencyFromCents(acordo.vl_desconto)], ["Honorários", formatCurrencyFromCents(acordo.vl_honorario)]];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");

      // Aba 2: Títulos Originais
      if (acordo.titulos_negociados && acordo.titulos_negociados.length > 0) {
        const titulosData = acordo.titulos_negociados.map((titulo: any) => ({
          "Vencimento": formatDateBR(titulo.dt_vencimento),
          "Saldo Original": formatCurrencyFromCents(titulo.vl_saldo_original),
          "Desconto": formatCurrencyFromCents(titulo.vl_desconto),
          "Total Negociado": formatCurrencyFromCents(titulo.vl_total_negociado)
        }));
        const wsTitulos = XLSX.utils.json_to_sheet(titulosData);
        XLSX.utils.book_append_sheet(workbook, wsTitulos, "Títulos Originais");
      }

      // Aba 3: Programação do Acordo
      if (acordo.parcelas_negociadas && acordo.parcelas_negociadas.length > 0) {
        const parcelasData = acordo.parcelas_negociadas.map((parcela: any) => ({
          "Parcela": parcela.parcela,
          "Vencimento": formatDateBR(parcela.dt_vencimento),
          "Forma Pagto": parcela.forma_pagto,
          "Valor Parcela": formatCurrencyFromCents(parcela.vl_total_parcela),
          "Status": getStatusText(parcela.status)
        }));
        
        // Adicionar totalizador
        const totalParcelas = acordo.parcelas_negociadas.reduce((sum: number, p: any) => sum + (parseFloat(p.vl_total_parcela) || 0), 0);
        parcelasData.push({
          "Parcela": "TOTAL:",
          "Vencimento": "",
          "Forma Pagto": "",
          "Valor Parcela": formatCurrencyFromCents(totalParcelas),
          "Status": ""
        });
        
        const wsParcelas = XLSX.utils.json_to_sheet(parcelasData);
        XLSX.utils.book_append_sheet(workbook, wsParcelas, "Programação");
      }
      const nomeArquivo = `acordo_${acordo.negociacao?.replace(/^005329-000000/, "") || "sem-numero"}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
      toast({
        title: "Sucesso",
        description: "Arquivo Excel exportado com sucesso!"
      });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo Excel",
        variant: "destructive"
      });
    }
  };

  // Exportar acordo para PDF (completo)
  const exportarAcordoPDF = (acordo: any) => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Logo da Superávit
      const logoImg = new Image();
      logoImg.src = '/src/assets/logo-superavit.png';
      logoImg.onload = () => {
        // Adicionar logo (ajustar tamanho conforme necessário)
        doc.addImage(logoImg, 'PNG', 14, 10, 40, 15);

        // Título principal
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Consultar repasse por Split", 60, 20);
        yPosition = 35;

        // Resumo da Negociação
        doc.setFontSize(14);
        doc.text("Resumo da Negociação", 14, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Negociação: ${acordo.negociacao?.replace(/^005329-000000/, "") || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Credor: ${acordo.credor || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Devedor: ${acordo.nome_devedor || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Data: ${formatDateBR(acordo.dt_negociacao)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Status: ${getStatusText(acordo.status)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Parcelas: ${acordo.num_parcelas || "-"}`, 14, yPosition);
        yPosition += 10;

        // Valores
        doc.setFont("helvetica", "bold");
        doc.text(`Saldo Original: ${formatCurrencyFromCents(acordo.vl_saldo_original)}`, 14, yPosition);
        yPosition += 6;
        doc.setTextColor(0, 128, 0);
        doc.text(`Total Negociado: ${formatCurrencyFromCents(acordo.vl_total_negociado)}`, 14, yPosition);
        yPosition += 6;
        doc.setTextColor(0, 0, 255);
        doc.text(`Desconto: ${formatCurrencyFromCents(acordo.vl_desconto)}`, 14, yPosition);
        yPosition += 12;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        // Títulos Originais
        if (acordo.titulos_negociados && acordo.titulos_negociados.length > 0) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Títulos Originais", 14, yPosition);
          yPosition += 5;
          const titulosData = acordo.titulos_negociados.map((titulo: any) => [formatDateBR(titulo.dt_vencimento), formatCurrencyFromCents(titulo.vl_saldo_original), formatCurrencyFromCents(titulo.vl_desconto), formatCurrencyFromCents(titulo.vl_total_negociado)]);

          // Calcular totais
          const totalSaldoOriginal = acordo.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_saldo_original) || 0), 0);
          const totalDesconto = acordo.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_desconto) || 0), 0);
          const totalNegociado = acordo.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_total_negociado) || 0), 0);
          titulosData.push(["TOTAIS:", formatCurrencyFromCents(totalSaldoOriginal), formatCurrencyFromCents(totalDesconto), formatCurrencyFromCents(totalNegociado)]);
          autoTable(doc, {
            head: [["Vencimento", "Saldo Original", "Desconto", "Total Negociado"]],
            body: titulosData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
              fillColor: [41, 128, 185],
              fontSize: 9
            },
            styles: {
              fontSize: 8
            },
            margin: {
              left: 14
            }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // Programação do Acordo
        if (acordo.parcelas_negociadas && acordo.parcelas_negociadas.length > 0) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Programação do Acordo", 14, yPosition);
          yPosition += 5;
          const parcelasData = acordo.parcelas_negociadas.map((parcela: any) => [parcela.parcela, formatDateBR(parcela.dt_vencimento), parcela.forma_pagto, formatCurrencyFromCents(parcela.vl_total_parcela), getStatusText(parcela.status)]);
          
          // Adicionar totalizador
          const totalParcelas = acordo.parcelas_negociadas.reduce((sum: number, p: any) => sum + (parseFloat(p.vl_total_parcela) || 0), 0);
          parcelasData.push(["TOTAL:", "", "", formatCurrencyFromCents(totalParcelas), ""]);
          
          autoTable(doc, {
            head: [["Parcela", "Vencimento", "Forma Pagto", "Valor Parcela", "Status"]],
            body: parcelasData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
              fillColor: [41, 128, 185],
              fontSize: 9
            },
            styles: {
              fontSize: 8
            },
            margin: {
              left: 14
            }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // Repasse para o Credor (ao final)
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Repasse para o Credor", 14, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Cliente: ${transacao?.cliente_nome || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Data: ${transacao ? formatDateFromDatabase(transacao.date) : "-"}`, 14, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 128, 0);
        doc.text(`Valor: ${transacao ? formatCurrency(transacao.value) : "-"}`, 14, yPosition);
        yPosition += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(`Saldo Após Transação: ${transacao ? formatCurrency(transacao.balance) : "-"}`, 14, yPosition);
        yPosition += 6;
        if (transacao?.description) {
          doc.text(`Descrição: ${transacao.description}`, 14, yPosition, {
            maxWidth: 180
          });
        }
        const nomeArquivo = `acordo_${acordo.negociacao?.replace(/^005329-000000/, "") || "sem-numero"}.pdf`;
        doc.save(nomeArquivo);
        toast({
          title: "Sucesso",
          description: "Arquivo PDF exportado com sucesso!"
        });
      };
      logoImg.onerror = () => {
        // Se a logo falhar, continuar sem ela
        yPosition = 20;

        // Título principal
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Consultar repasse por Split", 14, yPosition);
        yPosition += 10;

        // Resumo da Negociação
        doc.setFontSize(14);
        doc.text("Resumo da Negociação", 14, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Negociação: ${acordo.negociacao?.replace(/^005329-000000/, "") || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Credor: ${acordo.credor || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Devedor: ${acordo.nome_devedor || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Data: ${formatDateBR(acordo.dt_negociacao)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Status: ${getStatusText(acordo.status)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Parcelas: ${acordo.num_parcelas || "-"}`, 14, yPosition);
        yPosition += 10;

        // Valores
        doc.setFont("helvetica", "bold");
        doc.text(`Saldo Original: ${formatCurrencyFromCents(acordo.vl_saldo_original)}`, 14, yPosition);
        yPosition += 6;
        doc.setTextColor(0, 128, 0);
        doc.text(`Total Negociado: ${formatCurrencyFromCents(acordo.vl_total_negociado)}`, 14, yPosition);
        yPosition += 6;
        doc.setTextColor(0, 0, 255);
        doc.text(`Desconto: ${formatCurrencyFromCents(acordo.vl_desconto)}`, 14, yPosition);
        yPosition += 12;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        // Títulos Originais
        if (acordo.titulos_negociados && acordo.titulos_negociados.length > 0) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Títulos Originais", 14, yPosition);
          yPosition += 5;
          const titulosData = acordo.titulos_negociados.map((titulo: any) => [formatDateBR(titulo.dt_vencimento), formatCurrencyFromCents(titulo.vl_saldo_original), formatCurrencyFromCents(titulo.vl_desconto), formatCurrencyFromCents(titulo.vl_total_negociado)]);

          // Calcular totais
          const totalSaldoOriginal = acordo.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_saldo_original) || 0), 0);
          const totalDesconto = acordo.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_desconto) || 0), 0);
          const totalNegociado = acordo.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_total_negociado) || 0), 0);
          titulosData.push(["TOTAIS:", formatCurrencyFromCents(totalSaldoOriginal), formatCurrencyFromCents(totalDesconto), formatCurrencyFromCents(totalNegociado)]);
          autoTable(doc, {
            head: [["Vencimento", "Saldo Original", "Desconto", "Total Negociado"]],
            body: titulosData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
              fillColor: [41, 128, 185],
              fontSize: 9
            },
            styles: {
              fontSize: 8
            },
            margin: {
              left: 14
            }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // Programação do Acordo
        if (acordo.parcelas_negociadas && acordo.parcelas_negociadas.length > 0) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Programação do Acordo", 14, yPosition);
          yPosition += 5;
          const parcelasData = acordo.parcelas_negociadas.map((parcela: any) => [parcela.parcela, formatDateBR(parcela.dt_vencimento), parcela.forma_pagto, formatCurrencyFromCents(parcela.vl_total_parcela), getStatusText(parcela.status)]);
          
          // Adicionar totalizador
          const totalParcelas = acordo.parcelas_negociadas.reduce((sum: number, p: any) => sum + (parseFloat(p.vl_total_parcela) || 0), 0);
          parcelasData.push(["TOTAL:", "", "", formatCurrencyFromCents(totalParcelas), ""]);
          
          autoTable(doc, {
            head: [["Parcela", "Vencimento", "Forma Pagto", "Valor Parcela", "Status"]],
            body: parcelasData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
              fillColor: [41, 128, 185],
              fontSize: 9
            },
            styles: {
              fontSize: 8
            },
            margin: {
              left: 14
            }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // Repasse para o Credor (ao final)
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Repasse para o Credor", 14, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Cliente: ${transacao?.cliente_nome || "-"}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Data: ${transacao ? formatDateFromDatabase(transacao.date) : "-"}`, 14, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 128, 0);
        doc.text(`Valor: ${transacao ? formatCurrency(transacao.value) : "-"}`, 14, yPosition);
        yPosition += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(`Saldo Após Transação: ${transacao ? formatCurrency(transacao.balance) : "-"}`, 14, yPosition);
        yPosition += 6;
        if (transacao?.description) {
          doc.text(`Descrição: ${transacao.description}`, 14, yPosition, {
            maxWidth: 180
          });
        }
        const nomeArquivo = `acordo_${acordo.negociacao?.replace(/^005329-000000/, "") || "sem-numero"}.pdf`;
        doc.save(nomeArquivo);
        toast({
          title: "Sucesso",
          description: "Arquivo PDF exportado com sucesso!"
        });
      };
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo PDF",
        variant: "destructive"
      });
    }
  };
  const fields = [{
    label: "Cliente",
    value: transacao.cliente_nome
  }, {
    label: "Data",
    value: formatDateFromDatabase(transacao.date)
  }, {
    label: "Valor",
    value: formatCurrency(transacao.value),
    className: transacao.value > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"
  }, {
    label: "Saldo Após Transação",
    value: formatCurrency(transacao.balance),
    className: "font-semibold"
  }, {
    label: "Descrição",
    value: transacao.description || "-",
    span: true
  }];
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Detalhes da Transação
            </DialogTitle>
            {transacao?.type === "INTERNAL_TRANSFER_CREDIT" && cobrancaDetalhes && acordoDetalhes && !loadingAcordo && !erroAcordo && <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportarAcordoExcel(acordoDetalhes)}>
                  Exportar Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportarAcordoPDF(acordoDetalhes)}>
                  Exportar PDF
                </Button>
              </div>}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tipo:</span>
            <TipoTransacaoBadge type={transacao.type} description={transacao.description} />
          </div>

          {transacao.type === "INTERNAL_TRANSFER_CREDIT" && cobrancaDetalhes && (
            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
              <p className="text-xs font-medium text-muted-foreground mb-1">Nome do Devedor</p>
              <p className="text-lg font-bold text-primary">{cobrancaDetalhes.nome || "-"}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => <div key={field.label} className={`space-y-1 ${field.span ? "md:col-span-2" : ""}`}>
                <p className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </p>
                <p className={`text-sm ${field.className || ""}`}>
                  {field.value}
                </p>
              </div>)}
          </div>


          {transacao.type === "INTERNAL_TRANSFER_CREDIT" && cobrancaDetalhes && <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📊 Resumo da Negociação</h3>
                {loadingAcordo ? <p className="text-sm text-muted-foreground">Carregando detalhes do acordo...</p> : erroAcordo ? <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Erro ao carregar detalhes do acordo.</p>
                    <Button onClick={() => fetchAcordoDetalhes()} variant="outline" size="sm">
                      Carregar dados
                    </Button>
                  </div> : acordoDetalhes ? <div className="space-y-6">
                    {/* RESUMO DA NEGOCIAÇÃO */}
                    <div>
                      <h4 className="text-base font-semibold mb-3 text-primary">
                </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 p-4 rounded-lg">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Número da Negociação</p>
                        <p className="text-sm font-mono">
                          {acordoDetalhes.negociacao?.replace(/^005329-000000/, "") || "-"}
                        </p>
                      </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Credor</p>
                          <p className="text-sm font-semibold">{acordoDetalhes.credor || "-"}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Nome do Devedor</p>
                          <p className="text-sm">{acordoDetalhes.nome_devedor || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Data da Negociação</p>
                          <p className="text-sm">{formatDateBR(acordoDetalhes.dt_negociacao)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Operador</p>
                          <p className="text-sm">{acordoDetalhes.operador || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Status</p>
                          <p className="text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${acordoDetalhes.status === 'P' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                              {getStatusText(acordoDetalhes.status)}
                            </span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Número de Parcelas</p>
                          <p className="text-sm font-semibold">{acordoDetalhes.num_parcelas || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Saldo Original</p>
                          <p className="text-sm font-semibold text-destructive">
                            {formatCurrencyFromCents(acordoDetalhes.vl_saldo_original)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Valor Total Negociado</p>
                          <p className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrencyFromCents(acordoDetalhes.vl_total_negociado)}
                          </p>
                        </div>
                     <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Desconto</p>
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrencyFromCents(acordoDetalhes.vl_desconto)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Honorários</p>
                          <p className="text-sm font-semibold">
                            {formatCurrencyFromCents(acordoDetalhes.vl_honorario)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CPF/CNPJ e Descrição abaixo do Resumo */}
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">CPF/CNPJ</p>
                          <p className="text-sm font-mono">{cobrancaDetalhes?.cpf_cnpj || "-"}</p>
                        </div>
                        {cobrancaDetalhes?.descricao && (
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                            <p className="text-sm">{cobrancaDetalhes.descricao}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TÍTULOS ORIGINAIS */}
                    {acordoDetalhes.titulos_negociados && acordoDetalhes.titulos_negociados.length > 0 && <div>
                        <h4 className="text-base font-semibold mb-3 text-primary">📄 Títulos Originais</h4>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Vencimento</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Saldo Original</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Desconto</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Total Negociado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {acordoDetalhes.titulos_negociados.map((titulo: any, idx: number) => <tr key={idx} className="hover:bg-muted/50">
                                    <td className="px-3 py-2">{formatDateBR(titulo.dt_vencimento)}</td>
                                    <td className="px-3 py-2 text-right font-medium">
                                      {formatCurrencyFromCents(titulo.vl_saldo_original)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                                      {formatCurrencyFromCents(titulo.vl_desconto)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                                      {formatCurrencyFromCents(titulo.vl_total_negociado)}
                                    </td>
                                  </tr>)}
                                <tr className="bg-muted/50 font-bold">
                                  <td className="px-3 py-2 text-right">TOTAIS:</td>
                                  <td className="px-3 py-2 text-right">
                                    {formatCurrencyFromCents(acordoDetalhes.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_saldo_original) || 0), 0))}
                                  </td>
                                  <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                                    {formatCurrencyFromCents(acordoDetalhes.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_desconto) || 0), 0))}
                                  </td>
                                  <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                                    {formatCurrencyFromCents(acordoDetalhes.titulos_negociados.reduce((sum: number, t: any) => sum + (parseFloat(t.vl_total_negociado) || 0), 0))}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>}

                    {/* PROGRAMAÇÃO DO ACORDO */}
                    {acordoDetalhes.parcelas_negociadas && acordoDetalhes.parcelas_negociadas.length > 0 && <div>
                        <h4 className="text-base font-semibold mb-3 text-primary">💰 Programação do Acordo</h4>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Parcela</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Vencimento</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Forma Pagto</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Valor Parcela</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {acordoDetalhes.parcelas_negociadas.map((parcela: any, idx: number) => <tr key={idx} className="hover:bg-muted/50">
                                    <td className="px-3 py-2">{parcela.parcela}</td>
                                    <td className="px-3 py-2">{formatDateBR(parcela.dt_vencimento)}</td>
                                    <td className="px-3 py-2 text-xs">{parcela.forma_pagto}</td>
                                    <td className="px-3 py-2 text-right font-semibold">
                                      {formatCurrencyFromCents(parcela.vl_total_parcela)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${parcela.status === 'P' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                        {getStatusText(parcela.status)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {parcela.status !== 'P' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs"
                                          onClick={() => {
                                            toast({
                                              title: "Antecipação Solicitada",
                                              description: `Solicitação de antecipação da parcela ${parcela.parcela} enviada.`
                                            });
                                          }}
                                        >
                                          Solicitar antecipação
                                        </Button>
                                      )}
                                    </td>
                                  </tr>)}
                                <tr className="bg-muted/50 font-bold">
                                  <td className="px-3 py-2 text-right" colSpan={3}>TOTAL:</td>
                                  <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                                    {formatCurrencyFromCents(acordoDetalhes.parcelas_negociadas.reduce((sum: number, p: any) => sum + (parseFloat(p.vl_total_parcela) || 0), 0))}
                                  </td>
                                  <td colSpan={2}></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>}
                  </div> : <p className="text-sm text-muted-foreground">Nenhum detalhe do acordo encontrado.</p>}
              </div>
            </>}
        </div>
      </DialogContent>
    </Dialog>;
}