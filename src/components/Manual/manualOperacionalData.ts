export interface ManualSection {
  id: string;
  label: string;
  icon: string;
}

export const SECOES_OPERACIONAL: ManualSection[] = [
  { id: "visao-geral", label: "Visão Geral", icon: "BookOpen" },
  { id: "cadastros-necessarios", label: "Cadastros Necessários", icon: "ClipboardList" },
  { id: "fluxo-criacao-contrato", label: "Fluxo: Criação de Contrato", icon: "FileText" },
  { id: "geracao-cobranca", label: "Geração de Cobrança", icon: "Receipt" },
  { id: "geracao-contrato-digital", label: "Contrato Digital (ZapSign)", icon: "FileSignature" },
  { id: "cancelamento-cobrancas", label: "Cancelamento de Cobranças", icon: "XCircle" },
  { id: "alteracao-contratos", label: "Alteração de Contratos", icon: "Edit" },
  { id: "gestao-splits", label: "Gestão de Splits", icon: "BarChart3" },
  { id: "extrato-bancario", label: "Extrato Bancário", icon: "Landmark" },
  { id: "todas-cobrancas", label: "Todas as Cobranças", icon: "DollarSign" },
  { id: "valores-recebidos", label: "Valores Recebidos", icon: "Wallet" },
  { id: "bancos-dados", label: "Bancos de Dados Utilizados", icon: "Database" },
];
