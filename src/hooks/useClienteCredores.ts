import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useGestaoSplitsIsAdmin } from './useGestaoSplitsUserRoles';
import { toast } from '@/hooks/use-toast';
import type { ClienteCredorVinculo, ClienteSuperavitBasico } from '@/types/gestaoSplitsPermissions';

/**
 * Hook para buscar todos os clientes (para seleção)
 * Retorna id, credor_cedrus e nome_credor
 */
export function useClientesParaSelecao() {
  const { user } = useAuth();
  const { isAdmin } = useGestaoSplitsIsAdmin(user?.id);

  return useQuery({
    queryKey: ['clientes-para-selecao'],
    queryFn: async (): Promise<ClienteSuperavitBasico[]> => {
      const { data, error } = await supabase
        .from('clientes_superavit')
        .select('id, credor_cedrus, nome_credor')
        .order('nome_credor', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdmin
  });
}

/**
 * Hook para buscar credores vinculados a um cliente principal
 */
export function useCredoresVinculados(clientePrincipalId?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['credores-vinculados', clientePrincipalId],
    queryFn: async (): Promise<ClienteCredorVinculo[]> => {
      if (!clientePrincipalId) return [];

      const { data, error } = await supabase
        .from('cliente_credores')
        .select(`
          id,
          cliente_principal_id,
          cliente_vinculado_id,
          created_at,
          cliente_vinculado:clientes_superavit!cliente_vinculado_id(id, credor_cedrus, nome_credor)
        `)
        .eq('cliente_principal_id', clientePrincipalId);

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        cliente_principal_id: item.cliente_principal_id,
        cliente_vinculado_id: item.cliente_vinculado_id,
        created_at: item.created_at,
        cliente_vinculado: item.cliente_vinculado as unknown as ClienteSuperavitBasico
      }));
    },
    enabled: !!user && !!clientePrincipalId
  });
}

/**
 * Hook para buscar todos os credor_cedrus de um cliente (principal + vinculados)
 */
export function useTodosCredoresDoCliente(clienteId?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['todos-credores-cliente', clienteId],
    queryFn: async (): Promise<string[]> => {
      if (!clienteId) return [];

      // Usa a função SQL que criamos
      const { data, error } = await supabase
        .rpc('get_all_credores_by_cliente', { p_cliente_id: clienteId });

      if (error) throw error;
      
      // A RPC pode retornar strings ou objetos {credor_cedrus: string}
      if (!data) return [];
      return data.map((item: string | { credor_cedrus: string }) => 
        typeof item === 'string' ? item : item.credor_cedrus
      );
    },
    enabled: !!user && !!clienteId
  });
}

/**
 * Hook para vincular um credor a um cliente principal
 */
export function useVincularCredor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientePrincipalId, clienteVinculadoId }: { 
      clientePrincipalId: number; 
      clienteVinculadoId: number 
    }) => {
      const { data, error } = await supabase
        .from('cliente_credores')
        .insert({
          cliente_principal_id: clientePrincipalId,
          cliente_vinculado_id: clienteVinculadoId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credores-vinculados', variables.clientePrincipalId] });
      queryClient.invalidateQueries({ queryKey: ['todos-credores-cliente', variables.clientePrincipalId] });
      toast({
        title: 'Credor vinculado',
        description: 'O credor foi vinculado ao cliente com sucesso.'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao vincular credor:', error);
      toast({
        title: 'Erro ao vincular',
        description: error.message.includes('unique_vinculo') 
          ? 'Este credor já está vinculado ao cliente.'
          : error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook para desvincular um credor de um cliente principal
 */
export function useDesvincularCredor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vinculoId, clientePrincipalId }: { 
      vinculoId: number; 
      clientePrincipalId: number 
    }) => {
      const { error } = await supabase
        .from('cliente_credores')
        .delete()
        .eq('id', vinculoId);

      if (error) throw error;
      return { vinculoId, clientePrincipalId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credores-vinculados', variables.clientePrincipalId] });
      queryClient.invalidateQueries({ queryKey: ['todos-credores-cliente', variables.clientePrincipalId] });
      toast({
        title: 'Credor desvinculado',
        description: 'O credor foi removido do cliente.'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao desvincular credor:', error);
      toast({
        title: 'Erro ao desvincular',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook para verificar quais clientes já estão vinculados a algum outro cliente
 * Útil para evitar vínculos duplicados ou circulares
 */
export function useClientesJaVinculados() {
  const { user } = useAuth();
  const { isAdmin } = useGestaoSplitsIsAdmin(user?.id);

  return useQuery({
    queryKey: ['clientes-ja-vinculados'],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase
        .from('cliente_credores')
        .select('cliente_vinculado_id');

      if (error) throw error;
      return data?.map(d => d.cliente_vinculado_id) || [];
    },
    enabled: !!user && isAdmin
  });
}
