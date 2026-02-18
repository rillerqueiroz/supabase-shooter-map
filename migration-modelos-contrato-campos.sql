-- Tabela para armazenar os campos personalizados de cada modelo de contrato
CREATE TABLE IF NOT EXISTS public.gestao_splits_modelos_contrato_campos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo_id uuid NOT NULL REFERENCES public.gestao_splits_modelos_contrato(id) ON DELETE CASCADE,
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('texto', 'numero', 'data', 'email', 'telefone', 'cpf_cnpj', 'moeda', 'textarea')),
    obrigatorio boolean NOT NULL DEFAULT false,
    ordem integer NOT NULL DEFAULT 0,
    placeholder text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.gestao_splits_modelos_contrato_campos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar campos" ON public.gestao_splits_modelos_contrato_campos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins podem inserir campos" ON public.gestao_splits_modelos_contrato_campos
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gestao_splits_user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins podem atualizar campos" ON public.gestao_splits_modelos_contrato_campos
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.gestao_splits_user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins podem deletar campos" ON public.gestao_splits_modelos_contrato_campos
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.gestao_splits_user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Índices
CREATE INDEX IF NOT EXISTS idx_modelos_contrato_campos_modelo ON public.gestao_splits_modelos_contrato_campos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_modelos_contrato_campos_ordem ON public.gestao_splits_modelos_contrato_campos(modelo_id, ordem);

-- Grant
GRANT ALL ON public.gestao_splits_modelos_contrato_campos TO authenticated;
