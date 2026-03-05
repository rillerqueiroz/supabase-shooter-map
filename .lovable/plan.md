

## Plano: Permitir que todos os usuários visualizem todos os títulos

### Problema

A tabela `base_tudobelo_intermediaria` possui uma política RLS que filtra os dados por `credor_cedrus` com base nas permissões de cliente (`sistema_tudobelo_client_permissions`). A usuária Thaynara não é admin e tem permissões restritas, por isso vê apenas 439 dos 3.632 títulos.

### Solução

Alterar a política RLS de SELECT da tabela `base_tudobelo_intermediaria` para permitir que qualquer usuário autenticado veja todos os registros. Não é necessário alterar código no frontend.

### SQL a executar no Supabase

```sql
-- 1. Remover a política de SELECT atual que filtra por credor
DROP POLICY IF EXISTS "Users can view allowed titulos" ON base_tudobelo_intermediaria;
DROP POLICY IF EXISTS "Authenticated users can view titulos" ON base_tudobelo_intermediaria;
-- (listar outros nomes possíveis da policy de SELECT)

-- 2. Criar política simples: autenticado = acesso total de leitura
CREATE POLICY "Authenticated users can view all titulos"
ON base_tudobelo_intermediaria
FOR SELECT
TO authenticated
USING (true);
```

**Nota:** Antes de executar, seria prudente verificar o nome exato da política atual. Você pode fazer isso no Supabase Dashboard em: Table Editor > `base_tudobelo_intermediaria` > Policies, ou executar:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'base_tudobelo_intermediaria';
```

Isso mostrará os nomes das policies e seus filtros. Substitua o `DROP POLICY` pelo nome correto.

### Impacto

- Nenhuma alteração de código no frontend
- Todos os usuários autenticados passarão a ver os 3.632 títulos
- As permissões de INSERT/UPDATE/DELETE permanecem inalteradas

