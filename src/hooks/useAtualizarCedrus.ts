import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { computeCedrusDiff, CedrusFieldDiff, RemoteCedrusData } from "@/utils/cedrusDiff";

export interface CedrusSyncResult {
  titulo: TituloTudoBelo;
  found: boolean;
  remote: RemoteCedrusData | null;
  diffs: CedrusFieldDiff[];
  error?: string;
}

/**
 * Extrai o primeiro título da resposta da edge cedrus-consultar-titulo.
 * O payload retornado varia; tentamos os formatos conhecidos.
 */
function extractTitulo(payload: any): any | null {
  if (!payload) return null;
  // Padrão comum: { data: [...] } ou { titulos: [...] } ou array direto
  const candidates = [
    payload?.data,
    payload?.titulos,
    payload?.result,
    payload?.results,
    payload,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c[0];
    if (c && typeof c === "object" && (c.id_titulo || c.status)) return c;
  }
  return null;
}

async function consultarTituloRemote(titulo: TituloTudoBelo): Promise<RemoteCedrusData | null> {
  // Prefer id_titulo quando disponível, senão cod_titulo + parcela
  const body: Record<string, any> = {};
  if (titulo.id_titulo_cedrus) {
    const parsed = Number(titulo.id_titulo_cedrus);
    body.id_titulo = Number.isFinite(parsed) ? parsed : titulo.id_titulo_cedrus;
  } else {
    if (!titulo.documento) return null;
    body.cod_titulo = titulo.documento;
    if (titulo.numero_parcela) body.parcela = String(titulo.numero_parcela);
    if (titulo.credor_cedrus) body.cod_credor = titulo.credor_cedrus;
  }

  const { data, error } = await supabase.functions.invoke("cedrus-consultar-titulo", { body });
  if (error) throw error;

  const found = extractTitulo(data);
  if (!found) return null;

  const idTitulo = found.id_titulo ?? found.idTitulo ?? null;
  const status = found.status ?? found.status_cedrus ?? null;

  return {
    status_cedrus: status ? String(status) : null,
    inserido_cedrus: true,
    id_titulo_cedrus: idTitulo !== null && idTitulo !== undefined ? String(idTitulo) : (titulo.id_titulo_cedrus ?? null),
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const total = items.length;

  const workers = Array.from({ length: Math.min(limit, total) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= total) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = err as R;
      }
      done++;
      onProgress?.(done, total);
    }
  });

  await Promise.all(workers);
  return results;
}

export function useAtualizarCedrus() {
  const consultar = useCallback(
    async (
      titulos: TituloTudoBelo[],
      onProgress?: (done: number, total: number) => void
    ): Promise<CedrusSyncResult[]> => {
      return runWithConcurrency(
        titulos,
        5,
        async (titulo) => {
          try {
            const remote = await consultarTituloRemote(titulo);
            if (!remote) {
              return { titulo, found: false, remote: null, diffs: [] };
            }
            const diffs = computeCedrusDiff(titulo, remote);
            return { titulo, found: true, remote, diffs };
          } catch (err: any) {
            return {
              titulo,
              found: false,
              remote: null,
              diffs: [],
              error: err?.message || "Erro ao consultar Cedrus",
            };
          }
        },
        onProgress
      );
    },
    []
  );

  return { consultar };
}
