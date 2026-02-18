-- =====================================================
-- MIGRAÇÃO: Sistema de Projetos e Cobranças
-- Prefixo: gestao_splits_
-- =====================================================

-- 1. Tabela de Projetos
CREATE TABLE IF NOT EXISTS gestao_splits_projetos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    credor_cedrus TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Tabela de Splits por Projeto (múltiplos splits por projeto)
CREATE TABLE IF NOT EXISTS gestao_splits_projeto_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID NOT NULL REFERENCES gestao_splits_projetos(id) ON DELETE CASCADE,
    wallet_id TEXT NOT NULL,
    tipo_valor TEXT NOT NULL CHECK (tipo_valor IN ('fixedValue', 'percentualValue')),
    valor NUMERIC(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Modelos de Contrato
CREATE TABLE IF NOT EXISTS gestao_splits_modelos_contrato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    google_docs_id TEXT NOT NULL,
    credor_cedrus TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Adicionar coluna can_create_charges na tabela de permissões de cliente
ALTER TABLE gestao_splits_client_permissions 
ADD COLUMN IF NOT EXISTS can_create_charges BOOLEAN DEFAULT false;

-- 5. Tabela de Cobranças Geradas (registro do payload gerado)
CREATE TABLE IF NOT EXISTS gestao_splits_cobrancas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID REFERENCES gestao_splits_projetos(id),
    
    -- Dados do contratante
    nome_contratante TEXT NOT NULL,
    cpf_contratante TEXT NOT NULL,
    telefone_contratante TEXT,
    email_contratante TEXT,
    endereco TEXT,
    bairro TEXT,
    cidade TEXT,
    cep TEXT,
    estado TEXT,
    
    -- Múltiplos contratantes (JSON array)
    contratantes_adicionais JSONB,
    
    -- Dados da cobrança
    quantidade_boletos INTEGER NOT NULL,
    valor_sem_desconto NUMERIC(12, 2) NOT NULL,
    data_primeiro_boleto DATE NOT NULL,
    
    -- Desconto de pontualidade
    tipo_desconto TEXT CHECK (tipo_desconto IN ('fixo', 'percentual')),
    valor_desconto NUMERIC(12, 2),
    
    -- Descrição
    descricao_boleto TEXT,
    
    -- Contrato
    gerar_contrato BOOLEAN DEFAULT false,
    modelo_contrato_id UUID REFERENCES gestao_splits_modelos_contrato(id),
    
    -- Payload gerado (JSON completo para envio ao sistema externo)
    payload_gerado JSONB,
    
    -- Metadados
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'processado', 'erro')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION gestao_splits_projetos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gestao_splits_projetos_updated_at ON gestao_splits_projetos;
CREATE TRIGGER trigger_gestao_splits_projetos_updated_at
    BEFORE UPDATE ON gestao_splits_projetos
    FOR EACH ROW EXECUTE FUNCTION gestao_splits_projetos_updated_at();

DROP TRIGGER IF EXISTS trigger_gestao_splits_projeto_splits_updated_at ON gestao_splits_projeto_splits;
CREATE TRIGGER trigger_gestao_splits_projeto_splits_updated_at
    BEFORE UPDATE ON gestao_splits_projeto_splits
    FOR EACH ROW EXECUTE FUNCTION gestao_splits_projetos_updated_at();

DROP TRIGGER IF EXISTS trigger_gestao_splits_modelos_contrato_updated_at ON gestao_splits_modelos_contrato;
CREATE TRIGGER trigger_gestao_splits_modelos_contrato_updated_at
    BEFORE UPDATE ON gestao_splits_modelos_contrato
    FOR EACH ROW EXECUTE FUNCTION gestao_splits_projetos_updated_at();

DROP TRIGGER IF EXISTS trigger_gestao_splits_cobrancas_updated_at ON gestao_splits_cobrancas;
CREATE TRIGGER trigger_gestao_splits_cobrancas_updated_at
    BEFORE UPDATE ON gestao_splits_cobrancas
    FOR EACH ROW EXECUTE FUNCTION gestao_splits_projetos_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE gestao_splits_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_projeto_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_modelos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_splits_cobrancas ENABLE ROW LEVEL SECURITY;

-- Políticas para gestao_splits_projetos
CREATE POLICY "Admins podem ver todos os projetos"
ON gestao_splits_projetos FOR SELECT
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários podem ver projetos dos seus clientes"
ON gestao_splits_projetos FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM gestao_splits_client_permissions
        WHERE user_id = auth.uid()
        AND credor_cedrus = gestao_splits_projetos.credor_cedrus
        AND can_view = true
    )
);

