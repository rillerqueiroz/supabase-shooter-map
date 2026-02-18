# 🔍 Diagnóstico: Gabriel não vê dados em Valores Recebidos

## 📋 Passo 1: Executar Script de Correção

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `fix-valores-recebidos-only.sql`
4. Copie e cole **TODO O CONTEÚDO** no SQL Editor
5. Clique em **Run** (executar)
6. Aguarde a confirmação de sucesso

> ⚠️ **IMPORTANTE:** Execute o script completo de uma vez, não linha por linha.

---

## 📋 Passo 2: Verificar Permissões do Gabriel

No **SQL Editor do Supabase**, execute:

```sql
-- Substitua 'EMAIL_DO_GABRIEL' pelo email real
SELECT u.email, cp.credor_cedrus, cp.can_view, cp.can_transact
FROM auth.users u
LEFT JOIN public.client_permissions cp ON cp.user_id = u.id
WHERE u.email = 'EMAIL_DO_GABRIEL';
```

### Resultados Possíveis:

#### ✅ Cenário A: Gabriel tem permissões
```
email              | credor_cedrus | can_view | can_transact
gabriel@email.com  | EMPRESA X     | true     | false
```
✅ Tudo certo! Passe para o Passo 3.

#### ❌ Cenário B: Gabriel NÃO tem permissões (resultado vazio)
```
email              | credor_cedrus | can_view | can_transact
gabriel@email.com  | null          | null     | null
```

**SOLUÇÃO:** Adicionar permissão para Gabriel

```sql
-- Substitua os valores corretos
INSERT INTO public.client_permissions (user_id, credor_cedrus, can_view, can_transact)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'EMAIL_DO_GABRIEL'),
  'NOME_DA_EMPRESA',  -- Use o nome EXATO da empresa
  true,
  false
);
```

---

## 📋 Passo 3: Verificar Empresas Disponíveis

Execute no **SQL Editor**:

```sql
SELECT DISTINCT credor_cedrus, COUNT(*) as total_registros
FROM public.valores_totais_recebidos_asaas
GROUP BY credor_cedrus
ORDER BY credor_cedrus;
```

**Exemplo de resultado:**
```
credor_cedrus    | total_registros
EMPRESA A        | 150
EMPRESA B        | 89
EMPRESA X        | 342
```

> 📝 **ANOTE** o nome exato da empresa que Gabriel deve ver.

---

## 📋 Passo 4: Garantir Consistência dos Dados

Execute no **SQL Editor**:

```sql
-- Verificar se credor_cedrus do Gabriel corresponde exatamente ao da empresa
SELECT 
  cp.credor_cedrus as permissao,
  vr.credor_cedrus as dados,
  CASE 
    WHEN cp.credor_cedrus = vr.credor_cedrus THEN '✅ MATCH'
    ELSE '❌ NÃO MATCH'
  END as status,
  COUNT(*) as total
FROM public.client_permissions cp
LEFT JOIN public.valores_totais_recebidos_asaas vr 
  ON cp.credor_cedrus = vr.credor_cedrus
WHERE cp.user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL_DO_GABRIEL')
GROUP BY cp.credor_cedrus, vr.credor_cedrus;
```

### ✅ Se o resultado for "MATCH":
- Gabriel tem permissão E os dados existem
- Passe para o Passo 5

### ❌ Se o resultado for "NÃO MATCH" ou NULL:
- Há inconsistência nos valores de `credor_cedrus`
- Execute novamente a PARTE 3 do script SQL (normalização)

---

## 📋 Passo 5: Testar no Navegador

1. Gabriel deve fazer **logout** do sistema
2. Abrir **DevTools** (F12 ou Ctrl+Shift+I)
3. Ir na aba **Application** (Chrome) ou **Storage** (Firefox)
4. Expandir **Local Storage** e **Session Storage**
5. Deletar TODOS os dados
6. Fechar a aba
7. Abrir uma nova aba e fazer **login** novamente
8. Ir na aba **Console** do DevTools
9. Navegar para **"Valores Recebidos"**

### 🔍 Analisar Logs no Console

