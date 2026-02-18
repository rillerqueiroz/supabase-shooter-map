-- ============================================
-- MIGRAÇÃO: Renomear gestao_splits_profiles para gestao_profiles_todos_sistemas
-- e adicionar colunas booleanas por sistema
-- ============================================

-- 1. Renomear a tabela
ALTER TABLE gestao_splits_profiles RENAME TO gestao_profiles_todos_sistemas;

-- 2. Adicionar colunas de sistema
ALTER TABLE gestao_profiles_todos_sistemas
  ADD COLUMN sistema_tudobelo BOOLEAN DEFAULT false,
  ADD COLUMN sistema_gestao_repasses BOOLEAN DEFAULT false,
  ADD COLUMN sistema_antecipacoes BOOLEAN DEFAULT false,
  ADD COLUMN sistema_semear BOOLEAN DEFAULT false,
  ADD COLUMN sistema_gestao_splits BOOLEAN DEFAULT false,
  ADD COLUMN sistema_testedisc BOOLEAN DEFAULT false;

-- 3. Marcar usuários existentes com roles como pertencentes ao Tudo Belo
UPDATE gestao_profiles_todos_sistemas 
SET sistema_tudobelo = true 
WHERE id IN (SELECT DISTINCT user_id FROM gestao_splits_user_roles);

-- 4. Atualizar trigger de criação de usuário
CREATE OR REPLACE FUNCTION gestao_splits_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO gestao_profiles_todos_sistemas (id, nome)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- 5. Atualizar GRANT
GRANT ALL ON gestao_profiles_todos_sistemas TO authenticated;

-- Nota: As RLS policies e triggers existentes são mantidos automaticamente
-- pelo RENAME (PostgreSQL preserva policies ao renomear tabelas).
