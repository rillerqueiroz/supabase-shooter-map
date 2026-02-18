import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface VendedorContrato {
  id: string;
  contrato_id: string;
  beneficiario_id: string;
  percentual: number;
  description: string;
  created_at: string;
  updated_at: string;
  // Joins
  beneficiario?: { id: string; nome: string; wallet_id: string };
  contrato?: {
    id: string;
    contratante_nome: string;
    contratante_cpf_cnpj: string | null;
    credor_cedrus: string;
    valor_boleto: number | null;
    numero_boletos: number;
    created_at: string;
    projeto?: { id: string; nome: string };
  };
}

export interface CreateVendedorContratoInput {
  contrato_id: string;
  beneficiario_id: string;
  percentual: number;
  description?: string;
}

// Hook para listar todos os vendedores de contratos com joins
export function useVendedoresContratos(filters?: {
  credor_cedrus?: string;
  beneficiario_id?: string;
  projeto_id?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendedores-contratos', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_vendedores_contratos')
        .select(`
          *,
          beneficiario:gestao_splits_beneficiarios!beneficiario_id(id, nome, wallet_id),
          contrato:gestao_splits_contratos!contrato_id(
            id, contratante_nome, contratante_cpf_cnpj, credor_cedrus,
            valor_boleto, numero_boletos, created_at,
            projeto:gestao_splits_projetos!projeto_id(id, nome)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let result = data as VendedorContrato[];

      // Client-side filters for joined data
      if (filters?.credor_cedrus) {
        result = result.filter(v => v.contrato?.credor_cedrus === filters.credor_cedrus);
      }
      if (filters?.beneficiario_id) {
        result = result.filter(v => v.beneficiario_id === filters.beneficiario_id);
      }
      if (filters?.projeto_id) {
        result = result.filter(v => v.contrato?.projeto?.id === filters.projeto_id);
      }

      return result;
    },
    enabled: !!user
  });
}

// Hook para vendedores de um contrato específico
export function useVendedoresByContrato(contratoId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendedores-contrato', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];

      const { data, error } = await supabase
        .from('gestao_splits_vendedores_contratos')
        .select(`
          *,
          beneficiario:gestao_splits_beneficiarios!beneficiario_id(id, nome, wallet_id)
        `)
        .eq('contrato_id', contratoId)
        .order('created_at');

      if (error) throw error;
      return data as VendedorContrato[];
    },
    enabled: !!user && !!contratoId
  });
}

// Hook para criar vendedor em contrato
export function useCreateVendedorContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateVendedorContratoInput[]) => {
      const { data, error } = await supabase
        .from('gestao_splits_vendedores_contratos')
        .insert(inputs)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores-contratos'] });
      queryClient.invalidateQueries({ queryKey: ['vendedores-contrato'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao salvar vendedores:', error);
      toast.error('Erro ao salvar vendedores do contrato');
    }
  });
}

// Hook para deletar vendedor de contrato
export function useDeleteVendedorContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestao_splits_vendedores_contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores-contratos'] });
      queryClient.invalidateQueries({ queryKey: ['vendedores-contrato'] });
      toast.success('Vendedor removido do contrato');
    },
    onError: (error: Error) => {
      console.error('Erro ao remover vendedor:', error);
      toast.error('Erro ao remover vendedor');
    }
  });
}
