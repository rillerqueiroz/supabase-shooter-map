export interface ManualSection {
  id: string;
  label: string;
  icon: string;
}

export const SECOES_TECNICO: ManualSection[] = [
  { id: "arquitetura", label: "Arquitetura do Sistema", icon: "Server" },
  { id: "mapa-tabelas", label: "Mapa de Tabelas e Conexões", icon: "Database" },
  { id: "fluxo-criacao-contrato", label: "Fluxo: Criação de Contrato", icon: "FileText" },
  { id: "fluxo-geracao-cobranca", label: "Fluxo: Geração de Cobrança", icon: "Receipt" },
  { id: "fluxo-geracao-zapsign", label: "Fluxo: Contrato ZapSign", icon: "FileSignature" },
  { id: "fluxo-cancelamento", label: "Fluxo: Cancelamento", icon: "XCircle" },
  { id: "seguranca-permissoes", label: "Segurança e Permissões", icon: "Shield" },
  { id: "edge-functions", label: "Edge Functions", icon: "Zap" },
  { id: "hooks-arquivos", label: "Hooks e Arquivos", icon: "Code" },
];
