

## Plano: Trigger genérico para logar TODAS as alterações

### Problema atual
O trigger `log_titulo_alteracao()` monitora apenas 11 campos manualmente listados. Campos como `negativado`, `inserido_cedrus`, `etapa`, `valor_pago`, `data_pagamento`, `saldo_parcela`, `processado_internamente`, `status_boleto`, `data_baixa`, entre outros, não são rastreados.

### Solução
Substituir o trigger manual por um trigger **dinâmico** que usa a extensão `hstore` do PostgreSQL para comparar automaticamente TODOS os campos da linha antiga vs nova, sem precisar listar cada campo individualmente. Qualquer campo adicionado à tabela no futuro também será automaticamente monitorado.

### Migration SQL

1. **Habilitar extensão `hstore`** (se não existir)
2. **Recriar a função `log_titulo_alteracao()`** com lógica genérica:
   - Converte `OLD` e `NEW` para `hstore`
   - Calcula o diff (`NEW - OLD`)
   - Para cada campo alterado, insere um registro no log
   - Ignora campos irrelevantes como `selection` e `updated_at` para evitar ruído
3. **Recriar o trigger** na tabela `base_tudobelo_intermediaria`

```sql
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE OR REPLACE FUNCTION log_titulo_alteracao()
RETURNS TRIGGER AS $$
DECLARE
  old_row hstore;
  new_row hstore;
  diff hstore;
  key text;
  ignored_cols text[] := ARRAY['selection', 'updated_at'];
BEGIN
  old_row := hstore(OLD);
  new_row := hstore(NEW);
  diff := new_row - old_row;

  FOREACH key IN ARRAY akeys(diff) LOOP
    IF NOT (key = ANY(ignored_cols)) THEN
      INSERT INTO base_tudobelo_log_alteracoes
        (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
      VALUES
        (NEW.id::text, key, old_row -> key, new_row -> key,
         'api', 'Alteração detectada automaticamente');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Campos que passam a ser monitorados (além dos 11 atuais)
`negativado`, `inserido_cedrus`, `etapa`, `valor_pago`, `data_pagamento`, `saldo_parcela`, `data_documento`, `forma_pagamento`, `processado_internamente`, `status_boleto`, `data_baixa`, `credor_cedrus`, `id_titulo_cedrus`, `documento`, `tipo_documento`, `serie_documento`, `codigo_parceiro`, `nome_parceiro`, `numero_parcela`, `dias_atraso`, e qualquer campo adicionado no futuro.

### Arquivo
- Criar `migration-trigger-log-alteracoes-v2.sql` com a migration completa

### Filtro na interface
- Adicionar filtro por `campo_alterado` no `LogAlteracoesTab.tsx` para facilitar busca por tipo de alteração (ex: filtrar por "negativado", "etapa", etc.)

