import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type SistemaKey = 
  | 'sistema_tudobelo' 
  | 'sistema_gestao_repasses' 
  | 'sistema_antecipacoes' 
  | 'sistema_semear' 
  | 'sistema_gestao_splits' 
  | 'sistema_testedisc';

export const SISTEMAS: { key: SistemaKey; label: string }[] = [
  { key: 'sistema_tudobelo', label: 'Tudo Belo' },
  { key: 'sistema_gestao_repasses', label: 'Gestão Repasses' },
  { key: 'sistema_antecipacoes', label: 'Antecipações' },
  { key: 'sistema_semear', label: 'Semear' },
  { key: 'sistema_gestao_splits', label: 'Gestão Splits' },
  { key: 'sistema_testedisc', label: 'Teste DISC' },
];

export type ProfileComSistemas = {
  id: string;
  nome: string;
  email: string;
  roles: string[];
  sistema_tudobelo: boolean;
  sistema_gestao_repasses: boolean;
  sistema_antecipacoes: boolean;
  sistema_semear: boolean;
  sistema_gestao_splits: boolean;
  sistema_testedisc: boolean;
  created_at: string;
};

export function useGestaoAcessoSistemas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['gestao-acesso-sistemas'],
    queryFn: async (): Promise<ProfileComSistemas[]> => {
      const { data, error } = await supabase
        .from('gestao_profiles_todos_sistemas')
        .select('id, nome, created_at, sistema_tudobelo, sistema_gestao_repasses, sistema_antecipacoes, sistema_semear, sistema_gestao_splits, sistema_testedisc')
        .order('nome');

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const result = await Promise.all(
        data.map(async (profile: any) => {
          const [{ data: emailData }, { data: rolesData }] = await Promise.all([
            supabase.rpc('gestao_splits_get_user_email', { _user_id: profile.id }),
            supabase.from('gestao_splits_user_roles').select('role').eq('user_id', profile.id),
          ]);

          return {
            ...profile,
            email: emailData || 'sem-email@sistema.local',
            roles: rolesData?.map((r: any) => r.role) || [],
          } as ProfileComSistemas;
        })
      );

      return result;
    },
  });

  const toggleSistemaMutation = useMutation({
    mutationFn: async ({ userId, sistema, value }: { userId: string; sistema: SistemaKey; value: boolean }) => {
      const { error } = await supabase
        .from('gestao_profiles_todos_sistemas')
        .update({ [sistema]: value })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-acesso-sistemas'] });
      toast({ title: 'Acesso atualizado', description: 'A configuração de sistema foi salva.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  return {
    profiles,
    isLoading,
    toggleSistema: toggleSistemaMutation.mutate,
    isToggling: toggleSistemaMutation.isPending,
  };
}
