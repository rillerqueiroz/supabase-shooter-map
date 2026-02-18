import { Card, CardContent } from "@/components/ui/card";
import {
  Server, Database, FileText, Receipt, FileSignature,
  XCircle, Shield, Zap, Code,
} from "lucide-react";
import { SectionHeader, InfoBlock, FlowStep, TechBadge, TableSchema, AlertBlock } from "./ManualShared";

export function ManualTecnicoContent({ secaoAtiva }: { secaoAtiva: string }) {
  switch (secaoAtiva) {
    case "arquitetura": return <Arquitetura />;
    case "mapa-tabelas": return <MapaTabelas />;
    case "fluxo-criacao-contrato": return <FluxoCriacaoContrato />;
    case "fluxo-geracao-cobranca": return <FluxoGeracaoCobranca />;
    case "fluxo-geracao-zapsign": return <FluxoGeracaoZapSign />;
    case "fluxo-cancelamento": return <FluxoCancelamento />;
    case "seguranca-permissoes": return <SegurancaPermissoes />;
    case "edge-functions": return <EdgeFunctions />;
    case "hooks-arquivos": return <HooksArquivos />;
    default: return <Arquitetura />;
  }
}

function Arquitetura() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Server} title="Arquitetura do Sistema" subtitle="Stack tecnológico, estrutura e padrões" />

        <InfoBlock title="Stack Tecnológico">
          <div className="flex flex-wrap gap-2 mb-3">
            <TechBadge>React 18</TechBadge>
            <TechBadge>TypeScript</TechBadge>
            <TechBadge>Vite</TechBadge>
            <TechBadge>Tailwind CSS</TechBadge>
            <TechBadge>Shadcn/UI</TechBadge>
            <TechBadge>Supabase (PostgreSQL)</TechBadge>
            <TechBadge>Edge Functions (Deno)</TechBadge>
            <TechBadge>TanStack Query</TechBadge>
            <TechBadge>React Hook Form + Zod</TechBadge>
            <TechBadge>jsPDF + xlsx</TechBadge>
          </div>
        </InfoBlock>

        <InfoBlock title="Estrutura de Pastas">
          <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono space-y-1">
            <p>src/pages/ — Páginas (rotas)</p>
            <p>src/components/ — Componentes por módulo</p>
            <p>src/hooks/ — Hooks customizados (TanStack Query)</p>
            <p>src/utils/ — Utilitários e exportações</p>
            <p>src/lib/ — Configuração Supabase</p>
            <p>supabase/functions/ — Edge Functions</p>
          </div>
        </InfoBlock>

        <InfoBlock title="Padrão de Hooks (TanStack Query)">
          <p className="mb-2">Todos os hooks seguem o padrão:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><code>useXxx</code> — Query: busca dados com <code>useQuery</code></li>
            <li><code>useCreateXxx</code> — Mutation: cria com <code>useMutation</code>, invalida cache</li>
            <li><code>useUpdateXxx</code> — Mutation: atualiza</li>
            <li><code>useDeleteXxx</code> — Mutation: remove</li>
          </ul>
          <p className="mt-2">Após cada mutation, o cache é invalidado via <code>queryClient.invalidateQueries</code> para refletir mudanças imediatas.</p>
        </InfoBlock>

        <InfoBlock title="Roteamento">
          <p>SPA com <code>react-router-dom</code> v6. Rotas protegidas via <code>ProtectedRoute</code> que verifica autenticação Supabase. Permissões por tela via <code>ProtectedScreen</code>.</p>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function MapaTabelas() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Database} title="Mapa de Tabelas e Conexões" subtitle="Relacionamentos entre todas as tabelas do sistema" />

        <AlertBlock type="info">
          A chave <code>externalReference</code> (formato CTR-XXXXX) é o elo principal entre contratos e cobranças. Ela conecta o contrato aos boletos gerados no Asaas.
        </AlertBlock>

        <InfoBlock title="Diagrama de Relacionamentos">
          <div className="p-4 bg-muted/50 rounded-lg text-xs font-mono space-y-2">
            <p><strong>gestao_splits_beneficiarios</strong></p>
            <p>&nbsp;&nbsp;↓ (id → beneficiario_id)</p>
            <p><strong>gestao_splits_projeto_splits</strong> ← (projeto_id) → <strong>gestao_splits_projetos</strong></p>
            <p>&nbsp;&nbsp;↓ (projeto herda splits)</p>
            <p><strong>gestao_splits_contratos</strong> (projeto_id, modelo_contrato_id, etapa_atual_id)</p>
            <p>&nbsp;&nbsp;↓ (contrato_id)</p>
            <p><strong>gestao_splits_contratos_historico</strong> (etapa_anterior_id, etapa_nova_id → etapas)</p>
            <p>&nbsp;&nbsp;↓ (externalReference vincula)</p>
            <p><strong>gestao_splits_cobrancas</strong> (projeto_id, modelo_contrato_id)</p>
            <p>&nbsp;&nbsp;↓ (cobranca_id)</p>
            <p><strong>gestao_splits_cobrancas_splits</strong> (snapshot dos splits no momento da criação)</p>
            <p>&nbsp;&nbsp;↓ (externalReference ou Identificador)</p>
            <p><strong>base_gerenciamento_recebiveis</strong> (visão consolidada)</p>
            <p>&nbsp;&nbsp;↓ (Número da fatura)</p>
            <p><strong>base_valores_recebidos_asaas</strong> (pagamentos confirmados)</p>
          </div>
        </InfoBlock>

        <InfoBlock title="Tabelas de Splits">
          <TableSchema tableName="gestao_splits_beneficiarios" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "nome", type: "text", desc: "Nome do beneficiário" },
            { name: "wallet_id", type: "text", desc: "Wallet no Asaas" },
            { name: "ativo", type: "bool", desc: "Status" },
          ]} />
          <TableSchema tableName="gestao_splits_projetos" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "nome", type: "text", desc: "Nome do projeto" },
            { name: "credor_cedrus", type: "text", desc: "Código do credor" },
            { name: "ativo", type: "bool", desc: "Status" },
            { name: "tipo_cobranca", type: "text", desc: "Tipo de cobrança" },
          ]} />
          <TableSchema tableName="gestao_splits_projeto_splits" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "projeto_id", type: "uuid", desc: "FK → gestao_splits_projetos" },
            { name: "wallet_id", type: "text", desc: "Wallet do beneficiário" },
            { name: "tipo_valor", type: "text", desc: "fixedValue | percentualValue" },
            { name: "valor", type: "numeric", desc: "Valor ou percentual" },
            { name: "description", type: "text", desc: "Descrição" },
          ]} />
        </InfoBlock>

        <InfoBlock title="Tabelas de Contratos">
          <TableSchema tableName="gestao_splits_contratos" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "externalReference", type: "text", desc: "CTR-XXXXX (chave de vinculação)" },
            { name: "nome", type: "text", desc: "Título do contrato" },
            { name: "credor_cedrus", type: "text", desc: "Código do credor" },
            { name: "projeto_id", type: "uuid", desc: "FK → gestao_splits_projetos" },
            { name: "modelo_contrato_id", type: "uuid", desc: "FK → gestao_splits_modelos_contrato" },
            { name: "contratante_nome", type: "text", desc: "Nome do contratante" },
            { name: "contratante_cpf_cnpj", type: "text", desc: "CPF/CNPJ" },
            { name: "tipo_geracao", type: "text", desc: "contrato | contrato_boleto | boleto" },
            { name: "etapa_atual_id", type: "uuid", desc: "FK → gestao_splits_contratos_etapas" },
            { name: "cobranca_status", type: "text", desc: "Status Asaas" },
            { name: "contrato_status", type: "text", desc: "Status ZapSign" },
            { name: "contrato_assinado", type: "bool", desc: "Assinado?" },
            { name: "valor_boleto", type: "numeric", desc: "Valor por boleto" },
            { name: "numero_boletos", type: "int", desc: "Qtd boletos" },
          ]} />
          <TableSchema tableName="gestao_splits_contratos_etapas" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "nome", type: "text", desc: "Nome da etapa" },
            { name: "ordem", type: "int", desc: "Ordem no pipeline" },
            { name: "cor", type: "text", desc: "Cor hexadecimal" },
            { name: "ativo", type: "bool", desc: "Status" },
          ]} />
          <TableSchema tableName="gestao_splits_contratos_historico" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "contrato_id", type: "uuid", desc: "FK → contratos" },
            { name: "etapa_anterior_id", type: "uuid", desc: "FK → etapas (origem)" },
            { name: "etapa_nova_id", type: "uuid", desc: "FK → etapas (destino)" },
            { name: "observacao", type: "text", desc: "Observação" },
            { name: "created_by", type: "uuid", desc: "Usuário" },
            { name: "created_at", type: "timestamp", desc: "Data/hora" },
          ]} />
        </InfoBlock>

        <InfoBlock title="Tabelas de Cobranças">
          <TableSchema tableName="gestao_splits_cobrancas" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "projeto_id", type: "uuid", desc: "FK → projetos" },
            { name: "nome_contratante", type: "text", desc: "Nome do contratante" },
            { name: "cpf_contratante", type: "text", desc: "CPF" },
            { name: "quantidade_boletos", type: "int", desc: "Qtd boletos" },
            { name: "valor_sem_desconto", type: "numeric", desc: "Valor por boleto" },
            { name: "payload_gerado", type: "jsonb", desc: "Payload completo para API" },
            { name: "status", type: "text", desc: "pendente | enviado | processado | erro" },
            { name: "gerar_contrato", type: "bool", desc: "Gerar contrato?" },
            { name: "modelo_contrato_id", type: "uuid", desc: "FK → modelos" },
          ]} />
          <TableSchema tableName="gestao_splits_cobrancas_splits" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "cobranca_id", type: "uuid", desc: "FK → cobrancas" },
            { name: "wallet_id", type: "text", desc: "Wallet" },
            { name: "tipo_valor", type: "text", desc: "fixedValue | percentualValue" },
            { name: "valor", type: "numeric", desc: "Valor" },
            { name: "description", type: "text", desc: "Descrição" },
            { name: "origem", type: "text", desc: "projeto | adicional" },
          ]} />
          <TableSchema tableName="base_gerenciamento_recebiveis" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "nome_devedor", type: "text", desc: "Nome do devedor" },
            { name: "documento_devedor", type: "text", desc: "CPF/CNPJ" },
            { name: "credor_cedrus", type: "text", desc: "Código do credor" },
            { name: "valor_original", type: "numeric", desc: "Valor original" },
            { name: "valor_pago", type: "numeric", desc: "Valor pago" },
            { name: "status_negociacao", type: "text", desc: "Status" },
            { name: "data_vencimento", type: "date", desc: "Vencimento" },
            { name: "data_pagamento", type: "date", desc: "Pagamento" },
            { name: "Identificador", type: "text", desc: "ID Asaas do boleto" },
          ]} />
        </InfoBlock>

        <InfoBlock title="Tabelas de Permissões">
          <TableSchema tableName="gestao_splits_user_roles" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "user_id", type: "uuid", desc: "FK → auth.users" },
            { name: "role", type: "text", desc: "admin | operator | viewer" },
          ]} />
          <TableSchema tableName="gestao_splits_screen_permissions" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "user_id", type: "uuid", desc: "FK → auth.users" },
            { name: "screen_key", type: "text", desc: "Chave da tela" },
            { name: "can_view", type: "bool", desc: "Pode ver" },
            { name: "can_create", type: "bool", desc: "Pode criar" },
            { name: "can_update", type: "bool", desc: "Pode editar" },
            { name: "can_delete", type: "bool", desc: "Pode excluir" },
          ]} />
          <TableSchema tableName="gestao_splits_client_permissions" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "user_id", type: "uuid", desc: "FK → auth.users" },
            { name: "client_name", type: "text", desc: "Nome do cliente" },
          ]} />
        </InfoBlock>

        <InfoBlock title="Tabelas de Modelos de Contrato">
          <TableSchema tableName="gestao_splits_modelos_contrato" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "nome", type: "text", desc: "Nome do modelo" },
            { name: "credor_cedrus", type: "text", desc: "Credor vinculado" },
            { name: "documento_base_url", type: "text", desc: "URL do template" },
            { name: "ativo", type: "bool", desc: "Status" },
          ]} />
          <TableSchema tableName="gestao_splits_modelos_contrato_campos" columns={[
            { name: "id", type: "uuid", desc: "PK" },
            { name: "modelo_id", type: "uuid", desc: "FK → modelos_contrato" },
            { name: "nome", type: "text", desc: "Nome/variável" },
            { name: "tipo", type: "text", desc: "texto | data | numero | moeda | lista" },
            { name: "obrigatorio", type: "bool", desc: "Obrigatório?" },
            { name: "valor_padrao", type: "text", desc: "Valor padrão" },
            { name: "ordem", type: "int", desc: "Ordem" },
          ]} />
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function FluxoCriacaoContrato() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={FileText} title="Fluxo Técnico: Criação de Contrato" subtitle="Hooks, persistência e snapshots de splits" />

        <InfoBlock title="Hooks Envolvidos">
          <div className="flex flex-wrap gap-2 mb-2">
            <TechBadge>useCreateContrato</TechBadge>
            <TechBadge>useSaveContratoCamposValores</TechBadge>
            <TechBadge>useCreateVendedorContrato</TechBadge>
          </div>
        </InfoBlock>

        <InfoBlock title="Fluxo de Persistência">
          <div className="space-y-3">
            <FlowStep step={1} title="Geração do externalReference" desc="Formato CTR-XXXXX (aleatório). Serve como chave de vinculação entre contrato, cobrança e boletos no Asaas." />
            <FlowStep step={2} title="Insert em gestao_splits_contratos" desc="Dados do contratante, credor, projeto_id, tipo_geracao, etapa_atual_id, valores e externalReference." />
            <FlowStep step={3} title="Insert em gestao_splits_cobrancas" desc="Cópia dos dados financeiros (boletos, valores) vinculada ao mesmo externalReference." />
            <FlowStep step={4} title="Snapshot de Splits" desc="Os splits do projeto são copiados para gestao_splits_cobrancas_splits com origem='projeto'. Splits adicionais (vendedores) com origem='adicional'." />
            <FlowStep step={5} title="Campos do Contrato" desc="Se modelo selecionado, os valores dos campos são salvos em gestao_splits_contratos_campos_valores." />
            <FlowStep step={6} title="Vendedores" desc="Se vinculados, salvos em gestao_splits_vendedores_contratos com wallet_id e comissão." />
          </div>
        </InfoBlock>

        <AlertBlock type="info">
          O snapshot de splits (passo 4) é <strong>fundamental</strong>: garante que a cobrança mantém os splits originais do projeto, mesmo que o projeto seja alterado depois. A tabela <code>gestao_splits_cobrancas_splits</code> é a fonte de verdade para os splits de cada cobrança.
        </AlertBlock>

        <InfoBlock title="Payload Gerado (gestao_splits_cobrancas.payload_gerado)">
          <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono">
            {`{
  "customer": { "name", "cpfCnpj", "email", "phone", "address" },
  "billings": [{ "value", "dueDate", "description", "discount" }],
  "splits": [{ "walletId", "fixedValue/percentualValue" }],
  "externalReference": "CTR-XXXXX"
}`}
          </div>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function FluxoGeracaoCobranca() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Receipt} title="Fluxo Técnico: Geração de Cobrança" subtitle="Webhook, edge function e atualização de status" />

        <InfoBlock title="Sequência de Execução">
          <div className="space-y-3">
            <FlowStep step={1} title="Frontend dispara webhook" desc="POST para https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cria-cobranca-geral" />
            <FlowStep step={2} title="Atualiza cobranca_status" desc="Status muda para 'enviando' em gestao_splits_contratos." />
            <FlowStep step={3} title="Webhook N8N processa" desc="N8N orquestra: valida dados, chama edge function ou API Asaas diretamente." />
            <FlowStep step={4} title="Edge Function gerar-cobranca-asaas" desc="Recebe payload, adiciona API key do Asaas (secret), cria customer e billings na API." />
            <FlowStep step={5} title="Callback de sucesso/erro" desc="Status atualizado para 'sucesso' ou 'erro' em gestao_splits_contratos.cobranca_status." />
          </div>
        </InfoBlock>

        <InfoBlock title="Payload Enviado ao Webhook">
          <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono">
            {`{
  "contrato_id": "uuid",
  "externalReference": "CTR-XXXXX",
  "customer": { name, cpfCnpj, email, phone, address },
  "billings": [{ value, dueDate, description, discount }],
  "splits": [{ walletId, fixedValue?, percentualValue? }],
  "credor_cedrus": "codigo_credor"
}`}
          </div>
        </InfoBlock>

        <InfoBlock title="Edge Function: gerar-cobranca-asaas">
          <p className="mb-2">Arquivo: <code>supabase/functions/gerar-cobranca-asaas/index.ts</code></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Recebe payload via POST</li>
            <li>Adiciona header <code>access_token</code> do Asaas (variável de ambiente)</li>
            <li>Cria customer no Asaas (se não existir)</li>
            <li>Cria cada billing (boleto) com splits configurados</li>
            <li>Retorna status e IDs dos boletos criados</li>
          </ul>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function FluxoGeracaoZapSign() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={FileSignature} title="Fluxo Técnico: Contrato ZapSign" subtitle="Edge function, campos dinâmicos e callback de assinatura" />

        <InfoBlock title="Sequência de Execução">
          <div className="space-y-3">
            <FlowStep step={1} title="Frontend invoca edge function" desc="Chamada a supabase.functions.invoke('gerar-contrato-zapsign') com dados do contrato." />
            <FlowStep step={2} title="Edge function processa" desc="Busca modelo de contrato, substitui campos dinâmicos, cria documento na API ZapSign." />
            <FlowStep step={3} title="Adiciona signatários" desc="Contratante e contratantes adicionais são adicionados como signatários no ZapSign." />
            <FlowStep step={4} title="Retorna URL" desc="URL do contrato é salva em gestao_splits_contratos.contrato_url." />
            <FlowStep step={5} title="Webhook de callback" desc="Quando assinado, o webhook-zapsign recebe a notificação e atualiza contrato_assinado=true." />
          </div>
        </InfoBlock>

        <InfoBlock title="Edge Functions Envolvidas">
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li><strong>gerar-contrato-zapsign:</strong> Cria o documento e adiciona signatários</li>
            <li><strong>webhook-zapsign:</strong> Recebe callbacks de assinatura do ZapSign</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Campos Dinâmicos">
          <p>Os campos do modelo (<code>gestao_splits_modelos_contrato_campos</code>) são substituídos no documento. Exemplo: <code>{"{{nome_contratante}}"}</code> → "João Silva". Tipos suportados: texto, data, número, moeda, lista.</p>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function FluxoCancelamento() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={XCircle} title="Fluxo Técnico: Cancelamento" subtitle="Webhook de cancelamento e processamento sequencial" />

        <InfoBlock title="Webhook de Cancelamento">
          <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono mb-2">
            POST https://n8n.superavit.app.br/webhook/cancela-boletos-asaas
          </div>
          <p>O cancelamento envia o <code>Identificador</code> (ID do boleto no Asaas) para o webhook que aciona a API do Asaas para cancelar.</p>
        </InfoBlock>

        <InfoBlock title="Cancelamento em Massa (Sequencial)">
          <div className="space-y-3">
            <FlowStep step={1} title="Seleção de cobranças" desc="Usuário seleciona N cobranças na tabela." />
            <FlowStep step={2} title="Modal BulkCancelamentoModal" desc="Exibe lista com status individual de cada cobrança." />
            <FlowStep step={3} title="Loop sequencial" desc="Para cada cobrança: POST ao webhook → aguarda resposta → atualiza status → delay de 1000ms." />
            <FlowStep step={4} title="Controle de interrupção" desc="abortRef.current permite parar o processamento a qualquer momento." />
          </div>
        </InfoBlock>

        <InfoBlock title="Implementação (BulkCancelamentoModal.tsx)">
          <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono">
            {`for (let i = 0; i < cobrancas.length; i++) {
  if (abortRef.current) break;
  setStatuses(s => s.map(...)); // status: "sending"
  const ok = await fetch(webhookUrl, { body: { Identificador } });
  setStatuses(s => s.map(...)); // status: "success" | "error"
  if (i < cobrancas.length - 1) await delay(1000);
}`}
          </div>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function SegurancaPermissoes() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Shield} title="Segurança e Permissões" subtitle="RLS, permissões por tela e proxy de API keys" />

        <InfoBlock title="Row Level Security (RLS)">
          <p className="mb-2">Todas as tabelas possuem RLS ativado. Políticas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>SELECT:</strong> Usuários autenticados podem ler dados (filtrados por client_permissions quando aplicável).</li>
            <li><strong>INSERT/UPDATE/DELETE:</strong> Validam <code>auth.uid()</code> e role do usuário.</li>
            <li><strong>Filtro por cliente:</strong> Queries filtram por <code>credor_cedrus</code> com base nas permissões do usuário.</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Sistema de Permissões por Tela">
          <p className="mb-2">Cada usuário possui permissões granulares por tela:</p>
          <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono">
            {`{ screen_key: "gestao-contratos", can_view: true, can_create: true, can_update: true, can_delete: false }`}
          </div>
          <p className="mt-2">Hooks: <code>useGestaoSplitsScreenPermissions</code>, componente <code>ProtectedScreen</code>.</p>
        </InfoBlock>

        <InfoBlock title="Permissões por Cliente">
          <p>Tabela <code>gestao_splits_client_permissions</code> define quais clientes/credores cada usuário pode acessar. O hook <code>useGestaoSplitsClientPermissions</code> filtra dados automaticamente.</p>
        </InfoBlock>

        <InfoBlock title="Edge Functions como Proxy Seguro">
          <p>Chaves de API do Asaas e ZapSign <strong>nunca são expostas no frontend</strong>. Toda chamada externa passa por Edge Functions que:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Validam autenticação do usuário (JWT)</li>
            <li>Adicionam API keys (variáveis de ambiente do Supabase)</li>
            <li>Processam e retornam os dados</li>
          </ul>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function EdgeFunctions() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Zap} title="Edge Functions" subtitle="Listagem completa das funções serverless" />

        <InfoBlock title="Funções Disponíveis">
          <div className="space-y-4">
            <div className="border rounded-lg p-3">
              <p className="font-mono text-sm font-semibold text-primary">gerar-cobranca-asaas</p>
              <p className="text-xs text-muted-foreground mt-1">Gera boletos no Asaas com splits. Recebe payload com customer, billings e splits. Retorna IDs dos boletos criados.</p>
              <p className="text-xs mt-1"><strong>Trigger:</strong> Invocação direta ou via webhook N8N</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-mono text-sm font-semibold text-primary">gerar-contrato-zapsign</p>
              <p className="text-xs text-muted-foreground mt-1">Cria contrato digital no ZapSign a partir de um modelo. Substitui campos dinâmicos e adiciona signatários.</p>
              <p className="text-xs mt-1"><strong>Trigger:</strong> Invocação direta do frontend</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-mono text-sm font-semibold text-primary">webhook-zapsign</p>
              <p className="text-xs text-muted-foreground mt-1">Recebe callbacks do ZapSign quando um contrato é assinado. Atualiza contrato_assinado e contrato_status.</p>
              <p className="text-xs mt-1"><strong>Trigger:</strong> Webhook callback do ZapSign</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-mono text-sm font-semibold text-primary">webhook-cria-cobranca</p>
              <p className="text-xs text-muted-foreground mt-1">Webhook para criação de cobranças a partir de fontes externas.</p>
              <p className="text-xs mt-1"><strong>Trigger:</strong> Webhook externo</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-mono text-sm font-semibold text-primary">delete-user</p>
              <p className="text-xs text-muted-foreground mt-1">Remove um usuário do sistema (auth.users). Requer permissão de admin.</p>
              <p className="text-xs mt-1"><strong>Trigger:</strong> Invocação do frontend (Gestão de Usuários)</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-mono text-sm font-semibold text-primary">migrate-users</p>
              <p className="text-xs text-muted-foreground mt-1">Migração de usuários entre sistemas. Uso administrativo.</p>
              <p className="text-xs mt-1"><strong>Trigger:</strong> Manual</p>
            </div>
          </div>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function HooksArquivos() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Code} title="Hooks e Arquivos" subtitle="Mapa completo de cada módulo" />

        <InfoBlock title="Módulo: Splits">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useSplits</TechBadge><TechBadge>useSplitsAnalytics</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/GestaoSplits.tsx</li>
            <li>src/hooks/useSplits.ts, useSplitsAnalytics.ts</li>
            <li>src/components/Splits/*</li>
            <li>src/utils/exportSplits.ts</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Contratos">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useGestaoContratos</TechBadge><TechBadge>useVendedoresContratos</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/GestaoContratos.tsx, NovoContrato.tsx, GestaoContratosEtapas.tsx</li>
            <li>src/hooks/useGestaoContratos.ts, useVendedoresContratos.ts</li>
            <li>src/components/GestaoContratos/*</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Cobranças">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useTodasCobrancas</TechBadge><TechBadge>useCobrancasAnalytics</TechBadge><TechBadge>useBulkUpdateCobrancas</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/TodasCobrancas.tsx, CriarCobranca.tsx</li>
            <li>src/hooks/useTodasCobrancas.ts, useBulkUpdateCobrancas.ts, useCobrancasSemSplits.ts</li>
            <li>src/components/TodasCobrancas/*</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Projetos e Beneficiários">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useGestaoSplitsProjetos</TechBadge><TechBadge>useGestaoSplitsBeneficiarios</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/GestaoProjetos.tsx, EditarProjeto.tsx, BeneficiariosSplits.tsx</li>
            <li>src/hooks/useGestaoSplitsProjetos.ts, useGestaoSplitsBeneficiarios.ts</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Valores Recebidos e Extrato">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useValoresRecebidosAsaas</TechBadge><TechBadge>useExtratoWebhook</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/RelatorioValoresRecebidos.tsx, Extrato.tsx</li>
            <li>src/hooks/useValoresRecebidosAsaas.ts, useExtratoWebhook.ts</li>
            <li>src/components/ValoresRecebidos/*, src/components/Extrato/*</li>
            <li>src/utils/exportValoresRecebidos.ts, exportExtrato.ts</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Modelos de Contrato">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useGestaoSplitsModelosContrato</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/ModelosContrato.tsx</li>
            <li>src/hooks/useGestaoSplitsModelosContrato.ts</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Permissões e Usuários">
          <div className="flex flex-wrap gap-2 mb-2"><TechBadge>useGestaoSplitsUserManagement</TechBadge><TechBadge>useGestaoSplitsScreenPermissions</TechBadge><TechBadge>useGestaoSplitsClientPermissions</TechBadge></div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/pages/GestaoUsuarios.tsx, EditarUsuario.tsx</li>
            <li>src/hooks/useGestaoSplitsUserManagement.ts, useGestaoSplitsUserRoles.ts</li>
            <li>src/hooks/useGestaoSplitsScreenPermissions.ts, useGestaoSplitsClientPermissions.ts</li>
            <li>src/components/UserManagement/*</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Módulo: Exportações">
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>src/utils/exportSplits.ts — Splits (Excel/PDF)</li>
            <li>src/utils/exportExtrato.ts — Extrato (Excel/PDF)</li>
            <li>src/utils/exportValoresRecebidos.ts — Valores Recebidos (Excel/PDF)</li>
            <li>src/utils/exportCobrancasPDF.ts — Cobranças (PDF)</li>
            <li>src/utils/exportContratoPDF.ts — Contrato (PDF)</li>
            <li>src/utils/exportDetalhesPDF.ts — Detalhes (PDF)</li>
            <li>src/utils/exportToExcel.ts — Genérico Excel</li>
            <li>src/utils/exportToPDF.ts — Genérico PDF</li>
            <li>src/utils/exportManualPDF.ts — Manual do Sistema (PDF)</li>
          </ul>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}
