-- Migration: Adicionar coluna etapa na tabela base_tudobelo_intermediaria
-- Descrição: Adiciona campo para controle de etapa do título

-- Adicionar coluna etapa
ALTER TABLE public.base_tudobelo_intermediaria 
ADD COLUMN IF NOT EXISTS etapa text NULL;

-- Comentário
COMMENT ON COLUMN public.base_tudobelo_intermediaria.etapa IS 'Etapa atual do título no fluxo de processamento';

-- Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_base_tudobelo_etapa ON public.base_tudobelo_intermediaria(etapa);
