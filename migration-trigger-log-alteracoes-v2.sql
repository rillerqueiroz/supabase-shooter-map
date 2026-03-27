-- Migration v2: Trigger genérico para logar TODAS as alterações
-- Substitui o trigger manual por um dinâmico usando hstore

-- 1. Habilitar extensão hstore
CREATE EXTENSION IF NOT EXISTS hstore;

-- 2. Recriar a função com lógica genérica
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

-- 3. Recriar o trigger
DROP TRIGGER IF EXISTS trigger_log_alteracoes_titulo ON base_tudobelo_intermediaria;

CREATE TRIGGER trigger_log_alteracoes_titulo
AFTER UPDATE ON base_tudobelo_intermediaria
FOR EACH ROW
EXECUTE FUNCTION log_titulo_alteracao();

-- Comentários
COMMENT ON FUNCTION log_titulo_alteracao() IS 'Função genérica que registra automaticamente TODAS as alterações na tabela de títulos Tudo Belo usando hstore diff';
COMMENT ON TRIGGER trigger_log_alteracoes_titulo ON base_tudobelo_intermediaria IS 'Trigger que aciona o log automático de todas as alterações';
