

# Criar/Deletar/Alterar Senha de Usuarios via GoTrue Admin API

## Problema

As URLs dos webhooks n8n estao com valores placeholder (`SUBSTITUIR_CRIAR_USUARIO`, etc.), impedindo criar, deletar e alterar senha de usuarios. A funcao `handle_new_user` existe para `public.profiles`, mas o sistema usa `gestao_splits_profiles`.

## Solucao

Chamar a GoTrue Admin API diretamente do frontend usando a Service Role Key. Isso funciona bem para ambientes self-hosted com acesso restrito.

**Aviso de seguranca**: A Service Role Key ficara exposta no frontend. Isso e aceitavel apenas porque o sistema e interno e o acesso ao app ja e restrito.

## Alteracoes

### 1. Atualizar `src/lib/supabase.ts`

Adicionar uma constante com a Service Role Key e criar um segundo cliente Supabase admin:

```text
const supabaseServiceRoleKey = 'SUA_SERVICE_ROLE_KEY_AQUI'
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
```

Voce precisara fornecer a Service Role Key do seu Supabase self-hosted.

### 2. Atualizar `src/hooks/useGestaoSplitsUserManagement.ts`

Substituir as 3 operacoes de webhook por chamadas diretas:

**Criar usuario:**
- Usar `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome } })`
- Inserir perfil em `gestao_splits_profiles` via `supabaseAdmin`
- Inserir roles, permissoes de telas e clientes

**Deletar usuario:**
- Usar `supabaseAdmin.auth.admin.deleteUser(userId)`
- Dados relacionados serao removidos automaticamente via CASCADE

**Alterar senha:**
- Usar `supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })`

### 3. Criar trigger para `gestao_splits_profiles` (SQL no seu servidor)

Voce precisara executar no banco de dados um trigger similar ao `handle_new_user` mas para `gestao_splits_profiles`, para que usuarios criados por outros sistemas tambem tenham perfil nesta tabela:

```text
CREATE OR REPLACE FUNCTION public.handle_new_gestao_splits_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.gestao_splits_profiles (id, nome, created_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_gestao_splits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_gestao_splits_user();
```

Isso garante que novos usuarios criados por qualquer sistema tenham automaticamente um perfil em `gestao_splits_profiles`.

## Resumo das mudancas

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/supabase.ts` | Adicionar `supabaseAdmin` com Service Role Key |
| `src/hooks/useGestaoSplitsUserManagement.ts` | Substituir fetch webhooks por chamadas admin diretas |
| SQL no servidor | Criar trigger para `gestao_splits_profiles` |

## Proximo passo necessario

Voce precisa me informar a **Service Role Key** do seu Supabase self-hosted para que eu possa configurar o cliente admin.