CREATE POLICY "Admins podem criar projetos"
ON gestao_splits_projetos FOR INSERT
TO authenticated
WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar projetos"
ON gestao_splits_projetos FOR UPDATE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar projetos"
ON gestao_splits_projetos FOR DELETE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

-- Políticas para gestao_splits_projeto_splits
CREATE POLICY "Admins podem ver todos os splits de projeto"
ON gestao_splits_projeto_splits FOR SELECT
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários podem ver splits dos seus projetos"
ON gestao_splits_projeto_splits FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM gestao_splits_projetos p
        JOIN gestao_splits_client_permissions cp ON cp.credor_cedrus = p.credor_cedrus
        WHERE p.id = gestao_splits_projeto_splits.projeto_id
        AND cp.user_id = auth.uid()
        AND cp.can_view = true
    )
);

CREATE POLICY "Admins podem criar splits de projeto"
ON gestao_splits_projeto_splits FOR INSERT
TO authenticated
WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar splits de projeto"
ON gestao_splits_projeto_splits FOR UPDATE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar splits de projeto"
ON gestao_splits_projeto_splits FOR DELETE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

-- Políticas para gestao_splits_modelos_contrato
CREATE POLICY "Admins podem ver todos os modelos"
ON gestao_splits_modelos_contrato FOR SELECT
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários podem ver modelos dos seus clientes"
ON gestao_splits_modelos_contrato FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM gestao_splits_client_permissions
        WHERE user_id = auth.uid()
        AND credor_cedrus = gestao_splits_modelos_contrato.credor_cedrus
        AND can_view = true
    )
);

CREATE POLICY "Admins podem criar modelos"
ON gestao_splits_modelos_contrato FOR INSERT
TO authenticated
WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar modelos"
ON gestao_splits_modelos_contrato FOR UPDATE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar modelos"
ON gestao_splits_modelos_contrato FOR DELETE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

-- Políticas para gestao_splits_cobrancas
CREATE POLICY "Admins podem ver todas as cobranças"
ON gestao_splits_cobrancas FOR SELECT
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários podem ver cobranças dos seus projetos"
ON gestao_splits_cobrancas FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM gestao_splits_projetos p
        JOIN gestao_splits_client_permissions cp ON cp.credor_cedrus = p.credor_cedrus
        WHERE p.id = gestao_splits_cobrancas.projeto_id
        AND cp.user_id = auth.uid()
        AND cp.can_view = true
    )
);

CREATE POLICY "Admins podem criar cobranças"
ON gestao_splits_cobrancas FOR INSERT
TO authenticated
WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários com permissão podem criar cobranças"
ON gestao_splits_cobrancas FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM gestao_splits_projetos p
        JOIN gestao_splits_client_permissions cp ON cp.credor_cedrus = p.credor_cedrus
        WHERE p.id = gestao_splits_cobrancas.projeto_id
        AND cp.user_id = auth.uid()
        AND cp.can_create_charges = true
    )
);

CREATE POLICY "Admins podem atualizar cobranças"
ON gestao_splits_cobrancas FOR UPDATE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar cobranças"
ON gestao_splits_cobrancas FOR DELETE
TO authenticated
USING (gestao_splits_is_admin(auth.uid()));

-- =====================================================
-- ÍNDICES para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_gestao_splits_projetos_credor ON gestao_splits_projetos(credor_cedrus);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_projetos_ativo ON gestao_splits_projetos(ativo);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_projeto_splits_projeto ON gestao_splits_projeto_splits(projeto_id);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_modelos_credor ON gestao_splits_modelos_contrato(credor_cedrus);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_modelos_ativo ON gestao_splits_modelos_contrato(ativo);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_cobrancas_projeto ON gestao_splits_cobrancas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_gestao_splits_cobrancas_status ON gestao_splits_cobrancas(status);

-- =====================================================
-- Adicionar novas telas ao sistema
-- =====================================================

INSERT INTO gestao_splits_screens (slug, nome, descricao, ordem, ativo)
VALUES 
    ('criar-cobranca', 'Criar Cobrança', 'Formulário de criação de cobranças', 14, true),
    ('gestao-projetos', 'Gestão de Projetos', 'Gerenciamento de projetos e splits', 15, true),
    ('modelos-contrato', 'Modelos de Contrato', 'Gerenciamento de modelos de contrato', 16, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON gestao_splits_projetos TO authenticated;
GRANT ALL ON gestao_splits_projeto_splits TO authenticated;
GRANT ALL ON gestao_splits_modelos_contrato TO authenticated;
GRANT ALL ON gestao_splits_cobrancas TO authenticated;
