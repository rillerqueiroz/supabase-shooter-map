import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useGestaoSplitsIsAdmin } from './useGestaoSplitsUserRoles';

export type GestaoSplitsScreenPermissions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function useGestaoSplitsScreenPermissions(userId?: string, screenSlug?: string) {
  const { isAdmin, isLoading: isLoadingAdmin } = useGestaoSplitsIsAdmin(userId);

  return useQuery<GestaoSplitsScreenPermissions>({
    queryKey: ['gestao-splits-screen-permissions', userId, screenSlug],
    queryFn: async (): Promise<GestaoSplitsScreenPermissions> => {
      // Admin tem acesso total
      if (isAdmin) {
        return {
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true
        };
      }

      if (!userId || !screenSlug) {
        return {
          canView: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false
        };
      }

      // Buscar ID da tela pelo slug
      const { data: screenData, error: screenError } = await supabase
        .from('gestao_splits_screens')
        .select('id')
        .eq('slug', screenSlug)
        .maybeSingle();

      if (screenError) throw screenError;
      if (!screenData) {
        return {
          canView: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false
        };
      }

      // Buscar permissões do usuário para esta tela
      const { data: permissions, error: permError } = await supabase
        .from('gestao_splits_screen_permissions')
        .select('can_view, can_create, can_update, can_delete')
        .eq('user_id', userId)
        .eq('screen_id', screenData.id)
        .maybeSingle();

      if (permError) throw permError;

      return {
        canView: permissions?.can_view ?? false,
        canCreate: permissions?.can_create ?? false,
        canUpdate: permissions?.can_update ?? false,
        canDelete: permissions?.can_delete ?? false
      };
    },
    enabled: !!userId && !!screenSlug && !isLoadingAdmin,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });
}