#### ✅ Logs Esperados (Sucesso):
```
🔍 DEBUG - Buscando permissões para userId: abc123...
🔍 DEBUG - Permissões encontradas: [{credor_cedrus: "EMPRESA X", can_view: true}]
🔍 DEBUG - Total de permissões: 1
🔐 Filtrando valores recebidos para usuário: abc123...
🔐 Permissões carregadas: [{credor_cedrus: "EMPRESA X", ...}]
🔐 Filtrando por credores permitidos: ["EMPRESA X"]
✅ Dados carregados: 342 registros
```
✅ **SUCESSO!** Os dados devem aparecer na tela.

#### ❌ Logs de Erro (Problema):

**Cenário 1: Nenhuma permissão encontrada**
```
⚠️ DEBUG - Nenhuma permissão encontrada para este usuário!
🔐 Aplicando filtro vazio (sem permissões)
✅ Dados carregados: 0 registros
```
**SOLUÇÃO:** Voltar ao Passo 2 e adicionar permissões.

**Cenário 2: Permissões existem mas nenhum dado**
```
🔐 Filtrando por credores permitidos: ["EMPRESA X"]
✅ Dados carregados: 0 registros
```
**SOLUÇÃO:** Voltar ao Passo 4 e verificar consistência.

---

## 📋 Passo 6: Verificação Final

Execute no **SQL Editor**:

```sql
-- Query completa de diagnóstico
WITH user_info AS (
  SELECT id, email FROM auth.users WHERE email = 'EMAIL_DO_GABRIEL'
),
user_permissions AS (
  SELECT credor_cedrus, can_view
  FROM public.client_permissions
  WHERE user_id = (SELECT id FROM user_info)
),
available_data AS (
  SELECT credor_cedrus, COUNT(*) as total
  FROM public.valores_totais_recebidos_asaas
  GROUP BY credor_cedrus
)
SELECT 
  ui.email,
  up.credor_cedrus as permissao,
  up.can_view,
  ad.credor_cedrus as dados_existentes,
  ad.total as qtd_registros,
  CASE 
    WHEN up.credor_cedrus IS NULL THEN '❌ SEM PERMISSÃO'
    WHEN ad.credor_cedrus IS NULL THEN '❌ SEM DADOS'
    WHEN up.credor_cedrus = ad.credor_cedrus THEN '✅ TUDO OK'
    ELSE '⚠️ INCONSISTENTE'
  END as status
FROM user_info ui
LEFT JOIN user_permissions up ON true
LEFT JOIN available_data ad ON up.credor_cedrus = ad.credor_cedrus;
```

### Interpretação dos Resultados:

| Status | Significado | Ação |
|--------|-------------|------|
| ✅ TUDO OK | Gabriel tem permissão e dados existem | Nenhuma - deve funcionar |
| ❌ SEM PERMISSÃO | Gabriel não tem registro em `client_permissions` | Executar INSERT do Passo 2 |
| ❌ SEM DADOS | Permissão existe mas não há dados na tabela | Verificar se empresa tem dados |
| ⚠️ INCONSISTENTE | Valores de `credor_cedrus` não correspondem | Re-executar normalização (Passo 1) |

---

## ✅ Checklist Final

- [ ] Script `fix-valores-recebidos-only.sql` executado com sucesso
- [ ] Gabriel tem registro em `client_permissions` com `can_view = true`
- [ ] `credor_cedrus` da permissão = `credor_cedrus` dos dados (MATCH exato)
- [ ] Política RLS verificada (`SELECT * FROM pg_policies WHERE tablename = 'valores_totais_recebidos_asaas'`)
- [ ] Cache do navegador limpo (Local Storage + Session Storage)
- [ ] Logout e login realizados
- [ ] Console mostra "Filtrando por credores permitidos: [...]"
- [ ] Dados aparecem na tela "Valores Recebidos"

---

## 🆘 Se Nada Funcionar

1. Verifique se Gabriel é **admin**:
```sql
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'EMAIL_DO_GABRIEL';
```

2. Se Gabriel é admin e ainda não vê dados, pode ser problema de RLS recursivo. Execute:
```sql
-- Verificar se função is_admin existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';
```

3. Se a função não existir, crie:
```sql
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;
```

---

## 📞 Informações para Suporte

Se precisar de ajuda, forneça:

1. **Resultado da query do Passo 6** (diagnóstico completo)
2. **Screenshot dos logs do console** (com as mensagens de 🔐 e ✅)
3. **Confirmação de que o script foi executado** (timestamp da execução)
4. **Email do usuário Gabriel** (para verificação no banco)
