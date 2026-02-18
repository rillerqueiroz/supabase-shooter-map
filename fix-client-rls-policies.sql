-- ============================================================================
-- CORREÇÃO DE POLÍTICAS RLS - DENY BY DEFAULT
-- ============================================================================
-- Este script corrige as políticas RLS para implementar o princípio "deny by default"
-- Apenas admins OU usuários com permissões explícitas em client_permissions podem ver dados
-- ============================================================================

-- 1. CORRIGIR POLÍTICA DE VALORES RECEBIDOS ASAAS
-- ============================================================================

DROP POLICY IF EXISTS "valores_recebidos_select_policy" ON public.valores_totais_recebidos_asaas;

CREATE POLICY "valores_recebidos_select_policy" 
ON public.valores_totais_recebidos_asaas 
FOR SELECT 
TO authenticated
USING (
  -- Admin vê tudo
  public.is_admin(auth.uid()) 
  OR 
  -- OU tem permissão explícita para este credor_cedrus
  EXISTS (
    SELECT 1 
    FROM public.client_permissions cp
    WHERE cp.user_id = auth.uid()
      AND cp.credor_cedrus = valores_totais_recebidos_asaas.credor_cedrus
      AND cp.can_view = TRUE
  )
);

COMMENT ON POLICY "valores_recebidos_select_policy" ON public.valores_totais_recebidos_asaas 
IS 'Deny by default: apenas admins ou usuários com permissões explícitas podem ver valores recebidos';


-- 2. CORRIGIR POLÍTICA DE CLIENTES SUPERAVIT
-- ============================================================================

DROP POLICY IF EXISTS "clientes_superavit_select_policy" ON public.clientes_superavit;

CREATE POLICY "clientes_superavit_select_policy" 
ON public.clientes_superavit 
FOR SELECT 
TO authenticated
USING (
  -- Admin vê tudo
  public.is_admin(auth.uid()) 
  OR 
  -- OU tem permissão explícita para este credor_cedrus
  EXISTS (
    SELECT 1 
    FROM public.client_permissions cp
    WHERE cp.user_id = auth.uid()
      AND cp.credor_cedrus = clientes_superavit.credor_cedrus
      AND cp.can_view = TRUE
  )
);

COMMENT ON POLICY "clientes_superavit_select_policy" ON public.clientes_superavit 
IS 'Deny by default: apenas admins ou usuários com permissões explícitas podem ver clientes';


-- 3. FUNÇÃO AUXILIAR PARA NORMALIZAR credor_cedrus (OPCIONAL)
-- ============================================================================
-- Use esta função se houver inconsistências de formatação (espaços, maiúsculas/minúsculas)

CREATE OR REPLACE FUNCTION public.normalize_credor_cedrus(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT UPPER(TRIM(input))
$$;

COMMENT ON FUNCTION public.normalize_credor_cedrus(TEXT) 
IS 'Normaliza valores de credor_cedrus removendo espaços e convertendo para maiúsculas';


-- 4. APLICAR NORMALIZAÇÃO (DESCOMENTAR SE NECESSÁRIO)
-- ============================================================================
-- Execute apenas se identificar inconsistências nos valores de credor_cedrus

/*
-- Normalizar valores_totais_recebidos_asaas
UPDATE public.valores_totais_recebidos_asaas
SET credor_cedrus = public.normalize_credor_cedrus(credor_cedrus)
WHERE credor_cedrus IS NOT NULL 
  AND credor_cedrus != public.normalize_credor_cedrus(credor_cedrus);

-- Normalizar clientes_superavit
UPDATE public.clientes_superavit
SET credor_cedrus = public.normalize_credor_cedrus(credor_cedrus)
WHERE credor_cedrus IS NOT NULL 
  AND credor_cedrus != public.normalize_credor_cedrus(credor_cedrus);

-- Normalizar client_permissions
UPDATE public.client_permissions
SET credor_cedrus = public.normalize_credor_cedrus(credor_cedrus)
WHERE credor_cedrus IS NOT NULL 
  AND credor_cedrus != public.normalize_credor_cedrus(credor_cedrus);
*/


-- 5. QUERIES DE VERIFICAÇÃO
-- ============================================================================
-- Execute estas queries para diagnosticar o problema do Gabriel

-- Ver permissões de um usuário específico (substituir USER_ID)
-- SELECT * FROM public.client_permissions WHERE user_id = 'USER_ID';

-- Ver todos os credor_cedrus únicos em valores recebidos
-- SELECT DISTINCT credor_cedrus 
-- FROM public.valores_totais_recebidos_asaas 
-- WHERE credor_cedrus IS NOT NULL
-- ORDER BY credor_cedrus;

-- Ver todos os credor_cedrus únicos em clientes
-- SELECT DISTINCT credor_cedrus 
-- FROM public.clientes_superavit 
-- WHERE credor_cedrus IS NOT NULL
-- ORDER BY credor_cedrus;

-- Comparar permissões vs dados disponíveis
-- SELECT 
--   cp.credor_cedrus as permissao,
--   cs.credor_cedrus as cliente_existe,
--   vr.credor_cedrus as valor_existe
-- FROM public.client_permissions cp
-- LEFT JOIN public.clientes_superavit cs ON cs.credor_cedrus = cp.credor_cedrus
-- LEFT JOIN public.valores_totais_recebidos_asaas vr ON vr.credor_cedrus = cp.credor_cedrus
-- WHERE cp.user_id = 'USER_ID';


-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================
-- 1. Abrir SQL Editor no Supabase
-- 2. Copiar e colar este script completo
-- 3. Executar o script
-- 4. Verificar se as políticas foram criadas corretamente
-- 5. Testar login com Gabriel e verificar se os dados aparecem
-- 6. Se necessário, descomentar e executar a seção 4 (normalização)
-- ============================================================================
