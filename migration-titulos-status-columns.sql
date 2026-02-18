-- Migration: Adicionar colunas status_titulo e status_cedrus
-- Descrição: Adiciona campos para controle de status do título e status cedrus

-- Adicionar coluna status_titulo
ALTER TABLE public.base_tudobelo_intermediaria 
ADD COLUMN IF NOT EXISTS status_titulo text NULL;

-- Adicionar coluna status_cedrus
ALTER TABLE public.base_tudobelo_intermediaria 
ADD COLUMN IF NOT EXISTS status_cedrus text NULL;

-- Comentários
COMMENT ON COLUMN public.base_tudobelo_intermediaria.status_titulo IS 'Status do título: A vencer, Cancelado, Vencido, Negociado, Pago em dia, Pago via renegociação, Suspenso, Não se aplica';
COMMENT ON COLUMN public.base_tudobelo_intermediaria.status_cedrus IS 'Status no Cedrus: A (Aberto), C (Cancelado), N (Negociado), P (Pago)';

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_base_tudobelo_status_titulo ON public.base_tudobelo_intermediaria(status_titulo);
CREATE INDEX IF NOT EXISTS idx_base_tudobelo_status_cedrus ON public.base_tudobelo_intermediaria(status_cedrus);
