import { supabase } from '@/lib/supabase';
import { onlyDigits, variantesTelefone } from './normalize-phone';
import type {
  Person,
  PersonPhone,
  PersonCreditor,
  PersonExternalId,
  DuplicateGroup,
} from '@/types/people';
import { TUDOBELO_CREDITORS } from '@/types/people';

const CHUNK = 1000;

/** Busca todos os person_id vinculados a TUDOBELO ou TUDOBELO-FUNDOS (status ativo). */
export async function fetchTudobeloPersonIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('people_creditors')
      .select('person_id')
      .in('creditor_code', TUDOBELO_CREDITORS as unknown as string[])
      .eq('status', 'ativo')
      .range(from, from + CHUNK - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) if (r.person_id) ids.add(r.person_id as string);
    if (data.length < CHUNK) break;
    from += CHUNK;
  }
  return ids;
}

export interface FetchPeopleParams {
  search?: string;
  page?: number;
  pageSize?: number;
  onlyWithoutDocument?: boolean;
}

export interface FetchPeopleResult {
  rows: Person[];
  total: number;
}

/**
 * Lista pessoas TUDOBELO/-FUNDOS. Estratégia:
 *  1) Coleta person_ids ativos em people_creditors (chunked).
 *  2) Filtra por nome / CPF (document_digits) / telefone (variantes).
 *  3) Pagina o set final em memória, depois busca os registros completos em chunks.
 */
export async function fetchPeople(params: FetchPeopleParams): Promise<FetchPeopleResult> {
  const { search = '', page = 0, pageSize = 100, onlyWithoutDocument = false } = params;
  const q = search.trim();

  let allowed = await fetchTudobeloPersonIds();
  if (allowed.size === 0) return { rows: [], total: 0 };

  // Filtro por telefone — quando search tem >=4 dígitos
  const digits = onlyDigits(q);
  if (digits.length >= 4) {
    const variants = variantesTelefone(digits);
    const phoneIds = new Set<string>();
    for (const v of variants) {
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('people_phones')
          .select('person_id')
          .ilike('phone', `%${v}%`)
          .range(from, from + CHUNK - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const r of data) if (r.person_id) phoneIds.add(r.person_id as string);
        if (data.length < CHUNK) break;
        from += CHUNK;
      }
    }
    // Também tenta document_digits
    const docIds = new Set<string>();
    if (digits.length >= 3) {
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('people')
          .select('id')
          .ilike('document_digits', `%${digits}%`)
          .is('merged_into_id', null)
          .range(from, from + CHUNK - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const r of data) if (r.id) docIds.add(r.id as string);
        if (data.length < CHUNK) break;
        from += CHUNK;
      }
    }
    const union = new Set<string>([...phoneIds, ...docIds]);
    allowed = new Set([...allowed].filter((id) => union.has(id)));
  } else if (q.length > 0) {
    // Filtro por nome (texto livre)
    const nameIds = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('people')
        .select('id')
        .ilike('name', `%${q}%`)
        .is('merged_into_id', null)
        .range(from, from + CHUNK - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) if (r.id) nameIds.add(r.id as string);
      if (data.length < CHUNK) break;
      from += CHUNK;
    }
    allowed = new Set([...allowed].filter((id) => nameIds.has(id)));
  }

  // Filtro "sem CPF/CNPJ"
  if (onlyWithoutDocument && allowed.size > 0) {
    const withoutDocIds = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('people')
        .select('id')
        .or('document_digits.is.null,document_digits.eq.')
        .is('merged_into_id', null)
        .range(from, from + CHUNK - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) if (r.id) withoutDocIds.add(r.id as string);
      if (data.length < CHUNK) break;
      from += CHUNK;
    }
    allowed = new Set([...allowed].filter((id) => withoutDocIds.has(id)));
  }

  const allIds = Array.from(allowed);
  const total = allIds.length;
  const start = page * pageSize;
  const pageIds = allIds.slice(start, start + pageSize);
  if (pageIds.length === 0) return { rows: [], total };

  // Busca registros completos. Para evitar URL gigante, faz em sub-chunks de 200.
  const rows: Person[] = [];
  for (let i = 0; i < pageIds.length; i += 200) {
    const slice = pageIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .in('id', slice)
      .is('merged_into_id', null);
    if (error) throw error;
    if (data) rows.push(...(data as Person[]));
  }
  // Ordena por nome
  rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return { rows, total };
}

export async function getPersonById(id: string): Promise<Person | null> {
  const { data, error } = await supabase.from('people').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Person) ?? null;
}

