import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, createIsolatedClient } from '@/lib/supabase';
import { 
  GestaoSplitsCreateUserInput, 
  GestaoSplitsUpdateUserInput, 
  GestaoSplitsUserWithPermissions 
} from '@/types/gestaoSplitsPermissions';
import { useToast } from '@/hooks/use-toast';

export function useGestaoSplitsUserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query: buscar todos os usuários com permissões
  const { data: users, isLoading } = useQuery({
    queryKey: ['gestao-splits-users-management'],
    queryFn: async (): Promise<GestaoSplitsUserWithPermissions[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from('gestao_profiles_todos_sistemas')
        .select('id, nome, created_at')
        .eq('sistema_tudobelo', true);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const usersWithDetails = await Promise.all(
        profiles.map(async (profile: any) => {
          const userId = profile.id;

          const [
            { data: emailData },
            { data: rolesData },
            { data: screenPermsData },
            { data: clientPermsData }
          ] = await Promise.all([
            supabase.rpc('gestao_splits_get_user_email', { _user_id: userId }),
            supabase.from('gestao_splits_user_roles').select('role').eq('user_id', userId),
            supabase
              .from('gestao_splits_screen_permissions')
              .select('screen_id, can_view, can_create, can_update, can_delete, gestao_splits_screens(slug, nome)')
              .eq('user_id', userId),
            supabase
              .from('gestao_splits_client_permissions')
              .select('cliente_id, credor_cedrus, can_view, can_transact, clientes_superavit(id, credor_cedrus, nome_credor)')
              .eq('user_id', userId)
          ]);

          return {
            id: userId,
            email: emailData || 'sem-email@sistema.local',
            nome: profile.nome,
            roles: rolesData?.map((r: any) => r.role) || [],
            screenPermissions: screenPermsData?.map((sp: any) => ({
              screenId: sp.screen_id,
              screenSlug: sp.gestao_splits_screens?.slug || '',
              screenName: sp.gestao_splits_screens?.nome || '',
              canView: sp.can_view,
              canCreate: sp.can_create,
              canUpdate: sp.can_update,
              canDelete: sp.can_delete
            })) || [],
            clientPermissions: clientPermsData?.map((cp: any) => ({
              clienteId: cp.cliente_id || cp.clientes_superavit?.id || 0,
              clienteNome: cp.clientes_superavit?.nome_credor || cp.credor_cedrus || '',
              credorCedrus: cp.credor_cedrus || cp.clientes_superavit?.credor_cedrus || '',
              canView: cp.can_view,
              canTransact: cp.can_transact
            })) || [],
            createdAt: profile.created_at
          };
        })
      );

      return usersWithDetails;
    }
  });

  // Criar usuário via cliente isolado (não afeta sessão do admin)
  const createUserMutation = useMutation({
    mutationFn: async (input: GestaoSplitsCreateUserInput) => {
      // 1. Criar conta no Auth com cliente isolado
      const isolatedClient = createIsolatedClient();
      const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { nome: input.nome }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Falha ao criar usuário: nenhum usuário retornado');

      const newUserId = signUpData.user.id;

      // 2. Upsert no perfil (redundância de segurança com trigger)
      const { error: profileError } = await supabase
        .from('gestao_profiles_todos_sistemas')
        .upsert({ id: newUserId, nome: input.nome, sistema_tudobelo: true }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // 3. Inserir roles
      if (input.roles.length > 0) {
        const { error: rolesError } = await supabase
          .from('gestao_splits_user_roles')
          .insert(input.roles.map(role => ({ user_id: newUserId, role })));

        if (rolesError) throw rolesError;
      }

      // 4. Inserir permissões de tela
      if (input.screenPermissions && input.screenPermissions.length > 0) {
        const validPerms = input.screenPermissions.filter(
          sp => sp.canView || sp.canCreate || sp.canUpdate || sp.canDelete
        );
        if (validPerms.length > 0) {
          const { error: screenPermsError } = await supabase
            .from('gestao_splits_screen_permissions')
            .insert(validPerms.map(sp => ({
              user_id: newUserId,
              screen_id: sp.screenId,
              can_view: sp.canView,
              can_create: sp.canCreate,
              can_update: sp.canUpdate,
              can_delete: sp.canDelete
            })));

          if (screenPermsError) throw screenPermsError;
        }
      }

      // 5. Inserir permissões de cliente
      if (input.clientPermissions && input.clientPermissions.length > 0) {
        const { error: clientPermsError } = await supabase
          .from('gestao_splits_client_permissions')
          .insert(input.clientPermissions.map(cp => ({
            user_id: newUserId,
            cliente_id: cp.clienteId,
            credor_cedrus: cp.credorCedrus,
            can_view: cp.canView,
            can_transact: cp.canTransact
          })));

        if (clientPermsError) throw clientPermsError;
      }

      return newUserId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-users-management'] });
      toast({ title: 'Usuário criado', description: 'O usuário foi criado com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    }
  });

  // Atualizar usuário (nome, roles, permissões)
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: GestaoSplitsUpdateUserInput }) => {
      if (input.nome) {
        const { error } = await supabase
          .from('gestao_profiles_todos_sistemas')
          .update({ nome: input.nome })
          .eq('id', userId);
        if (error) throw error;
      }

      if (input.roles) {
        await supabase.from('gestao_splits_user_roles').delete().eq('user_id', userId);
        if (input.roles.length > 0) {
          const { error } = await supabase
            .from('gestao_splits_user_roles')
            .insert(input.roles.map(role => ({ user_id: userId, role })));
          if (error) throw error;
        }
      }

      if (input.screenPermissions) {
        await supabase.from('gestao_splits_screen_permissions').delete().eq('user_id', userId);
        const valid = input.screenPermissions.filter(sp => sp.canView || sp.canCreate || sp.canUpdate || sp.canDelete);
        if (valid.length > 0) {
          const { error } = await supabase
            .from('gestao_splits_screen_permissions')
            .insert(valid.map(sp => ({
              user_id: userId, screen_id: sp.screenId,
              can_view: sp.canView, can_create: sp.canCreate,
              can_update: sp.canUpdate, can_delete: sp.canDelete
            })));
          if (error) throw error;
        }
      }

      if (input.clientPermissions) {
        await supabase.from('gestao_splits_client_permissions').delete().eq('user_id', userId);
        if (input.clientPermissions.length > 0) {
          const { error } = await supabase
            .from('gestao_splits_client_permissions')
            .insert(input.clientPermissions.map(cp => ({
              user_id: userId, cliente_id: cp.clienteId,
              credor_cedrus: cp.credorCedrus,
              can_view: cp.canView, can_transact: cp.canTransact
            })));
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-users-management'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-screen-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-client-permissions'] });
      toast({ title: 'Usuário atualizado', description: 'As permissões foram atualizadas com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
    }
  });

  // Deletar usuário (apenas dados locais — sem Admin API, remove perfil/roles/permissões)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove dados nas tabelas (CASCADE deve limpar permissões se configurado)
      const { error: rolesErr } = await supabase.from('gestao_splits_user_roles').delete().eq('user_id', userId);
      if (rolesErr) throw rolesErr;

      const { error: screenErr } = await supabase.from('gestao_splits_screen_permissions').delete().eq('user_id', userId);
      if (screenErr) throw screenErr;

      const { error: clientErr } = await supabase.from('gestao_splits_client_permissions').delete().eq('user_id', userId);
      if (clientErr) throw clientErr;

      const { error: profileErr } = await supabase.from('gestao_profiles_todos_sistemas').delete().eq('id', userId);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-users-management'] });
      toast({ title: 'Usuário removido', description: 'O usuário foi removido com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover usuário', description: error.message, variant: 'destructive' });
    }
  });

  // Alterar senha — sem Admin API, não é possível no frontend sem service role key
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      // Criar cliente isolado, fazer login como o usuário não é possível sem a senha atual.
      // Alternativa: usar resetPasswordForEmail para enviar email de reset
      throw new Error(
        'Alteração de senha direta não disponível sem Admin API. ' +
        'Use a opção de redefinir senha por email.'
      );
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
    }
  });

  return {
    users,
    isLoading,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending
  };
}
