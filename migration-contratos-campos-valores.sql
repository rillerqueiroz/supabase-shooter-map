-- Tabela para armazenar os valores dos campos personalizados de cada contrato
CREATE TABLE IF NOT EXISTS public.gestao_splits_contratos_campos_valores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id uuid NOT NULL REFERENCES public.gestao_splits_contratos(id) ON DELETE CASCADE,
    campo_id uuid NOT NULL REFERENCES public.gestao_splits_modelos_contrato_campos(id) ON DELETE CASCADE,
    campo_nome text NOT NULL,
    campo_tipo text NOT NULL,
    valor text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contratos_campos_valores_contrato ON public.gestao_splits_contratos_campos_valores(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_campos_valores_campo ON public.gestao_splits_contratos_campos_valores(campo_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contratos_campos_valores_unique ON public.gestao_splits_contratos_campos_valores(contrato_id, campo_id);

-- Habilitar RLS
ALTER TABLE public.gestao_splits_contratos_campos_valores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar valores" ON public.gestao_splits_contratos_campos_valores
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir valores" ON public.gestao_splits_contratos_campos_valores
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar valores" ON public.gestao_splits_contratos_campos_valores
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins podem deletar valores" ON public.gestao_splits_contratos_campos_valores
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.gestao_splits_user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Grant
GRANT ALL ON public.gestao_splits_contratos_campos_valores TO authenticated;
