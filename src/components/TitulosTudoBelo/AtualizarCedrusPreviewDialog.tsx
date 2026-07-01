import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { buildUpdatePayload } from "@/utils/cedrusDiff";
import { CedrusSyncResult } from "@/hooks/useAtualizarCedrus";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: CedrusSyncResult[];
  tableName?: string;
}

export function AtualizarCedrusPreviewDialog({
  open,
  onOpenChange,
  results,
  tableName = "base_tudobelo_intermediaria",
}: Props) {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);

  const stats = useMemo(() => {
    let divergentes = 0, iguais = 0, naoEncontrados = 0, erros = 0;
    for (const r of results) {
      if (r.error) erros++;
      else if (!r.found) naoEncontrados++;
      else if (r.diffs.length > 0) divergentes++;
      else iguais++;
    }
    return { divergentes, iguais, naoEncontrados, erros, total: results.length };
  }, [results]);

  const comDiff = useMemo(() => results.filter(r => r.found && r.diffs.length > 0), [results]);
  const semDiff = useMemo(() => results.filter(r => r.found && r.diffs.length === 0), [results]);
  const naoEncontrados = useMemo(() => results.filter(r => !r.found && !r.error), [results]);
  const comErro = useMemo(() => results.filter(r => !!r.error), [results]);

  const handleApply = async () => {
    if (comDiff.length === 0) {
      onOpenChange(false);
      return;
    }
    setApplying(true);
    let success = 0;
    let failed = 0;
    const now = new Date().toISOString();

    // Atualiza em série (mudanças são poucas e evita rate limits do trigger)
    for (const r of comDiff) {
      try {
        const payload = buildUpdatePayload(r.diffs, r.remote!);
        const { error } = await supabase
          .from(tableName)
          .update({ ...payload, ultima_atualizacao: now })
          .eq("id", r.titulo.id);
        if (error) throw error;
        success++;
      } catch (err: any) {
        console.error("Erro ao atualizar título", r.titulo.id, err);
        failed++;
      }
    }

    setApplying(false);
    queryClient.invalidateQueries({ queryKey: ["titulos-tudobelo", tableName] });
    queryClient.invalidateQueries({ queryKey: ["titulos-tudobelo"] });

    if (failed === 0) {
      toast.success(`${success} títulos atualizados a partir do Cedrus.`);
    } else {
      toast.warning(`${success} atualizados, ${failed} falharam.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Preview da Atualização Cedrus
          </DialogTitle>
          <DialogDescription>
            Resultado da consulta ao Cedrus. Confira os diffs antes de aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">Total: {stats.total}</Badge>
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">Divergentes: {stats.divergentes}</Badge>
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Sem alteração: {stats.iguais}</Badge>
          <Badge className="bg-slate-500/15 text-slate-700 border-slate-300">Não encontrados: {stats.naoEncontrados}</Badge>
          {stats.erros > 0 && (
            <Badge variant="destructive">Erros: {stats.erros}</Badge>
          )}
        </div>

        <ScrollArea className="max-h-[55vh] pr-2">
          {comDiff.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-700">Divergências a aplicar ({comDiff.length})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Parceiro</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Antes</TableHead>
                    <TableHead>Depois</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comDiff.flatMap((r) =>
                    r.diffs.map((d, i) => (
                      <TableRow key={`${r.titulo.id}-${d.campo}`}>
                        {i === 0 && (
                          <>
                            <TableCell rowSpan={r.diffs.length} className="align-top font-mono text-xs">
                              {r.titulo.documento}
                              {r.titulo.numero_parcela ? `/${r.titulo.numero_parcela}` : ""}
                            </TableCell>
                            <TableCell rowSpan={r.diffs.length} className="align-top max-w-[220px] truncate">
                              {r.titulo.nome_parceiro || "-"}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-xs">{d.label}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.valorAnterior ?? "—"}</TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{d.valorNovo ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {naoEncontrados.length > 0 && (
            <div className="space-y-2 mt-6">
              <h4 className="text-sm font-semibold text-slate-700">Não encontrados no Cedrus ({naoEncontrados.length})</h4>
              <ul className="text-xs space-y-1">
                {naoEncontrados.map((r) => (
                  <li key={r.titulo.id} className="text-muted-foreground">
                    <span className="font-mono">{r.titulo.documento}</span>
                    {r.titulo.numero_parcela ? `/${r.titulo.numero_parcela}` : ""} — {r.titulo.nome_parceiro || "-"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {comErro.length > 0 && (
            <div className="space-y-2 mt-6">
              <h4 className="text-sm font-semibold text-destructive">Erros ({comErro.length})</h4>
              <ul className="text-xs space-y-1">
                {comErro.map((r) => (
                  <li key={r.titulo.id} className="text-destructive">
                    <span className="font-mono">{r.titulo.documento}</span> — {r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {semDiff.length > 0 && (
            <div className="space-y-2 mt-6">
              <h4 className="text-sm font-semibold text-emerald-700">Sem alterações ({semDiff.length})</h4>
              <p className="text-xs text-muted-foreground">
                Estes títulos já estão sincronizados com o Cedrus.
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || comDiff.length === 0}
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>Aplicar {comDiff.length} alteraç{comDiff.length === 1 ? "ão" : "ões"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
