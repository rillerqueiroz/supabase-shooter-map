import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useGestaoSplitsIsAdmin } from './useGestaoSplitsUserRoles';

export interface ClienteBasico {
  id: number;
  credor_cedrus: string;
  nome_credor: string | null;
}

/**
 * Hook para obter TODOS os clientes (sem filtro de permissões)
 * Usado apenas por admins na gestão de usuários
 * Retorna id, credor_cedrus e nome_credor
 */
export function useAllClientesList() {
  const { user } = useAuth();
  const { isAdmin } = useGestaoSplitsIsAdmin(user?.id);

  return useQuery({
    queryKey: ['all-clientes-list'],
    queryFn: async (): Promise<ClienteBasico[]> => {
      const { data, error } = await supabase
        .from('clientes_superavit')
        .select('id, credor_cedrus, nome_credor')
        .order('credor_cedrus');

      if (error) throw error;
      return data?.filter(c => c.credor_cedrus) || [];
    },
    enabled: !!user && isAdmin
  });
}

/**
 * Hook legado - retorna apenas os credor_cedrus como strings
 * @deprecated Use useAllClientesList ao invés disso
 */
export function useAllCredoresList() {
  const { data: clientes, ...rest } = useAllClientesList();
  
  return {
    ...rest,
    data: clientes?.map(c => c.credor_cedrus) || []
  };
}