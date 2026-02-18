import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Iniciando migração de usuários...');

    // 1. Buscar usuários legados
    const { data: legacyUsers, error: fetchError } = await supabaseAdmin
      .from('usuarios_sistemas_internos')
      .select('*');

    if (fetchError) {
      console.error('❌ Erro ao buscar usuários legados:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Encontrados ${legacyUsers?.length || 0} usuários para migrar`);

    const results: {
      success: Array<{ email: string; newUserId: string; role: string; tempPassword: string }>;
      errors: Array<{ email: string; error: string }>;
    } = {
      success: [],
      errors: []
    };

    // 2. Mapear roles legadas para novas
    const roleMapping: Record<string, string> = {
      'administrador': 'admin',
      'gestor': 'editor',
      'operador': 'colaborador',
      'visualizador': 'viewer'
    };

    for (const user of legacyUsers || []) {
      try {
        console.log(`🔄 Migrando usuário: ${user.email}`);

        // 3. Criar usuário no auth.users com senha temporária
        const tempPassword = `Temp${Math.random().toString(36).slice(2)}!123`;
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            nome: user.usuario || user.nome
          }
        });

        if (authError) {
          console.error(`❌ Erro ao criar usuário ${user.email}:`, authError);
          throw authError;
        }

        console.log(`✅ Usuário criado: ${authUser.user.id}`);

        // 4. Atribuir role
        const newRole = roleMapping[user.papel] || 'viewer';
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authUser.user.id,
            role: newRole
          });

        if (roleError) {
          console.error(`❌ Erro ao atribuir role:`, roleError);
          throw roleError;
        }

        console.log(`✅ Role atribuída: ${newRole}`);

        // 5. Migrar permissões de sistema (se houver sistemas_acesso)
        if (user.sistemas_acesso && Array.isArray(user.sistemas_acesso) && user.sistemas_acesso.length > 0) {
          console.log(`🔐 Migrando permissões de sistema...`);
          
          const { data: systems } = await supabaseAdmin
            .from('systems')
            .select('id, nome')
            .in('nome', user.sistemas_acesso);

          if (systems && systems.length > 0) {
            for (const system of systems) {
              await supabaseAdmin
                .from('system_permissions')
                .insert({
                  user_id: authUser.user.id,
                  system_id: system.id,
                  can_access: true
                });
            }
            console.log(`✅ Permissões de sistema criadas`);
          }
        }

        // 6. Migrar permissões de clientes (se houver clientes_acesso)
        if (user.clientes_acesso && Array.isArray(user.clientes_acesso) && user.clientes_acesso.length > 0) {
          console.log(`🔐 Migrando permissões de clientes...`);
          
          for (const credor of user.clientes_acesso) {
            await supabaseAdmin
              .from('client_permissions')
              .insert({
                user_id: authUser.user.id,
                credor_cedrus: credor,
                can_view: true,
                can_transact: newRole === 'admin' || newRole === 'editor'
              });
          }
          console.log(`✅ Permissões de clientes criadas`);
        }

        results.success.push({
          email: user.email,
          newUserId: authUser.user.id,
          role: newRole,
          tempPassword: tempPassword
        });

      } catch (err: any) {
        console.error(`❌ Erro ao migrar usuário ${user.email}:`, err);
        results.errors.push({
          email: user.email,
          error: err.message
        });
      }
    }

    console.log(`✅ Migração concluída: ${results.success.length} sucesso, ${results.errors.length} falhas`);

    return new Response(
      JSON.stringify({
        message: 'Migração concluída',
        migrated: results.success.length,
        failed: results.errors.length,
        details: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na migração:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
