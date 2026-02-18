# 🚀 GUIA DE MIGRAÇÃO - SUPABASE AUTH + RLS MULTI-TENANT

## 📋 VISÃO GERAL

Este guia irá te ajudar a migrar do sistema de autenticação legado (localStorage) para o Supabase Auth com Row Level Security (RLS) completo e sistema multi-tenant de 4 camadas.

## ⚡ PASSO A PASSO

### **PASSO 1: Executar Migração SQL**

1. Acesse o **SQL Editor** do seu projeto Supabase
2. Copie todo o conteúdo do arquivo `migration-rls-setup.sql`
3. Cole no SQL Editor e execute
4. Confirme que todas as tabelas foram criadas:
   - ✅ profiles
   - ✅ user_roles
   - ✅ systems
   - ✅ screens
   - ✅ system_permissions
   - ✅ screen_permissions
   - ✅ client_permissions

### **PASSO 2: Verificar Edge Function**

A Edge Function `migrate-users` já foi criada no projeto. Ela:
- Busca usuários da tabela `usuarios_sistemas_internos`
- Cria usuários no Supabase Auth
- Atribui roles apropriadas
- Migra permissões de sistemas e clientes

### **PASSO 3: Executar Migração de Usuários**

Abra o console do navegador e execute:

```javascript
const { data, error } = await supabase.functions.invoke('migrate-users');
console.log('Resultado:', data);
```

**IMPORTANTE:** Anote as senhas temporárias geradas. Os usuários precisarão delas para fazer o primeiro login.

### **PASSO 4: Criar Primeiro Usuário Admin Manualmente (Opcional)**

Se preferir, crie o primeiro admin manualmente:

```sql
-- 1. Criar usuário no Supabase Auth (via Dashboard ou SQL)
-- 2. Atribuir role admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('UUID_DO_USUARIO', 'admin');
```

---

## 🔄 MUDANÇAS NA ESTRUTURA DA TABELA clientes_superavit

### Campos Renomeados:
- `"CREDOR CEDRUS"` → `credor_cedrus`
- `nome` → `nome_credor`
- `"Faz Split"` → `faz_split`
- `WalletID` → `"walletId"` (mantido com aspas, camelCase)

### Campos Adicionados:
- `pct_comissao_*` (várias colunas de comissão)
- `forma_notificacao_baixas`
- `qualificacao_credor`
- `chave_pix`
- `apikey`
- `status`
- E outros...

### Impacto no Código:
- ✅ `useClientesSuperavit.ts` - Interface atualizada para refletir nova estrutura
- ✅ `useSplits.ts` - Corrigido mapeamento de `walletId` e acesso a `nome_credor`
- ✅ `Extrato.tsx` - Protegido com RLS usando `ProtectedScreen` e `ClientDataFilter`
- ✅ Políticas RLS adicionadas para `clientes_superavit` e `valores_totais_recebidos_asaas`

### Políticas RLS Implementadas:

**clientes_superavit:**
- SELECT: Admin vê tudo / Usuário sem permissões vê tudo / Usuário com permissões vê apenas clientes permitidos
- UPDATE: Admin ou usuário com `can_transact`
- INSERT/DELETE: Apenas admin

**valores_totais_recebidos_asaas:**
- SELECT: Mesma lógica de `clientes_superavit`
- INSERT/UPDATE/DELETE: Apenas admin

---

### **PASSO 5: Testar Login**

1. Faça logout do sistema legado
2. Acesse a tela de login
3. Entre com email e senha do Supabase Auth
4. Confirme que:
   - Login funciona corretamente
   - Sessão persiste após reload
   - Logout funciona

### **PASSO 6: Configurar Permissões (Se Necessário)**

Por padrão, o sistema é **permissivo**:
- Se não há permissões configuradas para um usuário, ele tem acesso a tudo
- Apenas admins podem criar/editar/deletar

Para restringir acessos específicos, insira registros em:
- `system_permissions` - Restringir sistemas
- `screen_permissions` - Restringir telas
- `client_permissions` - Restringir clientes

Exemplo:
```sql
-- Restringir usuário a ver apenas cliente específico
INSERT INTO public.client_permissions (user_id, credor_cedrus, can_view, can_transact)
VALUES ('UUID_DO_USUARIO', 'NOME_DO_CLIENTE', true, false);
```

### **PASSO 7: Remover Sistema Legado (Após Testes)**

⚠️ **APENAS APÓS CONFIRMAR QUE TUDO FUNCIONA:**

```sql
DROP TABLE IF EXISTS public.usuarios_sistemas_internos;
```

## 🔐 ESTRUTURA DE PERMISSÕES

### 4 Camadas de Controle:

1. **Roles** - Define tipo de usuário (admin, editor, viewer, colaborador, cliente, parceiro)
2. **System Permissions** - Controla acesso a sistemas inteiros
3. **Screen Permissions** - Controla acesso granular a telas (view, create, update, delete)
4. **Client Permissions** - Controla acesso a dados específicos de clientes