export async function updatePerson(id: string, patch: Partial<Person>): Promise<Person> {
  const clean = { ...patch };
  delete (clean as any).id;
  delete (clean as any).created_at;
  delete (clean as any).updated_at;
  delete (clean as any).document_digits; // coluna gerada
  const { data, error } = await supabase
    .from('people')
    .update(clean)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Person;
}

// ---------- Telefones ----------

export async function fetchPersonPhones(personId: string): Promise<PersonPhone[]> {
  const { data, error } = await supabase
    .from('people_phones')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as PersonPhone[]) || [];
}

export async function addPersonPhone(
  personId: string,
  payload: Partial<PersonPhone> & { phone: string }
): Promise<PersonPhone> {
  const insert = {
    person_id: personId,
    phone: payload.phone,
    phone_type: payload.phone_type ?? null,
    source: payload.source ?? 'manual',
    is_whatsapp: payload.is_whatsapp ?? null,
    is_valid: payload.is_valid ?? null,
    validated: payload.validated ?? null,
  };
  const { data, error } = await supabase
    .from('people_phones')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return data as PersonPhone;
}

export async function updatePersonPhone(id: string, patch: Partial<PersonPhone>): Promise<PersonPhone> {
  const { data, error } = await supabase
    .from('people_phones')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as PersonPhone;
}

export async function deletePersonPhone(id: string): Promise<void> {
  const { error } = await supabase.from('people_phones').delete().eq('id', id);
  if (error) throw error;
}

export async function validatePersonPhone(id: string): Promise<PersonPhone> {
  return updatePersonPhone(id, {
    validated: true,
    is_valid: true,
    validated_at: new Date().toISOString(),
  });
}

export async function invalidatePersonPhone(id: string): Promise<PersonPhone> {
  return updatePersonPhone(id, {
    validated: true,
    is_valid: false,
    validated_at: new Date().toISOString(),
  });
}

// ---------- Credores ----------

export async function fetchPersonCreditors(personId: string): Promise<PersonCreditor[]> {
  const { data, error } = await supabase
    .from('people_creditors')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as PersonCreditor[]) || [];
}

export async function addPersonCreditor(payload: PersonCreditor): Promise<PersonCreditor> {
  const insert = {
    person_id: payload.person_id,
    creditor_code: (payload.creditor_code || '').toUpperCase().trim(),
    debtor_code_at_creditor: payload.debtor_code_at_creditor ?? null,
    status: payload.status ?? 'ativo',
    source: payload.source ?? 'manual',
  };
  const { data, error } = await supabase
    .from('people_creditors')
    .upsert(insert, { onConflict: 'person_id,creditor_code' })
    .select('*')
    .single();
  if (error) throw error;
  return data as PersonCreditor;
}

// ---------- IDs externos ----------

export async function fetchPersonExternalIds(personId: string): Promise<PersonExternalId[]> {
  const { data, error } = await supabase
    .from('people_external_ids')
    .select('*')
    .eq('person_id', personId)
    .order('system', { ascending: true });
  if (error) throw error;
  return (data as PersonExternalId[]) || [];
}

export async function upsertPersonExternalId(
  personId: string,
  system: string,
  externalId: string,
  metadata?: Record<string, any>
): Promise<PersonExternalId> {
  const { data, error } = await supabase
    .from('people_external_ids')
    .upsert(
      {
        person_id: personId,
        system,
        external_id: externalId,
        metadata: metadata ?? null,
      },
      { onConflict: 'system,external_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as PersonExternalId;
}

// ---------- Duplicados ----------

export async function fetchDuplicateGroups(limit = 100): Promise<DuplicateGroup[]> {
  const { data, error } = await supabase
    .from('people_duplicates')
    .select('*')
    .limit(limit);
  if (error) throw error;
  return (data as DuplicateGroup[]) || [];
}

export async function mergePeople(canonical: string, duplicates: string[]): Promise<void> {
  const { error } = await supabase.rpc('merge_people', {
    _canonical: canonical,
    _duplicates: duplicates,
  });
  if (error) throw error;
}

// ---------- Títulos vinculados ----------

export async function fetchTitulosByDocumento(documentDigits: string) {
  const d = onlyDigits(documentDigits);
  if (!d) return [];
  const { data, error } = await supabase
    .from('base_tudobelo_intermediaria')
    .select('*')
    .eq('cnpj_cpf', d);
  if (error) {
    console.warn('[fetchTitulosByDocumento] erro:', error);
    return [];
  }
  return data || [];
}

/** Vincula (ou desvincula, com null) um título a uma Person via person_id. */
export async function setTituloPersonId(tituloId: string, personId: string | null) {
  const { error } = await supabase
    .from('base_tudobelo_intermediaria')
    .update({ person_id: personId })
    .eq('id', tituloId);
  if (error) throw error;
}

