import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FileText, CheckCircle2, AlertCircle, XCircle, ArrowLeft, Send, ChevronDown, Download, DollarSign, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import logoSuperavit from "@/assets/logo-superavit.png";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";

const PAGOS_COLUMN_MAP: Record<string, string> = {
  "Documento": "documento",
  "Tipo Documento": "tipo_documento",
  "Série do Documento": "serie_documento",
  "Serie do Documento": "serie_documento",
  "Código Parceiro": "codigo_parceiro",
  "Codigo Parceiro": "codigo_parceiro",
  "Código PN": "codigo_parceiro",
  "Codigo PN": "codigo_parceiro",
  "Nome Parceiro": "nome_parceiro",
  "Nome PN": "nome_parceiro",
  "Nome Fantasia do Parceiro": "nome_fantasia",
  "CNPJ/CPF": "cnpj_cpf",
  "Parcela": "numero_parcela",
  "Nº Parcela": "numero_parcela",
  "N° Parcela": "numero_parcela",
  "No Parcela": "numero_parcela",
  "Valor Original Parcela": "valor_parcela",
  "Valor Parcela": "valor_parcela",
  "Valor pago": "valor_pago",
  "Valor Pago": "valor_pago",
  "Data de pagamento": "data_pagamento",
  "Data de Pagamento": "data_pagamento",
  "Data Pagamento": "data_pagamento",
  "Data de Vencimento": "data_vencimento",
  "Dt.Vencimento": "data_vencimento",
  "Data Vencimento": "data_vencimento",
  "Forma de Pagamento": "forma_pagamento",
  "Forma Pagamento": "forma_pagamento",
  "Multa%": "multa_pct",
  "Valor Multa": "valor_multa",
  "Juros %": "juros_pct",
  "Valor Total Juros": "valor_juros",
  "Desconto %": "desconto_pct",
  "Valor Desconto": "valor_desconto",
  "Vendedor": "vendedor",
  "Filial": "filial",
};

const DATE_FIELDS = ["data_pagamento", "data_vencimento"];

function convertExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const utcDays = Math.floor(value) - 25569;
    const date = new Date(utcDays * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(value).trim();
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let year = parseInt(usMatch[3]);
    if (year < 100) year += 2000;
    return `${year}-${String(parseInt(usMatch[1])).padStart(2, "0")}-${String(parseInt(usMatch[2])).padStart(2, "0")}`;
  }
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

interface PagoRecord {
  id: string;
  documento: string;
  numero_parcela: string;
  nome_parceiro: string | null;
  cnpj_cpf: string | null;
  nome_fantasia: string | null;
  valor_parcela: number | null;
  valor_pago: number | null;
  data_pagamento: string | null;
  data_vencimento: string | null;
  forma_pagamento: string | null;
  vendedor: string | null;
  multa_pct: number | null;
  valor_multa: number | null;
  juros_pct: number | null;
  valor_juros: number | null;
  desconto_pct: number | null;
  valor_desconto: number | null;
}

interface PagosAnalysis {
  totalRows: number;
  totalValidos: number;
  totalSemDocumento: number;
  records: PagoRecord[];
  encontradosNoBanco: { pago: PagoRecord; db: Record<string, any> }[];
  naoEncontradosNoBanco: PagoRecord[];
  jaMaracadosPago: { pago: PagoRecord; db: Record<string, any> }[];
  columns: string[];
  matchedColumns: string[];
  unmatchedColumns: string[];
}

interface UploadPagosResult {
  totalProcessed: number;
  totalUpdated: number;
  totalAlreadyPago: number;
  totalNotFound: number;
  totalErrors: number;
  records: { id: string; nome: string; acao: string; status: string; erro?: string; alteracoes?: { campo: string; antes: string; depois: string }[] }[];
}

