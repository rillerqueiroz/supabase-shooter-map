import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CobrancaSplit {
  id: string;
  identificador: string;
  wallet_id: string;
  beneficiario_id?: string;
  tipo_valor: 'fixedValue' | 'percentualValue';
  percentualValue: number;
  fixedValue?: number | null;
  description?: string;
  externalReference?: string;
  origem: 'projeto' | 'adicional' | 'manual';
  tipo_cobranca?: string;
  cobranca_gerada?: boolean;
  id_cobranca?: string;
  installment?: string;
  id_split_asaas?: string;
  observacoes?: string;
  created_at: string;
  beneficiario?: {
    nome: string;
    wallet_id: string;
  };
}

export interface SaveCobrancaSplitInput {
  identificador: string;
  wallet_id: string;
  beneficiario_id?: string;
  tipo_valor: 'fixedValue' | 'percentualValue';
  percentualValue: number;
  fixedValue?: number | null;
  description?: string;
  externalReference?: string;
  origem?: 'projeto' | 'adicional' | 'manual';
}

export function useCobrancaSplitsByIdentificador(identificador: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cobranca-splits', identificador],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_cobrancas_splits')
        .select(`
          *,
          beneficiario:gestao_splits_beneficiarios(nome, wallet_id)
        `)
        .eq('identificador', identificador!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CobrancaSplit[];
    },
    enabled: !!user && !!identificador
  });
}

export function useSaveCobrancaSplits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ identificador, splits }: { identificador: string; splits: SaveCobrancaSplitInput[] }) => {
      // Deletar splits existentes para este identificador
      await supabase
        .from('gestao_splits_cobrancas_splits')
        .delete()
        .eq('identificador', identificador);

      if (splits.length === 0) return [];

      // Inserir novos splits
      const { data, error } = await supabase
        .from('gestao_splits_cobrancas_splits')
        .insert(splits.map(s => ({
          identificador,
          wallet_id: s.wallet_id,
          beneficiario_id: s.beneficiario_id || null,
          tipo_valor: s.tipo_valor,
          percentualValue: s.percentualValue,
          fixedValue: s.fixedValue ?? null,
          description: s.description || null,
          externalReference: s.externalReference || null,
          origem: s.origem || 'manual'
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cobranca-splits', variables.identificador] });
    },
    onError: (error) => {
      console.error('Erro ao salvar splits locais:', error);
      toast.error('Erro ao salvar splits no banco local');
    }
  });
}
