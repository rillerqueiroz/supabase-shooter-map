import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, ClipboardList, FileText, Receipt, FileSignature,
  XCircle, Edit, BarChart3, Landmark, DollarSign, Wallet, Database, ArrowRight,
} from "lucide-react";
import { SectionHeader, InfoBlock, FlowStep, AlertBlock, SimpleTableInfo } from "./ManualShared";

export function ManualOperacionalContent({ secaoAtiva }: { secaoAtiva: string }) {
  switch (secaoAtiva) {
    case "visao-geral": return <VisaoGeral />;
    case "cadastros-necessarios": return <CadastrosNecessarios />;
    case "fluxo-criacao-contrato": return <FluxoCriacaoContrato />;
    case "geracao-cobranca": return <GeracaoCobranca />;
    case "geracao-contrato-digital": return <GeracaoContratoDigital />;
    case "cancelamento-cobrancas": return <CancelamentoCobrancas />;
    case "alteracao-contratos": return <AlteracaoContratos />;
    case "gestao-splits": return <GestaoSplits />;
    case "extrato-bancario": return <ExtratoBancario />;
    case "todas-cobrancas": return <TodasCobrancas />;
    case "valores-recebidos": return <ValoresRecebidos />;
    case "bancos-dados": return <BancosDados />;
    default: return <VisaoGeral />;
  }
}

function VisaoGeral() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={BookOpen} title="Visão Geral do Sistema" subtitle="O que é o Superávit e como ele funciona" />
        <InfoBlock title="O que é este sistema?">
          <p className="mb-3">O Superávit é uma plataforma de <strong>gestão financeira</strong> que permite criar cobranças (boletos), dividir valores automaticamente entre parceiros (splits), gerar contratos digitais e acompanhar todo o ciclo de pagamentos.</p>
          <p>Ele se conecta com três serviços externos que fazem o trabalho pesado:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Asaas:</strong> Gera os boletos e processa pagamentos. É o "banco" do sistema.</li>
            <li><strong>ZapSign:</strong> Cria contratos digitais e coleta assinaturas eletrônicas.</li>
            <li><strong>Cedrus:</strong> Sistema de gestão de títulos e inadimplência.</li>
          </ul>
        </InfoBlock>
        <InfoBlock title="Fluxo Geral de Trabalho">
          <p className="mb-3">Para gerar uma cobrança completa com divisão de valores, siga esta ordem:</p>
          <div className="space-y-3">
            <FlowStep step={1} title="Cadastrar Beneficiários" desc="Registre quem vai receber parte dos valores (carteiras/wallets no Asaas)." />
            <FlowStep step={2} title="Criar um Projeto" desc="Configure como os valores serão divididos entre os beneficiários." />
            <FlowStep step={3} title="Criar o Contrato/Cobrança" desc="Preencha os dados do contratante, vincule ao projeto e gere os boletos." />
            <FlowStep step={4} title="Acompanhar" desc="Monitore pagamentos pelo Extrato, Valores Recebidos e Todas as Cobranças." />
          </div>
        </InfoBlock>
        <AlertBlock type="important">
          <strong>Ordem obrigatória:</strong> Você precisa ter ao menos 1 beneficiário e 1 projeto configurado antes de criar qualquer cobrança com splits.
        </AlertBlock>
      </CardContent>
    </Card>
  );
}

