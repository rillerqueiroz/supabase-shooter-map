-- Migration: Adicionar campos prazo_recompra e insere_na_base à tabela base_tudobelo_formas_pagamento
-- Data: 2026-03-23

ALTER TABLE public.base_tudobelo_formas_pagamento
  ADD COLUMN IF NOT EXISTS prazo_recompra NUMERIC,
  ADD COLUMN IF NOT EXISTS insere_na_base BOOLEAN;
