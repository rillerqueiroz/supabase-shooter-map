-- Tabela base_tudobelo_titulos_pagos
-- ID = Documento-Parcela (ex: 152896-3)

CREATE TABLE IF NOT EXISTS public.base_tudobelo_titulos_pagos (
  id text PRIMARY KEY,
  documento bigint,
  tipo_documento text,
  serie_documento text,
  codigo_parceiro text,
  nome_parceiro text,
  cnpj_cpf text,
  nome_fantasia_parceiro text,
  parcela integer,
  valor_original_parcela numeric(15,2),
  valor_pago numeric(15,2),
  data_pagamento date,
  data_vencimento date,
  forma_pagamento text,
  multa_percentual numeric(10,4),
  valor_multa numeric(15,2),
  juros_percentual numeric(10,4),
  valor_total_juros numeric(15,2),
  desconto_percentual numeric(10,4),
  valor_desconto numeric(15,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_btb_pagos_documento ON public.base_tudobelo_titulos_pagos(documento);
CREATE INDEX IF NOT EXISTS idx_btb_pagos_data_pagamento ON public.base_tudobelo_titulos_pagos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_btb_pagos_codigo_parceiro ON public.base_tudobelo_titulos_pagos(codigo_parceiro);

ALTER TABLE public.base_tudobelo_titulos_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read pagos" ON public.base_tudobelo_titulos_pagos;
CREATE POLICY "Authenticated read pagos"
  ON public.base_tudobelo_titulos_pagos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert pagos" ON public.base_tudobelo_titulos_pagos;
CREATE POLICY "Authenticated insert pagos"
  ON public.base_tudobelo_titulos_pagos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update pagos" ON public.base_tudobelo_titulos_pagos;
CREATE POLICY "Authenticated update pagos"
  ON public.base_tudobelo_titulos_pagos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated delete pagos" ON public.base_tudobelo_titulos_pagos;
CREATE POLICY "Authenticated delete pagos"
  ON public.base_tudobelo_titulos_pagos
  FOR DELETE
  TO authenticated
  USING (true);
