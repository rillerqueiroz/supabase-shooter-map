-- ============================================
-- MIGRAÇÃO: Tabela de Beneficiários de Splits
-- ============================================

-- Criar tabela de beneficiários de splits
CREATE TABLE IF NOT EXISTS gestao_splits_beneficiarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('pessoa_fisica', 'pessoa_juridica')),
    documento TEXT, -- CPF ou CNPJ
    wallet_id TEXT NOT NULL UNIQUE,
    email TEXT,
    telefone TEXT,
    banco TEXT,
    agencia TEXT,
    conta TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER gestao_splits_beneficiarios_updated_at
    BEFORE UPDATE ON gestao_splits_beneficiarios
    FOR EACH ROW
    EXECUTE FUNCTION gestao_splits_handle_updated_at();

-- Habilitar RLS
ALTER TABLE gestao_splits_beneficiarios ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para beneficiários
CREATE POLICY "Admins podem ver todos os beneficiários"
    ON gestao_splits_beneficiarios FOR SELECT
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários com permissão podem ver beneficiários"
    ON gestao_splits_beneficiarios FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gestao_splits_screen_permissions sp
            JOIN gestao_splits_screens s ON sp.screen_id = s.id
            WHERE sp.user_id = auth.uid()
            AND s.slug = 'beneficiarios-splits'
            AND sp.can_view = true
        )
    );

CREATE POLICY "Admins podem criar beneficiários"
    ON gestao_splits_beneficiarios FOR INSERT
    TO authenticated
    WITH CHECK (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários com permissão podem criar beneficiários"
    ON gestao_splits_beneficiarios FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM gestao_splits_screen_permissions sp
            JOIN gestao_splits_screens s ON sp.screen_id = s.id
            WHERE sp.user_id = auth.uid()
            AND s.slug = 'beneficiarios-splits'
            AND sp.can_create = true
        )
    );

CREATE POLICY "Admins podem atualizar beneficiários"
    ON gestao_splits_beneficiarios FOR UPDATE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários com permissão podem atualizar beneficiários"
    ON gestao_splits_beneficiarios FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gestao_splits_screen_permissions sp
            JOIN gestao_splits_screens s ON sp.screen_id = s.id
            WHERE sp.user_id = auth.uid()
            AND s.slug = 'beneficiarios-splits'
            AND sp.can_update = true
        )
    );

CREATE POLICY "Admins podem deletar beneficiários"
    ON gestao_splits_beneficiarios FOR DELETE
    TO authenticated
    USING (gestao_splits_is_admin(auth.uid()));

CREATE POLICY "Usuários com permissão podem deletar beneficiários"
    ON gestao_splits_beneficiarios FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gestao_splits_screen_permissions sp
            JOIN gestao_splits_screens s ON sp.screen_id = s.id
            WHERE sp.user_id = auth.uid()
            AND s.slug = 'beneficiarios-splits'
            AND sp.can_delete = true
        )
    );

-- Índices
CREATE INDEX idx_beneficiarios_wallet_id ON gestao_splits_beneficiarios(wallet_id);
CREATE INDEX idx_beneficiarios_nome ON gestao_splits_beneficiarios(nome);
CREATE INDEX idx_beneficiarios_ativo ON gestao_splits_beneficiarios(ativo);

-- Inserir nova tela no sistema de permissões
INSERT INTO gestao_splits_screens (slug, nome, descricao, ordem, ativo) 
VALUES ('beneficiarios-splits', 'Beneficiários de Splits', 'Cadastro de beneficiários de splits', 14, true)
ON CONFLICT (slug) DO NOTHING;

-- Grant para usuários autenticados
GRANT ALL ON gestao_splits_beneficiarios TO authenticated;

-- ============================================
-- POVOAMENTO INICIAL COM DADOS DE CLIENTES
-- ============================================

-- Inserir beneficiários a partir de clientes_superavit que têm walletId
INSERT INTO gestao_splits_beneficiarios (nome, tipo, wallet_id, ativo)
SELECT 
    COALESCE(nome_credor, credor_cedrus, 'Sem nome') as nome,
    'pessoa_juridica' as tipo,
    "walletId" as wallet_id,
    true as ativo
FROM clientes_superavit
WHERE "walletId" IS NOT NULL 
  AND "walletId" != ''
  AND "walletId" NOT IN (SELECT wallet_id FROM gestao_splits_beneficiarios)
ON CONFLICT (wallet_id) DO NOTHING;
