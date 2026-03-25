import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTitulosInsercoes } from "@/hooks/useTitulosInsercoes";
import { Upload, FileSpreadsheet, ExternalLink, Clock, FileText, FlaskConical, CheckCircle2, AlertCircle, XCircle, ArrowLeft, Send, ChevronDown, ChevronRight, Plus } from "lucide-react";
import logoSuperavit from "@/assets/logo-superavit.png";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";

// Mapeamento Excel → Supabase
const COLUMN_MAP: Record<string, string> = {
  "Documento": "documento",
  "Tipo Documento": "tipo_documento",
  "Série do Documento": "serie_documento",
  "Serie do Documento": "serie_documento",
  "Codigo PN": "codigo_parceiro",
  "Código PN": "codigo_parceiro",
  "Nome PN": "nome_parceiro",
  "Nome Fantasia do Parceiro": "nome_fantasia",
  "CNPJ/CPF": "cnpj_cpf",
  "Nº Parcela": "numero_parcela",
  "N° Parcela": "numero_parcela",
  "No Parcela": "numero_parcela",
  "Valor Parcela": "valor_parcela",
  "Saldo Parcela": "saldo_parcela",
  "Data Documento": "data_documento",
  "Dt.Vencimento": "data_vencimento",
  "Data Vencimento": "data_vencimento",
  "Situação do Boleto": "status_boleto",
  "Situacao do Boleto": "status_boleto",
  "Forma de Pagamento": "forma_pagamento",
  "Observações": "observacoes",
  "Observacoes": "observacoes",
  "Linha Digitavel": "linha_digitavel",
  "Tipo Negocio": "tipo_negocio",
  "Tipo Negócio": "tipo_negocio",
  "Filial": "filial",
  "Vendedor": "vendedor",
  "UF Cobrança": "uf_cobranca",
  "UF Cobranca": "uf_cobranca",
  "Cidade Cobrança": "municipio_cobranca",
  "Cidade Cobranca": "municipio_cobranca",
  "Endereço": "endereco",
  "Endereco": "endereco",
  "Numero": "numero_endereco",
  "Número": "numero_endereco",
  "Complemento": "complemento",
  "Bairro": "bairro",
  "Cidade": "cidade",
  "UF": "uf",
  "FONE 1": "fone1",
  "Fone 1": "fone1",
  "FONE 2": "fone2",
  "Fone 2": "fone2",
  "E-mail": "email",
  "Email": "email",
};

// Campos de data que podem vir como serial do Excel
const DATE_FIELDS = ["data_documento", "data_vencimento"];

// Colunas esperadas na tabela
const EXPECTED_COLUMNS = [
  "id", "documento", "tipo_documento", "serie_documento", "codigo_parceiro",
  "nome_parceiro", "cnpj_cpf", "numero_parcela", "valor_parcela", "saldo_parcela",
  "data_documento", "data_vencimento", "dias_atraso", "observacoes", "forma_pagamento",
  "status_boleto", "filial", "vendedor", "uf_cobranca", "municipio_cobranca",
  "inserido_cedrus", "id_titulo_cedrus", "credor_cedrus", "processado_internamente",
  "status_titulo", "status_cedrus", "etapa", "tipo_titulo", "id_negociacao_cedrus",
  "linha_digitavel", "data_pagamento", "valor_pago", "nome_fantasia", "fone1",
  "fone2", "email", "endereco", "numero_endereco", "complemento", "bairro",
  "cidade", "uf", "tipo_negocio", "cod_devedor_cedrus", "negativado", "bloqueado",
];

// Campos obrigatórios
const REQUIRED_FIELDS = ["id", "nome_parceiro"];

/**
 * Converte data serial do Excel para string yyyy-MM-dd.
 * Se já for string de data, tenta parsear diretamente.
 */
function convertExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  
  // Se for número (serial do Excel)
  if (typeof value === "number") {
    // Excel serial: dias desde 1900-01-01 (com bug do leap year 1900)
    const utcDays = Math.floor(value) - 25569; // 25569 = dias entre 1900-01-01 e 1970-01-01
    const date = new Date(utcDays * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Se for string, tenta parsear
  const str = String(value).trim();
  // Formato dd/MM/yyyy
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  // Formato yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  
  return null;
}

/**
 * Mapeia uma linha da planilha Excel para o formato do banco.
 */
function mapExcelRow(row: Record<string, any>, formasLiquidacao?: Map<string, number>): Record<string, any> | null {
  const mapped: Record<string, any> = {};

  for (const [excelCol, dbCol] of Object.entries(COLUMN_MAP)) {
    if (row[excelCol] !== undefined) {
      mapped[dbCol] = row[excelCol];
    }
  }

  for (const col of EXPECTED_COLUMNS) {
    if (mapped[col] === undefined && row[col] !== undefined) {
      mapped[col] = row[col];
    }
  }

  const documento = mapped.documento;
  if (!documento || String(documento).trim() === "") return null;

  const tipoDoc = mapped.tipo_documento;
  if (tipoDoc && String(tipoDoc).trim() === "Lançamento Contábil Manual") return null;

  const saldo = Number(mapped.saldo_parcela);
  if (isNaN(saldo) || saldo <= 0) return null;

  const parcela = mapped.numero_parcela ?? "1";
  mapped.id = `${String(documento).trim()}-${String(parcela).trim()}`;

  for (const dateField of DATE_FIELDS) {
    if (mapped[dateField] !== undefined) {
      mapped[dateField] = convertExcelDate(mapped[dateField]);
    }
  }

  // status_titulo: considera prazo_liquidacao da forma de pagamento
  const vencStr = mapped.data_vencimento;
  if (vencStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const venc = new Date(vencStr + "T00:00:00");
    
    // Calcular data efetiva de vencimento (vencimento + prazo_liquidacao)
    let prazoLiq = 0;
    if (formasLiquidacao && mapped.forma_pagamento) {
      prazoLiq = formasLiquidacao.get(mapped.forma_pagamento) || 0;
    }
    const vencEfetivo = new Date(venc);
    vencEfetivo.setDate(vencEfetivo.getDate() + prazoLiq);

    if (vencEfetivo >= today) {
      mapped.status_titulo = "A vencer";
    } else {
      const dayOfWeek = venc.getDay();
      const todayDayOfWeek = today.getDay();
      // "Vencido em final de semana" só aparece às segundas-feiras
      if ((dayOfWeek === 0 || dayOfWeek === 6) && todayDayOfWeek === 1) {
        mapped.status_titulo = "Vencido em final de semana";
      } else {
        mapped.status_titulo = "Vencido";
      }
    }
  }

  mapped.inserido_cedrus = false;

  return mapped;
}

interface FilteredStats {
  totalOriginal: number;
  semDocumento: number;
  lancamentoContabil: number;
  saldoZero: number;
  totalAposFiltro: number;
}

interface FormaPagamentoConfig {
  forma_pagamento: string;
  insere_na_base: boolean | null;
  prazo_liquidacao: number | null;
}

interface FormaPagamentoValidation {
  blocked: { forma: string; count: number }[];
  nullConfig: { forma: string; count: number }[];
  notFound: { forma: string; count: number }[];
  allowedCount: number;
  totalWithForma: number;
}

interface StatusTituloComparison {
  totalCompared: number;
  totalDifferent: number;
  totalIdentical: number;
  details: { from: string; to: string; count: number; records: { id: string; db: Record<string, any>; calc: Record<string, any> }[] }[];
}

interface EtapaBloqueadoValidation {
  etapaIgnoradaCount: number;
  etapaIgnoradaDetails: { etapa: string; count: number; ids: string[] }[];
  bloqueadoCount: number;
  bloqueadoIds: string[];
  somenteBancoCount: number;
  somenteBancoIds: string[];
  somenteBancoRecords: Record<string, any>[];
  novosTitulosCount: number;
  novosTitulosRecords: Record<string, any>[];
}

interface AnalysisResult {
  totalRows: number;
  columns: string[];
  matchedColumns: string[];
  unmatchedColumns: string[];
  missingExpected: string[];
  fieldStats: Record<string, { filled: number; empty: number; uniqueValues: number }>;
  requiredFieldIssues: { field: string; emptyRows: number }[];
  duplicateIds: number;
  records: Record<string, any>[];
  formaValidation: FormaPagamentoValidation | null;
  filteredStats: FilteredStats;
  statusComparison: StatusTituloComparison | null;
  etapaBloqueadoValidation: EtapaBloqueadoValidation | null;
}

function analyzeData(rawRows: Record<string, any>[], formasConfig: FormaPagamentoConfig[]): AnalysisResult {
  // Build prazo_liquidacao map
  const formasLiquidacao = new Map<string, number>();
  for (const f of formasConfig) {
    formasLiquidacao.set(f.forma_pagamento, f.prazo_liquidacao || 0);
  }

  let semDocumento = 0;
  let lancamentoContabil = 0;
  let saldoZero = 0;
  const mappedRows: Record<string, any>[] = [];

  for (const raw of rawRows) {
    const excelDocumento = raw["Documento"] ?? raw["documento"];
    const excelTipoDoc = raw["Tipo Documento"] ?? raw["tipo_documento"];
    const excelSaldo = raw["Saldo Parcela"] ?? raw["saldo_parcela"];

    if (!excelDocumento || String(excelDocumento).trim() === "") {
      semDocumento++;
      continue;
    }
    if (excelTipoDoc && String(excelTipoDoc).trim() === "Lançamento Contábil Manual") {
      lancamentoContabil++;
      continue;
    }
    const saldoNum = Number(excelSaldo);
    if (isNaN(saldoNum) || saldoNum <= 0) {
      saldoZero++;
      continue;
    }

    const mapped = mapExcelRow(raw, formasLiquidacao);
    if (mapped) mappedRows.push(mapped);
  }

  const filteredStats: FilteredStats = {
    totalOriginal: rawRows.length,
    semDocumento,
    lancamentoContabil,
    saldoZero,
    totalAposFiltro: mappedRows.length,
  };

  // --- Passo 2: Analisar dados mapeados ---
  const columns = mappedRows.length > 0 ? Object.keys(mappedRows[0]) : [];
  const matchedColumns = columns.filter(c => EXPECTED_COLUMNS.includes(c));
  const unmatchedColumns = columns.filter(c => !EXPECTED_COLUMNS.includes(c));
  const missingExpected = EXPECTED_COLUMNS.filter(c => !columns.includes(c));

  const fieldStats: Record<string, { filled: number; empty: number; uniqueValues: number }> = {};
  for (const col of matchedColumns) {
    const values = mappedRows.map(r => r[col]);
    const filled = values.filter(v => v !== null && v !== undefined && v !== "").length;
    const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== "")).size;
    fieldStats[col] = { filled, empty: mappedRows.length - filled, uniqueValues };
  }

  const requiredFieldIssues = REQUIRED_FIELDS.map(field => {
    const emptyRows = mappedRows.filter(r => !r[field] || r[field] === "").length;
    return { field, emptyRows };
  }).filter(r => r.emptyRows > 0);

  const ids = mappedRows.map(r => r.id).filter(Boolean);
  const duplicateIds = ids.length - new Set(ids).size;

  // --- Passo 3: Validação forma_pagamento vs insere_na_base ---
  const configMap = new Map(formasConfig.map(f => [f.forma_pagamento, f.insere_na_base]));
  const blockedMap: Record<string, number> = {};
  const nullConfigMap: Record<string, number> = {};
  const notFoundMap: Record<string, number> = {};
  let allowedCount = 0;
  let totalWithForma = 0;

  for (const row of mappedRows) {
    const forma = row.forma_pagamento;
    if (!forma || forma === "") continue;
    totalWithForma++;

    if (!configMap.has(forma)) {
      notFoundMap[forma] = (notFoundMap[forma] || 0) + 1;
    } else {
      const val = configMap.get(forma);
      if (val === null || val === undefined) {
        nullConfigMap[forma] = (nullConfigMap[forma] || 0) + 1;
      } else if (val === false) {
        blockedMap[forma] = (blockedMap[forma] || 0) + 1;
      } else {
        allowedCount++;
      }
    }
  }

  const formaValidation: FormaPagamentoValidation = {
    blocked: Object.entries(blockedMap).map(([forma, count]) => ({ forma, count })),
    nullConfig: Object.entries(nullConfigMap).map(([forma, count]) => ({ forma, count })),
    notFound: Object.entries(notFoundMap).map(([forma, count]) => ({ forma, count })),
    allowedCount,
    totalWithForma,
  };

  // --- Passo 4: Filtrar por forma_pagamento permitida ---
  const allowedFormas = new Set(
    formasConfig.filter(f => f.insere_na_base === true).map(f => f.forma_pagamento)
  );

  const records = mappedRows
    .filter(row => {
      const forma = row.forma_pagamento;
      if (!forma || forma === "") return true;
      return allowedFormas.has(forma);
    })
    .map(row => {
      const record: Record<string, any> = {};
      for (const col of EXPECTED_COLUMNS) {
        if (["inserido_cedrus", "negativado", "bloqueado"].includes(col)) {
          record[col] = row[col] ?? false;
        } else {
          record[col] = row[col] ?? null;
        }
      }
      return record;
    });

  return {
    totalRows: mappedRows.length,
    columns,
    matchedColumns,
    unmatchedColumns,
    missingExpected,
    fieldStats,
    requiredFieldIssues,
    duplicateIds,
    records,
    formaValidation,
    filteredStats,
    statusComparison: null,
    etapaBloqueadoValidation: null,
  };
}

