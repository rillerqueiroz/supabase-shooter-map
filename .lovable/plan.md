

## Plano: Criar tabelas `sistema_tudobelo_*` e remover dependencia de `gestao_splits_*`

### Contexto

Atualmente o sistema Tudo Belo usa as tabelas `gestao_splits_screens`, `gestao_splits_screen_permissions`, `gestao_splits_user_roles`, `gestao_splits_client_permissions` e funções como `gestao_splits_get_user_email`, `gestao_splits_is_admin`, `gestao_splits_has_role`. Tudo precisa ser migrado para tabelas e funções com prefixo `sistema_tudobelo_`.

### 1. Migration SQL -- Novas tabelas e funções

Criar via migration tool:

```sql
-- Enum
CREATE TYPE sistema_tudobelo_role AS ENUM ('admin', 'editor', 'viewer', 'colaborador', 'cliente', 'parceiro');

-- Tabela de roles
CREATE TABLE sistema_tudobelo_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role sistema_tudobelo_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Tabela de telas
CREATE TABLE sistema_tudobelo_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões de tela
CREATE TABLE sistema_tudobelo_screen_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES sistema_tudobelo_screens(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, screen_id)
);

-- Permissões de cliente
CREATE TABLE sistema_tudobelo_client_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id INTEGER,
    credor_cedrus TEXT NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_transact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, credor_cedrus)
);

-- RLS
ALTER TABLE sistema_tudobelo_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sistema_tudobelo_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sistema_tudobelo_screen_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sistema_tudobelo_client_permissions ENABLE ROW LEVEL SECURITY;

-- Funções security definer
CREATE OR REPLACE FUNCTION sistema_tudobelo_has_role(_user_id UUID, _role sistema_tudobelo_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM sistema_tudobelo_user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION sistema_tudobelo_is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT sistema_tudobelo_has_role(_user_id, 'admin') $$;

CREATE OR REPLACE FUNCTION sistema_tudobelo_get_user_email(_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT email FROM auth.users WHERE id = _user_id $$;

-- Policies (mesmo padrão do gestao_splits)
-- USER_ROLES
CREATE POLICY "tudobelo_user_roles_select" ON sistema_tudobelo_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_user_roles_insert" ON sistema_tudobelo_user_roles FOR INSERT TO authenticated
  WITH CHECK (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_user_roles_update" ON sistema_tudobelo_user_roles FOR UPDATE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_user_roles_delete" ON sistema_tudobelo_user_roles FOR DELETE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));

-- SCREENS
CREATE POLICY "tudobelo_screens_select" ON sistema_tudobelo_screens FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "tudobelo_screens_insert" ON sistema_tudobelo_screens FOR INSERT TO authenticated
  WITH CHECK (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_screens_update" ON sistema_tudobelo_screens FOR UPDATE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_screens_delete" ON sistema_tudobelo_screens FOR DELETE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));

-- SCREEN_PERMISSIONS
CREATE POLICY "tudobelo_screen_perms_select" ON sistema_tudobelo_screen_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_screen_perms_insert" ON sistema_tudobelo_screen_permissions FOR INSERT TO authenticated
  WITH CHECK (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_screen_perms_update" ON sistema_tudobelo_screen_permissions FOR UPDATE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_screen_perms_delete" ON sistema_tudobelo_screen_permissions FOR DELETE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));

-- CLIENT_PERMISSIONS
CREATE POLICY "tudobelo_client_perms_select" ON sistema_tudobelo_client_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_client_perms_insert" ON sistema_tudobelo_client_permissions FOR INSERT TO authenticated
  WITH CHECK (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_client_perms_update" ON sistema_tudobelo_client_permissions FOR UPDATE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));
CREATE POLICY "tudobelo_client_perms_delete" ON sistema_tudobelo_client_permissions FOR DELETE TO authenticated
  USING (sistema_tudobelo_is_admin(auth.uid()));

-- Triggers updated_at
CREATE OR REPLACE FUNCTION sistema_tudobelo_handle_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER sistema_tudobelo_screens_updated_at BEFORE UPDATE ON sistema_tudobelo_screens
  FOR EACH ROW EXECUTE FUNCTION sistema_tudobelo_handle_updated_at();
CREATE TRIGGER sistema_tudobelo_screen_permissions_updated_at BEFORE UPDATE ON sistema_tudobelo_screen_permissions
  FOR EACH ROW EXECUTE FUNCTION sistema_tudobelo_handle_updated_at();
CREATE TRIGGER sistema_tudobelo_client_permissions_updated_at BEFORE UPDATE ON sistema_tudobelo_client_permissions
  FOR EACH ROW EXECUTE FUNCTION sistema_tudobelo_handle_updated_at();

-- Indices
CREATE INDEX idx_tudobelo_user_roles_user ON sistema_tudobelo_user_roles(user_id);
CREATE INDEX idx_tudobelo_screen_perms_user ON sistema_tudobelo_screen_permissions(user_id);
CREATE INDEX idx_tudobelo_screen_perms_screen ON sistema_tudobelo_screen_permissions(screen_id);
CREATE INDEX idx_tudobelo_client_perms_user ON sistema_tudobelo_client_permissions(user_id);
CREATE INDEX idx_tudobelo_screens_slug ON sistema_tudobelo_screens(slug);

-- Grants
GRANT ALL ON sistema_tudobelo_user_roles TO authenticated;
GRANT ALL ON sistema_tudobelo_screens TO authenticated;
GRANT ALL ON sistema_tudobelo_screen_permissions TO authenticated;
GRANT ALL ON sistema_tudobelo_client_permissions TO authenticated;
```

