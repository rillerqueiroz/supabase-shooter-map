-- =====================================================
-- MIGRAÇÃO: Sistema de Gestão de Contratos
-- Prefixo: gestao_splits_
-- =====================================================

-- Tabela de etapas pré-definidas para contratos
CREATE TABLE IF NOT EXISTS public.gestao_splits_contratos_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    cor TEXT DEFAULT '#3b82f6',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela principal de contratos
CREATE TABLE IF NOT EXISTS public.gestao_splits_contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificador único para vinculação com valores_totais_recebidos_asaas
    identificador_externo TEXT UNIQUE NOT NULL,
    
    -- Dados do contrato
    nome TEXT NOT NULL,
    descricao TEXT,
    credor_cedrus TEXT NOT NULL,
    projeto_id UUID REFERENCES public.gestao_splits_projetos(id),
    modelo_contrato_id UUID REFERENCES public.gestao_splits_modelos_contrato(id),
    
    -- Dados do contratante
    contratante_nome TEXT NOT NULL,
    contratante_cpf_cnpj TEXT,
    contratante_email TEXT,
    contratante_telefone TEXT,
    
    -- Valores
    valor_total DECIMAL(15,2),
    quantidade_parcelas INTEGER DEFAULT 1,
    
    -- Etapa atual
    etapa_atual_id UUID REFERENCES public.gestao_splits_contratos_etapas(id),
    
    -- Status de geração de cobrança
    cobranca_gerada BOOLEAN DEFAULT false,
    cobranca_gerada_em TIMESTAMPTZ,
    cobranca_webhook_payload JSONB,
    cobranca_webhook_response JSONB,
    
    -- Status de geração de contrato
    contrato_gerado BOOLEAN DEFAULT false,
    contrato_gerado_em TIMESTAMPTZ,
    contrato_webhook_payload JSONB,
    contrato_webhook_response JSONB,
    contrato_url TEXT,
    contrato_assinado BOOLEAN DEFAULT false,
    contrato_assinado_em TIMESTAMPTZ,
    
    -- Metadados
    observacoes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de histórico de mudanças de etapa
CREATE TABLE IF NOT EXISTS public.gestao_splits_contratos_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID REFERENCES public.gestao_splits_contratos(id) ON DELETE CASCADE,
    etapa_anterior_id UUID REFERENCES public.gestao_splits_contratos_etapas(id),
    etapa_nova_id UUID REFERENCES public.gestao_splits_contratos_etapas(id),
    observacao TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gestao_splits_contratos_etapas_updated_at ON public.gestao_splits_contratos_etapas;
CREATE TRIGGER update_gestao_splits_contratos_etapas_updated_at
    BEFORE UPDATE ON public.gestao_splits_contratos_etapas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gestao_splits_contratos_updated_at ON public.gestao_splits_contratos;
CREATE TRIGGER update_gestao_splits_contratos_updated_at
    BEFORE UPDATE ON public.gestao_splits_contratos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.gestao_splits_contratos_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestao_splits_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestao_splits_contratos_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para gestao_splits_contratos_etapas
CREATE POLICY "Usuários autenticados podem ver etapas" ON public.gestao_splits_contratos_etapas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins podem inserir etapas" ON public.gestao_splits_contratos_etapas
    FOR INSERT TO authenticated
    WITH CHECK (public.gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar etapas" ON public.gestao_splits_contratos_etapas
    FOR UPDATE TO authenticated
    USING (public.gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar etapas" ON public.gestao_splits_contratos_etapas
    FOR DELETE TO authenticated
    USING (public.gestao_splits_is_admin(auth.uid()));

-- Políticas para gestao_splits_contratos (baseado em permissões de cliente)
CREATE POLICY "Usuários podem ver contratos de seus clientes" ON public.gestao_splits_contratos
    FOR SELECT TO authenticated
    USING (
        public.gestao_splits_is_admin(auth.uid())
        OR credor_cedrus IN (
            SELECT client_name FROM public.gestao_splits_user_client_permissions
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem inserir contratos de seus clientes" ON public.gestao_splits_contratos
    FOR INSERT TO authenticated
    WITH CHECK (
        public.gestao_splits_is_admin(auth.uid())
        OR credor_cedrus IN (
            SELECT client_name FROM public.gestao_splits_user_client_permissions
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem atualizar contratos de seus clientes" ON public.gestao_splits_contratos
    FOR UPDATE TO authenticated
    USING (
        public.gestao_splits_is_admin(auth.uid())
        OR credor_cedrus IN (
            SELECT client_name FROM public.gestao_splits_user_client_permissions
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins podem deletar contratos" ON public.gestao_splits_contratos
    FOR DELETE TO authenticated
    USING (public.gestao_splits_is_admin(auth.uid()));

-- Políticas para gestao_splits_contratos_historico
CREATE POLICY "Usuários podem ver histórico de seus contratos" ON public.gestao_splits_contratos_historico
    FOR SELECT TO authenticated
    USING (
        public.gestao_splits_is_admin(auth.uid())
        OR contrato_id IN (
            SELECT id FROM public.gestao_splits_contratos
            WHERE credor_cedrus IN (
                SELECT client_name FROM public.gestao_splits_user_client_permissions
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Usuários podem inserir histórico" ON public.gestao_splits_contratos_historico
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_identificador_externo 
    ON public.gestao_splits_contratos(identificador_externo);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_credor_cedrus 
    ON public.gestao_splits_contratos(credor_cedrus);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_etapa_atual 
    ON public.gestao_splits_contratos(etapa_atual_id);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_projeto 
    ON public.gestao_splits_contratos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_contratos_historico_contrato 
    ON public.gestao_splits_contratos_historico(contrato_id);

-- =====================================================
-- INSERIR TELA NO SISTEMA DE PERMISSÕES
-- =====================================================

INSERT INTO public.gestao_splits_screens (slug, nome, descricao)
VALUES 
    ('gestao-contratos', 'Gestão de Contratos', 'Gerenciamento de contratos e acompanhamento de etapas'),
    ('gestao-contratos-etapas', 'Gestão de Etapas de Contratos', 'Configuração de etapas para contratos')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ETAPAS PADRÃO
-- =====================================================

INSERT INTO public.gestao_splits_contratos_etapas (nome, descricao, ordem, cor)
VALUES 
    ('Aguardando Geração', 'Contrato criado, aguardando geração de cobrança e documento', 1, '#94a3b8'),
    ('Cobrança Gerada', 'Cobrança foi gerada com sucesso', 2, '#3b82f6'),
    ('Contrato Gerado', 'Documento de contrato foi gerado', 3, '#8b5cf6'),
    ('Aguardando Assinatura', 'Contrato enviado, aguardando assinatura do cliente', 4, '#f59e0b'),
    ('Contrato Assinado', 'Contrato assinado pelo cliente', 5, '#22c55e'),
    ('Pagamento Confirmado', 'Pagamento da cobrança confirmado', 6, '#10b981'),
    ('Concluído', 'Processo finalizado com sucesso', 7, '#059669'),
    ('Cancelado', 'Contrato cancelado', 8, '#ef4444')
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON public.gestao_splits_contratos_etapas TO authenticated;
GRANT ALL ON public.gestao_splits_contratos TO authenticated;
GRANT ALL ON public.gestao_splits_contratos_historico TO authenticated;
