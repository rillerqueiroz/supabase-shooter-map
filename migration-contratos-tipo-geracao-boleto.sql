-- Migration: Adicionar campos de boleto e tipo de geração
-- Esta migration adiciona campos para controle de tipo de geração e dados de boleto

-- Novos campos para controle de tipo de geração e dados de boleto
ALTER TABLE public.gestao_splits_contratos
ADD COLUMN IF NOT EXISTS tipo_geracao TEXT DEFAULT 'contrato_boleto' 
  CHECK (tipo_geracao IN ('contrato', 'contrato_boleto', 'boleto')),
ADD COLUMN IF NOT EXISTS objeto_contrato TEXT,
ADD COLUMN IF NOT EXISTS valor_boleto DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS data_primeiro_boleto DATE,
ADD COLUMN IF NOT EXISTS numero_boletos INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS tem_desconto_pontualidade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_desconto TEXT CHECK (tipo_desconto IN ('fixo', 'percentual')),
ADD COLUMN IF NOT EXISTS valor_desconto DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS dias_antecedencia_desconto INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN public.gestao_splits_contratos.tipo_geracao IS 'Tipo de geração: contrato (apenas contrato), contrato_boleto (ambos), boleto (apenas boletos)';
COMMENT ON COLUMN public.gestao_splits_contratos.objeto_contrato IS 'Objeto do contrato - descrição do serviço/procedimento';
COMMENT ON COLUMN public.gestao_splits_contratos.valor_boleto IS 'Valor de cada boleto';
COMMENT ON COLUMN public.gestao_splits_contratos.data_primeiro_boleto IS 'Data de vencimento do primeiro boleto';
COMMENT ON COLUMN public.gestao_splits_contratos.numero_boletos IS 'Quantidade de boletos a serem gerados';
COMMENT ON COLUMN public.gestao_splits_contratos.tem_desconto_pontualidade IS 'Se terá desconto por pagamento pontual';
COMMENT ON COLUMN public.gestao_splits_contratos.tipo_desconto IS 'Tipo de desconto: fixo (valor em R$) ou percentual';
COMMENT ON COLUMN public.gestao_splits_contratos.valor_desconto IS 'Valor do desconto (em R$ ou %)';
COMMENT ON COLUMN public.gestao_splits_contratos.dias_antecedencia_desconto IS 'Dias de antecedência para aplicar o desconto';
