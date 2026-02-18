-- ============================================================================
-- MIGRAÇÃO: Cliente ID como Chave Principal
-- ============================================================================
-- Esta migração altera o sistema para usar cliente_id (da tabela clientes_superavit)
-- como chave principal em vez de credor_cedrus, permitindo:
-- 1. Vincular múltiplos credores a um mesmo cliente
-- 2. Simplificar permissões (dar acesso ao cliente = acesso a todos seus credores)
-- 3. Projetos globais por cliente (não apenas por credor específico)
-- ============================================================================

-- ============================================================================
-- FASE 1.1: Criar tabela de vinculação cliente_credores
-- ============================================================================
-- Esta tabela permite vincular múltiplos credores a um cliente principal
-- Exemplo: GRUPOUS (cliente principal) pode ter SACHA, SACHA-IESE vinculados

CREATE TABLE IF NOT EXISTS public.cliente_credores (
    id SERIAL PRIMARY KEY,
    cliente_principal_id INTEGER NOT NULL REFERENCES public.clientes_superavit(id) ON DELETE CASCADE,
    cliente_vinculado_id INTEGER NOT NULL REFERENCES public.clientes_superavit(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evita duplicatas
    CONSTRAINT unique_vinculo UNIQUE (cliente_principal_id, cliente_vinculado_id),
    
    -- Evita vincular um cliente a si mesmo
    CONSTRAINT no_self_reference CHECK (cliente_principal_id != cliente_vinculado_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cliente_credores_principal ON public.cliente_credores(cliente_principal_id);
CREATE INDEX IF NOT EXISTS idx_cliente_credores_vinculado ON public.cliente_credores(cliente_vinculado_id);

-- ============================================================================
-- FASE 1.2: Adicionar cliente_id em gestao_splits_projetos
-- ============================================================================
-- Permite projetos vinculados a um cliente (global) ou credor específico

ALTER TABLE public.gestao_splits_projetos 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes_superavit(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_projetos_cliente_id ON public.gestao_splits_projetos(cliente_id);

-- ============================================================================
-- FASE 1.3: Adicionar cliente_id em gestao_splits_client_permissions
-- ============================================================================
-- Permissões agora são por cliente, não mais por credor

ALTER TABLE public.gestao_splits_client_permissions 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES public.clientes_superavit(id) ON DELETE CASCADE;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_permissions_cliente_id ON public.gestao_splits_client_permissions(cliente_id);

-- ============================================================================
-- FASE 1.4: Funções auxiliares para RLS
-- ============================================================================

-- Função: Retorna todos os credor_cedrus de um cliente (principal + vinculados)
CREATE OR REPLACE FUNCTION public.get_all_credores_by_cliente(p_cliente_id INTEGER)
RETURNS SETOF TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Retorna o credor_cedrus do cliente principal
    SELECT credor_cedrus FROM clientes_superavit WHERE id = p_cliente_id
    UNION
    -- Retorna os credor_cedrus de todos os clientes vinculados
    SELECT cs.credor_cedrus 
    FROM cliente_credores cc
    JOIN clientes_superavit cs ON cs.id = cc.cliente_vinculado_id
    WHERE cc.cliente_principal_id = p_cliente_id
$$;

-- Função: Verifica se usuário tem acesso a um cliente
CREATE OR REPLACE FUNCTION public.user_has_cliente_access(p_user_id UUID, p_cliente_id INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM gestao_splits_client_permissions
        WHERE user_id = p_user_id 
        AND cliente_id = p_cliente_id 
        AND can_view = true
    )
$$;

-- Função: Retorna todos os cliente_ids que um usuário pode acessar
CREATE OR REPLACE FUNCTION public.get_user_allowed_cliente_ids(p_user_id UUID)
RETURNS SETOF INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cliente_id 
    FROM gestao_splits_client_permissions
    WHERE user_id = p_user_id 
    AND cliente_id IS NOT NULL
    AND can_view = true
$$;

-- Função: Retorna todos os credor_cedrus que um usuário pode acessar
CREATE OR REPLACE FUNCTION public.get_user_allowed_credores(p_user_id UUID)
RETURNS SETOF TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Credores diretos dos clientes que o usuário tem permissão
    SELECT cs.credor_cedrus
    FROM gestao_splits_client_permissions perm
    JOIN clientes_superavit cs ON cs.id = perm.cliente_id
    WHERE perm.user_id = p_user_id 
    AND perm.can_view = true
    AND perm.cliente_id IS NOT NULL
    
    UNION
    
    -- Credores vinculados aos clientes que o usuário tem permissão
    SELECT cs.credor_cedrus
    FROM gestao_splits_client_permissions perm
    JOIN cliente_credores cc ON cc.cliente_principal_id = perm.cliente_id
    JOIN clientes_superavit cs ON cs.id = cc.cliente_vinculado_id
    WHERE perm.user_id = p_user_id 
    AND perm.can_view = true
    AND perm.cliente_id IS NOT NULL
$$;

-- ============================================================================
-- FASE 1.5: RLS para cliente_credores
-- ============================================================================

ALTER TABLE public.cliente_credores ENABLE ROW LEVEL SECURITY;

-- Admins podem ver tudo
CREATE POLICY "Admins podem ver todos os vínculos" ON public.cliente_credores
    FOR SELECT TO authenticated
    USING (public.gestao_splits_is_admin(auth.uid()));

-- Usuários podem ver vínculos dos clientes que têm acesso
CREATE POLICY "Usuários veem vínculos dos seus clientes" ON public.cliente_credores
    FOR SELECT TO authenticated
    USING (
        public.user_has_cliente_access(auth.uid(), cliente_principal_id)
        OR public.gestao_splits_is_admin(auth.uid())
    );

-- Apenas admins podem criar vínculos
CREATE POLICY "Admins podem criar vínculos" ON public.cliente_credores
    FOR INSERT TO authenticated
    WITH CHECK (public.gestao_splits_is_admin(auth.uid()));

-- Apenas admins podem deletar vínculos
CREATE POLICY "Admins podem deletar vínculos" ON public.cliente_credores
    FOR DELETE TO authenticated
    USING (public.gestao_splits_is_admin(auth.uid()));

-- ============================================================================
-- FASE 2: Migração de dados existentes
-- ============================================================================

-- Popular cliente_id em gestao_splits_projetos baseado no credor_cedrus
UPDATE public.gestao_splits_projetos p
SET cliente_id = (
    SELECT id FROM clientes_superavit cs 
    WHERE cs.credor_cedrus = p.credor_cedrus
    LIMIT 1
)
WHERE p.cliente_id IS NULL AND p.credor_cedrus IS NOT NULL;

-- Popular cliente_id em gestao_splits_client_permissions baseado no credor_cedrus
UPDATE public.gestao_splits_client_permissions p
SET cliente_id = (
    SELECT id FROM clientes_superavit cs 
    WHERE cs.credor_cedrus = p.credor_cedrus
    LIMIT 1
)
WHERE p.cliente_id IS NULL AND p.credor_cedrus IS NOT NULL;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON public.cliente_credores TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cliente_credores_id_seq TO authenticated;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE public.cliente_credores IS 'Vincula múltiplos credores a um cliente principal';
COMMENT ON COLUMN public.cliente_credores.cliente_principal_id IS 'ID do cliente principal (pai)';
COMMENT ON COLUMN public.cliente_credores.cliente_vinculado_id IS 'ID do credor vinculado ao cliente principal';
COMMENT ON FUNCTION public.get_all_credores_by_cliente IS 'Retorna todos os credor_cedrus de um cliente (principal + vinculados)';
COMMENT ON FUNCTION public.user_has_cliente_access IS 'Verifica se usuário tem acesso a um cliente específico';
COMMENT ON FUNCTION public.get_user_allowed_cliente_ids IS 'Retorna todos os cliente_ids que um usuário pode acessar';
COMMENT ON FUNCTION public.get_user_allowed_credores IS 'Retorna todos os credor_cedrus que um usuário pode acessar (incluindo vinculados)';
