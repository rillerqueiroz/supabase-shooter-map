import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ProjetoSplit {
  id?: string;
  projeto_id?: string;
  wallet_id: string;
  tipo_valor: 'fixedValue' | 'percentualValue';
  valor: number;
  description?: string;
  tipo_cobranca: 'normal' | 'inadimplencia';
}

export interface Projeto {
  id: string;
  nome: string;
  descricao?: string;
  cliente_id?: number;
  credor_cedrus: string;
  credor_inadimplencia?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  splits?: ProjetoSplit[];
  cliente?: {
    id: number;
    nome_credor: string;
    credor_cedrus: string;
  };
}

export interface CreateProjetoInput {
  nome: string;
  descricao?: string;
  cliente_id?: number;
  credor_cedrus: string;
  credor_inadimplencia?: string;
  ativo?: boolean;
  splits?: ProjetoSplit[];
}

export interface UpdateProjetoInput {
  id: string;
  nome?: string;
  descricao?: string;
  cliente_id?: number;
  credor_cedrus?: string;
  credor_inadimplencia?: string;
  ativo?: boolean;
  splits?: ProjetoSplit[];
}

export function useProjetos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-projetos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_projetos')
        .select(`
          *,
          splits:gestao_splits_projeto_splits(*),
          cliente:clientes_superavit!cliente_id(id, nome_credor, credor_cedrus)
        `)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar projetos:', error);
        throw error;
      }

      return data as Projeto[];
    },
    enabled: !!user
  });
}

export function useProjetosByCredor(credorCedrus?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-projetos', credorCedrus],
    queryFn: async () => {
      if (!credorCedrus) return [];

      const { data, error } = await supabase
        .from('gestao_splits_projetos')
        .select(`
          *,
          splits:gestao_splits_projeto_splits(*)
        `)
        .eq('credor_cedrus', credorCedrus)
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar projetos por credor:', error);
        throw error;
      }

      return data as Projeto[];
    },
    enabled: !!user && !!credorCedrus
  });
}

export function useProjeto(projetoId?: string) {
  return useQuery({
    queryKey: ['gestao-splits-projeto', projetoId],
    queryFn: async () => {
      if (!projetoId) return null;

      const { data, error } = await supabase
        .from('gestao_splits_projetos')
        .select(`
          *,
          splits:gestao_splits_projeto_splits(*)
        `)
        .eq('id', projetoId)
        .single();

      if (error) {
        console.error('Erro ao buscar projeto:', error);
        throw error;
      }

      return data as Projeto;
    },
    enabled: !!projetoId
  });
}

export function useCreateProjeto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProjetoInput) => {
      const { splits, ...projetoData } = input;

      // Criar projeto
      const { data: projeto, error: projetoError } = await supabase
        .from('gestao_splits_projetos')
        .insert({
          ...projetoData,
          created_by: user?.id
        })
        .select()
        .single();

      if (projetoError) throw projetoError;

      // Criar splits se houver
      if (splits && splits.length > 0) {
        const splitsData = splits.map(split => ({
          ...split,
          projeto_id: projeto.id
        }));

        const { error: splitsError } = await supabase
          .from('gestao_splits_projeto_splits')
          .insert(splitsData);

        if (splitsError) throw splitsError;
      }

      return projeto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-projetos'] });
      toast.success('Projeto criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar projeto:', error);
      const msg = error?.message || error?.details || 'Erro desconhecido';
      toast.error(`Erro ao criar projeto: ${msg}`);
    }
  });
}

export function useUpdateProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjetoInput) => {
      const { id, splits, ...projetoData } = input;

      // Atualizar projeto
      const { error: projetoError } = await supabase
        .from('gestao_splits_projetos')
        .update(projetoData)
        .eq('id', id);

      if (projetoError) throw projetoError;

      // Atualizar splits se houver
      if (splits) {
        // Deletar splits existentes
        await supabase
          .from('gestao_splits_projeto_splits')
          .delete()
          .eq('projeto_id', id);

        // Inserir novos splits
        if (splits.length > 0) {
          const splitsData = splits.map(split => ({
            wallet_id: split.wallet_id,
            tipo_valor: split.tipo_valor,
            valor: split.valor,
            description: split.description,
            tipo_cobranca: split.tipo_cobranca || 'normal',
            projeto_id: id
          }));

          const { error: splitsError } = await supabase
            .from('gestao_splits_projeto_splits')
            .insert(splitsData);

          if (splitsError) throw splitsError;
        }
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-projetos'] });
      toast.success('Projeto atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar projeto:', error);
      toast.error('Erro ao atualizar projeto');
    }
  });
}

export function useDeleteProjeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestao_splits_projetos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-projetos'] });
      toast.success('Projeto excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir projeto:', error);
      toast.error('Erro ao excluir projeto');
    }
  });
}
