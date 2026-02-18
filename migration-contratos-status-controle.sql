-- Migration: Adicionar campos de controle de status para cobranças e contratos
-- Esta migration adiciona campos para rastrear o status de integrações com Asaas e ZapSign

-- Campos adicionais para controle de cobrança
ALTER TABLE public.gestao_splits_contratos
ADD COLUMN IF NOT EXISTS cobranca_status TEXT DEFAULT 'pendente' 
  CHECK (cobranca_status IN ('pendente', 'enviando', 'sucesso', 'erro', 'reprocessar')),
ADD COLUMN IF NOT EXISTS cobranca_id_externo TEXT,
ADD COLUMN IF NOT EXISTS cobranca_erro_mensagem TEXT;

-- Campos adicionais para controle de contrato
ALTER TABLE public.gestao_splits_contratos
ADD COLUMN IF NOT EXISTS contrato_status TEXT DEFAULT 'pendente' 
  CHECK (contrato_status IN ('pendente', 'enviando', 'sucesso', 'erro', 'reprocessar')),
ADD COLUMN IF NOT EXISTS contrato_id_externo TEXT,
ADD COLUMN IF NOT EXISTS contrato_erro_mensagem TEXT;

-- Índices para busca por status
CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_cobranca_status 
  ON public.gestao_splits_contratos(cobranca_status);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_contrato_status 
  ON public.gestao_splits_contratos(contrato_status);

-- Comentários para documentação
COMMENT ON COLUMN public.gestao_splits_contratos.cobranca_status IS 'Status da integração com Asaas: pendente, enviando, sucesso, erro, reprocessar';
COMMENT ON COLUMN public.gestao_splits_contratos.cobranca_id_externo IS 'ID do boleto/cobrança retornado pela API do Asaas';
COMMENT ON COLUMN public.gestao_splits_contratos.cobranca_erro_mensagem IS 'Mensagem de erro caso a integração com Asaas falhe';
COMMENT ON COLUMN public.gestao_splits_contratos.contrato_status IS 'Status da integração com ZapSign: pendente, enviando, sucesso, erro, reprocessar';
COMMENT ON COLUMN public.gestao_splits_contratos.contrato_id_externo IS 'ID do documento retornado pela API do ZapSign';
COMMENT ON COLUMN public.gestao_splits_contratos.contrato_erro_mensagem IS 'Mensagem de erro caso a integração com ZapSign falhe';
