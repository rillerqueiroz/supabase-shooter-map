-- =====================================================
-- CORREÇÃO FOCADA: VALORES RECEBIDOS
-- Objetivo: Garantir que usuários vejam apenas dados 
-- das empresas (credor_cedrus) permitidas em client_permissions
-- =====================================================

-- =====================================================
-- PARTE 1: CRIAR FUNÇÃO DE NORMALIZAÇÃO
-- =====================================================
-- Remove espaços extras, trim, e converte para maiúsculas
-- Garante que "EMPRESA X ", "empresa x", "EMPRESA X" sejam todos "EMPRESA X"

CREATE OR REPLACE FUNCTION normalize_credor_cedrus(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT UPPER(TRIM(REGEXP_REPLACE(input, '\s+', ' ', 'g')))
$$;

-- =====================================================
-- PARTE 2: CORRIGIR POLÍTICA RLS
-- =====================================================
-- Remove a cláusula NOT EXISTS que permite acesso sem permissões
-- Implementa "deny by default" (apenas admin ou permissão explícita)

-- Drop da política atual
DROP POLICY IF EXISTS "valores_recebidos_select_policy" ON public.valores_totais_recebidos_asaas;

-- Criar política correta
CREATE POLICY "valores_recebidos_select_policy" 
ON public.valores_totais_recebidos_asaas
FOR SELECT 
TO authenticated
USING (
  -- Admin vê tudo
  public.is_admin(auth.uid()) 
  OR
  -- Usuários com permissão explícita veem apenas suas empresas
  EXISTS (
    SELECT 1 
    FROM public.client_permissions cp
    WHERE cp.user_id = auth.uid()
      AND cp.credor_cedrus = valores_totais_recebidos_asaas.credor_cedrus
      AND cp.can_view = true
  )
);

-- =====================================================
-- PARTE 3: NORMALIZAR DADOS EXISTENTES
-- =====================================================
-- Atualiza valores existentes para garantir consistência

-- 3.1: Normalizar valores_totais_recebidos_asaas
UPDATE public.valores_totais_recebidos_asaas
SET credor_cedrus = normalize_credor_cedrus(credor_cedrus)
WHERE credor_cedrus IS NOT NULL 
  AND credor_cedrus != normalize_credor_cedrus(credor_cedrus);

-- 3.2: Normalizar client_permissions (necessário para o match funcionar)
UPDATE public.client_permissions
SET credor_cedrus = normalize_credor_cedrus(credor_cedrus)
WHERE credor_cedrus IS NOT NULL 
  AND credor_cedrus != normalize_credor_cedrus(credor_cedrus);

-- =====================================================
-- PARTE 4: TRIGGER DE NORMALIZAÇÃO AUTOMÁTICA
-- =====================================================
-- Garante que novos registros já entrem normalizados

-- 4.1: Criar função do trigger
CREATE OR REPLACE FUNCTION auto_normalize_credor_cedrus()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.credor_cedrus IS NOT NULL THEN
    NEW.credor_cedrus = normalize_credor_cedrus(NEW.credor_cedrus);
  END IF;
  RETURN NEW;
END;
$$;

-- 4.2: Aplicar trigger em valores_totais_recebidos_asaas
DROP TRIGGER IF EXISTS normalize_valores_recebidos_credor ON public.valores_totais_recebidos_asaas;
CREATE TRIGGER normalize_valores_recebidos_credor
  BEFORE INSERT OR UPDATE OF credor_cedrus
  ON public.valores_totais_recebidos_asaas
  FOR EACH ROW
  EXECUTE FUNCTION auto_normalize_credor_cedrus();

-- 4.3: Aplicar trigger em client_permissions (para consistência)
DROP TRIGGER IF EXISTS normalize_client_permissions_credor ON public.client_permissions;
CREATE TRIGGER normalize_client_permissions_credor
  BEFORE INSERT OR UPDATE OF credor_cedrus
  ON public.client_permissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_normalize_credor_cedrus();

-- =====================================================
-- PARTE 5: ÍNDICE DE PERFORMANCE
-- =====================================================
-- Melhora performance do filtro RLS

CREATE INDEX IF NOT EXISTS idx_valores_recebidos_credor 
ON public.valores_totais_recebidos_asaas(credor_cedrus);

CREATE INDEX IF NOT EXISTS idx_client_permissions_credor_view
ON public.client_permissions(credor_cedrus, user_id) 
WHERE can_view = true;

-- =====================================================
-- PARTE 6: QUERIES DE VERIFICAÇÃO E DIAGNÓSTICO
-- =====================================================
-- Execute estas queries para verificar se tudo está funcionando

-- 6.1: Verificar se a política RLS foi aplicada corretamente
-- SELECT schemaname, tablename, policyname, qual 
-- FROM pg_policies 
-- WHERE tablename = 'valores_totais_recebidos_asaas';

-- 6.2: Ver todas as empresas (credor_cedrus) disponíveis
-- SELECT DISTINCT credor_cedrus 
-- FROM public.valores_totais_recebidos_asaas 
-- ORDER BY credor_cedrus;

-- 6.3: Verificar permissões de um usuário específico (substitua USER_ID)
-- SELECT user_id, credor_cedrus, can_view, can_transact
-- FROM public.client_permissions 
-- WHERE user_id = 'USER_ID';

-- 6.4: Verificar se há inconsistências de credor_cedrus
-- SELECT credor_cedrus, 
--        LENGTH(credor_cedrus) as tam,
--        normalize_credor_cedrus(credor_cedrus) as normalized,
--        COUNT(*) as qtd
-- FROM public.valores_totais_recebidos_asaas
-- WHERE credor_cedrus IS NOT NULL
-- GROUP BY credor_cedrus
-- HAVING credor_cedrus != normalize_credor_cedrus(credor_cedrus);

-- 6.5: Comparar permissões vs dados disponíveis (substitua USER_ID)
-- WITH user_permissions AS (
--   SELECT credor_cedrus 
--   FROM public.client_permissions 
--   WHERE user_id = 'USER_ID' AND can_view = true
-- )
-- SELECT 
--   vr.credor_cedrus,
--   COUNT(*) as total_registros,
--   CASE WHEN up.credor_cedrus IS NOT NULL THEN 'PERMITIDO' ELSE 'BLOQUEADO' END as status
-- FROM public.valores_totais_recebidos_asaas vr
-- LEFT JOIN user_permissions up ON up.credor_cedrus = vr.credor_cedrus
-- GROUP BY vr.credor_cedrus, up.credor_cedrus
-- ORDER BY status DESC, vr.credor_cedrus;

-- =====================================================
-- FINALIZADO! 
-- =====================================================
-- Execute este script completo no Supabase SQL Editor
-- Depois siga as instruções em DIAGNOSTICO-GABRIEL.md
