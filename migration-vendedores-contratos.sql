-- =====================================================
-- Tabela de Vendedores por Contrato
-- Armazena o vínculo entre contratos e vendedores (beneficiários)
-- com o percentual de comissão de cada um
-- =====================================================

CREATE TABLE IF NOT EXISTS gestao_splits_vendedores_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES gestao_splits_contratos(id) ON DELETE CASCADE,
  beneficiario_id uuid NOT NULL REFERENCES gestao_splits_beneficiarios(id) ON DELETE CASCADE,
  percentual numeric(5,2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE gestao_splits_vendedores_contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vendedores_contratos"
ON gestao_splits_vendedores_contratos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert vendedores_contratos"
ON gestao_splits_vendedores_contratos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update vendedores_contratos"
ON gestao_splits_vendedores_contratos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete vendedores_contratos"
ON gestao_splits_vendedores_contratos FOR DELETE
TO authenticated
USING (true);

-- Índices
CREATE INDEX idx_vendedores_contratos_contrato ON gestao_splits_vendedores_contratos(contrato_id);
CREATE INDEX idx_vendedores_contratos_beneficiario ON gestao_splits_vendedores_contratos(beneficiario_id);
