-- Migration: Add tipo_cobranca column to gestao_splits_projeto_splits
-- This column differentiates splits for normal charges vs delinquency charges

-- Add tipo_cobranca column with default 'normal'
ALTER TABLE public.gestao_splits_projeto_splits 
ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'normal' CHECK (tipo_cobranca IN ('normal', 'inadimplencia'));

-- Update existing records to 'normal' (they were all normal charges before)
UPDATE public.gestao_splits_projeto_splits 
SET tipo_cobranca = 'normal' 
WHERE tipo_cobranca IS NULL;
