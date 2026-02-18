-- ============================================
-- MIGRAÇÃO: Tabelas Exclusivas gestao_splits_
-- Sistema: Gestão Splits
-- ============================================

-- 1. Criar enum exclusivo para roles
CREATE TYPE gestao_splits_role AS ENUM ('admin', 'editor', 'viewer', 'colaborador', 'cliente', 'parceiro');

-- 2. Tabela de Perfis
CREATE TABLE gestao_splits_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Roles do Usuário
CREATE TABLE gestao_splits_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role gestao_splits_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 4. Tabela de Telas (sem referência a systems)
CREATE TABLE gestao_splits_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Permissões de Telas
CREATE TABLE gestao_splits_screen_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES gestao_splits_screens(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, screen_id)
);

-- 6. Tabela de Permissões de Clientes/Credores
CREATE TABLE gestao_splits_client_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credor_cedrus TEXT NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_transact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, credor_cedrus)
);

-- ============================================
-- HABILITAR RLS
-- ============================================

ALTER TABLE gestao_splits_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_screen_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_client_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNÇÕES SECURITY DEFINER
-- ============================================

-- Função para verificar se usuário tem role
CREATE OR REPLACE FUNCTION gestao_splits_has_role(_user_id UUID, _role gestao_splits_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM gestao_splits_user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION gestao_splits_is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT gestao_splits_has_role(_user_id, 'admin')
$$;

-- Função para obter email do usuário (útil para listagem)
CREATE OR REPLACE FUNCTION gestao_splits_get_user_email(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT email FROM auth.users WHERE id = _user_id
$$;

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION gestao_splits_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO gestao_splits_profiles (id, nome)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION gestao_splits_handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para criar perfil ao registrar usuário
DROP TRIGGER IF EXISTS on_auth_user_created_gestao_splits ON auth.users;
CREATE TRIGGER on_auth_user_created_gestao_splits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION gestao_splits_handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER gestao_splits_profiles_updated_at
    BEFORE UPDATE ON gestao_splits_profiles
    FOR EACH ROW
    EXECUTE FUNCTION gestao_splits_handle_updated_at();

CREATE TRIGGER gestao_splits_screens_updated_at
    BEFORE UPDATE ON gestao_splits_screens
    FOR EACH ROW
    EXECUTE FUNCTION gestao_splits_handle_updated_at();

CREATE TRIGGER gestao_splits_screen_permissions_updated_at
    BEFORE UPDATE ON gestao_splits_screen_permissions
    FOR EACH ROW
    EXECUTE FUNCTION gestao_splits_handle_updated_at();

CREATE TRIGGER gestao_splits_client_permissions_updated_at
    BEFORE UPDATE ON gestao_splits_client_permissions
    FOR EACH ROW
    EXECUTE FUNCTION gestao_splits_handle_updated_at();

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- PROFILES
CREATE POLICY "gestao_splits_profiles_select_own"
    ON gestao_splits_profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_profiles_update_own"
    ON gestao_splits_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_profiles_insert"
    ON gestao_splits_profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid() OR gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_profiles_delete_admin"
    ON gestao_splits_profiles FOR DELETE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

-- USER ROLES
CREATE POLICY "gestao_splits_user_roles_select"
    ON gestao_splits_user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_user_roles_insert_admin"
    ON gestao_splits_user_roles FOR INSERT
    TO authenticated
    WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_user_roles_update_admin"
    ON gestao_splits_user_roles FOR UPDATE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_user_roles_delete_admin"
    ON gestao_splits_user_roles FOR DELETE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

-- SCREENS (leitura pública para autenticados)
CREATE POLICY "gestao_splits_screens_select"
    ON gestao_splits_screens FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "gestao_splits_screens_insert_admin"
    ON gestao_splits_screens FOR INSERT
    TO authenticated
    WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_screens_update_admin"
    ON gestao_splits_screens FOR UPDATE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_screens_delete_admin"
    ON gestao_splits_screens FOR DELETE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

-- SCREEN PERMISSIONS
CREATE POLICY "gestao_splits_screen_permissions_select"
    ON gestao_splits_screen_permissions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_screen_permissions_insert_admin"
    ON gestao_splits_screen_permissions FOR INSERT
    TO authenticated
    WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_screen_permissions_update_admin"
    ON gestao_splits_screen_permissions FOR UPDATE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_screen_permissions_delete_admin"
    ON gestao_splits_screen_permissions FOR DELETE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

-- CLIENT PERMISSIONS
CREATE POLICY "gestao_splits_client_permissions_select"
    ON gestao_splits_client_permissions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_client_permissions_insert_admin"
    ON gestao_splits_client_permissions FOR INSERT
    TO authenticated
    WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_client_permissions_update_admin"
    ON gestao_splits_client_permissions FOR UPDATE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "gestao_splits_client_permissions_delete_admin"
    ON gestao_splits_client_permissions FOR DELETE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

-- ============================================
-- DADOS INICIAIS - TELAS DO SISTEMA
-- ============================================

INSERT INTO gestao_splits_screens (slug, nome, descricao, ordem) VALUES
    ('dashboard', 'Dashboard', 'Painel principal com métricas e indicadores', 1),
    ('calendario', 'Calendário', 'Visualização de eventos e agendamentos', 2),
    ('relatorio-cliente', 'Relatório por Cliente', 'Relatórios filtrados por cliente/credor', 3),
    ('relatorio-devedor', 'Relatório por Devedor', 'Relatórios filtrados por devedor', 4),
    ('gestao-setor-sul', 'Gestão Setor Sul', 'Gestão de clientes e parcelas do Setor Sul', 5),
    ('valores-recebidos', 'Valores Recebidos', 'Visualização de valores recebidos via Asaas', 6),
    ('gestao-splits', 'Gestão de Splits', 'Gestão de splits de pagamentos', 7),
    ('extrato-bancario', 'Extrato Bancário', 'Visualização de extratos bancários', 8),
    ('configuracoes', 'Configurações', 'Configurações do sistema', 9),
    ('gestao-usuarios', 'Gestão de Usuários', 'Gerenciamento de usuários e permissões', 10),
    ('gestao-pos-acordo', 'Gestão Pós-Acordo', 'Acompanhamento de acordos firmados', 11),
    ('logs-zapsign', 'Logs Zapsign', 'Visualização de logs de integração Zapsign', 12);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_gestao_splits_user_roles_user_id ON gestao_splits_user_roles(user_id);
CREATE INDEX idx_gestao_splits_user_roles_role ON gestao_splits_user_roles(role);
CREATE INDEX idx_gestao_splits_screen_permissions_user_id ON gestao_splits_screen_permissions(user_id);
CREATE INDEX idx_gestao_splits_screen_permissions_screen_id ON gestao_splits_screen_permissions(screen_id);
CREATE INDEX idx_gestao_splits_client_permissions_user_id ON gestao_splits_client_permissions(user_id);
CREATE INDEX idx_gestao_splits_client_permissions_credor ON gestao_splits_client_permissions(credor_cedrus);
CREATE INDEX idx_gestao_splits_screens_slug ON gestao_splits_screens(slug);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON gestao_splits_profiles TO authenticated;
GRANT ALL ON gestao_splits_user_roles TO authenticated;
GRANT ALL ON gestao_splits_screens TO authenticated;
GRANT ALL ON gestao_splits_screen_permissions TO authenticated;
GRANT ALL ON gestao_splits_client_permissions TO authenticated;

-- ============================================
-- MIGRAÇÃO OPCIONAL: Copiar dados existentes
-- ============================================
-- Se você quiser migrar dados das tabelas antigas, descomente e execute:
--
-- INSERT INTO gestao_splits_profiles (id, nome, created_at)
-- SELECT id, nome, created_at FROM profiles
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO gestao_splits_user_roles (user_id, role)
-- SELECT user_id, role::text::gestao_splits_role FROM user_roles
-- ON CONFLICT (user_id, role) DO NOTHING;