export default function UploadArquivos() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: insercoes, isLoading } = useTitulosInsercoes();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setAnalysis(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setAnalysis(null);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    try {
      // Buscar config de formas de pagamento e etapas em paralelo
      const [formasRes, etapasRes] = await Promise.all([
        supabase.from("base_tudobelo_formas_pagamento").select("forma_pagamento, insere_na_base, prazo_liquidacao"),
        supabase.from("base_tudobelo_etapas").select("etapa, ignorar"),
      ]);

      if (formasRes.error) throw formasRes.error;

      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        toast.error("A planilha está vazia.");
        setAnalyzing(false);
        return;
      }

      const result = analyzeData(rows, formasRes.data || []);

      // Build set of etapas to ignore
      const etapasIgnorar = new Set(
        (etapasRes.data || []).filter(e => e.ignorar === true).map(e => e.etapa)
      );

      // Fetch ALL DB records to compare (for etapa/bloqueado and somente-banco)
      const recordIds = result.records.map(r => r.id).filter(Boolean);
      const allSpreadsheetIds = new Set(recordIds);
      const dbRecordsMap: Record<string, Record<string, any>> = {};

      // Fetch DB records that match spreadsheet
      if (recordIds.length > 0) {
        for (let i = 0; i < recordIds.length; i += 500) {
          const batch = recordIds.slice(i, i + 500);
          const { data: dbData } = await supabase
            .from("base_tudobelo_para_testes")
            .select("id, status_titulo, data_vencimento, forma_pagamento, nome_parceiro, saldo_parcela, etapa, bloqueado")
            .in("id", batch);
          if (dbData) {
            for (const row of dbData) {
              dbRecordsMap[row.id] = row;
            }
          }
        }
      }

      // Fetch all DB records to find somente-banco (titles only in DB, not in spreadsheet)
      const { data: allDbIds } = await supabase
        .from("base_tudobelo_para_testes")
        .select("id, nome_parceiro, status_titulo, etapa, bloqueado, forma_pagamento, data_vencimento, saldo_parcela")
        .not("status_titulo", "in", '("Pago","Pago em dia","Pago via renegociação","Cancelado","Suspenso","Não se aplica")');

      const somenteBancoIds: string[] = [];
      const somenteBancoRecords: Record<string, any>[] = [];
      if (allDbIds) {
        for (const dbRow of allDbIds) {
          if (!allSpreadsheetIds.has(dbRow.id)) {
            somenteBancoIds.push(dbRow.id);
            if (somenteBancoRecords.length < 100) somenteBancoRecords.push(dbRow);
          }
        }
      }

      // Track novos títulos (in spreadsheet but not in DB)
      const novosTitulosRecords: Record<string, any>[] = [];
      let novosTitulosCount = 0;
      for (const record of result.records) {
        if (!record.id) continue;
        if (!dbRecordsMap[record.id]) {
          novosTitulosCount++;
          if (novosTitulosRecords.length < 100) novosTitulosRecords.push(record);
        }
      }

      // Etapa/bloqueado validation
      const etapaIgnoradaMap: Record<string, { count: number; ids: string[] }> = {};
      let bloqueadoCount = 0;
      const bloqueadoIds: string[] = [];

      // Check DB records for etapa ignorar and bloqueado
      for (const record of result.records) {
        if (!record.id) continue;
        const dbRow = dbRecordsMap[record.id];
        if (dbRow) {
          // Check bloqueado
          if (dbRow.bloqueado === true) {
            bloqueadoCount++;
            if (bloqueadoIds.length < 100) bloqueadoIds.push(record.id);
          }
          // Check etapa ignorar
          if (dbRow.etapa && etapasIgnorar.has(dbRow.etapa)) {
            if (!etapaIgnoradaMap[dbRow.etapa]) etapaIgnoradaMap[dbRow.etapa] = { count: 0, ids: [] };
            etapaIgnoradaMap[dbRow.etapa].count++;
            if (etapaIgnoradaMap[dbRow.etapa].ids.length < 50) etapaIgnoradaMap[dbRow.etapa].ids.push(record.id);
          }
        }
      }

      result.etapaBloqueadoValidation = {
        etapaIgnoradaCount: Object.values(etapaIgnoradaMap).reduce((s, v) => s + v.count, 0),
        etapaIgnoradaDetails: Object.entries(etapaIgnoradaMap).map(([etapa, v]) => ({ etapa, count: v.count, ids: v.ids })),
        bloqueadoCount,
        bloqueadoIds,
        somenteBancoCount: somenteBancoIds.length,
        somenteBancoIds: somenteBancoIds.slice(0, 100),
        somenteBancoRecords: somenteBancoRecords,
        novosTitulosCount: novosTitulosCount,
        novosTitulosRecords: novosTitulosRecords,
      };

      // Filter out records with etapa ignorar or bloqueado from DB
      const blockedByEtapaOrBloqueado = new Set<string>();
      for (const record of result.records) {
        if (!record.id) continue;
        const dbRow = dbRecordsMap[record.id];
        if (dbRow) {
          if (dbRow.bloqueado === true) blockedByEtapaOrBloqueado.add(record.id);
          if (dbRow.etapa && etapasIgnorar.has(dbRow.etapa)) blockedByEtapaOrBloqueado.add(record.id);
        }
      }
      result.records = result.records.filter(r => !blockedByEtapaOrBloqueado.has(r.id));

      // Status comparison (after filtering)
      // Títulos com status "Pago" ou "Vencido" no banco mantêm o status do banco
      const statusProtegidos = ["Pago", "Pago em dia", "Pago via renegociação"];
      for (const record of result.records) {
        if (!record.id || !(record.id in dbRecordsMap)) continue;
        const dbRow = dbRecordsMap[record.id];
        const dbStatus = dbRow.status_titulo;
        if (dbStatus && statusProtegidos.includes(dbStatus)) {
          record.status_titulo = dbStatus;
        }
      }

      const diffMap: Record<string, { count: number; records: { id: string; db: Record<string, any>; calc: Record<string, any> }[] }> = {};
      let totalCompared = 0;
      let totalDifferent = 0;
      let totalIdentical = 0;

      for (const record of result.records) {
        if (!record.id || !(record.id in dbRecordsMap)) continue;
        totalCompared++;
        const dbRow = dbRecordsMap[record.id];
        const dbStatus = dbRow.status_titulo || "Sem status";
        const calcStatus = record.status_titulo || "Sem status";
        if (dbStatus !== calcStatus) {
          totalDifferent++;
          const key = `${dbStatus} → ${calcStatus}`;
          if (!diffMap[key]) diffMap[key] = { count: 0, records: [] };
          diffMap[key].count++;
          if (diffMap[key].records.length < 100) {
            diffMap[key].records.push({ id: record.id, db: dbRow, calc: record });
          }
        } else {
          totalIdentical++;
        }
      }

      result.statusComparison = {
        totalCompared,
        totalDifferent,
        totalIdentical,
        details: Object.entries(diffMap).map(([key, val]) => {
          const [from, to] = key.split(" → ");
          return { from, to, count: val.count, records: val.records };
        }),
      };

      setAnalysis(result);
    } catch (err: any) {
      toast.error(`Erro ao analisar arquivo: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!analysis) return;
    setUploading(true);

    try {
      const batchSize = 500;
      let totalInserted = 0;
      let totalUpdated = 0;

      // Determine which records are new vs existing
      const recordIds = analysis.records.map(r => r.id).filter(Boolean);
      const existingIds = new Set<string>();
      for (let i = 0; i < recordIds.length; i += 500) {
        const batch = recordIds.slice(i, i + 500);
        const { data: dbData } = await supabase
          .from("base_tudobelo_para_testes")
          .select("id")
          .in("id", batch);
        if (dbData) dbData.forEach(r => existingIds.add(r.id));
      }

      const newRecords = analysis.records.filter(r => !existingIds.has(r.id));
      const updateRecords = analysis.records.filter(r => existingIds.has(r.id));

      // Insert new records
      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);
        const { error } = await supabase.from("base_tudobelo_para_testes").insert(batch);
        if (error) throw error;
        totalInserted += batch.length;
      }

      // Update existing records
      for (let i = 0; i < updateRecords.length; i += batchSize) {
        const batch = updateRecords.slice(i, i + batchSize);
        const { error } = await supabase.from("base_tudobelo_para_testes").upsert(batch, { onConflict: "id" });
        if (error) throw error;
        totalUpdated += batch.length;
      }

      // Mark somente-banco titles as "Pago"
      let totalMarkedPago = 0;
      const somenteBancoIds = analysis.etapaBloqueadoValidation?.somenteBancoIds || [];
      for (let i = 0; i < somenteBancoIds.length; i += 500) {
        const batch = somenteBancoIds.slice(i, i + 500);
        const { error } = await supabase
          .from("base_tudobelo_para_testes")
          .update({ status_titulo: "Pago" })
          .in("id", batch);
        if (error) throw error;
        totalMarkedPago += batch.length;
      }

      const msgs = [];
      if (totalInserted > 0) msgs.push(`${totalInserted} inserido(s)`);
      if (totalUpdated > 0) msgs.push(`${totalUpdated} atualizado(s)`);
      if (totalMarkedPago > 0) msgs.push(`${totalMarkedPago} marcado(s) como Pago`);
      toast.success(`Concluído: ${msgs.join(", ")}!`);
      setSelectedFile(null);
      setAnalysis(null);
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error(`Erro ao enviar dados: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setAnalysis(null);
    setSelectedFile(null);
  };

  const hasBlockingIssues = analysis ? analysis.requiredFieldIssues.some(r => r.field === "id" && r.emptyRows > 0) : false;

  const formatDateStr = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Se a análise estiver ativa, mostra a tela de análise
  if (analysis) {
    const fv = analysis.formaValidation;
    const warnings = [];
    if (analysis.unmatchedColumns.length > 0) {
      warnings.push(`${analysis.unmatchedColumns.length} coluna(s) na planilha não correspondem à tabela e serão ignoradas`);
    }
    if (analysis.duplicateIds > 0) {
      warnings.push(`${analysis.duplicateIds} ID(s) duplicado(s) encontrado(s) — serão atualizados via upsert`);
    }
    for (const issue of analysis.requiredFieldIssues) {
      warnings.push(`Campo obrigatório "${issue.field}" está vazio em ${issue.emptyRows} linha(s)`);
    }
    if (fv) {
      for (const item of fv.blocked) {
        warnings.push(`"${item.forma}" — insere_na_base = false → ${item.count} registro(s) bloqueado(s)`);
      }
      for (const item of fv.nullConfig) {
        warnings.push(`"${item.forma}" — insere_na_base = null (não configurado) → ${item.count} registro(s)`);
      }
      for (const item of fv.notFound) {
        warnings.push(`"${item.forma}" — forma de pagamento não cadastrada → ${item.count} registro(s)`);
      }
    }
    const blockedTotal = fv ? fv.blocked.reduce((s, b) => s + b.count, 0) : 0;

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSuperavit} alt="Superávit" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold">Análise do Arquivo</h1>
              <p className="text-muted-foreground text-sm">
                Revise os dados antes de enviar para a base de testes
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 h-8 px-3">
            <FlaskConical className="h-3.5 w-3.5 mr-1" />
            AMBIENTE DE TESTES
          </Badge>
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Linhas na Planilha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(analysis.filteredStats?.totalOriginal ?? analysis.totalRows).toLocaleString("pt-BR")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Após Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analysis.totalRows.toLocaleString("pt-BR")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Colunas Mapeadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.matchedColumns.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">A Enviar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analysis.records.length.toLocaleString("pt-BR")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${warnings.length > 0 ? "text-amber-600" : "text-green-600"}`}>
                {warnings.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros aplicados */}
        {analysis.filteredStats && (analysis.filteredStats.semDocumento > 0 || analysis.filteredStats.lancamentoContabil > 0 || analysis.filteredStats.saldoZero > 0) && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
                <FileText className="h-4 w-4" />
                Filtros de Validação Aplicados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.filteredStats.semDocumento > 0 && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span><strong>{analysis.filteredStats.semDocumento}</strong> sem documento (removidos)</span>
                  </div>
                )}
                {analysis.filteredStats.lancamentoContabil > 0 && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span><strong>{analysis.filteredStats.lancamentoContabil}</strong> Lançamento Contábil Manual (removidos)</span>
                  </div>
                )}
                {analysis.filteredStats.saldoZero > 0 && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span><strong>{analysis.filteredStats.saldoZero}</strong> com saldo ≤ 0 (removidos)</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Total removido: {analysis.filteredStats.totalOriginal - analysis.filteredStats.totalAposFiltro} de {analysis.filteredStats.totalOriginal} linhas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Novos Títulos - presentes na planilha mas não no banco */}
        {analysis.etapaBloqueadoValidation?.novosTitulosCount > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-800">
                <Plus className="h-4 w-4" />
                Novos Títulos ({analysis.etapaBloqueadoValidation.novosTitulosCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-sm text-emerald-700">
                  <strong>{analysis.etapaBloqueadoValidation.novosTitulosCount}</strong> título(s) serão inseridos como novos registros no banco
                </div>
              </div>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 mb-2">
                    <ChevronDown className="h-3.5 w-3.5" />
                    Ver detalhes
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">Forma Pagamento</TableHead>
                          <TableHead className="text-xs">Vencimento</TableHead>
                          <TableHead className="text-xs">Saldo</TableHead>
                          <TableHead className="text-xs">Status Calculado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.etapaBloqueadoValidation.novosTitulosRecords.map((rec, j) => (
                          <TableRow key={j} className="text-xs">
                            <TableCell className="font-mono text-xs">{rec.id}</TableCell>
                            <TableCell className="text-xs">{rec.nome_parceiro || "-"}</TableCell>
                            <TableCell className="text-xs">{rec.forma_pagamento || "-"}</TableCell>
                            <TableCell className="text-xs">{rec.data_vencimento || "-"}</TableCell>
                            <TableCell className="text-xs">{rec.saldo_parcela != null ? Number(rec.saldo_parcela).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{rec.status_titulo || "Sem status"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {analysis.etapaBloqueadoValidation.novosTitulosCount > analysis.etapaBloqueadoValidation.novosTitulosRecords.length && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-xs text-center text-muted-foreground">
                              +{analysis.etapaBloqueadoValidation.novosTitulosCount - analysis.etapaBloqueadoValidation.novosTitulosRecords.length} título(s) adicionais não exibidos
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <p className="text-xs text-emerald-600 mt-2">
                Estes títulos não existem no banco de dados e serão inseridos como novos registros ao confirmar o envio.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Validação: Status Título (comparativo com banco) */}
        {analysis.statusComparison && analysis.statusComparison.totalCompared > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                Validação: Status do Título (comparativo com banco de dados)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <div className="text-sm text-blue-700">
                  <strong>{analysis.statusComparison.totalCompared}</strong> título(s) encontrado(s) no banco
                </div>
                <div className="text-sm font-semibold text-green-700">
                  ✓ {analysis.statusComparison.totalIdentical} título(s) idêntico(s)
                </div>
                <div className={`text-sm font-semibold ${analysis.statusComparison.totalDifferent > 0 ? "text-amber-700" : "text-green-700"}`}>
                  {analysis.statusComparison.totalDifferent > 0
                    ? `⚠ ${analysis.statusComparison.totalDifferent} título(s) com status diferente`
                    : "✓ Todos os status estão consistentes"}
                </div>
              </div>
              {analysis.statusComparison.details.length > 0 && (
                <div className="space-y-2">
                  {analysis.statusComparison.details.map((item, i) => (
                    <Collapsible key={i}>
                      <div className="flex items-center justify-between border rounded-md p-3 bg-background">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {item.from}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            {item.to}
                          </Badge>
                          <span className="text-sm font-medium ml-2">{item.count} título(s)</span>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs gap-1">
                            <ChevronDown className="h-3.5 w-3.5" />
                            Ver detalhes
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="border border-t-0 rounded-b-md overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">Nome</TableHead>
                                <TableHead className="text-xs">Forma Pagamento</TableHead>
                                <TableHead className="text-xs">Vencimento</TableHead>
                                <TableHead className="text-xs">Saldo</TableHead>
                                <TableHead className="text-xs">Status Banco</TableHead>
                                <TableHead className="text-xs">Status Calculado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(item.records || []).map((rec, j) => (
                                <TableRow key={j} className="text-xs cursor-pointer hover:bg-muted/50" onClick={async () => {
                                  const { data } = await supabase.from("base_tudobelo_para_testes").select("*").eq("id", rec.id).single();
                                  if (data) {
                                    setSelectedTitulo(data as TituloTudoBelo);
                                    setDetailsOpen(true);
                                  } else {
                                    toast.error("Título não encontrado no banco de dados");
                                  }
                                }}>
                                  <TableCell className="font-mono text-xs">{rec.id}</TableCell>
                                  <TableCell className="text-xs">{rec.db.nome_parceiro || "-"}</TableCell>
                                  <TableCell className="text-xs">{rec.db.forma_pagamento || "-"}</TableCell>
                                  <TableCell className="text-xs">{rec.db.data_vencimento || "-"}</TableCell>
                                  <TableCell className="text-xs">{rec.db.saldo_parcela != null ? Number(rec.db.saldo_parcela).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-"}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">{rec.db.status_titulo || "Sem status"}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{rec.calc.status_titulo || "Sem status"}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
              {/* Somente banco - títulos ausentes na planilha */}
              {analysis.etapaBloqueadoValidation?.somenteBancoCount > 0 && (
                <Collapsible>
                  <div className="flex items-center justify-between border rounded-md p-3 bg-background mt-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        💰 Somente no banco
                      </Badge>
                      <span className="text-sm font-semibold text-green-700">
                        {analysis.etapaBloqueadoValidation.somenteBancoCount} título(s) ausentes na planilha → serão marcados como "Pago"
                      </span>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        <ChevronDown className="h-3.5 w-3.5" />
                        Ver detalhes
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="border border-t-0 rounded-b-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">ID</TableHead>
                            <TableHead className="text-xs">Nome</TableHead>
                            <TableHead className="text-xs">Forma Pagamento</TableHead>
                            <TableHead className="text-xs">Vencimento</TableHead>
                            <TableHead className="text-xs">Saldo</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Etapa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.etapaBloqueadoValidation.somenteBancoRecords.map((rec, j) => (
                            <TableRow key={j} className="text-xs cursor-pointer hover:bg-muted/50" onClick={async () => {
                              const { data } = await supabase.from("base_tudobelo_para_testes").select("*").eq("id", rec.id).single();
                              if (data) {
                                setSelectedTitulo(data as TituloTudoBelo);
                                setDetailsOpen(true);
                              } else {
                                toast.error("Título não encontrado no banco de dados");
                              }
                            }}>
                              <TableCell className="font-mono text-xs">{rec.id}</TableCell>
                              <TableCell className="text-xs">{rec.nome_parceiro || "-"}</TableCell>
                              <TableCell className="text-xs">{rec.forma_pagamento || "-"}</TableCell>
                              <TableCell className="text-xs">{rec.data_vencimento || "-"}</TableCell>
                              <TableCell className="text-xs">{rec.saldo_parcela != null ? Number(rec.saldo_parcela).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{rec.status_titulo || "Sem status"}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{rec.etapa || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {analysis.etapaBloqueadoValidation.somenteBancoCount > analysis.etapaBloqueadoValidation.somenteBancoRecords.length && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-xs text-center text-muted-foreground">
                                +{analysis.etapaBloqueadoValidation.somenteBancoCount - analysis.etapaBloqueadoValidation.somenteBancoRecords.length} título(s) adicionais não exibidos
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              <p className="text-xs text-blue-600 mt-2">
                O status é recalculado com base na data de vencimento + prazo de liquidação da forma de pagamento. Títulos vencidos em finais de semana são marcados como "Vencido em final de semana" apenas às segundas-feiras. Títulos com status "Pago" no banco são preservados.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Validação: Etapa Ignorada e Bloqueados */}
        {analysis.etapaBloqueadoValidation && (analysis.etapaBloqueadoValidation.etapaIgnoradaCount > 0 || analysis.etapaBloqueadoValidation.bloqueadoCount > 0) && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-800">
                <AlertCircle className="h-4 w-4" />
                Validação: Etapa e Bloqueio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Etapas com ignorar */}
              {analysis.etapaBloqueadoValidation.etapaIgnoradaCount > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-purple-700">
                    🚫 {analysis.etapaBloqueadoValidation.etapaIgnoradaCount} título(s) com etapa marcada como "ignorar" (não serão inseridos/atualizados)
                  </div>
                  {analysis.etapaBloqueadoValidation.etapaIgnoradaDetails.map((item, i) => (
                    <Collapsible key={i}>
                      <div className="flex items-center justify-between border rounded-md p-3 bg-background">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            Etapa: {item.etapa}
                          </Badge>
                          <span className="text-sm font-medium">{item.count} título(s)</span>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs gap-1">
                            <ChevronDown className="h-3.5 w-3.5" />
                            Ver IDs
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="border border-t-0 rounded-b-md p-3 bg-background">
                          <div className="flex flex-wrap gap-1">
                            {item.ids.map((id, j) => (
                              <Badge key={j} variant="outline" className="text-xs font-mono">{id}</Badge>
                            ))}
                            {item.count > item.ids.length && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">+{item.count - item.ids.length} mais</Badge>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}

              {/* Bloqueados */}
              {analysis.etapaBloqueadoValidation.bloqueadoCount > 0 && (
                <Collapsible>
                  <div className="flex items-center justify-between border rounded-md p-3 bg-background">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        🔒 Bloqueados
                      </Badge>
                      <span className="text-sm font-semibold text-amber-700">
                        {analysis.etapaBloqueadoValidation.bloqueadoCount} título(s) bloqueado(s) (não serão inseridos/atualizados)
                      </span>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        <ChevronDown className="h-3.5 w-3.5" />
                        Ver IDs
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="border border-t-0 rounded-b-md p-3 bg-background">
                      <div className="flex flex-wrap gap-1">
                        {analysis.etapaBloqueadoValidation.bloqueadoIds.map((id, j) => (
                          <Badge key={j} variant="outline" className="text-xs font-mono">{id}</Badge>
                        ))}
                        {analysis.etapaBloqueadoValidation.bloqueadoCount > analysis.etapaBloqueadoValidation.bloqueadoIds.length && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">+{analysis.etapaBloqueadoValidation.bloqueadoCount - analysis.etapaBloqueadoValidation.bloqueadoIds.length} mais</Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <p className="text-xs text-purple-600 mt-2">
                Títulos com etapa "ignorar" ou marcados como bloqueados no banco não são atualizados.
              </p>
            </CardContent>
          </Card>
        )}

        <Collapsible>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Mapeamento de Colunas</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <ChevronDown className="h-3.5 w-3.5" />
                    Expandir
                  </Button>
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
                {analysis.missingExpected.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Colunas da tabela ausentes na planilha (serão preenchidas como null):</p>
                    <p className="text-xs text-muted-foreground">{analysis.missingExpected.join(", ")}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Estatísticas por campo */}
        <Collapsible>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Preenchimento por Campo</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <ChevronDown className="h-3.5 w-3.5" />
                    Expandir
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campo</TableHead>
                        <TableHead className="text-center">Preenchidos</TableHead>
                        <TableHead className="text-center">Vazios</TableHead>
                        <TableHead className="text-center">Valores Únicos</TableHead>
                        <TableHead className="text-center">Preenchimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.matchedColumns.map(col => {
                        const stats = analysis.fieldStats[col];
                        const pct = Math.round((stats.filled / analysis.totalRows) * 100);
                        return (
                          <TableRow key={col}>
                            <TableCell className="text-sm font-medium">{col}</TableCell>
                            <TableCell className="text-center text-sm">{stats.filled}</TableCell>
                            <TableCell className="text-center text-sm">
                              {stats.empty > 0 ? (
                                <span className="text-amber-600">{stats.empty}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">{stats.uniqueValues}</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  pct === 100
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : pct >= 50
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {pct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Alertas */}
        {warnings.length > 0 && (
          <Collapsible>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    Alertas ({warnings.length})
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <ChevronDown className="h-3.5 w-3.5" />
                      Expandir
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <ul className="space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="mt-0.5">⚠</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{selectedFile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {analysis.records.length} de {analysis.totalRows} registros serão enviados
                {blockedTotal > 0 && ` (${blockedTotal} bloqueado(s) por forma de pagamento)`}
                {analysis.etapaBloqueadoValidation?.etapaIgnoradaCount ? ` | ${analysis.etapaBloqueadoValidation.etapaIgnoradaCount} ignorado(s) por etapa` : ""}
                {analysis.etapaBloqueadoValidation?.bloqueadoCount ? ` | ${analysis.etapaBloqueadoValidation.bloqueadoCount} bloqueado(s)` : ""}
                {analysis.etapaBloqueadoValidation?.somenteBancoCount ? ` | ${analysis.etapaBloqueadoValidation.somenteBancoCount} serão marcados como Pago` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading || hasBlockingIssues}
            >
              <Send className="h-4 w-4 mr-1" />
              {uploading ? "Enviando..." : "Confirmar e Enviar"}
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={logoSuperavit} alt="Superávit" className="h-10" />
        <div>
          <h1 className="text-2xl font-bold">Upload de Arquivos</h1>
          <p className="text-muted-foreground text-sm">
            Envio de planilhas e arquivos CSV para importação de dados
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Arquivo para Base de Testes
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 ml-2">
              <FlaskConical className="h-3 w-3 mr-1" />
              Testes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              Arraste e solte o arquivo aqui
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Formatos aceitos: .xlsx, .xls, .csv — Os dados serão inseridos na tabela de testes
            </p>
            <Input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setSelectedFile(null); setAnalysis(null); }} variant="ghost">
                  Remover
                </Button>
                <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? "Analisando..." : "Analisar Arquivo"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Inserções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Inserções
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !insercoes?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma inserção encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome do Arquivo</TableHead>
                    <TableHead className="text-center">Qtd. Inserida</TableHead>
                    <TableHead>Google Drive</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insercoes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateStr(item.created_at)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {item.nome_arquivo || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {item.quantidade_inserida || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.id_google_drive ? (
                          <a
                            href={`https://drive.google.com/file/d/${item.id_google_drive}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
