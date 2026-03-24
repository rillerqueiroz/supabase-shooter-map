-- Migration: Adicionar campo prazo_liquidacao à tabela base_tudobelo_formas_pagamento
-- Data: 2026-03-24

ALTER TABLE public.base_tudobelo_formas_pagamento
  ADD COLUMN IF NOT EXISTS prazo_liquidacao NUMERIC DEFAULT 0;
