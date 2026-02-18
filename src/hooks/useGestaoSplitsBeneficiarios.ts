import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface BeneficiarioProjeto {
  id: string;
  nome: string;
}

export interface Beneficiario {
  id: string;
  nome: string;
  tipo: 'pessoa_fisica' | 'pessoa_juridica';
  documento?: string;
  wallet_id: string;
  email?: string;
  telefone?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  observacoes?: string;
  ativo: boolean;
  is_vendedor: boolean;
  cliente_id?: number;
  created_at: string;
  updated_at: string;
  projetos?: BeneficiarioProjeto[];
  cliente?: {
    id: number;
    nome_credor: string;
    credor_cedrus: string;
  };
}

export interface CreateBeneficiarioInput {
  nome: string;
  tipo: 'pessoa_fisica' | 'pessoa_juridica';
  documento?: string;
  wallet_id: string;
  email?: string;
  telefone?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  observacoes?: string;
  ativo?: boolean;
  is_vendedor?: boolean;
  cliente_id?: number | null;
  projeto_ids?: string[];
}

export interface UpdateBeneficiarioInput extends Partial<CreateBeneficiarioInput> {
  id: string;
}

// Hook para listar todos os beneficiários com projetos vinculados
export function useBeneficiarios() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-beneficiarios'],
    queryFn: async () => {
      // Query beneficiários directly (without join that requires FK)
      const { data: beneficiarios, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .select('*, cliente:clientes_superavit!cliente_id(id, nome_credor, credor_cedrus)')
        .order('nome');

      if (error) throw error;

      // Query project assignments separately
      const { data: assignments } = await supabase
        .from('gestao_splits_beneficiarios_projetos')
        .select('beneficiario_id, projeto_id');

      // Query project names
      const { data: projetos } = await supabase
        .from('gestao_splits_projetos')
        .select('id, nome');

      const projetoMap = new Map((projetos || []).map(p => [p.id, p]));

      return (beneficiarios || []).map((b: any) => ({
        ...b,
        projetos: (assignments || [])
          .filter((a: any) => a.beneficiario_id === b.id)
          .map((a: any) => projetoMap.get(a.projeto_id))
          .filter(Boolean) as BeneficiarioProjeto[],
      })) as Beneficiario[];
    },
    enabled: !!user
  });
}

// Hook para listar apenas beneficiários ativos (para uso nos selects de splits)
export function useBeneficiariosAtivos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-beneficiarios-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .select('id, nome, wallet_id, is_vendedor')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Pick<Beneficiario, 'id' | 'nome' | 'wallet_id' | 'is_vendedor'>[];
    },
    enabled: !!user
  });
}

// Hook para listar apenas beneficiários ativos que são vendedores
export function useBeneficiariosVendedores() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-beneficiarios-vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .select('id, nome, wallet_id')
        .eq('ativo', true)
        .eq('is_vendedor', true)
        .order('nome');

      if (error) throw error;
      return data as Pick<Beneficiario, 'id' | 'nome' | 'wallet_id'>[];
    },
    enabled: !!user
  });
}

// Hook para listar beneficiários ativos vinculados a um projeto específico
export function useBeneficiariosPorProjeto(projetoId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-beneficiarios-projeto', projetoId],
    queryFn: async () => {
      if (!projetoId) return [];

      // Get beneficiario IDs linked to this project
      const { data: assignments, error: aError } = await supabase
        .from('gestao_splits_beneficiarios_projetos')
        .select('beneficiario_id')
        .eq('projeto_id', projetoId);

      if (aError) throw aError;
      if (!assignments || assignments.length === 0) return [];

      const ids = assignments.map((a: any) => a.beneficiario_id);

      const { data, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .select('id, nome, wallet_id')
        .eq('ativo', true)
        .in('id', ids)
        .order('nome');

      if (error) throw error;
      return (data || []) as Pick<Beneficiario, 'id' | 'nome' | 'wallet_id'>[];
    },
    enabled: !!user && !!projetoId
  });
}

// Hook para buscar um beneficiário específico
export function useBeneficiario(id?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-beneficiario', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get project assignments separately
      const { data: assignments } = await supabase
        .from('gestao_splits_beneficiarios_projetos')
        .select('projeto_id')
        .eq('beneficiario_id', id);

      const { data: projetos } = await supabase
        .from('gestao_splits_projetos')
        .select('id, nome');

      const projetoMap = new Map((projetos || []).map(p => [p.id, p]));

      return {
        ...data,
        projetos: (assignments || [])
          .map((a: any) => projetoMap.get(a.projeto_id))
          .filter(Boolean),
      } as Beneficiario;
    },
    enabled: !!user && !!id
  });
}

async function syncBeneficiarioProjetos(beneficiarioId: string, projetoIds: string[]) {
  // Deletar vínculos existentes
  await supabase
    .from('gestao_splits_beneficiarios_projetos')
    .delete()
    .eq('beneficiario_id', beneficiarioId);

  // Inserir novos vínculos
  if (projetoIds.length > 0) {
    const { error } = await supabase
      .from('gestao_splits_beneficiarios_projetos')
      .insert(projetoIds.map(projeto_id => ({
        beneficiario_id: beneficiarioId,
        projeto_id,
      })));
    if (error) throw error;
  }
}

// Hook para criar beneficiário
export function useCreateBeneficiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBeneficiarioInput) => {
      const { projeto_ids, ...beneficiarioData } = input;

      const { data, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .insert({
          nome: beneficiarioData.nome,
          tipo: beneficiarioData.tipo,
          documento: beneficiarioData.documento || null,
          wallet_id: beneficiarioData.wallet_id,
          email: beneficiarioData.email || null,
          telefone: beneficiarioData.telefone || null,
          banco: beneficiarioData.banco || null,
          agencia: beneficiarioData.agencia || null,
          conta: beneficiarioData.conta || null,
          observacoes: beneficiarioData.observacoes || null,
          ativo: beneficiarioData.ativo ?? true,
          cliente_id: beneficiarioData.cliente_id || null
        })
        .select()
        .single();

      if (error) throw error;

      if (projeto_ids && projeto_ids.length > 0) {
        await syncBeneficiarioProjetos(data.id, projeto_ids);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios-projeto'] });
      toast({
        title: 'Beneficiário criado',
        description: 'Beneficiário cadastrado com sucesso!'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar beneficiário:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar beneficiário',
        description: error.message.includes('duplicate') 
          ? 'Já existe um beneficiário com este Wallet ID'
          : error.message
      });
    }
  });
}

// Hook para atualizar beneficiário
export function useUpdateBeneficiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBeneficiarioInput) => {
      const { id, projeto_ids, ...updateData } = input;
      
      const { data, error } = await supabase
        .from('gestao_splits_beneficiarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (projeto_ids !== undefined) {
        await syncBeneficiarioProjetos(id, projeto_ids);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios-projeto'] });
      toast({
        title: 'Beneficiário atualizado',
        description: 'Dados atualizados com sucesso!'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar beneficiário:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message.includes('duplicate') 
          ? 'Já existe um beneficiário com este Wallet ID'
          : error.message
      });
    }
  });
}

// Hook para deletar beneficiário
export function useDeleteBeneficiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestao_splits_beneficiarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-beneficiarios-projeto'] });
      toast({
        title: 'Beneficiário removido',
        description: 'Beneficiário removido com sucesso!'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao deletar beneficiário:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: error.message
      });
    }
  });
}
