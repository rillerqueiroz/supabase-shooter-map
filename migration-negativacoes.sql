-- =============================================
-- Migration: Gestão de Negativações Tudo Belo
-- =============================================

-- Tabela principal de negativações
CREATE TABLE IF NOT EXISTS public.base_tudobelo_negativacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id text NOT NULL,
  data_negativacao timestamptz NOT NULL DEFAULT now(),
  motivo_negativacao text,
  data_remocao timestamptz,
  motivo_remocao text,
  usuario_id uuid REFERENCES auth.users(id),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Log de todas as alterações (incluindo de sistemas externos)
CREATE TABLE IF NOT EXISTS public.base_tudobelo_negativacoes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negativacao_id uuid REFERENCES public.base_tudobelo_negativacoes(id),
  titulo_id text,
  documento text,
  nome_parceiro text,
  acao text NOT NULL, -- 'negativacao', 'remocao', 'edicao'
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  origem text NOT NULL DEFAULT 'usuario', -- 'usuario', 'sistema', 'externo'
  descricao text,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.base_tudobelo_negativacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_tudobelo_negativacoes_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all for authenticated" ON public.base_tudobelo_negativacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.base_tudobelo_negativacoes_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_base_tudobelo_negativacoes_titulo_id ON public.base_tudobelo_negativacoes(titulo_id);
CREATE INDEX IF NOT EXISTS idx_base_tudobelo_negativacoes_log_titulo_id ON public.base_tudobelo_negativacoes_log(titulo_id);
CREATE INDEX IF NOT EXISTS idx_base_tudobelo_negativacoes_log_created_at ON public.base_tudobelo_negativacoes_log(created_at DESC);
