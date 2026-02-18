-- Migration: Criar tabela gestao_splits_cobrancas_splits
-- Tabela normalizada para armazenar splits individuais por cobrança

CREATE TABLE IF NOT EXISTS gestao_splits_cobrancas_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  beneficiario_id UUID REFERENCES gestao_splits_beneficiarios(id) ON DELETE SET NULL,
  tipo_valor TEXT NOT NULL CHECK (tipo_valor IN ('fixedValue', 'percentualValue')),
  valor NUMERIC(12,2) NOT NULL,
  valor_calculado NUMERIC(12,2),
  description TEXT,
  origem TEXT DEFAULT 'projeto' CHECK (origem IN ('projeto', 'adicional', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_cobrancas_splits_identificador ON gestao_splits_cobrancas_splits(identificador);
CREATE INDEX idx_cobrancas_splits_wallet_id ON gestao_splits_cobrancas_splits(wallet_id);
CREATE INDEX idx_cobrancas_splits_beneficiario_id ON gestao_splits_cobrancas_splits(beneficiario_id);

-- RLS
ALTER TABLE gestao_splits_cobrancas_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler splits de cobranças"
  ON gestao_splits_cobrancas_splits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir splits de cobranças"
  ON gestao_splits_cobrancas_splits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar splits de cobranças"
  ON gestao_splits_cobrancas_splits FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar splits de cobranças"
  ON gestao_splits_cobrancas_splits FOR DELETE
  TO authenticated
  USING (true);