function CadastrosNecessarios() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={ClipboardList} title="Cadastros Necessários (Pré-requisitos)" subtitle="O que precisa estar pronto antes de gerar cobranças" />
        <AlertBlock type="warning">
          Antes de criar qualquer contrato ou cobrança, os cadastros abaixo devem estar feitos, nesta ordem.
        </AlertBlock>

        <InfoBlock title="1. Beneficiários (Tela: Beneficiários de Splits)">
          <p>Beneficiários são as <strong>pessoas ou empresas que recebem parte do valor</strong> de cada cobrança. Cada um possui uma "carteira" (wallet) no Asaas.</p>
          <p className="mt-2"><strong>O que cadastrar:</strong> Nome, Wallet ID (fornecido pelo Asaas) e descrição.</p>
          <p className="mt-1"><strong>Exemplo:</strong> Se uma construtora divide valores com uma imobiliária, cada uma tem seu beneficiário.</p>
        </InfoBlock>

        <InfoBlock title="2. Projetos (Tela: Gestão de Projetos)">
          <p>Projetos definem <strong>as regras de divisão de valores</strong>. Cada projeto pertence a um credor e contém N splits configurados.</p>
          <p className="mt-2"><strong>O que configurar:</strong> Nome do projeto, credor vinculado, e para cada split: beneficiário, tipo (valor fixo R$ ou percentual %), e o valor.</p>
          <p className="mt-1"><strong>Validação:</strong> A soma dos splits percentuais não pode exceder 100%.</p>
        </InfoBlock>

        <InfoBlock title="3. Modelos de Contrato (Opcional — Tela: Modelos de Contrato)">
          <p>Se você vai gerar <strong>contratos digitais</strong> junto com os boletos, precisa ter ao menos um modelo cadastrado.</p>
          <p className="mt-2"><strong>O que configurar:</strong> Nome, credor, documento base (template) e campos dinâmicos (variáveis que serão preenchidas em cada contrato).</p>
        </InfoBlock>

        <InfoBlock title="4. Etapas de Contratos (Tela: Etapas de Contratos)">
          <p>As etapas formam o <strong>pipeline de acompanhamento</strong> dos contratos. Por exemplo: Novo → Em Análise → Aguardando Assinatura → Assinado → Concluído.</p>
          <p className="mt-2"><strong>O que configurar:</strong> Nome da etapa, cor, descrição e ordem no pipeline.</p>
        </InfoBlock>

        <InfoBlock title="Diagrama de Vinculação">
          <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Beneficiário</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-semibold">Projeto (com splits)</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-semibold">Contrato/Cobrança</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-semibold">Boletos + Splits Automáticos</span>
            </div>
          </div>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function FluxoCriacaoContrato() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={FileText} title="Fluxo Completo: Criação de Contrato" subtitle="Passo a passo detalhado da criação de contratos e cobranças" />

        <InfoBlock title="Passo a Passo">
          <div className="space-y-3">
            <FlowStep step={1} title="Selecionar Cliente/Credor" desc="Escolha o credor que receberá os valores. Isso filtra os projetos disponíveis." />
            <FlowStep step={2} title="Selecionar Projeto" desc="O projeto define quais splits serão aplicados automaticamente nos boletos." />
            <FlowStep step={3} title="Tipo de Geração" desc="Escolha: apenas Contrato (ZapSign), apenas Boleto (Asaas), ou Contrato + Boleto." />
            <FlowStep step={4} title="Dados do Contratante" desc="Preencha nome, CPF/CNPJ (mín. 11 dígitos), telefone e e-mail. O sistema valida o CPF." />
            <FlowStep step={5} title="Endereço" desc="CEP (busca automática), rua, número, complemento, bairro, cidade e estado." />
            <FlowStep step={6} title="Configurar Boletos" desc="Defina quantidade, valor unitário, data do 1º vencimento. Parcelas seguintes são mensais." />
            <FlowStep step={7} title="Desconto de Pontualidade (Opcional)" desc="Configure desconto fixo (R$) ou percentual (%) para pagamento antes do vencimento." />
            <FlowStep step={8} title="Splits Adicionais (Opcional)" desc="Além dos splits do projeto, pode adicionar splits extras para comissões de vendedores." />
            <FlowStep step={9} title="Contrato Digital (Opcional)" desc="Se ativado, selecione o modelo e preencha os campos dinâmicos." />
            <FlowStep step={10} title="Confirmar Criação" desc="Modal de resumo com todos os dados e valores. Ao confirmar, os dados são salvos." />
          </div>
        </InfoBlock>

        <AlertBlock type="info">
          <strong>O que acontece ao confirmar:</strong> Os dados do contrato são salvos no banco de dados. Uma cópia (snapshot) dos splits do projeto é gravada junto ao contrato, garantindo que mesmo que o projeto mude depois, a cobrança mantém os splits originais.
        </AlertBlock>

        <InfoBlock title="Vendedores e Comissões">
          <p>Ao criar um contrato, é possível vincular vendedores que receberão comissão. A comissão do vendedor é configurada como um split adicional (fixo ou percentual) que será incluído na geração dos boletos.</p>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function GeracaoCobranca() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Receipt} title="Geração de Cobrança (Asaas)" subtitle="Como os boletos são gerados e processados" />

        <InfoBlock title="Como Funciona">
          <p>Após criar o contrato, os boletos não são gerados imediatamente. Você precisa <strong>acionar a geração</strong> na tela de Gestão de Contratos:</p>
          <div className="space-y-3 mt-3">
            <FlowStep step={1} title="Abrir Gestão de Contratos" desc="Encontre o contrato desejado na listagem." />
            <FlowStep step={2} title="Clicar em 'Gerar Cobrança'" desc="O sistema envia os dados para o Asaas via um serviço intermediário (webhook)." />
            <FlowStep step={3} title="Acompanhar Status" desc="O status muda: Pendente → Enviando → Sucesso ou Erro." />
          </div>
        </InfoBlock>

        <InfoBlock title="Status de Integração">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Pendente:</strong> Aguardando envio ao Asaas.</li>
            <li><strong>Enviando:</strong> Em processamento (aguarde).</li>
            <li><strong>Sucesso:</strong> Boletos gerados com sucesso no Asaas.</li>
            <li><strong>Erro:</strong> Falha na geração. Verifique os dados e tente reprocessar.</li>
          </ul>
        </InfoBlock>

        <AlertBlock type="warning">
          Em caso de erro, você pode clicar em "Reprocessar" para tentar novamente. Verifique se os dados do contratante (CPF, e-mail) estão corretos.
        </AlertBlock>

        <InfoBlock title="O que é enviado ao Asaas">
          <p>O sistema monta um pacote com: dados do pagador (nome, CPF, contato), lista de boletos (valor, vencimento), splits (quem recebe quanto) e desconto de pontualidade (se houver).</p>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function GeracaoContratoDigital() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={FileSignature} title="Geração de Contrato Digital (ZapSign)" subtitle="Contratos digitais com assinatura eletrônica" />

        <InfoBlock title="Como Funciona">
          <p>Se o contrato foi criado com a opção de gerar contrato digital:</p>
          <div className="space-y-3 mt-3">
            <FlowStep step={1} title="Gerar Contrato" desc="Na Gestão de Contratos, clique em 'Gerar Contrato'. O sistema usa o modelo selecionado." />
            <FlowStep step={2} title="Campos Dinâmicos" desc="Os campos do modelo são preenchidos com os dados do contratante (nome, CPF, endereço, valores)." />
            <FlowStep step={3} title="Envio para Assinatura" desc="O contrato é criado no ZapSign e enviado automaticamente para o contratante assinar." />
            <FlowStep step={4} title="Acompanhamento" desc="O status é atualizado: pendente → enviado → assinado." />
          </div>
        </InfoBlock>

        <InfoBlock title="Acompanhando a Assinatura">
          <p>Na coluna "Status Contrato" da Gestão de Contratos, você verá se o contrato já foi assinado. Quando o contratante assina no ZapSign, o sistema recebe a notificação automaticamente.</p>
        </InfoBlock>

        <AlertBlock type="info">
          O link do contrato no ZapSign fica disponível na coluna "URL Contrato" para envio manual, se necessário.
        </AlertBlock>
      </CardContent>
    </Card>
  );
}

