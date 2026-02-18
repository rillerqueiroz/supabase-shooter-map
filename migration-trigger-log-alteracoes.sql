-- Trigger automático para registrar alterações na tabela base_tudobelo_intermediaria
-- Captura todas as alterações independente da origem (n8n, API, SQL direto, etc.)

-- 1. Criar função que registra as alterações
CREATE OR REPLACE FUNCTION log_titulo_alteracao()
RETURNS TRIGGER AS $$
BEGIN
  -- status_titulo
  IF OLD.status_titulo IS DISTINCT FROM NEW.status_titulo THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'status_titulo', OLD.status_titulo, NEW.status_titulo, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- status_cedrus
  IF OLD.status_cedrus IS DISTINCT FROM NEW.status_cedrus THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'status_cedrus', OLD.status_cedrus, NEW.status_cedrus, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- contrato
  IF OLD.contrato IS DISTINCT FROM NEW.contrato THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'contrato', OLD.contrato, NEW.contrato, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- valor_parcela
  IF OLD.valor_parcela IS DISTINCT FROM NEW.valor_parcela THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'valor_parcela', OLD.valor_parcela::text, NEW.valor_parcela::text, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- data_vencimento
  IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'data_vencimento', OLD.data_vencimento, NEW.data_vencimento, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- observacoes
  IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'observacoes', OLD.observacoes, NEW.observacoes, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- parceiro
  IF OLD.parceiro IS DISTINCT FROM NEW.parceiro THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'parceiro', OLD.parceiro, NEW.parceiro, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- devedor
  IF OLD.devedor IS DISTINCT FROM NEW.devedor THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'devedor', OLD.devedor, NEW.devedor, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- cpf_cnpj
  IF OLD.cpf_cnpj IS DISTINCT FROM NEW.cpf_cnpj THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'cpf_cnpj', OLD.cpf_cnpj, NEW.cpf_cnpj, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- valor_original
  IF OLD.valor_original IS DISTINCT FROM NEW.valor_original THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'valor_original', OLD.valor_original::text, NEW.valor_original::text, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  -- valor_atualizado
  IF OLD.valor_atualizado IS DISTINCT FROM NEW.valor_atualizado THEN
    INSERT INTO base_tudobelo_log_alteracoes 
      (titulo_id, campo_alterado, valor_anterior, valor_novo, origem, descricao)
    VALUES 
      (NEW.id::text, 'valor_atualizado', OLD.valor_atualizado::text, NEW.valor_atualizado::text, 
       'api', 'Alteração detectada automaticamente');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Remover trigger existente (se houver) para evitar duplicação
DROP TRIGGER IF EXISTS trigger_log_alteracoes_titulo ON base_tudobelo_intermediaria;

-- 3. Criar o trigger
CREATE TRIGGER trigger_log_alteracoes_titulo
AFTER UPDATE ON base_tudobelo_intermediaria
FOR EACH ROW
EXECUTE FUNCTION log_titulo_alteracao();

-- Comentários para documentação
COMMENT ON FUNCTION log_titulo_alteracao() IS 'Função que registra automaticamente alterações na tabela de títulos Tudo Belo';
COMMENT ON TRIGGER trigger_log_alteracoes_titulo ON base_tudobelo_intermediaria IS 'Trigger que aciona o log automático de alterações';
