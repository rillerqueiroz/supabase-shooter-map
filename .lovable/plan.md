

# Renomear tabela de perfis e adicionar colunas por sistema

## Objetivo
Renomear `gestao_splits_profiles` para `gestao_profiles_todos_sistemas` e adicionar colunas booleanas para cada sistema, permitindo filtrar quais usuarios pertencem a qual sistema.

## Etapas

### 1. Migration SQL
Renomear a tabela e adicionar as 5 colunas de sistema:

```sql
ALTER TABLE gestao_splits_profiles RENAME TO gestao_profiles_todos_sistemas;

ALTER TABLE gestao_profiles_todos_sistemas
  ADD COLUMN sistema_tudobelo BOOLEAN DEFAULT false,
  ADD COLUMN sistema_gestao_repasses BOOLEAN DEFAULT false,
  ADD COLUMN sistema_antecipacoes BOOLEAN DEFAULT false,
  ADD COLUMN sistema_semear BOOLEAN DEFAULT false,
  ADD COLUMN sistema_gestao_splits BOOLEAN DEFAULT false,
  ADD COLUMN sistema_testedisc BOOLEAN DEFAULT false;
```

### 2. Marcar usuarios existentes
Usuarios que ja possuem roles em `gestao_splits_user_roles` serao marcados como pertencentes ao sistema Tudo Belo (via insert tool, nao migration):

```sql
UPDATE gestao_profiles_todos_sistemas 
SET sistema_tudobelo = true 
WHERE id IN (SELECT DISTINCT user_id FROM gestao_splits_user_roles);
```

### 3. Atualizar trigger de criacao de usuario
Recriar o trigger `gestao_splits_handle_new_user` para inserir na nova tabela `gestao_profiles_todos_sistemas` em vez de `gestao_splits_profiles`.

### 4. Atualizar RLS policies
Recriar as policies (select, update, insert, delete) apontando para `gestao_profiles_todos_sistemas`. O RENAME pode manter as policies, mas precisaremos verificar.

### 5. Atualizar codigo fonte

Arquivos afetados:

- **`src/hooks/useGestaoSplitsUserManagement.ts`** (4 referencias):
  - Query de profiles: trocar tabela e adicionar `.eq('sistema_tudobelo', true)`
  - Upsert ao criar usuario: trocar tabela e incluir `sistema_tudobelo: true`
  - Update de nome: trocar tabela
  - Delete de profile: trocar tabela

- **`src/lib/supabase.ts`** (1 referencia):
  - Atualizar comentario/docstring da funcao deprecated

### 6. Grants
Atualizar o GRANT para a nova tabela:
```sql
GRANT ALL ON gestao_profiles_todos_sistemas TO authenticated;
```

## Resultado esperado
- Apenas usuarios com `sistema_tudobelo = true` aparecerao na gestao de usuarios deste sistema
- Novos usuarios criados pelo sistema serao automaticamente marcados
- Outros sistemas poderao usar suas respectivas colunas (`sistema_gestao_repasses`, etc.) para o mesmo fim
- Nenhum impacto no `auth.users` compartilhado