function CancelamentoCobrancas() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={XCircle} title="Cancelamento de Cobranças" subtitle="Como cancelar boletos individuais ou em massa" />

        <InfoBlock title="Cancelamento Individual">
          <p>Na tela de <strong>Todas as Cobranças</strong>, selecione a cobrança desejada e use a opção de cancelamento. O sistema envia a solicitação ao Asaas para cancelar o boleto.</p>
        </InfoBlock>

        <InfoBlock title="Cancelamento em Massa">
          <p>Para cancelar múltiplas cobranças de uma vez:</p>
          <div className="space-y-3 mt-3">
            <FlowStep step={1} title="Selecionar Cobranças" desc="Marque as cobranças na tabela usando os checkboxes." />
            <FlowStep step={2} title="Clicar em 'Cancelar Selecionadas'" desc="Um modal de progresso aparecerá." />
            <FlowStep step={3} title="Processamento Sequencial" desc="As cobranças são canceladas uma por uma, com intervalo de 1 segundo entre cada. Isso evita sobrecarga no Asaas." />
            <FlowStep step={4} title="Acompanhar Progresso" desc="O modal mostra em tempo real: total, processados, sucesso e erros." />
          </div>
        </InfoBlock>

        <AlertBlock type="warning">
          O cancelamento é <strong>irreversível</strong>. Uma vez cancelado no Asaas, o boleto não pode ser reativado. Será necessário gerar novos boletos.
        </AlertBlock>

        <InfoBlock title="Interromper Cancelamento">
          <p>Se necessário, você pode clicar em "Interromper" durante o processamento. As cobranças já processadas não serão desfeitas, mas as restantes não serão enviadas.</p>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function AlteracaoContratos() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Edit} title="Alteração de Contratos" subtitle="Como editar contratos existentes" />

        <InfoBlock title="O que pode ser alterado">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dados do Contratante:</strong> Nome, CPF/CNPJ, telefone, e-mail, endereço.</li>
            <li><strong>Etapa:</strong> Mover o contrato para outra etapa do pipeline (ex: de "Novo" para "Em Análise").</li>
            <li><strong>Splits:</strong> Reconfigurar os splits do contrato (remove os anteriores e insere os novos).</li>
            <li><strong>Dados financeiros:</strong> Valor dos boletos, quantidade, datas.</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="Mudança de Etapa">
          <p>Ao mover um contrato para outra etapa, o sistema registra automaticamente no histórico: etapa anterior, nova etapa, data/hora e quem fez a alteração. Esse histórico pode ser consultado nos detalhes do contrato.</p>
        </InfoBlock>

        <AlertBlock type="warning">
          <strong>Atenção:</strong> Alterar splits de um contrato que já teve boletos gerados no Asaas não altera os boletos existentes. Os novos splits valerão apenas para futuras gerações.
        </AlertBlock>
      </CardContent>
    </Card>
  );
}