### Comportamento Padrão (Permissivo):

- **Admins:** Acesso total a tudo
- **Outros usuários SEM permissões configuradas:**
  - ✅ Acesso a todos os sistemas
  - ✅ View em todas as telas (mas não CRUD)
  - ✅ Acesso a todos os clientes
- **Usuários COM permissões específicas:**
  - ⚠️ Apenas o que foi explicitamente permitido

## 🛠️ ARQUIVOS CRIADOS

### Hooks:
- `src/hooks/useAuth.ts` - Autenticação Supabase
- `src/hooks/useUserRoles.ts` - Verificar roles do usuário
- `src/hooks/useSystemPermissions.ts` - Verificar permissões de sistema
- `src/hooks/useScreenPermissions.ts` - Verificar permissões de tela
- `src/hooks/useClientPermissions.ts` - Verificar permissões de cliente

### Componentes de Proteção:
- `src/components/Auth/ProtectedRoute.tsx` - Protege rotas (requer autenticação)
- `src/components/Auth/ProtectedScreen.tsx` - Protege telas (verifica permissões)
- `src/components/Auth/ClientDataFilter.tsx` - Filtra dados por cliente

### Edge Function:
- `supabase/functions/migrate-users/index.ts` - Migração de usuários legados

### Migração SQL:
- `migration-rls-setup.sql` - Script SQL completo

## 🔍 COMO USAR OS COMPONENTES

### Proteger uma Rota:
```tsx
<Route path="/configuracoes" element={
  <ProtectedRoute>
    <Configuracoes />
  </ProtectedRoute>
} />
```

### Proteger uma Tela:
```tsx
<ProtectedScreen screenSlug="gestao-usuarios" requiredPermission="view">
  {/* Conteúdo da tela */}
</ProtectedScreen>
```

### Filtrar Dados por Cliente:
```tsx
<ClientDataFilter
  data={clientes}
  getCredorCedrus={(item) => item.credorCedrus}
>
  {(filteredData) => (
    <Table data={filteredData} />
  )}
</ClientDataFilter>
```

### Verificar Role:
```tsx
const { user } = useAuth();
const { isAdmin } = useIsAdmin(user?.id);

if (isAdmin) {
  // Mostrar botão de administração
}
```

## ⚠️ PONTOS DE ATENÇÃO

1. **Senhas Temporárias:** Usuários migrados recebem senhas temporárias. Envie email de reset.
2. **Backup:** Faça backup da tabela `usuarios_sistemas_internos` antes de deletar.
3. **Testes:** Teste TODOS os cenários antes de ir para produção.
4. **Email Configuration:** Configure SMTP no Supabase para email de recuperação funcionar.

## 📚 QUERIES ÚTEIS

### Ver usuários e suas roles:
```sql
SELECT 
  u.email,
  array_agg(ur.role) as roles
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email;
```

### Ver permissões de um usuário:
```sql
-- Permissões de sistema
SELECT s.nome, sp.can_access
FROM public.system_permissions sp
JOIN public.systems s ON sp.system_id = s.id
WHERE sp.user_id = 'USER_ID_AQUI';

-- Permissões de telas
SELECT sc.nome, sp.can_view, sp.can_create, sp.can_update, sp.can_delete
FROM public.screen_permissions sp
JOIN public.screens sc ON sp.screen_id = sc.id
WHERE sp.user_id = 'USER_ID_AQUI';

-- Permissões de clientes
SELECT credor_cedrus, can_view, can_transact
FROM public.client_permissions
WHERE user_id = 'USER_ID_AQUI';
```

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Migração SQL executada sem erros
- [ ] Tabelas criadas corretamente
- [ ] Edge Function migrate-users executada com sucesso
- [ ] Login funciona com credenciais do Supabase
- [ ] Sessão persiste após reload
- [ ] Logout remove sessão
- [ ] Admin tem acesso total
- [ ] Usuários com permissões específicas têm acesso restrito
- [ ] Filtro de clientes funciona corretamente
- [ ] Todos os usuários migraram com sucesso
- [ ] Sistema legado removido após confirmação

## 🆘 TROUBLESHOOTING

### Erro: "Invalid login credentials"
- Verifique se o usuário foi criado no Supabase Auth
- Confirme que a senha está correta

### Erro: "You don't have permission to access this functionality"
- Verifique se o usuário tem a role apropriada
- Confirme que as permissões de tela foram configuradas

### Dados não aparecem após login:
- Verifique as políticas RLS
- Confirme que `client_permissions` está configurada corretamente

### Erro ao executar migrate-users:
- Verifique se a tabela `usuarios_sistemas_internos` existe
- Confirme que a Edge Function foi deployada corretamente

## 📞 SUPORTE

Para problemas durante a migração, consulte:
- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentação Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Migração implementada com sucesso! Sistema agora usa Supabase Auth com RLS multi-tenant de 4 camadas.** 🎉
