-- Migration: Adicionar coluna ignorar na tabela base_tudobelo_etapas
-- Descrição: Campo booleano para marcar etapas que devem ser ignoradas no upload

ALTER TABLE public.base_tudobelo_etapas 
ADD COLUMN IF NOT EXISTS ignorar boolean NULL DEFAULT false;

COMMENT ON COLUMN public.base_tudobelo_etapas.ignorar IS 'Se true, títulos com esta etapa serão ignorados no upload';
