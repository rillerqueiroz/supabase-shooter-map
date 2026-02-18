-- Migration: Create gestao_splits_contrato_splits table
-- Stores additional splits (vendedores, supervisores, etc.) linked to individual contracts

CREATE TABLE IF NOT EXISTS gestao_splits_contrato_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES gestao_splits_contratos(id) ON DELETE CASCADE,
    beneficiario_id UUID REFERENCES gestao_splits_beneficiarios(id),
    wallet_id TEXT NOT NULL,
    tipo_valor TEXT NOT NULL CHECK (tipo_valor IN ('fixedValue', 'percentualValue')),
    valor NUMERIC(12, 2) NOT NULL,
    description TEXT,
    tipo_cobranca TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contrato_splits_contrato_id ON gestao_splits_contrato_splits(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_splits_beneficiario_id ON gestao_splits_contrato_splits(beneficiario_id);

-- Enable RLS
ALTER TABLE gestao_splits_contrato_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read contrato splits"
ON gestao_splits_contrato_splits
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert contrato splits"
ON gestao_splits_contrato_splits
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contrato splits"
ON gestao_splits_contrato_splits
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contrato splits"
ON gestao_splits_contrato_splits
FOR DELETE
TO authenticated
USING (true);
