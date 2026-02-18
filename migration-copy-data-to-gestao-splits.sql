-- =====================================================
-- MIGRAÇÃO DE DADOS PARA TABELAS gestao_splits_*
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Copiar perfis de usuários existentes (sem duplicatas)
INSERT INTO gestao_splits_profiles (id, nome, created_at, updated_at)
SELECT DISTINCT ON (id)
  id,
  COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', email) as nome,
  created_at,
  NOW() as updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  updated_at = NOW();

-- 2. Copiar roles de usuários (usando DISTINCT para evitar duplicatas)
INSERT INTO gestao_splits_user_roles (user_id, role)
SELECT DISTINCT ON (user_id, role)
  user_id,
  CASE 
    WHEN role::text = 'admin' THEN 'admin'::gestao_splits_role
    WHEN role::text = 'editor' THEN 'editor'::gestao_splits_role
    WHEN role::text = 'viewer' THEN 'viewer'::gestao_splits_role
    WHEN role::text = 'colaborador' THEN 'colaborador'::gestao_splits_role
    WHEN role::text = 'cliente' THEN 'cliente'::gestao_splits_role
    WHEN role::text = 'parceiro' THEN 'parceiro'::gestao_splits_role
    ELSE 'viewer'::gestao_splits_role
  END as role
FROM user_roles
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Copiar permissões de telas (usando DISTINCT para evitar duplicatas)
INSERT INTO gestao_splits_screen_permissions (user_id, screen_id, can_view, can_create, can_update, can_delete)
SELECT DISTINCT ON (sp.user_id, gs.id)
  sp.user_id,
  gs.id as screen_id,
  sp.can_view,
  sp.can_create,
  sp.can_update,
  sp.can_delete
FROM screen_permissions sp
JOIN screens s ON sp.screen_id = s.id
JOIN gestao_splits_screens gs ON gs.slug = s.slug
ON CONFLICT (user_id, screen_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;

-- 4. Copiar permissões de clientes (usando DISTINCT para evitar duplicatas)
INSERT INTO gestao_splits_client_permissions (user_id, credor_cedrus, can_view, can_transact)
SELECT DISTINCT ON (user_id, credor_cedrus)
  user_id,
  credor_cedrus,
  can_view,
  COALESCE(can_transact, false) as can_transact
FROM client_permissions
ON CONFLICT (user_id, credor_cedrus) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_transact = EXCLUDED.can_transact;

-- 5. Verificar dados migrados
SELECT 'Perfis migrados:' as info, COUNT(*) as total FROM gestao_splits_profiles;
SELECT 'Roles migrados:' as info, COUNT(*) as total FROM gestao_splits_user_roles;
SELECT 'Permissões de telas migradas:' as info, COUNT(*) as total FROM gestao_splits_screen_permissions;
SELECT 'Permissões de clientes migradas:' as info, COUNT(*) as total FROM gestao_splits_client_permissions;

-- 6. Listar usuários admin
SELECT p.id, p.nome, gestao_splits_get_user_email(p.id) as email, r.role 
FROM gestao_splits_profiles p
JOIN gestao_splits_user_roles r ON p.id = r.user_id
WHERE r.role = 'admin';