function GestaoSplits() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={BarChart3} title="Gestão de Splits" subtitle="Relatório e análise dos splits financeiros" />
        <InfoBlock title="O que são Splits?">
          <p>Splits são a <strong>divisão automática de valores</strong> de uma cobrança entre diferentes beneficiários. Quando um boleto é pago, o valor é dividido conforme as regras configuradas no projeto.</p>
        </InfoBlock>
        <InfoBlock title="Funcionalidades">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cards de Métricas:</strong> Total de splits, valor total, quantidade por tipo.</li>
            <li><strong>Tabela:</strong> Lista todos os splits com pagador, wallet, tipo, valor e data.</li>
            <li><strong>Filtros:</strong> Por pagador, wallet ID, cliente e busca textual.</li>
            <li><strong>Aba Analytics:</strong> Gráficos e análises visuais.</li>
            <li><strong>Exportação:</strong> Excel (.xlsx) e PDF.</li>
            <li><strong>Modal de Detalhes:</strong> Clique em um split para ver todos os detalhes.</li>
          </ul>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function ExtratoBancario() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Landmark} title="Extrato Bancário" subtitle="Movimentações financeiras do Asaas" />
        <InfoBlock title="Como Consultar">
          <div className="space-y-3">
            <FlowStep step={1} title="Selecionar Cliente" desc="Escolha o credor cujo extrato deseja consultar." />
            <FlowStep step={2} title="Definir Período" desc="Semana, mês, trimestre ou período personalizado." />
            <FlowStep step={3} title="Consultar" desc="Os dados são buscados em tempo real do Asaas." />
            <FlowStep step={4} title="Analisar" desc="Cards com entradas, saídas e saldo. Tabela com cada transação." />
          </div>
        </InfoBlock>
        <InfoBlock title="Funcionalidades">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cards de Métricas:</strong> Total de entradas, saídas, saldo líquido.</li>
            <li><strong>Tabela:</strong> Data, tipo, valor, descrição, saldo.</li>
            <li><strong>Identificação do Devedor:</strong> Para transferências internas, o sistema busca o nome do devedor pela fatura.</li>
            <li><strong>Modal de Detalhes:</strong> Informações completas de cada transação.</li>
            <li><strong>Exportação:</strong> Excel e PDF.</li>
          </ul>
        </InfoBlock>
        <AlertBlock type="info">Os dados do extrato são buscados em tempo real do Asaas e não ficam salvos no sistema.</AlertBlock>
      </CardContent>
    </Card>
  );
}

