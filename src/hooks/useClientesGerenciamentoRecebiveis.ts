import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useGestaoSplitsClientPermissions, useAllowedCredores } from './useGestaoSplitsClientPermissions';

export interface ClienteGerenciamentoRecebiveis {
  id: number;
  credor_cedrus: string;
  nome_credor: string | null;
}

/**
 * Hook para obter clientes com gerenciamento_recebiveis_splits = true
 * Respeita permissões do usuário (admin vê todos, usuário comum vê apenas os permitidos)
 */
export function useClientesGerenciamentoRecebiveis() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ['clientes-gerenciamento-recebiveis', user?.id, permissions],
    queryFn: async (): Promise<ClienteGerenciamentoRecebiveis[]> => {
      let query = supabase
        .from('clientes_superavit')
        .select('id, credor_cedrus, nome_credor')
        .eq('gerenciamento_recebiveis_splits', true)
        .order('credor_cedrus');

      // Admin (permissions === null) vê tudo
      if (allowedCredores === null) {
        // Query sem filtro adicional
      }
      // Sem permissões ou array vazio = não retornar nada
      else if (!allowedCredores || allowedCredores.length === 0) {
        return [];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        query = query.in('credor_cedrus', allowedCredores);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar clientes com gerenciamento de recebíveis:', error);
        throw error;
      }

      return (data || [])
        .filter(c => c.credor_cedrus)
        .map(c => ({
          id: c.id,
          credor_cedrus: c.credor_cedrus,
          nome_credor: c.nome_credor
        }));
    },
    enabled: !isLoadingPermissions && !!user
  });
}
