import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ManualSection {
  title: string;
  subtitle: string;
  content: { heading: string; text: string }[];
  tables?: { name: string; columns: string[][] }[];
}

const secoesOperacional: ManualSection[] = [
  {
    title: "Visão Geral do Sistema",
    subtitle: "O que e o Superavit e como ele funciona",
    content: [
      { heading: "O que e este sistema?", text: "O Superavit e uma plataforma de gestao financeira que permite criar cobrancas (boletos), dividir valores automaticamente entre parceiros (splits), gerar contratos digitais e acompanhar todo o ciclo de pagamentos.\n\nEle se conecta com tres servicos externos:\n- Asaas: Gera os boletos e processa pagamentos. E o \"banco\" do sistema.\n- ZapSign: Cria contratos digitais e coleta assinaturas eletronicas.\n- Cedrus: Sistema de gestao de titulos e inadimplencia." },
      { heading: "Fluxo Geral de Trabalho", text: "1. Cadastrar Beneficiarios -- Registre quem vai receber parte dos valores (carteiras/wallets no Asaas).\n2. Criar um Projeto -- Configure como os valores serao divididos entre os beneficiarios.\n3. Criar o Contrato/Cobranca -- Preencha os dados do contratante, vincule ao projeto e gere os boletos.\n4. Acompanhar -- Monitore pagamentos pelo Extrato, Valores Recebidos e Todas as Cobrancas." },
      { heading: "[!] Ordem obrigatoria", text: "Voce precisa ter ao menos 1 beneficiario e 1 projeto configurado antes de criar qualquer cobranca com splits." },
    ],
  },
  {
    title: "Cadastros Necessarios (Pre-requisitos)",
    subtitle: "O que precisa estar pronto antes de gerar cobrancas",
    content: [
      { heading: "1. Beneficiarios (Tela: Beneficiarios de Splits)", text: "Beneficiarios sao as pessoas ou empresas que recebem parte do valor de cada cobranca. Cada um possui uma \"carteira\" (wallet) no Asaas.\n\nO que cadastrar: Nome, Wallet ID (fornecido pelo Asaas) e descricao.\nExemplo: Se uma construtora divide valores com uma imobiliaria, cada uma tem seu beneficiario." },
      { heading: "2. Projetos (Tela: Gestao de Projetos)", text: "Projetos definem as regras de divisao de valores. Cada projeto pertence a um credor e contem N splits configurados.\n\nO que configurar: Nome do projeto, credor vinculado, e para cada split: beneficiario, tipo (valor fixo R$ ou percentual %), e o valor.\nValidacao: A soma dos splits percentuais nao pode exceder 100%." },
      { heading: "3. Modelos de Contrato (Opcional)", text: "Se voce vai gerar contratos digitais junto com os boletos, precisa ter ao menos um modelo cadastrado.\n\nO que configurar: Nome, credor, documento base (template) e campos dinamicos (variaveis que serao preenchidas em cada contrato)." },
      { heading: "4. Etapas de Contratos", text: "As etapas formam o pipeline de acompanhamento dos contratos.\nExemplo: Novo > Em Analise > Aguardando Assinatura > Assinado > Concluido.\n\nO que configurar: Nome da etapa, cor, descricao e ordem no pipeline." },
      { heading: "Diagrama de Vinculacao", text: "Beneficiario > Projeto (com splits) > Contrato/Cobranca > Boletos + Splits Automaticos" },
    ],
  },
  {
    title: "Fluxo Completo: Criacao de Contrato",
    subtitle: "Passo a passo detalhado da criacao de contratos e cobrancas",
    content: [
      { heading: "Passo a Passo", text: "1. Selecionar Cliente/Credor -- Escolha o credor que recebera os valores.\n2. Selecionar Projeto -- O projeto define quais splits serao aplicados automaticamente.\n3. Tipo de Geracao -- Escolha: apenas Contrato (ZapSign), apenas Boleto (Asaas), ou Contrato + Boleto.\n4. Dados do Contratante -- Nome, CPF/CNPJ (min. 11 digitos), telefone e e-mail.\n5. Endereco -- CEP (busca automatica), rua, numero, complemento, bairro, cidade e estado.\n6. Configurar Boletos -- Quantidade, valor unitario, data do 1o vencimento. Parcelas seguintes mensais.\n7. Desconto de Pontualidade (Opcional) -- Desconto fixo (R$) ou percentual (%) para pagamento antecipado.\n8. Splits Adicionais (Opcional) -- Splits extras para comissoes de vendedores.\n9. Contrato Digital (Opcional) -- Selecione o modelo e preencha os campos dinamicos.\n10. Confirmar Criacao -- Modal de resumo com todos os dados e valores." },
      { heading: "O que acontece ao confirmar", text: "Os dados do contrato sao salvos no banco de dados. Uma copia (snapshot) dos splits do projeto e gravada junto ao contrato, garantindo que mesmo que o projeto mude depois, a cobranca mantem os splits originais." },
      { heading: "Vendedores e Comissoes", text: "Ao criar um contrato, e possivel vincular vendedores que receberao comissao. A comissao e configurada como um split adicional (fixo ou percentual) incluido na geracao dos boletos." },
    ],
  },
  {
    title: "Geracao de Cobranca (Asaas)",
    subtitle: "Como os boletos sao gerados e processados",
    content: [
      { heading: "Como Funciona", text: "Apos criar o contrato, os boletos nao sao gerados imediatamente. Voce precisa acionar a geracao na tela de Gestao de Contratos:\n\n1. Abrir Gestao de Contratos e encontrar o contrato desejado.\n2. Clicar em 'Gerar Cobranca'. O sistema envia os dados para o Asaas.\n3. Acompanhar o status: Pendente > Enviando > Sucesso ou Erro." },
      { heading: "Status de Integracao", text: "- Pendente: Aguardando envio ao Asaas.\n- Enviando: Em processamento (aguarde).\n- Sucesso: Boletos gerados com sucesso no Asaas.\n- Erro: Falha na geracao. Verifique os dados e tente reprocessar." },
      { heading: "[!] Em caso de erro", text: "Voce pode clicar em \"Reprocessar\" para tentar novamente. Verifique se os dados do contratante (CPF, e-mail) estao corretos." },
    ],
  },
  {
    title: "Geracao de Contrato Digital (ZapSign)",
    subtitle: "Contratos digitais com assinatura eletronica",
    content: [
      { heading: "Como Funciona", text: "1. Gerar Contrato -- Na Gestao de Contratos, clique em 'Gerar Contrato'. O sistema usa o modelo selecionado.\n2. Campos Dinamicos -- Os campos do modelo sao preenchidos com os dados do contratante.\n3. Envio para Assinatura -- O contrato e criado no ZapSign e enviado automaticamente.\n4. Acompanhamento -- O status e atualizado: pendente > enviado > assinado." },
      { heading: "Acompanhando a Assinatura", text: "Na coluna \"Status Contrato\" da Gestao de Contratos, voce vera se o contrato ja foi assinado. Quando o contratante assina, o sistema recebe a notificacao automaticamente." },
      { heading: "Link do Contrato", text: "O link do contrato no ZapSign fica disponivel na coluna \"URL Contrato\" para envio manual, se necessario." },
    ],
  },
  {
    title: "Cancelamento de Cobrancas",
    subtitle: "Como cancelar boletos individuais ou em massa",
    content: [
      { heading: "Cancelamento Individual", text: "Na tela de Todas as Cobrancas, selecione a cobranca desejada e use a opcao de cancelamento. O sistema envia a solicitacao ao Asaas." },
      { heading: "Cancelamento em Massa", text: "1. Selecionar Cobrancas -- Marque as cobrancas na tabela usando os checkboxes.\n2. Clicar em 'Cancelar Selecionadas' -- Um modal de progresso aparecera.\n3. Processamento Sequencial -- As cobrancas sao canceladas uma por uma, com intervalo de 1 segundo.\n4. Acompanhar Progresso -- O modal mostra em tempo real: total, processados, sucesso e erros." },
      { heading: "[!] Atencao", text: "O cancelamento e irreversivel. Uma vez cancelado no Asaas, o boleto nao pode ser reativado. Sera necessario gerar novos boletos." },
      { heading: "Interromper Cancelamento", text: "Se necessario, clique em \"Interromper\" durante o processamento. As cobrancas ja processadas nao serao desfeitas." },
    ],
  },
  {
    title: "Alteracao de Contratos",
    subtitle: "Como editar contratos existentes",
    content: [
      { heading: "O que pode ser alterado", text: "- Dados do Contratante: Nome, CPF/CNPJ, telefone, e-mail, endereco.\n- Etapa: Mover o contrato para outra etapa do pipeline.\n- Splits: Reconfigurar os splits (remove os anteriores e insere os novos).\n- Dados financeiros: Valor dos boletos, quantidade, datas." },
      { heading: "Mudanca de Etapa", text: "Ao mover um contrato para outra etapa, o sistema registra automaticamente no historico: etapa anterior, nova etapa, data/hora e quem fez a alteracao." },
      { heading: "[!] Atencao com Splits", text: "Alterar splits de um contrato que ja teve boletos gerados no Asaas nao altera os boletos existentes. Os novos splits valerao apenas para futuras geracoes." },
    ],
  },
  {
    title: "Gestao de Splits",
    subtitle: "Relatorio e analise dos splits financeiros",
    content: [
      { heading: "O que sao Splits?", text: "Splits sao a divisao automatica de valores de uma cobranca entre diferentes beneficiarios. Quando um boleto e pago, o valor e dividido conforme as regras do projeto." },
      { heading: "Funcionalidades", text: "- Cards de Metricas: Total de splits, valor total, quantidade por tipo.\n- Tabela: Lista todos os splits com pagador, wallet, tipo, valor e data.\n- Filtros: Por pagador, wallet ID, cliente e busca textual.\n- Aba Analytics: Graficos e analises visuais.\n- Exportacao: Excel (.xlsx) e PDF.\n- Modal de Detalhes: Clique em um split para ver detalhes." },
    ],
  },
  {
    title: "Extrato Bancario",
    subtitle: "Movimentacoes financeiras do Asaas",
    content: [
      { heading: "Como Consultar", text: "1. Selecionar Cliente -- Escolha o credor.\n2. Definir Periodo -- Semana, mes, trimestre ou personalizado.\n3. Consultar -- Dados buscados em tempo real do Asaas.\n4. Analisar -- Cards com entradas, saidas e saldo." },
      { heading: "Funcionalidades", text: "- Cards de Metricas: Total de entradas, saidas, saldo liquido.\n- Tabela: Data, tipo, valor, descricao, saldo.\n- Identificacao do Devedor: Para transferencias internas, o sistema busca o nome pela fatura.\n- Exportacao: Excel e PDF." },
      { heading: "[i] Dados em tempo real", text: "Os dados do extrato sao buscados em tempo real do Asaas e nao ficam salvos no sistema." },
    ],
  },
  {
    title: "Todas as Cobrancas",
    subtitle: "Visao consolidada de todas as cobrancas",
    content: [
      { heading: "Visao Geral", text: "Centraliza todas as cobrancas do sistema, de todos os credores e projetos. Permite acompanhar status, editar em lote e analisar metricas." },
      { heading: "Abas Disponiveis", text: "- Cobrancas: Tabela principal com filtros e edicao em lote.\n- Analytics: Graficos por status, periodo e valor.\n- Sem Splits: Cobrancas sem splits configurados.\n- Apagadas: Cobrancas removidas." },
      { heading: "Acoes Disponiveis", text: "- Filtros: Nome, unidade, status, forma de pagamento, periodo.\n- Edicao em Lote: Selecione multiplas e edite campos.\n- Cancelamento em Massa: Cancele multiplas cobrancas sequencialmente.\n- Exportacao: Excel.\n- Somatorio: Rodape com totais." },
    ],
  },
  {
    title: "Valores Recebidos",
    subtitle: "O que foi efetivamente pago",
    content: [
      { heading: "Diferenca de 'Todas as Cobrancas'", text: "\"Todas as Cobrancas\" mostra o que foi cobrado (expectativa). \"Valores Recebidos\" mostra o que foi efetivamente pago (realidade). Os dados vem do gateway Asaas." },
      { heading: "Funcionalidades", text: "- Cards de Metricas: Total recebido, quantidade, ticket medio.\n- Filtros: Nome, unidade, forma/meio de pagamento, periodo.\n- Tabela: Lista de cada valor recebido com detalhes.\n- Exportacao: Excel e PDF.\n- Permissoes: Controle de acesso por usuario." },
    ],
  },
  {
    title: "Bancos de Dados Utilizados",
    subtitle: "Onde o sistema armazena as informacoes",
    content: [
      { heading: "O que e um 'banco de dados'?", text: "Cada modulo do sistema armazena informacoes em tabelas organizadas. Pense nelas como planilhas especializadas que guardam dados de forma estruturada e segura." },
      { heading: "Modulo de Splits e Projetos", text: "- Beneficiarios: Guarda quem recebe valores (nome, carteira, status).\n- Projetos: Configuracoes de cada projeto (nome, credor, status).\n- Splits do Projeto: Regras de divisao (beneficiario, tipo, valor).\n- Relatorio de Splits: Visao consolidada de todos os splits executados." },
      { heading: "Modulo de Contratos", text: "- Contratos: Dados de cada contrato (contratante, credor, projeto, status, valores).\n- Etapas: Pipeline de acompanhamento (nome, cor, ordem).\n- Historico: Registro de movimentacoes entre etapas.\n- Modelos de Contrato: Templates para contratos digitais.\n- Campos do Modelo: Variaveis dinamicas de cada modelo." },
      { heading: "Modulo de Cobrancas", text: "- Cobrancas: Dados de boletos gerados (contratante, projeto, valores, status).\n- Splits da Cobranca: Copia dos splits no momento da criacao (snapshot).\n- Base de Gerenciamento: Visao consolidada de todas as cobrancas.\n- Valores Recebidos: Pagamentos confirmados pelo Asaas." },
      { heading: "Modulo de Permissoes", text: "- Papeis de Usuario: Nivel de acesso (admin, operador, visualizador).\n- Permissoes por Tela: O que cada usuario pode fazer em cada tela.\n- Permissoes por Cliente: Quais clientes cada usuario pode acessar." },
    ],
  },
];

