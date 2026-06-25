import { supabase } from '@/lib/supabase';
import { chunkArray } from '@/lib/supabaseBatch';
import { onlyDigits } from './normalize-phone';
import type { TituloPersonSource } from './findOrCreatePerson';

export interface PeopleAnalysisPreviewItem {
  nome_parceiro: string | null;
  cnpj_cpf: string | null;
  codigo_parceiro: string | null;
}

export interface PeopleAnalysisResult {
  totalRecords: number;
  semIdentificador: number;
  distinctPessoas: number;
  jaExistem: number;
  matchedByExternal: number;
  matchedByDocument: number;
  novasACriar: number;
  novasPreview: PeopleAnalysisPreviewItem[];
}

function cleanStr(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * Pesquisa quantas pessoas já existem na base (`people`) para os registros
 * de uma planilha, sem criar nem atualizar nada. Match por:
 *  - `people_external_ids.external_id = codigo_parceiro` (system = externalSystem)
 *  - `people.document_digits = cnpj_cpf` (apenas dígitos)
 */
export async function analyzePeopleForRecords(
  records: TituloPersonSource[],
  opts: { externalSystem?: string } = {},
): Promise<PeopleAnalysisResult> {
  const system = (opts.externalSystem || 'tudobelo').toLowerCase();
  const totalRecords = records.length;

  // Agrupa registros por chave única de pessoa (preferindo CPF, depois código).
  // Linhas sem nenhum identificador entram em `semIdentificador`.
  let semIdentificador = 0;
  const byKey = new Map<string, PeopleAnalysisPreviewItem & { dig: string | null; codigo: string | null }>();

  for (const r of records) {
    const codigo = cleanStr(r.codigo_parceiro);
    const dig = onlyDigits(r.cnpj_cpf == null ? '' : String(r.cnpj_cpf));
    const docOk = dig && (dig.length === 11 || dig.length === 14) ? dig : null;
    if (!codigo && !docOk) {
      semIdentificador++;
      continue;
    }
    const key = docOk ? `doc:${docOk}` : `cod:${codigo}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        nome_parceiro: cleanStr(r.nome_parceiro),
        cnpj_cpf: docOk,
        codigo_parceiro: codigo,
        dig: docOk,
        codigo,
      });
    }
  }

  const distinctPessoas = byKey.size;

  // Prefetch external_ids
  const codigos = Array.from(
    new Set(Array.from(byKey.values()).map((v) => v.codigo).filter((x): x is string => !!x)),
  );
  const codigoToPerson = new Map<string, string>();
  if (codigos.length > 0) {
    for (const chunk of chunkArray(codigos, 200)) {
      if (!chunk.length) continue;
      const { data, error } = await supabase
        .from('people_external_ids')
        .select('external_id, person_id')
        .eq('system', system)
        .in('external_id', chunk);
      if (error) console.warn('[analyzePeople] external_ids error:', error.message);
      for (const row of (data as any[]) || []) {
        if (!codigoToPerson.has(row.external_id)) {
          codigoToPerson.set(String(row.external_id), row.person_id as string);
        }
      }
    }
  }

  // Prefetch documents
  const docs = Array.from(
    new Set(Array.from(byKey.values()).map((v) => v.dig).filter((x): x is string => !!x)),
  );
  const docToPerson = new Map<string, string>();
  if (docs.length > 0) {
    for (const chunk of chunkArray(docs, 500)) {
      if (!chunk.length) continue;
      const { data, error } = await supabase
        .from('people')
        .select('id, document_digits')
        .in('document_digits', chunk)
        .is('merged_into_id', null);
      if (error) console.warn('[analyzePeople] people error:', error.message);
      for (const row of (data as any[]) || []) {
        if (!docToPerson.has(row.document_digits)) {
          docToPerson.set(String(row.document_digits), row.id as string);
        }
      }
    }
  }

  let matchedByExternal = 0;
  let matchedByDocument = 0;
  const novasPreview: PeopleAnalysisPreviewItem[] = [];

  for (const v of byKey.values()) {
    if (v.codigo && codigoToPerson.has(v.codigo)) {
      matchedByExternal++;
      continue;
    }
    if (v.dig && docToPerson.has(v.dig)) {
      matchedByDocument++;
      continue;
    }
    if (novasPreview.length < 100) {
      novasPreview.push({
        nome_parceiro: v.nome_parceiro,
        cnpj_cpf: v.cnpj_cpf,
        codigo_parceiro: v.codigo_parceiro,
      });
    }
  }

  const jaExistem = matchedByExternal + matchedByDocument;
  const novasACriar = distinctPessoas - jaExistem;

  return {
    totalRecords,
    semIdentificador,
    distinctPessoas,
    jaExistem,
    matchedByExternal,
    matchedByDocument,
    novasACriar,
    novasPreview,
  };
}
