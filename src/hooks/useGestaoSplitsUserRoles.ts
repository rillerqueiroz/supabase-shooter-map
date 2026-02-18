import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GestaoSplitsRole } from '@/types/gestaoSplitsPermissions';

export function useGestaoSplitsUserRoles(userId?: string) {
  return useQuery({
    queryKey: ['gestao-splits-user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('gestao_splits_user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      return data.map(r => r.role as GestaoSplitsRole);
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });
}

export function useGestaoSplitsIsAdmin(userId?: string) {
  const { data: roles, isLoading } = useGestaoSplitsUserRoles(userId);
  return {
    isAdmin: roles?.includes('admin') ?? false,
    isLoading
  };
}

export function useGestaoSplitsHasRole(userId?: string, role?: GestaoSplitsRole) {
  const { data: roles, isLoading } = useGestaoSplitsUserRoles(userId);
  return {
    hasRole: role ? roles?.includes(role) ?? false : false,
    isLoading
  };
}
