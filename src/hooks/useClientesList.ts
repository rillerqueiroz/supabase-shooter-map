import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useGestaoSplitsClientPermissions, useAllowedCredores } from './useGestaoSplitsClientPermissions';

export interface ClienteListItem {
  id: number;
  credor_cedrus: string;
  nome_credor: string | null;
}

export function useClientesList() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ['clientes-list', user?.id, permissions],
    queryFn: async (): Promise<ClienteListItem[]> => {
      let query = supabase
        .from('clientes_superavit')
        .select('id, credor_cedrus, nome_credor')
        .order('credor_cedrus');

      // Admin (permissions === null) vê tudo
      if (allowedCredores === null) {
        // Query sem filtro
      }
      // Sem permissões ou array vazio = não retornar nada (bloqueio padrão)
      else if (!allowedCredores || allowedCredores.length === 0) {
        return [];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        query = query.in('credor_cedrus', allowedCredores);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.filter(c => c.credor_cedrus) || [];
    },
    enabled: !isLoadingPermissions && !!user
  });
}

/**
 * Hook legado - retorna apenas os credor_cedrus como strings
 * @deprecated Use useClientesList ao invés disso
 */
export function useCredoresList() {
  const { data: clientes, ...rest } = useClientesList();
  
  return {
    ...rest,
    data: clientes?.map(c => c.credor_cedrus) || []
  };
}
