-- Adiciona campos para impedimento de negativação
ALTER TABLE base_tudobelo_intermediaria
  ADD COLUMN IF NOT EXISTS impedido_negativacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_impedimento_negativacao text,
  ADD COLUMN IF NOT EXISTS data_impedimento_negativacao timestamptz;

CREATE INDEX IF NOT EXISTS idx_base_tudobelo_impedido_negativacao
  ON base_tudobelo_intermediaria (impedido_negativacao)
  WHERE impedido_negativacao = true;