const secoesTecnico: ManualSection[] = [
  {
    title: "Arquitetura do Sistema",
    subtitle: "Stack tecnologico, estrutura e padroes",
    content: [
      { heading: "Stack Tecnologico", text: "Frontend: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI\nBackend: Supabase (PostgreSQL, Edge Functions Deno, RLS)\nEstado: TanStack Query, React Hook Form, Zod\nExportacao: jsPDF, jspdf-autotable, xlsx" },
      { heading: "Estrutura de Pastas", text: "src/pages/ -- Paginas (rotas)\nsrc/components/ -- Componentes por modulo\nsrc/hooks/ -- Hooks customizados (TanStack Query)\nsrc/utils/ -- Utilitarios e exportacoes\nsrc/lib/ -- Configuracao Supabase\nsupabase/functions/ -- Edge Functions" },
      { heading: "Padrao de Hooks (TanStack Query)", text: "- useXxx -- Query: busca dados com useQuery\n- useCreateXxx -- Mutation: cria com useMutation, invalida cache\n- useUpdateXxx -- Mutation: atualiza\n- useDeleteXxx -- Mutation: remove\n\nApos cada mutation, o cache e invalidado via queryClient.invalidateQueries." },
      { heading: "Roteamento", text: "SPA com react-router-dom v6. Rotas protegidas via ProtectedRoute (verifica autenticacao Supabase). Permissoes por tela via ProtectedScreen." },
    ],
  },
  {
    title: "Mapa de Tabelas e Conexoes",
    subtitle: "Relacionamentos entre todas as tabelas do sistema",
    content: [
      { heading: "Chave Principal de Vinculacao", text: "A chave externalReference (formato CTR-XXXXX) e o elo principal entre contratos e cobrancas. Ela conecta o contrato aos boletos gerados no Asaas." },
      { heading: "Diagrama de Relacionamentos", text: "gestao_splits_beneficiarios\n  | (id > wallet_id)\ngestao_splits_projeto_splits < (projeto_id) > gestao_splits_projetos\n  | (projeto herda splits)\ngestao_splits_contratos (projeto_id, modelo_contrato_id, etapa_atual_id)\n  | (contrato_id)\ngestao_splits_contratos_historico (etapa_anterior_id, etapa_nova_id > etapas)\n  | (externalReference vincula)\ngestao_splits_cobrancas (projeto_id, modelo_contrato_id)\n  | (cobranca_id)\ngestao_splits_cobrancas_splits (snapshot dos splits)\n  | (externalReference ou Identificador)\nbase_gerenciamento_recebiveis (visao consolidada)\n  | (Numero da fatura)\nbase_valores_recebidos_asaas (pagamentos confirmados)" },
    ],
    tables: [
      { name: "gestao_splits_beneficiarios", columns: [["id", "uuid", "PK"], ["nome", "text", "Nome do beneficiario"], ["wallet_id", "text", "Wallet no Asaas"], ["ativo", "bool", "Status"]] },
      { name: "gestao_splits_projetos", columns: [["id", "uuid", "PK"], ["nome", "text", "Nome do projeto"], ["credor_cedrus", "text", "Codigo do credor"], ["ativo", "bool", "Status"], ["tipo_cobranca", "text", "Tipo de cobranca"]] },
      { name: "gestao_splits_projeto_splits", columns: [["id", "uuid", "PK"], ["projeto_id", "uuid", "FK > projetos"], ["wallet_id", "text", "Wallet do beneficiario"], ["tipo_valor", "text", "fixedValue | percentualValue"], ["valor", "numeric", "Valor ou percentual"], ["description", "text", "Descricao"]] },
      { name: "gestao_splits_contratos", columns: [["id", "uuid", "PK"], ["externalReference", "text", "CTR-XXXXX (chave de vinculacao)"], ["nome", "text", "Titulo"], ["credor_cedrus", "text", "Credor"], ["projeto_id", "uuid", "FK > projetos"], ["modelo_contrato_id", "uuid", "FK > modelos"], ["contratante_nome", "text", "Nome"], ["contratante_cpf_cnpj", "text", "CPF/CNPJ"], ["tipo_geracao", "text", "contrato|contrato_boleto|boleto"], ["etapa_atual_id", "uuid", "FK > etapas"], ["cobranca_status", "text", "Status Asaas"], ["contrato_status", "text", "Status ZapSign"], ["contrato_assinado", "bool", "Assinado?"], ["valor_boleto", "numeric", "Valor/boleto"], ["numero_boletos", "int", "Qtd boletos"]] },
      { name: "gestao_splits_contratos_etapas", columns: [["id", "uuid", "PK"], ["nome", "text", "Nome da etapa"], ["ordem", "int", "Ordem no pipeline"], ["cor", "text", "Cor hexadecimal"], ["ativo", "bool", "Status"]] },
      { name: "gestao_splits_contratos_historico", columns: [["id", "uuid", "PK"], ["contrato_id", "uuid", "FK > contratos"], ["etapa_anterior_id", "uuid", "FK > etapas (origem)"], ["etapa_nova_id", "uuid", "FK > etapas (destino)"], ["observacao", "text", "Observacao"], ["created_by", "uuid", "Usuario"], ["created_at", "timestamp", "Data/hora"]] },
      { name: "gestao_splits_cobrancas", columns: [["id", "uuid", "PK"], ["projeto_id", "uuid", "FK > projetos"], ["nome_contratante", "text", "Nome"], ["cpf_contratante", "text", "CPF"], ["quantidade_boletos", "int", "Qtd"], ["valor_sem_desconto", "numeric", "Valor/boleto"], ["payload_gerado", "jsonb", "Payload para API"], ["status", "text", "pendente|enviado|processado|erro"], ["gerar_contrato", "bool", "Gerar contrato?"], ["modelo_contrato_id", "uuid", "FK > modelos"]] },
      { name: "gestao_splits_cobrancas_splits", columns: [["id", "uuid", "PK"], ["cobranca_id", "uuid", "FK > cobrancas"], ["wallet_id", "text", "Wallet"], ["tipo_valor", "text", "fixedValue|percentualValue"], ["valor", "numeric", "Valor"], ["description", "text", "Descricao"], ["origem", "text", "projeto|adicional"]] },
      { name: "base_gerenciamento_recebiveis", columns: [["id", "uuid", "PK"], ["nome_devedor", "text", "Devedor"], ["documento_devedor", "text", "CPF/CNPJ"], ["credor_cedrus", "text", "Credor"], ["valor_original", "numeric", "Valor original"], ["valor_pago", "numeric", "Valor pago"], ["status_negociacao", "text", "Status"], ["data_vencimento", "date", "Vencimento"], ["Identificador", "text", "ID Asaas"]] },
      { name: "gestao_splits_user_roles", columns: [["id", "uuid", "PK"], ["user_id", "uuid", "FK > auth.users"], ["role", "text", "admin|operator|viewer"]] },
      { name: "gestao_splits_screen_permissions", columns: [["id", "uuid", "PK"], ["user_id", "uuid", "FK > auth.users"], ["screen_key", "text", "Chave da tela"], ["can_view", "bool", "Ver"], ["can_create", "bool", "Criar"], ["can_update", "bool", "Editar"], ["can_delete", "bool", "Excluir"]] },
      { name: "gestao_splits_client_permissions", columns: [["id", "uuid", "PK"], ["user_id", "uuid", "FK > auth.users"], ["client_name", "text", "Nome do cliente"]] },
      { name: "gestao_splits_modelos_contrato", columns: [["id", "uuid", "PK"], ["nome", "text", "Nome do modelo"], ["credor_cedrus", "text", "Credor"], ["documento_base_url", "text", "URL do template"], ["ativo", "bool", "Status"]] },
      { name: "gestao_splits_modelos_contrato_campos", columns: [["id", "uuid", "PK"], ["modelo_id", "uuid", "FK > modelos"], ["nome", "text", "Nome/variavel"], ["tipo", "text", "texto|data|numero|moeda|lista"], ["obrigatorio", "bool", "Obrigatorio?"], ["valor_padrao", "text", "Valor padrao"], ["ordem", "int", "Ordem"]] },
    ],
  },
  {
    title: "Fluxo Tecnico: Criacao de Contrato",
    subtitle: "Hooks, persistencia e snapshots de splits",
    content: [
      { heading: "Hooks Envolvidos", text: "useCreateContrato, useSaveContratoCamposValores, useCreateVendedorContrato" },
      { heading: "Fluxo de Persistencia", text: "1. Geracao do externalReference -- Formato CTR-XXXXX (aleatorio). Chave de vinculacao entre contrato, cobranca e boletos.\n2. Insert em gestao_splits_contratos -- Dados do contratante, credor, projeto_id, tipo_geracao, etapa_atual_id, valores.\n3. Insert em gestao_splits_cobrancas -- Copia dos dados financeiros vinculada ao mesmo externalReference.\n4. Snapshot de Splits -- Splits do projeto copiados para gestao_splits_cobrancas_splits com origem='projeto'. Adicionais com origem='adicional'.\n5. Campos do Contrato -- Se modelo selecionado, valores salvos em gestao_splits_contratos_campos_valores.\n6. Vendedores -- Se vinculados, salvos em gestao_splits_vendedores_contratos." },
      { heading: "Snapshot de Splits (Importante)", text: "O snapshot garante que a cobranca mantem os splits originais do projeto, mesmo que o projeto seja alterado depois. A tabela gestao_splits_cobrancas_splits e a fonte de verdade para os splits de cada cobranca." },
      { heading: "Payload Gerado (payload_gerado)", text: "{ customer: { name, cpfCnpj, email, phone, address }, billings: [{ value, dueDate, description, discount }], splits: [{ walletId, fixedValue/percentualValue }], externalReference: \"CTR-XXXXX\" }" },
    ],
  },
  {
    title: "Fluxo Tecnico: Geracao de Cobranca",
    subtitle: "Webhook, edge function e atualizacao de status",
    content: [
      { heading: "Sequencia de Execucao", text: "1. Frontend dispara webhook -- POST para https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cria-cobranca-geral\n2. Atualiza cobranca_status -- Status muda para 'enviando' em gestao_splits_contratos.\n3. Webhook N8N processa -- Orquestra: valida dados, chama edge function ou API Asaas.\n4. Edge Function gerar-cobranca-asaas -- Recebe payload, adiciona API key, cria customer e billings.\n5. Callback de sucesso/erro -- Status atualizado para 'sucesso' ou 'erro'." },
      { heading: "Payload Enviado ao Webhook", text: "{ contrato_id, externalReference, customer: { name, cpfCnpj, email, phone, address }, billings: [{ value, dueDate, description, discount }], splits: [{ walletId, fixedValue?, percentualValue? }], credor_cedrus }" },
      { heading: "Edge Function: gerar-cobranca-asaas", text: "Arquivo: supabase/functions/gerar-cobranca-asaas/index.ts\n- Recebe payload via POST\n- Adiciona header access_token do Asaas (variavel de ambiente)\n- Cria customer no Asaas (se nao existir)\n- Cria cada billing (boleto) com splits configurados\n- Retorna status e IDs dos boletos criados" },
    ],
  },
  {
    title: "Fluxo Tecnico: Contrato ZapSign",
    subtitle: "Edge function, campos dinamicos e callback de assinatura",
    content: [
      { heading: "Sequencia de Execucao", text: "1. Frontend invoca edge function -- supabase.functions.invoke('gerar-contrato-zapsign')\n2. Edge function processa -- Busca modelo, substitui campos dinamicos, cria documento na API ZapSign.\n3. Adiciona signatarios -- Contratante e adicionais sao adicionados como signatarios.\n4. Retorna URL -- URL salva em gestao_splits_contratos.contrato_url.\n5. Webhook de callback -- webhook-zapsign recebe notificacao e atualiza contrato_assinado=true." },
      { heading: "Edge Functions Envolvidas", text: "- gerar-contrato-zapsign: Cria o documento e adiciona signatarios\n- webhook-zapsign: Recebe callbacks de assinatura do ZapSign" },
      { heading: "Campos Dinamicos", text: "Os campos do modelo (gestao_splits_modelos_contrato_campos) sao substituidos no documento. Exemplo: {{nome_contratante}} > \"Joao Silva\". Tipos: texto, data, numero, moeda, lista." },
    ],
  },
  {
    title: "Fluxo Tecnico: Cancelamento",
    subtitle: "Webhook de cancelamento e processamento sequencial",
    content: [
      { heading: "Webhook de Cancelamento", text: "POST https://n8n.superavit.app.br/webhook/cancela-boletos-asaas\n\nO cancelamento envia o Identificador (ID do boleto no Asaas) para o webhook que aciona a API do Asaas." },
      { heading: "Cancelamento em Massa (Sequencial)", text: "1. Selecao de cobrancas na tabela.\n2. Modal BulkCancelamentoModal exibe lista com status individual.\n3. Loop sequencial: POST ao webhook > aguarda resposta > atualiza status > delay 1000ms.\n4. Controle de interrupcao via abortRef.current." },
      { heading: "Implementacao", text: "for (let i = 0; i < cobrancas.length; i++) {\n  if (abortRef.current) break;\n  setStatuses = 'sending'\n  const ok = await fetch(webhookUrl, { body: { Identificador } });\n  setStatuses = 'success' | 'error'\n  if (i < cobrancas.length - 1) await delay(1000);\n}" },
    ],
  },
  {
    title: "Seguranca e Permissoes",
    subtitle: "RLS, permissoes por tela e proxy de API keys",
    content: [
      { heading: "Row Level Security (RLS)", text: "Todas as tabelas possuem RLS ativado. Politicas:\n- SELECT: Usuarios autenticados podem ler dados (filtrados por client_permissions).\n- INSERT/UPDATE/DELETE: Validam auth.uid() e role do usuario.\n- Filtro por cliente: Queries filtram por credor_cedrus com base nas permissoes." },
      { heading: "Permissoes por Tela", text: "Cada usuario possui permissoes granulares:\n{ screen_key: \"gestao-contratos\", can_view: true, can_create: true, can_update: true, can_delete: false }\n\nHooks: useGestaoSplitsScreenPermissions\nComponente: ProtectedScreen" },
      { heading: "Permissoes por Cliente", text: "Tabela gestao_splits_client_permissions define quais clientes cada usuario pode acessar. Hook useGestaoSplitsClientPermissions filtra dados automaticamente." },
      { heading: "Edge Functions como Proxy Seguro", text: "Chaves de API do Asaas e ZapSign nunca sao expostas no frontend. Toda chamada externa passa por Edge Functions que:\n- Validam autenticacao (JWT)\n- Adicionam API keys (variaveis de ambiente)\n- Processam e retornam dados" },
    ],
  },
  {
    title: "Edge Functions",
    subtitle: "Listagem completa das funcoes serverless",
    content: [
      { heading: "gerar-cobranca-asaas", text: "Gera boletos no Asaas com splits. Recebe payload com customer, billings e splits. Retorna IDs dos boletos.\nTrigger: Invocacao direta ou via webhook N8N" },
      { heading: "gerar-contrato-zapsign", text: "Cria contrato digital no ZapSign a partir de um modelo. Substitui campos dinamicos e adiciona signatarios.\nTrigger: Invocacao direta do frontend" },
      { heading: "webhook-zapsign", text: "Recebe callbacks do ZapSign quando um contrato e assinado. Atualiza contrato_assinado e contrato_status.\nTrigger: Webhook callback do ZapSign" },
      { heading: "webhook-cria-cobranca", text: "Webhook para criacao de cobrancas a partir de fontes externas.\nTrigger: Webhook externo" },
      { heading: "delete-user", text: "Remove um usuario do sistema (auth.users). Requer permissao de admin.\nTrigger: Invocacao do frontend (Gestao de Usuarios)" },
      { heading: "migrate-users", text: "Migracao de usuarios entre sistemas. Uso administrativo.\nTrigger: Manual" },
    ],
  },
  {
    title: "Hooks e Arquivos",
    subtitle: "Mapa completo de cada modulo",
    content: [
      { heading: "Modulo: Splits", text: "Hooks: useSplits, useSplitsAnalytics\nArquivos:\n- src/pages/GestaoSplits.tsx\n- src/hooks/useSplits.ts, useSplitsAnalytics.ts\n- src/components/Splits/*\n- src/utils/exportSplits.ts" },
      { heading: "Modulo: Contratos", text: "Hooks: useGestaoContratos, useVendedoresContratos\nArquivos:\n- src/pages/GestaoContratos.tsx, NovoContrato.tsx, GestaoContratosEtapas.tsx\n- src/hooks/useGestaoContratos.ts, useVendedoresContratos.ts\n- src/components/GestaoContratos/*" },
      { heading: "Modulo: Cobrancas", text: "Hooks: useTodasCobrancas, useCobrancasAnalytics, useBulkUpdateCobrancas\nArquivos:\n- src/pages/TodasCobrancas.tsx, CriarCobranca.tsx\n- src/hooks/useTodasCobrancas.ts, useBulkUpdateCobrancas.ts, useCobrancasSemSplits.ts\n- src/components/TodasCobrancas/*" },
      { heading: "Modulo: Projetos e Beneficiarios", text: "Hooks: useGestaoSplitsProjetos, useGestaoSplitsBeneficiarios\nArquivos:\n- src/pages/GestaoProjetos.tsx, EditarProjeto.tsx, BeneficiariosSplits.tsx\n- src/hooks/useGestaoSplitsProjetos.ts, useGestaoSplitsBeneficiarios.ts" },
      { heading: "Modulo: Valores Recebidos e Extrato", text: "Hooks: useValoresRecebidosAsaas, useExtratoWebhook\nArquivos:\n- src/pages/RelatorioValoresRecebidos.tsx, Extrato.tsx\n- src/hooks/useValoresRecebidosAsaas.ts, useExtratoWebhook.ts\n- src/components/ValoresRecebidos/*, src/components/Extrato/*\n- src/utils/exportValoresRecebidos.ts, exportExtrato.ts" },
      { heading: "Modulo: Modelos de Contrato", text: "Hooks: useGestaoSplitsModelosContrato\nArquivos:\n- src/pages/ModelosContrato.tsx\n- src/hooks/useGestaoSplitsModelosContrato.ts" },
      { heading: "Modulo: Permissoes e Usuarios", text: "Hooks: useGestaoSplitsUserManagement, useGestaoSplitsScreenPermissions, useGestaoSplitsClientPermissions\nArquivos:\n- src/pages/GestaoUsuarios.tsx, EditarUsuario.tsx\n- src/hooks/useGestaoSplitsUserManagement.ts, useGestaoSplitsUserRoles.ts\n- src/hooks/useGestaoSplitsScreenPermissions.ts, useGestaoSplitsClientPermissions.ts\n- src/components/UserManagement/*" },
      { heading: "Modulo: Exportacoes", text: "- src/utils/exportSplits.ts -- Splits (Excel/PDF)\n- src/utils/exportExtrato.ts -- Extrato (Excel/PDF)\n- src/utils/exportValoresRecebidos.ts -- Valores Recebidos\n- src/utils/exportCobrancasPDF.ts -- Cobrancas (PDF)\n- src/utils/exportContratoPDF.ts -- Contrato (PDF)\n- src/utils/exportManualPDF.ts -- Manual do Sistema (PDF)" },
    ],
  },
];

