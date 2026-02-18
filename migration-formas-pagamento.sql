-- Migration: Criar tabela de formas de pagamento com vínculo a credor Cedrus
-- Data: 2026-01-11

-- Criar tabela
CREATE TABLE public.base_tudobelo_formas_pagamento (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  forma_pagamento TEXT NOT NULL UNIQUE,
  credor_cedrus TEXT
);

-- Inserir as formas de pagamento existentes
INSERT INTO public.base_tudobelo_formas_pagamento (forma_pagamento) VALUES
  ('Boleto Audax - Bradesco'),
  ('Boleto Banco Safra'),
  ('BOLETO CARTEIRA'),
  ('Boleto Cobrança Itau'),
  ('Boleto Multiplike - Itau'),
  ('BOLETO OMNI'),
  ('Boleto QI Sociedade - Bradesco'),
  ('CARTÃO DE CRÉDITO'),
  ('CARTÃO DE DÉBITO'),
  ('CHEQUE CARTEIRA'),
  ('CHEQUE TELECHEQUE'),
  ('CROMATIC BANK'),
  ('DINHEIRO'),
  ('FINANCEIRA - GLORIA'),
  ('FINANCIAMENTO HTM'),
  ('FUNCIONÁRIO'),
  ('INTEGRAÇÃO - SITE'),
  ('LINK - BEM FACIL'),
  ('LINK MERCADO PAGO'),
  ('LINK VINDI'),
  ('LOCACAO - MEDICAL SAN'),
  ('MEDICAL SAN'),
  ('MERCADO LIVRE'),
  ('OMNI'),
  ('Santander'),
  ('TRANSFERÊNCIA'),
  ('TRANSFERÊNCIA A RECEBER');

-- Habilitar RLS
ALTER TABLE public.base_tudobelo_formas_pagamento ENABLE ROW LEVEL SECURITY;

-- Política de leitura para usuários autenticados
CREATE POLICY "Permitir leitura autenticada" ON public.base_tudobelo_formas_pagamento
  FOR SELECT TO authenticated USING (true);

-- Política de escrita para usuários autenticados
CREATE POLICY "Permitir insert autenticado" ON public.base_tudobelo_formas_pagamento
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir update autenticado" ON public.base_tudobelo_formas_pagamento
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir delete autenticado" ON public.base_tudobelo_formas_pagamento
  FOR DELETE TO authenticated USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_formas_pagamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trigger_update_formas_pagamento_updated_at
  BEFORE UPDATE ON public.base_tudobelo_formas_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION update_formas_pagamento_updated_at();