function TodasCobrancas() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={DollarSign} title="Todas as Cobranças" subtitle="Visão consolidada de todas as cobranças" />
        <InfoBlock title="Visão Geral">
          <p>Centraliza <strong>todas as cobranças</strong> do sistema, de todos os credores e projetos. Permite acompanhar status, editar em lote e analisar métricas.</p>
        </InfoBlock>
        <InfoBlock title="Abas Disponíveis">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cobranças:</strong> Tabela principal com filtros e edição em lote.</li>
            <li><strong>Analytics:</strong> Gráficos por status, período e valor.</li>
            <li><strong>Sem Splits:</strong> Cobranças sem splits configurados.</li>
            <li><strong>Apagadas:</strong> Cobranças removidas.</li>
          </ul>
        </InfoBlock>
        <InfoBlock title="Ações Disponíveis">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Filtros:</strong> Nome, unidade, status, forma de pagamento, período.</li>
            <li><strong>Edição em Lote:</strong> Selecione múltiplas e edite campos.</li>
            <li><strong>Cancelamento em Massa:</strong> Cancele múltiplas cobranças sequencialmente.</li>
            <li><strong>Exportação:</strong> Excel.</li>
            <li><strong>Somatório:</strong> Rodapé com totais.</li>
          </ul>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function ValoresRecebidos() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Wallet} title="Valores Recebidos" subtitle="O que foi efetivamente pago" />
        <InfoBlock title="Diferença de 'Todas as Cobranças'">
          <p>"Todas as Cobranças" mostra o que foi <strong>cobrado</strong> (expectativa). "Valores Recebidos" mostra o que foi <strong>efetivamente pago</strong> (realidade). Os dados vêm diretamente do gateway de pagamento Asaas.</p>
        </InfoBlock>
        <InfoBlock title="Funcionalidades">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cards de Métricas:</strong> Total recebido, quantidade, ticket médio.</li>
            <li><strong>Filtros:</strong> Nome, unidade, forma/meio de pagamento, período.</li>
            <li><strong>Tabela:</strong> Lista de cada valor recebido com detalhes.</li>
            <li><strong>Exportação:</strong> Excel e PDF.</li>
            <li><strong>Permissões:</strong> Controle de acesso por usuário.</li>
          </ul>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}

function BancosDados() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <SectionHeader icon={Database} title="Bancos de Dados Utilizados" subtitle="Onde o sistema armazena as informações" />

        <InfoBlock title="O que é um 'banco de dados' no contexto deste sistema?">
          <p>Cada módulo do sistema armazena informações em tabelas organizadas. Pense nelas como planilhas especializadas que guardam dados de forma estruturada e segura.</p>
        </InfoBlock>

        <InfoBlock title="📦 Módulo de Splits e Projetos">
          <div className="space-y-2">
            <SimpleTableInfo tableName="Beneficiários" description="Guarda os dados de quem recebe valores: nome, carteira (wallet) e status." />
            <SimpleTableInfo tableName="Projetos" description="Armazena as configurações de cada projeto: nome, credor, descrição e status." />
            <SimpleTableInfo tableName="Splits do Projeto" description="Define como o valor é dividido em cada projeto: beneficiário, tipo (fixo/%) e valor." />
            <SimpleTableInfo tableName="Relatório de Splits" description="Visão consolidada com todos os splits executados: pagador, wallet, valor e data." />
          </div>
        </InfoBlock>

        <InfoBlock title="📋 Módulo de Contratos">
          <div className="space-y-2">
            <SimpleTableInfo tableName="Contratos" description="Dados de cada contrato: contratante, credor, projeto, tipo de geração, status e valores." />
            <SimpleTableInfo tableName="Etapas" description="Pipeline de acompanhamento: nome da etapa, cor, ordem." />
            <SimpleTableInfo tableName="Histórico de Etapas" description="Registro de movimentações: de qual etapa para qual, quando e quem moveu." />
            <SimpleTableInfo tableName="Modelos de Contrato" description="Templates para contratos digitais: nome, credor e documento base." />
            <SimpleTableInfo tableName="Campos do Modelo" description="Variáveis dinâmicas de cada modelo: nome, tipo e valor padrão." />
          </div>
        </InfoBlock>

        <InfoBlock title="💰 Módulo de Cobranças">
          <div className="space-y-2">
            <SimpleTableInfo tableName="Cobranças" description="Dados de boletos gerados: contratante, projeto, valores, status de envio ao Asaas." />
            <SimpleTableInfo tableName="Splits da Cobrança" description="Cópia (snapshot) dos splits no momento da criação. Garante que mudanças futuras no projeto não afetem cobranças já geradas." />
            <SimpleTableInfo tableName="Base de Gerenciamento" description="Visão consolidada de todas as cobranças com dados de devedor, credor e status." />
            <SimpleTableInfo tableName="Valores Recebidos" description="Registros de pagamentos confirmados pelo Asaas." />
          </div>
        </InfoBlock>

        <InfoBlock title="🔐 Módulo de Permissões">
          <div className="space-y-2">
            <SimpleTableInfo tableName="Papéis de Usuário" description="Define o nível de acesso: admin, operador ou visualizador." />
            <SimpleTableInfo tableName="Permissões por Tela" description="Controla o que cada usuário pode fazer em cada tela: ver, criar, editar ou excluir." />
            <SimpleTableInfo tableName="Permissões por Cliente" description="Define quais clientes/credores cada usuário pode acessar." />
          </div>
        </InfoBlock>
      </CardContent>
    </Card>
  );
}
