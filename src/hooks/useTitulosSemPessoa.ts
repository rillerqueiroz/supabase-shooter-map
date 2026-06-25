import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows, chunkArray } from '@/lib/supabaseBatch';
import { onlyDigits } from '@/utils/normalize-phone';
import { toast } from 'sonner';

export interface TituloSemPessoa {
  id: string;
  documento: string | null;
  nome_parceiro: string | null;
  codigo_parceiro: string | null;
  cnpj_cpf: string | null;
  valor_parcela: number | null;
  saldo_parcela: number | null;
  data_vencimento: string | null;
  status_titulo: string | null;
  forma_pagamento: string | null;
  filial: string | null;
  uf_cobranca: string | null;
  person_id: string | null;
}

export interface MatchCandidate {
  person_id: string;
  name: string | null;
  cpf: string | null;
  document_digits: string | null;
  reasons: Array<'codigo_parceiro' | 'cpf_cnpj'>;
}

export interface TituloComMatches extends TituloSemPessoa {
  candidates: MatchCandidate[];
}

const SELECT_COLS =
  'id, documento, nome_parceiro, codigo_parceiro, cnpj_cpf, valor_parcela, saldo_parcela, data_vencimento, status_titulo, forma_pagamento, filial, uf_cobranca, person_id';

/**
 * Carrega todos os títulos sem person_id e cruza com a base people
 * por: (1) people_external_ids.external_id = codigo_parceiro
 *      (2) people.document_digits = digits(cnpj_cpf)
 */
export function useTitulosSemPessoa(externalSystem?: string | null) {
  return useQuery({
    queryKey: ['vincular-titulos-pessoas', externalSystem ?? '__any__'],
    queryFn: async (): Promise<TituloComMatches[]> => {
      // 1) Fetch titles with person_id null
      const titulos = await fetchAllSupabaseRows<TituloSemPessoa>(async (from, to) => {
        const result = await supabase
          .from('base_tudobelo_intermediaria')
          .select(SELECT_COLS)
          .is('person_id', null)
          .order('data_vencimento', { ascending: false })
          .range(from, to);
        return result as any;
      }, 500);

      if (!titulos.length) return [];

      // 2) Unique keys
      const codigosParceiros = Array.from(
        new Set(titulos.map((t) => (t.codigo_parceiro || '').trim()).filter(Boolean)),
      );
      const docDigits = Array.from(
        new Set(titulos.map((t) => onlyDigits(t.cnpj_cpf)).filter((d) => d.length >= 11)),
      );

      // 3) Match by codigo_parceiro via people_external_ids
      const codigoToPersons = new Map<string, MatchCandidate[]>();
      for (const chunk of chunkArray(codigosParceiros, 200)) {
        let query = supabase
          .from('people_external_ids')
          .select('external_id, person_id, system, people:person_id(id, name, cpf, document_digits)')
          .in('external_id', chunk);
        if (externalSystem) query = query.eq('system', externalSystem);
        const { data, error } = await query;
        if (error) throw error;
        for (const row of (data as any[]) || []) {
          const key = String(row.external_id);
          const person = row.people;
          if (!person) continue;
          const list = codigoToPersons.get(key) || [];
          list.push({
            person_id: person.id,
            name: person.name,
            cpf: person.cpf,
            document_digits: person.document_digits,
            reasons: ['codigo_parceiro'],
          });
          codigoToPersons.set(key, list);
        }
      }

      // 4) Match by document_digits via people
      const docToPersons = new Map<string, MatchCandidate[]>();
      for (const chunk of chunkArray(docDigits, 500)) {
        const { data, error } = await supabase
          .from('people')
          .select('id, name, cpf, document_digits')
          .in('document_digits', chunk)
          .is('merged_into_id', null);
        if (error) throw error;
        for (const p of (data as any[]) || []) {
          const key = String(p.document_digits);
          const list = docToPersons.get(key) || [];
          list.push({
            person_id: p.id,
            name: p.name,
            cpf: p.cpf,
            document_digits: p.document_digits,
            reasons: ['cpf_cnpj'],
          });
          docToPersons.set(key, list);
        }
      }

      // 5) Combine candidates per título (dedup, merge reasons)
      return titulos.map((t) => {
        const byPerson = new Map<string, MatchCandidate>();

        const cod = (t.codigo_parceiro || '').trim();
        if (cod && codigoToPersons.has(cod)) {
          for (const c of codigoToPersons.get(cod)!) {
            const ex = byPerson.get(c.person_id);
            if (ex) {
              if (!ex.reasons.includes('codigo_parceiro')) ex.reasons.push('codigo_parceiro');
            } else {
              byPerson.set(c.person_id, { ...c, reasons: [...c.reasons] });
            }
          }
        }
        const dig = onlyDigits(t.cnpj_cpf);
        if (dig && docToPersons.has(dig)) {
          for (const c of docToPersons.get(dig)!) {
            const ex = byPerson.get(c.person_id);
            if (ex) {
              if (!ex.reasons.includes('cpf_cnpj')) ex.reasons.push('cpf_cnpj');
            } else {
              byPerson.set(c.person_id, { ...c, reasons: [...c.reasons] });
            }
          }
        }

        return { ...t, candidates: Array.from(byPerson.values()) };
      });
    },
  });
}

export function useVincularTituloPessoa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tituloId, personId }: { tituloId: string; personId: string }) => {
      const { error } = await supabase
        .from('base_tudobelo_intermediaria')
        .update({ person_id: personId, ultima_atualizacao: new Date().toISOString() })
        .eq('id', tituloId);
      if (error) throw error;
      return { tituloId, personId };
    },
    onSuccess: () => {
      toast.success('Título vinculado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['vincular-titulos-pessoas'] });
    },
    onError: (e: any) => {
      toast.error('Erro ao vincular: ' + (e?.message || 'falha'));
    },
  });
}

export function useVincularTitulosBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pairs: Array<{ tituloId: string; personId: string }>) => {
      let ok = 0;
      for (const chunk of chunkArray(pairs, 50)) {
        await Promise.all(
          chunk.map(async ({ tituloId, personId }) => {
            const { error } = await supabase
              .from('base_tudobelo_intermediaria')
              .update({ person_id: personId, ultima_atualizacao: new Date().toISOString() })
              .eq('id', tituloId);
            if (!error) ok++;
          }),
        );
      }
      return ok;
    },
    onSuccess: (ok, vars) => {
      toast.success(`${ok}/${vars.length} títulos vinculados.`);
      queryClient.invalidateQueries({ queryKey: ['vincular-titulos-pessoas'] });
    },
    onError: (e: any) => {
      toast.error('Erro no vínculo em massa: ' + (e?.message || 'falha'));
    },
  });
}
