import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useGestaoSplitsIsAdmin } from './useGestaoSplitsUserRoles';

export interface ClientPermission {
  cliente_id: number;
  credor_cedrus: string;
  nome_credor: string | null;
  can_view: boolean;
  can_transact: boolean;
}

export function useGestaoSplitsClientPermissions(userId?: string) {
  const { isAdmin, isLoading: isLoadingAdmin } = useGestaoSplitsIsAdmin(userId);

  return useQuery({
    queryKey: ['sistema-tudobelo-client-permissions', userId],
    queryFn: async (): Promise<ClientPermission[] | null> => {
      console.info('🔍 [GestaoSplits] Buscando permissões para userId:', userId);
      
      if (!userId) return [];

      // Admin vê todos os clientes
      if (isAdmin) {
        console.info('👑 [GestaoSplits] Usuário é admin, retornando null (acesso total)');
        return null; // null = todos
      }

      // Buscar permissões específicas com JOIN para pegar todos os credores do cliente
      const { data, error } = await supabase
        .from('sistema_tudobelo_client_permissions')
        .select(`
          cliente_id,
          can_view,
          can_transact,
          cliente:clientes_superavit!sistema_tudobelo_client_permissions_cliente_id_fkey(
            id,
            credor_cedrus,
            nome_credor
          )
        `)
        .eq('user_id', userId)
        .eq('can_view', true);

      if (error) {
        console.error('❌ [GestaoSplits] Erro ao buscar permissões:', error);
        throw error;
      }

      console.info('🔍 [GestaoSplits] Permissões encontradas:', data);

      // BLOQUEIO PADRÃO: Se não há permissões = sem acesso
      if (!data || data.length === 0) {
        console.warn('⚠️ [GestaoSplits] Nenhuma permissão encontrada para este usuário!');
        return [];
      }

      // Buscar todos os credores vinculados a cada cliente permitido
      const clienteIds = data.map(p => p.cliente_id).filter(Boolean);
      
      // Usar a função SQL para obter todos os credor_cedrus permitidos
      const { data: credoresData, error: credoresError } = await supabase
        .rpc('get_user_allowed_credores', { p_user_id: userId });

      if (credoresError) {
        console.error('❌ [GestaoSplits] Erro ao buscar credores expandidos:', credoresError);
        // Fallback: retornar apenas os credores diretos dos clientes
        return data.map(p => ({
          cliente_id: p.cliente_id,
          credor_cedrus: (p.cliente as any)?.credor_cedrus || '',
          nome_credor: (p.cliente as any)?.nome_credor || null,
          can_view: p.can_view,
          can_transact: p.can_transact
        }));
      }

      console.info('🔍 [GestaoSplits] Credores expandidos:', credoresData);

      // Mapear permissões com todos os credores
      const permissions: ClientPermission[] = [];
      
      // Primeiro, adicionar os clientes principais
      data.forEach(p => {
        const cliente = p.cliente as any;
        if (cliente?.credor_cedrus) {
          permissions.push({
            cliente_id: p.cliente_id,
            credor_cedrus: cliente.credor_cedrus,
            nome_credor: cliente.nome_credor,
            can_view: p.can_view,
            can_transact: p.can_transact
          });
        }
      });

      // Adicionar os credores vinculados (se existirem)
      if (credoresData) {
        credoresData.forEach((credor: string) => {
          // Verificar se já não foi adicionado
          if (!permissions.some(p => p.credor_cedrus === credor)) {
            permissions.push({
              cliente_id: 0, // Vinculado
              credor_cedrus: credor,
              nome_credor: null,
              can_view: true,
              can_transact: false
            });
          }
        });
      }

      console.info('🔍 [GestaoSplits] Total de permissões:', permissions.length);
      return permissions;
    },
    enabled: !!userId && !isLoadingAdmin,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });
}

// Hook auxiliar para obter lista de credor_cedrus permitidos
export function useAllowedCredores(userId?: string) {
  const { data: permissions } = useGestaoSplitsClientPermissions(userId);
  
  if (permissions === null) return null; // Admin - acesso total
  if (!permissions || permissions.length === 0) return [];
  
  return permissions.map(p => p.credor_cedrus).filter(Boolean);
}

// Hook auxiliar para obter lista de cliente_ids permitidos
export function useAllowedClienteIds(userId?: string) {
  const { data: permissions } = useGestaoSplitsClientPermissions(userId);
  
  if (permissions === null) return null; // Admin - acesso total
  if (!permissions || permissions.length === 0) return [];
  
  return [...new Set(permissions.map(p => p.cliente_id).filter(id => id > 0))];
}

export function useGestaoSplitsCanViewClient(userId?: string, clienteId?: number) {
  const { data: permissions } = useGestaoSplitsClientPermissions(userId);
  const { isAdmin } = useGestaoSplitsIsAdmin(userId);

  if (!userId || !clienteId) return false;
  if (isAdmin) return true;
  if (permissions === null) return true; // Acesso a todos
  return permissions.some(p => p.cliente_id === clienteId);
}