export function exportManualPDF(tipo: "operacional" | "tecnico" = "operacional") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 25;
  let y = 20;

  doc.setFont("helvetica");

  const sections = tipo === "operacional" ? secoesOperacional : secoesTecnico;
  const titleText = tipo === "operacional" ? "Manual Operacional" : "Manual Técnico (TI)";
  const subtitleText = tipo === "operacional"
    ? "Guia de operação do sistema Superávit"
    : "Infraestrutura, tabelas, hooks e fluxos técnicos";

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
  };

  // === COVER ===
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(titleText, pageWidth / 2, 55, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Sistema Superávit", pageWidth / 2, 68, { align: "center" });

  doc.setFontSize(11);
  doc.text(subtitleText, pageWidth / 2, 80, { align: "center" });

  doc.setFontSize(10);
  doc.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    95,
    { align: "center" }
  );

  // Line decoration
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(60, 100, pageWidth - 60, 100);

  // === TABLE OF CONTENTS ===
  doc.addPage();
  y = 20;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Índice", margin, y);
  y += 14;

  sections.forEach((section, i) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(59, 130, 246);
    doc.text(`${i + 1}. ${section.title}`, margin + 5, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(section.subtitle, margin + 10, y);
    y += 10;
  });

  // === SECTIONS ===
  sections.forEach((section, sIdx) => {
    doc.addPage();
    y = 20;

    // Section title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`${sIdx + 1}. ${section.title}`, margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(section.subtitle, margin, y);
    y += 5;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Content blocks
    section.content.forEach((block) => {
      checkPageBreak(18);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(block.heading, margin, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(block.text, contentWidth);
      lines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 6;
    });

    // Tables
    if (section.tables) {
      section.tables.forEach((table) => {
        checkPageBreak(30);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(59, 130, 246);
        doc.text(`Tabela: ${table.name}`, margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Coluna", "Tipo", "Descrição"]],
          body: table.columns,
          styles: { fontSize: 7, font: "helvetica", cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], font: "helvetica", fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      });
    }
  });

  // === FOOTER ON ALL PAGES ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${titleText} — Sistema Superávit — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`${tipo === "operacional" ? "manual-operacional" : "manual-tecnico-ti"}-superavit-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
