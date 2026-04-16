import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { fetchAllSupabaseRows, chunkArray } from "@/lib/supabaseBatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileSpreadsheet, Search, Trash2 } from "lucide-react";
import { LoadingProgress } from "@/components/ui/loading-progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface TituloPago {
  id: string;
  documento: number | null;
  tipo_documento: string | null;
  serie_documento: string | null;
  codigo_parceiro: string | null;
  nome_parceiro: string | null;
  cnpj_cpf: string | null;
  nome_fantasia_parceiro: string | null;
  parcela: number | null;
  valor_original_parcela: number | null;
  valor_pago: number | null;
  data_pagamento: string | null;
  data_vencimento: string | null;
  forma_pagamento: string | null;
  multa_percentual: number | null;
  valor_multa: number | null;
  juros_percentual: number | null;
  valor_total_juros: number | null;
  desconto_percentual: number | null;
  valor_desconto: number | null;
}

const PAGE_SIZE = 50;

const parseDate = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};

const toStr = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
};

const formatCurrency = (v: number | null) =>
  v === null ? "-" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (v: string | null) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
};

export default function TitulosPagosTudoBelo() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [titulos, setTitulos] = useState<TituloPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setProgress({ current: 0, total: 0, message: "Carregando títulos pagos..." });
    try {
      const rows = await fetchAllSupabaseRows<TituloPago>(
        async (from, to) =>
          await supabase
            .from("base_tudobelo_titulos_pagos")
            .select("*")
            .order("data_pagamento", { ascending: false })
            .range(from, to),
        500,
        (loaded) => setProgress({ current: loaded, total: loaded, message: `${loaded} carregados` })
      );
      setTitulos(rows);
      toast({ title: "Dados carregados", description: `${rows.length} títulos pagos.` });
    } catch (err: any) {
      toast({ title: "Erro ao carregar", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress({ current: 0, total: 0, message: "Lendo arquivo..." });

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });

      const records = rows
        .map((r) => {
          const documento = toNum(r["Documento"]);
          const parcela = toNum(r["Parcela"]);
          if (documento === null || parcela === null) return null;
          return {
            id: `${documento}-${parcela}`,
            documento,
            tipo_documento: toStr(r["Tipo Documento"]),
            serie_documento: toStr(r["Série do Documento"]),
            codigo_parceiro: toStr(r["Código Parceiro"]),
            nome_parceiro: toStr(r["Nome Parceiro"]),
            cnpj_cpf: toStr(r["CNPJ/CPF"]),
            nome_fantasia_parceiro: toStr(r["Nome Fantasia do Parceiro"]),
            parcela: Math.trunc(parcela),
            valor_original_parcela: toNum(r["Valor Original Parcela"]),
            valor_pago: toNum(r["Valor Pago"]),
            data_pagamento: parseDate(r["Data de pagamento"]),
            data_vencimento: parseDate(r["Data de Vencimento"]),
            forma_pagamento: toStr(r["Forma de Pagamento"]),
            multa_percentual: toNum(r["Multa%"]),
            valor_multa: toNum(r["Valor Multa"]),
            juros_percentual: toNum(r["Juros %"]),
            valor_total_juros: toNum(r["Valor Total Juros"]),
            desconto_percentual: toNum(r["Desconto %"]),
            valor_desconto: toNum(r["Valor Desconto"]),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      // Dedup por id (mantém o último)
      const map = new Map<string, (typeof records)[number]>();
      for (const r of records) map.set(r.id, r);
      const unique = Array.from(map.values());

      const chunks = chunkArray(unique, 500);
      let inserted = 0;
      setProgress({ current: 0, total: unique.length, message: "Importando..." });

      for (const batch of chunks) {
        const { error } = await supabase
          .from("base_tudobelo_titulos_pagos")
          .upsert(batch, { onConflict: "id" });
        if (error) throw error;
        inserted += batch.length;
        setProgress({ current: inserted, total: unique.length, message: `${inserted}/${unique.length}` });
      }

      toast({ title: "Upload concluído", description: `${unique.length} registros importados.` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleClearAll = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("base_tudobelo_titulos_pagos")
        .delete()
        .not("id", "is", null);
      if (error) throw error;
      setTitulos([]);
      toast({ title: "Base limpa", description: "Todos os registros foram removidos." });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLoading(false);
      setConfirmClearOpen(false);
    }
  };

  const filtered = titulos.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      (t.nome_parceiro ?? "").toLowerCase().includes(q) ||
      (t.codigo_parceiro ?? "").toLowerCase().includes(q) ||
      (t.cnpj_cpf ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Títulos Pagos Tudo Belo</h1>
          <p className="text-muted-foreground">Importação e consulta dos títulos pagos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload de Planilha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o arquivo .xlsx no formato padrão (Documento, Parcela, Valor Pago, etc.). O ID será
            gerado como <code className="font-mono">Documento-Parcela</code> e duplicidades serão atualizadas.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id="upload-pagos"
            />
            <Button asChild disabled={uploading}>
              <label htmlFor="upload-pagos" className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar planilha
                  </>
                )}
              </label>
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading || uploading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Carregar dados
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmClearOpen(true)}
              disabled={loading || uploading || titulos.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar base
            </Button>
          </div>
          {(uploading || loading) && (
            <LoadingProgress
              current={progress.current}
              total={progress.total || progress.current}
              message={progress.message}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Títulos Pagos ({filtered.length})</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, parceiro, CNPJ..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead className="text-right">Valor Original</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Forma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {titulos.length === 0
                        ? "Nenhum dado. Carregue ou faça upload da planilha."
                        : "Nenhum resultado para a busca."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.id}</TableCell>
                      <TableCell>{t.documento}</TableCell>
                      <TableCell>{t.parcela}</TableCell>
                      <TableCell className="max-w-[240px] truncate" title={t.nome_parceiro ?? ""}>
                        {t.nome_parceiro ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.cnpj_cpf ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.valor_original_parcela)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.valor_pago)}</TableCell>
                      <TableCell>{formatDate(t.data_vencimento)}</TableCell>
                      <TableCell>{formatDate(t.data_pagamento)}</TableCell>
                      <TableCell>{t.forma_pagamento ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>
                    {currentPage} / {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar toda a base?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá todos os {titulos.length} registros de títulos pagos. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