function mapPagosRow(row: Record<string, any>): PagoRecord | null {
  const mapped: Record<string, any> = {};
  for (const [excelCol, dbCol] of Object.entries(PAGOS_COLUMN_MAP)) {
    if (row[excelCol] !== undefined) {
      mapped[dbCol] = row[excelCol];
    }
  }

  const documento = mapped.documento;
  if (!documento || String(documento).trim() === "") return null;

  const parcela = mapped.numero_parcela ?? "1";
  const id = `${String(documento).trim()}-${String(parcela).trim()}`;

  for (const df of DATE_FIELDS) {
    if (mapped[df] !== undefined) {
      mapped[df] = convertExcelDate(mapped[df]);
    }
  }

  const parseNum = (v: any) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  return {
    id,
    documento: String(documento).trim(),
    numero_parcela: String(parcela).trim(),
    nome_parceiro: mapped.nome_parceiro ? String(mapped.nome_parceiro) : null,
    cnpj_cpf: mapped.cnpj_cpf ? String(mapped.cnpj_cpf) : null,
    nome_fantasia: mapped.nome_fantasia ? String(mapped.nome_fantasia) : null,
    valor_parcela: parseNum(mapped.valor_parcela),
    valor_pago: parseNum(mapped.valor_pago),
    data_pagamento: mapped.data_pagamento || null,
    data_vencimento: mapped.data_vencimento || null,
    forma_pagamento: mapped.forma_pagamento ? String(mapped.forma_pagamento) : null,
    vendedor: mapped.vendedor ? String(mapped.vendedor) : null,
    multa_pct: parseNum(mapped.multa_pct),
    valor_multa: parseNum(mapped.valor_multa),
    juros_pct: parseNum(mapped.juros_pct),
    valor_juros: parseNum(mapped.valor_juros),
    desconto_pct: parseNum(mapped.desconto_pct),
    valor_desconto: parseNum(mapped.valor_desconto),
  };
}

