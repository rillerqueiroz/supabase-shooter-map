import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface TituloBaixado {
  id: number;
  created_at: string;
  id_titulo: string | null;
  data_baixa: string | null;
  valor_pago: number | null;
  id_titulo_cedrus: string | null;
  // Campos cruzados da base_tudobelo_intermediaria
  titulo?: {
    id: string;
    documento: string | null;
    tipo_documento: string | null;
    nome_parceiro: string | null;
    cnpj_cpf: string | null;
    valor_parcela: number | null;
    saldo_parcela: number | null;
    data_vencimento: string | null;
    dias_atraso: string | null;
    forma_pagamento: string | null;
    status_titulo: string | null;
    status_cedrus: string | null;
    etapa: string | null;
    filial: string | null;
    vendedor: string | null;
    uf_cobranca: string | null;
    credor_cedrus: string | null;
    tipo_titulo: string | null;
    fone1: string | null;
    fone2: string | null;
    email: string | null;
    negativado: boolean | null;
  } | null;
}

export function useTitulosBaixados(tableName: string = 'base_tudobelo_intermediaria') {
  return useQuery({
    queryKey: ['titulos-baixados', tableName],
    queryFn: async () => {
      // Fetch baixados
      let query = supabase
        .from('base_tudobelo_titulos_baixados_automaticamente')
        .select('*')
        .order('data_baixa', { ascending: false })
        .range(0, 49999);

      const { data: baixados, error } = await query;
      if (error) throw error;

      if (!baixados || baixados.length === 0) return [];

      // Get unique titulo IDs for cross-reference
      const tituloIds = baixados
        .map(b => b.id_titulo)
        .filter(Boolean) as string[];

      let titulosMap = new Map<string, any>();

      if (tituloIds.length > 0) {
        const { data: titulos, error: titulosError } = await supabase
          .from(tableName)
          .select('id, documento, tipo_documento, nome_parceiro, cnpj_cpf, valor_parcela, saldo_parcela, data_vencimento, dias_atraso, forma_pagamento, status_titulo, status_cedrus, etapa, filial, vendedor, uf_cobranca, credor_cedrus, tipo_titulo, fone1, fone2, email, negativado')
          .in('id', tituloIds);

        if (!titulosError && titulos) {
          titulos.forEach(t => titulosMap.set(t.id, t));
        }
      }

      // Merge data
      const result: TituloBaixado[] = baixados.map(b => ({
        ...b,
        titulo: b.id_titulo ? titulosMap.get(b.id_titulo) || null : null,
      }));

      return result;
    },
  });
}
