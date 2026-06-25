import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchPersonPhones } from '@/utils/supabase-people-mapper';
import { normalizeNumber, variantsOf } from '@/lib/discador-processing';

export type MatchReason = 'telefone' | 'nome' | 'cpf';

export interface DiscadorLigacao {
  id: string;
  call_id: string;
  call_date: string | null;
  numero: string | null;
  agente: string | null;
  qualificacao: string | null;
  motivo: string | null;
  credor: string | null;
  devedor: string | null;
  resolution_source: string | null;
  historico: string | null;
  duration: number | null;
  talk_time: number | null;
  ring_time: number | null;
  hangup_cause: string | null;
  campaign_name: string | null;
  queue: string | null;
  callerid: string | null;
  dialed_number: string | null;
  recording: string | null;
  audio_base64: string | null;
  audio_mime: string | null;
  transcricao_audio: string | null;
  mailing_data: { phone?: string; data?: Record<string, any> } | null;
  matchReasons: MatchReason[];
}

interface Params {
  personId: string | null | undefined;
  name?: string | null;
  cpf?: string | null;
  enabled?: boolean;
}

export function useHistoricoDiscadorPorPessoa({ personId, name, cpf, enabled = true }: Params) {
  const [ligacoes, setLigacoes] = useState<DiscadorLigacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !personId) {
      setLigacoes([]);
      return;
    }
    let canceled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const phones = await fetchPersonPhones(personId);
        const phoneVariants = new Set<string>();
        for (const p of phones) {
          const d = normalizeNumber(p.phone || '');
          if (!d) continue;
          for (const v of variantsOf(d)) phoneVariants.add(v);
        }

        const cpfRaw = (cpf || '').replace(/\D/g, '');
        const nameClean = (name || '').trim();
        const useName = nameClean.split(/\s+/).filter(Boolean).length >= 3;

        const ors: string[] = [];
        for (const v of phoneVariants) {
          const tail = v.length > 10 ? v.slice(-10) : v;
          ors.push(`numero.ilike.%${tail}%`);
        }
        if (useName) {
          const escaped = nameClean.replace(/[%,()]/g, ' ').trim();
          ors.push(`devedor.ilike.%${escaped}%`);
        }

        if (ors.length === 0) {
          if (!canceled) setLigacoes([]);
          return;
        }

        const { data, error: err } = await supabase
          .from('discador_ligacoes' as any)
          .select(
            'id,call_id,call_date,numero,agente,qualificacao,motivo,credor,devedor,resolution_source,historico,duration,talk_time,ring_time,hangup_cause,campaign_name,queue,callerid,dialed_number,recording,audio_base64,audio_mime,transcricao_audio,mailing_data',
          )
          .or(ors.join(','))
          .order('call_date', { ascending: false })
          .limit(2000);

        if (err) throw err;

        const map = new Map<string, DiscadorLigacao>();
        for (const row of (data || []) as any[]) {
          const numDigits = normalizeNumber(row.numero || '');
          const reasons: MatchReason[] = [];
          if (numDigits) {
            for (const v of phoneVariants) {
              const tail = v.length > 10 ? v.slice(-10) : v;
              if (numDigits.endsWith(tail) || numDigits.includes(tail)) {
                reasons.push('telefone');
                break;
              }
            }
          }
          if (useName && row.devedor && row.devedor.toLowerCase().includes(nameClean.toLowerCase())) {
            reasons.push('nome');
          }
          const mailingCpf = String(row?.mailing_data?.data?.CPF ?? row?.mailing_data?.CPF ?? '').replace(/\D/g, '');
          if (cpfRaw && mailingCpf === cpfRaw) reasons.push('cpf');

          const key = String(row.call_id || row.id);
          if (!map.has(key)) {
            map.set(key, { ...(row as DiscadorLigacao), matchReasons: reasons.length ? reasons : ['telefone'] });
          }
        }

        const list = Array.from(map.values()).sort((a, b) => {
          const da = a.call_date ? new Date(a.call_date).getTime() : 0;
          const db = b.call_date ? new Date(b.call_date).getTime() : 0;
          return db - da;
        });

        if (!canceled) setLigacoes(list);
      } catch (e: any) {
        console.error('[useHistoricoDiscadorPorPessoa]', e);
        if (!canceled) setError(e?.message || 'Erro ao carregar histórico');
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [personId, name, cpf, enabled]);

  return { ligacoes, loading, error, total: ligacoes.length };
}