### 2. Inserir dados iniciais de telas (via insert tool)

```sql
INSERT INTO sistema_tudobelo_screens (slug, nome, descricao, ordem, ativo) VALUES
  ('pagina-inicial', 'Página Inicial', 'Página inicial do sistema', 1, true),
  ('gestao-titulos-tudobelo', 'Gestão Títulos Tudo Belo', 'Gestão de títulos', 10, true),
  ('analytics-titulos-tudobelo', 'Analytics Títulos', 'Analytics de títulos', 11, true),
  ('gestao-negativados-tudobelo', 'Gestão Negativados Tudo Belo', 'Gestão de negativados', 20, true),
  ('gestao-acesso-sistemas', 'Gestão Acesso Sistemas', 'Gestão de acesso a sistemas', 80, true),
  ('configuracoes', 'Configurações', 'Configurações do sistema', 90, true),
  ('gestao-usuarios', 'Gestão de Usuários', 'Gestão de usuários', 91, true);
```

### 3. Atualizar codigo -- substituir todas as referencias

**7 arquivos a alterar** (trocar `gestao_splits_*` por `sistema_tudobelo_*`):

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useGestaoSplitsUserRoles.ts` | Tabela `sistema_tudobelo_user_roles`, renomear query keys |
| `src/hooks/useGestaoSplitsScreenPermissions.ts` | Tabelas `sistema_tudobelo_screens` e `sistema_tudobelo_screen_permissions` |
| `src/hooks/useGestaoSplitsClientPermissions.ts` | Tabela `sistema_tudobelo_client_permissions` |
| `src/hooks/useGestaoSplitsUserManagement.ts` | Todas as tabelas e RPC `sistema_tudobelo_get_user_email` |
| `src/hooks/useGestaoSplitsScreensList.ts` | Tabela `sistema_tudobelo_screens` |
| `src/hooks/useGestaoAcessoSistemas.ts` | RPC e tabela de roles |
| `src/pages/PaginaInicial.tsx` | Tabelas `sistema_tudobelo_screens` e `sistema_tudobelo_screen_permissions` |

Todas as referencias a `gestao_splits_get_user_email` viram `sistema_tudobelo_get_user_email`, `gestao_splits_user_roles` vira `sistema_tudobelo_user_roles`, etc.

Os tipos em `src/types/gestaoSplitsPermissions.ts` permanecem iguais (sao tipos TS, nao nomes de tabela).

