import { supabase } from '@/lib/supabase';
import { chunkArray } from '@/lib/supabaseBatch';
import { normalizarTelefone, onlyDigits } from './normalize-phone';

/**
 * Origem de dados de pessoa a partir de um título.
 * Todos os campos são opcionais — usamos o que estiver disponível.
 */
export interface TituloPersonSource {
  codigo_parceiro?: string | null;
  cnpj_cpf?: string | null;
  nome_parceiro?: string | null;
  nome_fantasia?: string | null;
  email?: string | null;
  fone1?: string | null;
  fone2?: string | null;
  endereco?: string | null;
  numero_endereco?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

export interface FindOrCreateOptions {
  /** Sistema usado em people_external_ids. Default 'tudobelo'. */
  externalSystem?: string;
  /** Código do credor para people_creditors. Default 'TUDOBELO'. */
  creditorCode?: string;
  /** Origem dos dados para campos `source`. Default 'upload'. */
  source?: string;
}

export interface FindOrCreateResult {
  personId: string | null;
  created: boolean;
  matchedBy: 'external_id' | 'document' | 'created' | null;
}

function personTypeFromDoc(digits: string): 'F' | 'J' | null {
  if (digits.length === 11) return 'F';
  if (digits.length === 14) return 'J';
  return null;
}

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

async function ensureExternalId(
  personId: string,
  system: string,
  externalId: string,
) {
  const { error } = await supabase
    .from('people_external_ids')
    .upsert(
      {
        person_id: personId,
        system,
        external_id: externalId,
        metadata: null,
      },
      { onConflict: 'system,external_id' },
    );
  if (error) console.warn('[ensureExternalId]', error.message);
}

async function ensureCreditor(personId: string, creditorCode: string, source: string) {
  const { error } = await supabase
    .from('people_creditors')
    .upsert(
      {
        person_id: personId,
        creditor_code: creditorCode.toUpperCase().trim(),
        status: 'ativo',
        source,
      },
      { onConflict: 'person_id,creditor_code' },
    );
  if (error) console.warn('[ensureCreditor]', error.message);
}

async function ensurePhones(
  personId: string,
  phones: Array<{ phone: string; phone_type?: string | null }>,
  source: string,
) {
  if (!phones.length) return;
  // dedupe by normalized digits within input
  const seen = new Set<string>();
  const unique = phones.filter((p) => {
    const n = normalizarTelefone(p.phone);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  if (!unique.length) return;

  // remove ones already present for the person
  const { data: existing } = await supabase
    .from('people_phones')
    .select('phone')
    .eq('person_id', personId);
  const existingSet = new Set(
    (existing as any[] | null)?.map((r) => normalizarTelefone(r.phone)) ?? [],
  );
  const toInsert = unique
    .filter((p) => !existingSet.has(normalizarTelefone(p.phone)))
    .map((p) => ({
      person_id: personId,
      phone: normalizarTelefone(p.phone),
      phone_type: p.phone_type ?? null,
      source,
    }));
  if (!toInsert.length) return;
  const { error } = await supabase.from('people_phones').insert(toInsert);
  if (error) console.warn('[ensurePhones]', error.message);
}

/**
 * Encontra ou cria UMA pessoa a partir dos dados de um título.
 *
 * Regras de match (nessa ordem):
 *   1) people_external_ids onde (system, external_id) = (externalSystem, codigo_parceiro)
 *   2) people.document_digits = digits(cnpj_cpf)
 *
 * Não atualiza pessoa existente — somente cria se não existir.
 * Sempre garante: external_id link, creditor (TUDOBELO) e telefones (fone1/fone2).
 */
export async function findOrCreatePersonFromTitulo(
  t: TituloPersonSource,
  opts: FindOrCreateOptions = {},
): Promise<FindOrCreateResult> {
  const system = (opts.externalSystem || 'tudobelo').toLowerCase();
  const creditor = (opts.creditorCode || 'TUDOBELO').toUpperCase();
  const source = opts.source || 'upload';

  const codigo = cleanStr(t.codigo_parceiro);
  const docDigits = onlyDigits(t.cnpj_cpf);
  const phones: Array<{ phone: string; phone_type?: string | null }> = [];
  for (const f of [t.fone1, t.fone2]) {
    const n = normalizarTelefone(f);
    if (n) phones.push({ phone: n, phone_type: null });
  }

  let personId: string | null = null;
  let matchedBy: FindOrCreateResult['matchedBy'] = null;

  // 1) Match por external_id
  if (codigo) {
    const { data } = await supabase
      .from('people_external_ids')
      .select('person_id')
      .eq('system', system)
      .eq('external_id', codigo)
      .limit(1)
      .maybeSingle();
    if (data?.person_id) {
      personId = data.person_id as string;
      matchedBy = 'external_id';
    }
  }

  // 2) Match por documento
  if (!personId && docDigits.length >= 11) {
    const { data } = await supabase
      .from('people')
      .select('id')
      .eq('document_digits', docDigits)
      .is('merged_into_id', null)
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      personId = data.id as string;
      matchedBy = 'document';
    }
  }

  // 3) Criar nova pessoa (somente se não existir)
  let created = false;
  if (!personId) {
    const payload: Record<string, any> = {
      name: cleanStr(t.nome_parceiro),
      cpf: docDigits || null,
      person_type: docDigits ? personTypeFromDoc(docDigits) : null,
      email: cleanStr(t.email),
      address_street_name: cleanStr(t.endereco),
      address_number: cleanStr(t.numero_endereco),
      address_complement: cleanStr(t.complemento),
      address_neighborhood: cleanStr(t.bairro),
      address_city: cleanStr(t.cidade),
      address_state: cleanStr(t.uf),
    };
    const { data, error } = await supabase
      .from('people')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data?.id) {
      console.warn('[findOrCreatePerson] erro ao criar pessoa:', error?.message);
      return { personId: null, created: false, matchedBy: null };
    }
    personId = data.id as string;
    created = true;
    matchedBy = 'created';
  }

  // Garante vínculos: external_id, credor e telefones
  if (personId && codigo) await ensureExternalId(personId, system, codigo);
  if (personId) await ensureCreditor(personId, creditor, source);
  if (personId) await ensurePhones(personId, phones, source);

  return { personId, created, matchedBy };
}

// ----------------------------------------------------------------------------
// Versão em lote — usada no upload para resolver person_id de muitos registros
// de uma vez, com prefetch (1 query por chave) antes de criar os ausentes.
// ----------------------------------------------------------------------------

export interface BulkResolveResult<T extends TituloPersonSource> {
  records: Array<T & { person_id: string | null }>;
  stats: {
    matchedByExternal: number;
    matchedByDocument: number;
    created: number;
    failed: number;
  };
}

export async function resolveOrCreatePeopleForRecords<T extends TituloPersonSource>(
  records: T[],
  opts: FindOrCreateOptions = {},
  onProgress?: (done: number, total: number, phase: string) => void,
): Promise<BulkResolveResult<T>> {
  const system = (opts.externalSystem || 'tudobelo').toLowerCase();
  const creditor = (opts.creditorCode || 'TUDOBELO').toUpperCase();
  const source = opts.source || 'upload';

  const stats = { matchedByExternal: 0, matchedByDocument: 0, created: 0, failed: 0 };
  const out: Array<T & { person_id: string | null }> = records.map((r) => ({
    ...r,
    person_id: null,
  }));

  // Prefetch — chaves únicas
  const codigos = Array.from(
    new Set(out.map((r) => cleanStr(r.codigo_parceiro)).filter((x): x is string => !!x)),
  );
  const docs = Array.from(
    new Set(
      out
        .map((r) => onlyDigits(r.cnpj_cpf))
        .filter((d) => d.length === 11 || d.length === 14),
    ),
  );

  const codigoToPerson = new Map<string, string>();
  for (const chunk of chunkArray(codigos, 200)) {
    const { data } = await supabase
      .from('people_external_ids')
      .select('external_id, person_id')
      .eq('system', system)
      .in('external_id', chunk);
    for (const row of (data as any[]) || []) {
      if (!codigoToPerson.has(row.external_id)) {
        codigoToPerson.set(String(row.external_id), row.person_id as string);
      }
    }
  }

  const docToPerson = new Map<string, string>();
  for (const chunk of chunkArray(docs, 500)) {
    const { data } = await supabase
      .from('people')
      .select('id, document_digits')
      .in('document_digits', chunk)
      .is('merged_into_id', null);
    for (const row of (data as any[]) || []) {
      if (!docToPerson.has(row.document_digits)) {
        docToPerson.set(String(row.document_digits), row.id as string);
      }
    }
  }

  // Resolve match ou marca para criação
  const toCreateIdx: number[] = [];
  for (let i = 0; i < out.length; i++) {
    const r = out[i];
    const codigo = cleanStr(r.codigo_parceiro);
    const dig = onlyDigits(r.cnpj_cpf);
    if (codigo && codigoToPerson.has(codigo)) {
      out[i].person_id = codigoToPerson.get(codigo)!;
      stats.matchedByExternal++;
      continue;
    }
    if (dig && docToPerson.has(dig)) {
      out[i].person_id = docToPerson.get(dig)!;
      stats.matchedByDocument++;
      continue;
    }
    toCreateIdx.push(i);
  }

  onProgress?.(out.length - toCreateIdx.length, out.length, 'match');

  // Cria pessoas ausentes — deduplicadas por (document_digits || codigo_parceiro || índice)
  // Evita criar duplicatas dentro do mesmo lote para o mesmo CPF/CNPJ.
  const dedupCreated = new Map<string, string>(); // key -> personId

  let done = out.length - toCreateIdx.length;
  for (const idx of toCreateIdx) {
    const r = out[idx];
    const dig = onlyDigits(r.cnpj_cpf);
    const codigo = cleanStr(r.codigo_parceiro);
    const dedupKey = dig || (codigo ? `cod:${codigo}` : `row:${idx}`);

    let personId = dedupCreated.get(dedupKey) || null;

    if (!personId) {
      const payload: Record<string, any> = {
        name: cleanStr(r.nome_parceiro),
        cpf: dig || null,
        person_type: dig ? personTypeFromDoc(dig) : null,
        email: cleanStr(r.email),
        address_street_name: cleanStr(r.endereco),
        address_number: cleanStr(r.numero_endereco),
        address_complement: cleanStr(r.complemento),
        address_neighborhood: cleanStr(r.bairro),
        address_city: cleanStr(r.cidade),
        address_state: cleanStr(r.uf),
      };
      const { data, error } = await supabase
        .from('people')
        .insert(payload)
        .select('id')
        .single();
      if (error || !data?.id) {
        console.warn('[resolveOrCreatePeople] erro ao criar pessoa:', error?.message);
        stats.failed++;
        done++;
        onProgress?.(done, out.length, 'create');
        continue;
      }
      personId = data.id as string;
      dedupCreated.set(dedupKey, personId);
      stats.created++;
    }

    out[idx].person_id = personId;

    // Vínculos auxiliares (best-effort, em paralelo)
    const phones: Array<{ phone: string; phone_type?: string | null }> = [];
    for (const f of [r.fone1, r.fone2]) {
      const n = normalizarTelefone(f);
      if (n) phones.push({ phone: n, phone_type: null });
    }
    await Promise.all([
      codigo ? ensureExternalId(personId, system, codigo) : Promise.resolve(),
      ensureCreditor(personId, creditor, source),
      ensurePhones(personId, phones, source),
    ]);

    done++;
    onProgress?.(done, out.length, 'create');
  }

  return { records: out, stats };
}