export default function UploadPagosOficial() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<PagosAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProgressLabel, setUploadProgressLabel] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadPagosResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setAnalysis(null);
    setUploadResult(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => { setDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) { setSelectedFile(file); setAnalysis(null); setUploadResult(null); }
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        toast.error("A planilha está vazia.");
        setAnalyzing(false);
        return;
      }

      const excelColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const knownCols = new Set(Object.keys(PAGOS_COLUMN_MAP));
      const matchedColumns = excelColumns.filter(c => knownCols.has(c));
      const unmatchedColumns = excelColumns.filter(c => !knownCols.has(c));

      let totalSemDocumento = 0;
      const records: PagoRecord[] = [];
      for (const row of rows) {
        const doc = row["Documento"] ?? row["documento"];
        if (!doc || String(doc).trim() === "") { totalSemDocumento++; continue; }
        const mapped = mapPagosRow(row);
        if (mapped) records.push(mapped);
      }

      const dedupMap = new Map<string, PagoRecord>();
      for (const r of records) dedupMap.set(r.id, r);
      const uniqueRecords = Array.from(dedupMap.values());

      const recordIds = uniqueRecords.map(r => r.id);
      const dbRecordsMap = new Map<string, Record<string, any>>();
      for (let i = 0; i < recordIds.length; i += 500) {
        const batch = recordIds.slice(i, i + 500);
        const { data: dbData } = await supabase
          .from("base_tudobelo_intermediaria")
          .select("*")
          .in("id", batch);
        if (dbData) dbData.forEach(r => dbRecordsMap.set(r.id, r));
      }

      const encontradosNoBanco: PagosAnalysis["encontradosNoBanco"] = [];
      const naoEncontradosNoBanco: PagoRecord[] = [];
      const jaMaracadosPago: PagosAnalysis["jaMaracadosPago"] = [];

      for (const pago of uniqueRecords) {
        const db = dbRecordsMap.get(pago.id);
        if (!db) {
          naoEncontradosNoBanco.push(pago);
        } else {
          const statusPagos = ["Pago", "Pago em dia", "Pago via renegociação"];
          if (statusPagos.includes(db.status_titulo)) {
            jaMaracadosPago.push({ pago, db });
          } else {
            encontradosNoBanco.push({ pago, db });
          }
        }
      }

      setAnalysis({
        totalRows: rows.length,
        totalValidos: uniqueRecords.length,
        totalSemDocumento,
        records: uniqueRecords,
        encontradosNoBanco,
        naoEncontradosNoBanco,
        jaMaracadosPago,
        columns: excelColumns,
        matchedColumns,
        unmatchedColumns,
      });

    } catch (err: any) {
      toast.error(`Erro ao analisar arquivo: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!analysis) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadProgressLabel("Preparando atualização...");

    const resultRecords: UploadPagosResult["records"] = [];
    let totalUpdated = 0;
    let totalErrors = 0;

    try {
      const toUpdate = analysis.encontradosNoBanco;
      const batchSize = 100;

      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        setUploadProgressLabel(`Atualizando pagamentos (${Math.min(i + batchSize, toUpdate.length)}/${toUpdate.length})...`);
        setUploadProgress(Math.round(((i + batch.length) / toUpdate.length) * 100));

        for (const { pago, db } of batch) {
          const isCedrus = db.inserido_cedrus === true;
          const updates: Record<string, any> = {
            valor_pago: pago.valor_pago,
            data_pagamento: pago.data_pagamento,
            status_titulo: "Pago",
            processado_internamente: false,
            ultima_atualizacao: new Date().toISOString(),
          };

          if (isCedrus) {
            updates.etapa = "Inserir no Cedrus";
          }

          const { error } = await supabase
            .from("base_tudobelo_intermediaria")
            .update(updates)
            .eq("id", pago.id);

          const alteracoes: { campo: string; antes: string; depois: string }[] = [];
          alteracoes.push({ campo: "valor_pago", antes: String(db.valor_pago ?? "(vazio)"), depois: String(pago.valor_pago ?? "(vazio)") });
          alteracoes.push({ campo: "data_pagamento", antes: String(db.data_pagamento ?? "(vazio)"), depois: String(pago.data_pagamento ?? "(vazio)") });
          alteracoes.push({ campo: "status_titulo", antes: String(db.status_titulo ?? "(vazio)"), depois: "Pago" });
          if (isCedrus) {
            alteracoes.push({ campo: "etapa", antes: String(db.etapa ?? "(vazio)"), depois: "Inserir no Cedrus" });
          }

          if (error) {
            resultRecords.push({ id: pago.id, nome: pago.nome_parceiro || "-", acao: isCedrus ? "Atualizar Pagamento (Cedrus)" : "Atualizar Pagamento", status: "Erro", erro: error.message, alteracoes });
            totalErrors++;
          } else {
            resultRecords.push({ id: pago.id, nome: pago.nome_parceiro || "-", acao: isCedrus ? "Atualizar Pagamento (Cedrus)" : "Atualizar Pagamento", status: "Sucesso", alteracoes });
            totalUpdated++;
          }
        }
      }

      for (const { pago } of analysis.jaMaracadosPago) {
        resultRecords.push({ id: pago.id, nome: pago.nome_parceiro || "-", acao: "Já marcado como Pago", status: "Sucesso" });
      }

      for (const pago of analysis.naoEncontradosNoBanco) {
        resultRecords.push({ id: pago.id, nome: pago.nome_parceiro || "-", acao: "Não encontrado no banco", status: "Sucesso" });
      }

      setUploadProgress(100);
      setUploadProgressLabel("Concluído!");
      setUploadResult({
        totalProcessed: resultRecords.length,
        totalUpdated,
        totalAlreadyPago: analysis.jaMaracadosPago.length,
        totalNotFound: analysis.naoEncontradosNoBanco.length,
        totalErrors,
        records: resultRecords,
      });
    } catch (err: any) {
      toast.error(`Erro ao processar pagamentos: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const generateExcelReport = () => {
    if (!uploadResult) return;
    const wsData = [
      ["ID", "Nome Parceiro", "Ação", "Status", "Erro", "Campos Alterados", "Valores Anteriores", "Valores Novos"],
      ...uploadResult.records.map(r => {
        const campos = (r.alteracoes || []).map(a => a.campo).join("; ");
        const antes = (r.alteracoes || []).map(a => `${a.campo}: ${a.antes}`).join("; ");
        const depois = (r.alteracoes || []).map(a => `${a.campo}: ${a.depois}`).join("; ");
        return [r.id, r.nome, r.acao, r.status, r.erro || "", campos, antes, depois];
      })
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = wsData[0].map((_, colIdx) => {
      const maxLen = wsData.reduce((max, row) => Math.max(max, String(row[colIdx] || "").length), 0);
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultado Pagos");

    const summaryData = [
      ["Resumo do Processamento de Pagos"],
      [],
      ["Métrica", "Quantidade"],
      ["Total processados", uploadResult.totalProcessed],
      ["Atualizados como Pago", uploadResult.totalUpdated],
      ["Já marcados como Pago", uploadResult.totalAlreadyPago],
      ["Não encontrados no banco", uploadResult.totalNotFound],
      ["Erros", uploadResult.totalErrors],
      [],
      ["Data/Hora", new Date().toLocaleString("pt-BR")],
      ["Arquivo", selectedFile?.name || "-"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

    const fileName = `resultado-pagos-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Relatório baixado: ${fileName}`);
  };

  const handleCancel = () => { setAnalysis(null); setSelectedFile(null); setUploadResult(null); };

  const formatCurrency = (v: number | null) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";
  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
  };

  const openTituloDetails = async (id: string) => {
    const { data } = await supabase.from("base_tudobelo_intermediaria").select("*").eq("id", id).single();
    if (data) { setSelectedTitulo(data as TituloTudoBelo); setDetailsOpen(true); }
  };

  if (uploadResult) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSuperavit} alt="Superávit" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold">Resultado — Atualização de Pagos</h1>
              <p className="text-muted-foreground text-sm">Processamento concluído</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 h-8 px-3">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            PAGOS
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Atualizados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{uploadResult.totalUpdated}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Já Pagos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{uploadResult.totalAlreadyPago}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Não Encontrados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{uploadResult.totalNotFound}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Erros</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${uploadResult.totalErrors > 0 ? "text-destructive" : "text-green-600"}`}>{uploadResult.totalErrors}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{uploadResult.totalProcessed}</div></CardContent></Card>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">Processamento finalizado</p>
              <p className="text-xs text-muted-foreground">{uploadResult.totalProcessed} registro(s) processado(s)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateExcelReport}><Download className="h-4 w-4 mr-1" />Baixar Relatório Excel</Button>
            <Button size="sm" onClick={() => { setUploadResult(null); setAnalysis(null); setSelectedFile(null); }}><ArrowLeft className="h-4 w-4 mr-1" />Novo Upload</Button>
          </div>
        </div>
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <img src={logoSuperavit} alt="Superávit" className="h-10" />
          <div>
            <h1 className="text-2xl font-bold">Atualizando Pagamentos...</h1>
            <p className="text-muted-foreground text-sm">Aguarde enquanto os registros são processados</p>
          </div>
        </div>
        <Card><CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{uploadProgressLabel}</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-3" />
          </div>
          <p className="text-xs text-muted-foreground text-center">Não feche esta página durante o processamento</p>
        </CardContent></Card>
      </div>
    );
  }

  if (analysis) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSuperavit} alt="Superávit" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold">Análise — Planilha de Pagos</h1>
              <p className="text-muted-foreground text-sm">Revise os dados antes de atualizar a base oficial</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 h-8 px-3">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            PAGOS
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Linhas na Planilha</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{analysis.totalRows}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Válidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{analysis.totalValidos}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">A Atualizar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{analysis.encontradosNoBanco.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Já Pagos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{analysis.jaMaracadosPago.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Não Encontrados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{analysis.naoEncontradosNoBanco.length}</div></CardContent></Card>
        </div>

        {(() => {
          const cedrusCount = analysis.encontradosNoBanco.filter(({ db }) => db.inserido_cedrus === true).length;
          return cedrusCount > 0 ? (
            <Card className="border-orange-400 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-orange-800">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <strong>{cedrusCount}</strong> título(s) com <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs mx-1">inserido_cedrus = true</Badge> serão movidos para a etapa <strong>"Inserir no Cedrus"</strong> e marcados como pendentes de análise.
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {analysis.totalSemDocumento > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                <strong>{analysis.totalSemDocumento}</strong> linha(s) sem documento foram ignoradas
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.encontradosNoBanco.length > 0 && (
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Títulos a Atualizar como Pago ({analysis.encontradosNoBanco.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Estes títulos serão atualizados com valor pago, data de pagamento e status "Pago".
              </p>
              <Collapsible defaultOpen={analysis.encontradosNoBanco.length <= 20}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 mb-2"><ChevronDown className="h-3.5 w-3.5" />Ver detalhes</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">Status Atual</TableHead>
                          <TableHead className="text-xs">Cedrus</TableHead>
                          <TableHead className="text-xs">Saldo Parcela</TableHead>
                          <TableHead className="text-xs">Valor Pago</TableHead>
                          <TableHead className="text-xs">Data Pagamento</TableHead>
                          <TableHead className="text-xs">Vencimento</TableHead>
                          <TableHead className="text-xs">Tratativa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.encontradosNoBanco.slice(0, 100).map(({ pago, db }) => {
                          const isCedrus = db.inserido_cedrus === true;
                          return (
                            <TableRow key={pago.id} className={`text-xs cursor-pointer hover:bg-muted/50 ${isCedrus ? "bg-orange-50" : ""}`} onClick={() => openTituloDetails(pago.id)}>
                              <TableCell className="font-mono text-xs">{pago.id}</TableCell>
                              <TableCell className="text-xs">{pago.nome_parceiro || "-"}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{db.status_titulo || "Sem status"}</Badge></TableCell>
                              <TableCell>{isCedrus ? <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">Sim</Badge> : <span className="text-muted-foreground">Não</span>}</TableCell>
                              <TableCell className="text-xs">{formatCurrency(db.saldo_parcela)}</TableCell>
                              <TableCell className="text-xs font-medium text-emerald-700">{formatCurrency(pago.valor_pago)}</TableCell>
                              <TableCell className="text-xs">{formatDate(pago.data_pagamento)}</TableCell>
                              <TableCell className="text-xs">{formatDate(pago.data_vencimento)}</TableCell>
                              <TableCell>{isCedrus ? <Badge className="text-xs bg-orange-500 text-white">→ Inserir no Cedrus</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                            </TableRow>
                          );
                        })}
                        {analysis.encontradosNoBanco.length > 100 && (
                          <TableRow><TableCell colSpan={7} className="text-xs text-center text-muted-foreground">+{analysis.encontradosNoBanco.length - 100} registro(s) adicionais</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {analysis.jaMaracadosPago.length > 0 && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Já Marcados como Pago ({analysis.jaMaracadosPago.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Estes títulos já estão com status "Pago" no banco e não serão alterados.
              </p>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 mb-2"><ChevronDown className="h-3.5 w-3.5" />Ver detalhes</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">Status Atual</TableHead>
                          <TableHead className="text-xs">Valor Pago (planilha)</TableHead>
                          <TableHead className="text-xs">Data Pgto (planilha)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.jaMaracadosPago.slice(0, 50).map(({ pago, db }) => (
                          <TableRow key={pago.id} className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => openTituloDetails(pago.id)}>
                            <TableCell className="font-mono text-xs">{pago.id}</TableCell>
                            <TableCell className="text-xs">{pago.nome_parceiro || "-"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{db.status_titulo}</Badge></TableCell>
                            <TableCell className="text-xs">{formatCurrency(pago.valor_pago)}</TableCell>
                            <TableCell className="text-xs">{formatDate(pago.data_pagamento)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {analysis.naoEncontradosNoBanco.length > 0 && (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Não Encontrados no Banco ({analysis.naoEncontradosNoBanco.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Estes registros da planilha não possuem título correspondente no banco de dados. Nenhuma ação será tomada.
              </p>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 mb-2"><ChevronDown className="h-3.5 w-3.5" />Ver detalhes</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">CNPJ/CPF</TableHead>
                          <TableHead className="text-xs">Valor Pago</TableHead>
                          <TableHead className="text-xs">Data Pgto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.naoEncontradosNoBanco.slice(0, 50).map((pago) => (
                          <TableRow key={pago.id} className="text-xs">
                            <TableCell className="font-mono text-xs">{pago.id}</TableCell>
                            <TableCell className="text-xs">{pago.nome_parceiro || "-"}</TableCell>
                            <TableCell className="text-xs">{pago.cnpj_cpf || "-"}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(pago.valor_pago)}</TableCell>
                            <TableCell className="text-xs">{formatDate(pago.data_pagamento)}</TableCell>
                          </TableRow>
                        ))}
                        {analysis.naoEncontradosNoBanco.length > 50 && (
                          <TableRow><TableCell colSpan={5} className="text-xs text-center text-muted-foreground">+{analysis.naoEncontradosNoBanco.length - 50} registro(s) adicionais</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        <Collapsible>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Mapeamento de Colunas</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1"><ChevronDown className="h-3.5 w-3.5" />Expandir</Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {analysis.matchedColumns.map(col => (
                    <div key={col} className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <span className="truncate">{col}</span>
                    </div>
                  ))}
                  {analysis.unmatchedColumns.map(col => (
                    <div key={col} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="truncate line-through">{col}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{selectedFile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {analysis.encontradosNoBanco.length} título(s) serão atualizados como Pago
                {analysis.jaMaracadosPago.length > 0 && ` | ${analysis.jaMaracadosPago.length} já pagos`}
                {analysis.naoEncontradosNoBanco.length > 0 && ` | ${analysis.naoEncontradosNoBanco.length} não encontrado(s)`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading || analysis.encontradosNoBanco.length === 0}>
              <Send className="h-4 w-4 mr-1" />
              Confirmar e Atualizar Pagos
            </Button>
          </div>
        </div>

        <TituloDetailsModal
          titulo={selectedTitulo}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onTituloUpdated={(updated) => setSelectedTitulo(updated)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <img src={logoSuperavit} alt="Superávit" className="h-10" />
        <div>
          <h1 className="text-2xl font-bold">Atualização de Pagos — Oficial</h1>
          <p className="text-muted-foreground text-sm">
            Processe planilhas de pagamentos e atualize títulos na base oficial
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Planilha de Pagos
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 ml-2">
              <DollarSign className="h-3 w-3 mr-1" />
              Pagos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input-pagos")?.click()}
          >
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Arraste e solte a planilha de pagos aqui</p>
            <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-3">
              Formatos aceitos: .xlsx, .xls, .csv — Os dados de pagamento serão comparados com a base oficial
            </p>
            <Input id="file-input-pagos" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setSelectedFile(null); setAnalysis(null); }} variant="ghost">Remover</Button>
                <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? "Analisando..." : "Analisar Arquivo"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
