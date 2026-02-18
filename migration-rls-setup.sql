-- ============================================
-- MIGRAÇÃO COMPLETA PARA SUPABASE AUTH + RLS
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- FASE 1: CRIAR ENUM E TABELAS
-- ============================================

CREATE TYPE public.app_role AS ENUM (
  'admin', 
  'editor', 
  'viewer', 
  'colaborador', 
  'cliente', 
  'parceiro'
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  descricao TEXT,
  url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES public.systems(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(system_id, slug)
);

CREATE TABLE public.system_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  system_id UUID REFERENCES public.systems(id) ON DELETE CASCADE NOT NULL,
  can_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, system_id)
);

CREATE TABLE public.screen_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  screen_id UUID REFERENCES public.screens(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, screen_id)
);

CREATE TABLE public.client_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credor_cedrus TEXT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_transact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, credor_cedrus)
);

-- ============================================
-- FASE 2: HABILITAR RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FASE 3: FUNÇÕES SECURITY DEFINER
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.can_access_system(_user_id UUID, _system_slug TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin(_user_id) THEN TRUE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.system_permissions
      WHERE user_id = _user_id
    ) THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.system_permissions sp
      JOIN public.systems s ON sp.system_id = s.id
      WHERE sp.user_id = _user_id 
        AND s.slug = _system_slug 
        AND sp.can_access = TRUE
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- ============================================
-- FASE 4: TRIGGERS
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_systems_updated_at
  BEFORE UPDATE ON public.systems
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_screens_updated_at
  BEFORE UPDATE ON public.screens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_system_permissions_updated_at
  BEFORE UPDATE ON public.system_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_screen_permissions_updated_at
  BEFORE UPDATE ON public.screen_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_client_permissions_updated_at
  BEFORE UPDATE ON public.client_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- FASE 5: POLÍTICAS RLS
-- ============================================

-- PROFILES
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- USER_ROLES
CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles_insert_policy" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_update_policy" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_delete_policy" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- SYSTEMS
CREATE POLICY "systems_select_policy" ON public.systems
FOR SELECT TO authenticated
USING (ativo = TRUE OR public.is_admin(auth.uid()));

CREATE POLICY "systems_insert_policy" ON public.systems
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "systems_update_policy" ON public.systems
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "systems_delete_policy" ON public.systems
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- SCREENS
CREATE POLICY "screens_select_policy" ON public.screens
FOR SELECT TO authenticated
USING (ativo = TRUE OR public.is_admin(auth.uid()));

CREATE POLICY "screens_insert_policy" ON public.screens
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "screens_update_policy" ON public.screens
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "screens_delete_policy" ON public.screens
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- SYSTEM_PERMISSIONS
CREATE POLICY "system_permissions_select_policy" ON public.system_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "system_permissions_insert_policy" ON public.system_permissions
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "system_permissions_update_policy" ON public.system_permissions
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "system_permissions_delete_policy" ON public.system_permissions
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- SCREEN_PERMISSIONS
CREATE POLICY "screen_permissions_select_policy" ON public.screen_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "screen_permissions_insert_policy" ON public.screen_permissions
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "screen_permissions_update_policy" ON public.screen_permissions
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "screen_permissions_delete_policy" ON public.screen_permissions
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- CLIENT_PERMISSIONS
CREATE POLICY "client_permissions_select_policy" ON public.client_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "client_permissions_insert_policy" ON public.client_permissions
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "client_permissions_update_policy" ON public.client_permissions
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "client_permissions_delete_policy" ON public.client_permissions
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================
-- RLS PARA TABELAS DE DADOS DE CLIENTES
-- ============================================

-- Tabela: clientes_superavit
ALTER TABLE public.clientes_superavit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_superavit_select_policy" 
ON public.clientes_superavit FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  NOT EXISTS (SELECT 1 FROM public.client_permissions WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.client_permissions cp
    WHERE cp.user_id = auth.uid()
      AND cp.credor_cedrus = clientes_superavit.credor_cedrus
      AND cp.can_view = TRUE
  )
);

CREATE POLICY "clientes_superavit_update_policy" 
ON public.clientes_superavit FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.client_permissions cp
    WHERE cp.user_id = auth.uid()
      AND cp.credor_cedrus = clientes_superavit.credor_cedrus
      AND cp.can_transact = TRUE
  )
);

CREATE POLICY "clientes_superavit_insert_policy" 
ON public.clientes_superavit FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "clientes_superavit_delete_policy" 
ON public.clientes_superavit FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Tabela: valores_totais_recebidos_asaas
ALTER TABLE public.valores_totais_recebidos_asaas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valores_recebidos_select_policy" 
ON public.valores_totais_recebidos_asaas FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  NOT EXISTS (SELECT 1 FROM public.client_permissions WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.client_permissions cp
    WHERE cp.user_id = auth.uid()
      AND cp.credor_cedrus = valores_totais_recebidos_asaas.credor_cedrus
      AND cp.can_view = TRUE
  )
);

CREATE POLICY "valores_recebidos_write_policy" 
ON public.valores_totais_recebidos_asaas FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- FASE 6: INSERIR DADOS INICIAIS
-- ============================================

INSERT INTO public.systems (nome, slug, descricao, ativo) VALUES
('Superávit - Sistema Principal', 'superavit', 'Sistema de gestão de repasses e disparos WhatsApp', TRUE);

INSERT INTO public.screens (system_id, nome, slug, ordem, ativo)
SELECT 
  (SELECT id FROM public.systems WHERE slug = 'superavit'),
  unnest(ARRAY[
    'Dashboard', 'Calendário', 'Relatório por Cliente', 
    'Relatório por Devedor', 'Gestão Setor Sul', 'Valores Recebidos',
    'Gestão de Splits', 'Extrato Bancário', 'Configurações', 'Gestão de Usuários'
  ]),
  unnest(ARRAY[
    'dashboard', 'calendario', 'relatorio-cliente',
    'relatorio-devedor', 'gestao-setor-sul', 'valores-recebidos',
    'gestao-splits', 'extrato', 'configuracoes', 'gestao-usuarios'
  ]),
  generate_series(1, 10),
  TRUE;

-- ============================================
-- MIGRAÇÃO COMPLETA!
-- ============================================
-- Próximos passos:
-- 1. Execute a Edge Function 'migrate-users' para migrar usuários
-- 2. Teste o login com Supabase Auth
-- 3. Após confirmar que tudo funciona, execute:
--    DROP TABLE IF EXISTS public.usuarios_sistemas_internos;
-- ============================================
