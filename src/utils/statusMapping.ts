import { 
  Check, 
  Clock, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Eye, 
  CreditCard,
  Ban,
  ArrowDownLeft,
  AlertCircle,
  FileText,
  Hourglass,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trash2,
  RotateCcw,
  Receipt,
  Banknote,
  Split,
  Lock
} from 'lucide-react';

export type StatusVariant = 'success' | 'info' | 'warning' | 'destructive' | 'secondary' | 'outline';

export interface StatusConfig {
  label: string;
  variant: StatusVariant;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'positive' | 'processing' | 'alert' | 'negative';
}

// Mapeamento completo de todos os status Asaas (sem prefixo PAYMENT_)
export const STATUS_CONFIG: Record<string, StatusConfig> = {
  // ===== STATUS POSITIVOS (VERDE) =====
  AUTHORIZED: {
    label: 'Autorizado',
    variant: 'success',
    color: 'bg-green-500',
    icon: ShieldCheck,
    description: 'Pagamento autorizado pelo banco',
    category: 'positive'
  },
  APPROVED_BY_RISK_ANALYSIS: {
    label: 'Aprovado (Análise)',
    variant: 'success',
    color: 'bg-green-500',
    icon: ShieldCheck,
    description: 'Aprovado pela análise de risco',
    category: 'positive'
  },
  CONFIRMED: {
    label: 'Confirmado',
    variant: 'success',
    color: 'bg-green-600',
    icon: Check,
    description: 'Pagamento confirmado',
    category: 'positive'
  },
  RECEIVED: {
    label: 'Recebido',
    variant: 'success',
    color: 'bg-green-600',
    icon: Check,
    description: 'Pagamento recebido com sucesso',
    category: 'positive'
  },
  RECEIVED_IN_CASH: {
    label: 'Recebido em Dinheiro',
    variant: 'success',
    color: 'bg-green-500',
    icon: Banknote,
    description: 'Pagamento recebido em dinheiro',
    category: 'positive'
  },
  ANTICIPATED: {
    label: 'Antecipado',
    variant: 'success',
    color: 'bg-green-500',
    icon: ArrowDownLeft,
    description: 'Pagamento antecipado',
    category: 'positive'
  },
  RESTORED: {
    label: 'Restaurado',
    variant: 'success',
    color: 'bg-green-500',
    icon: RotateCcw,
    description: 'Cobrança restaurada',
    category: 'positive'
  },
  DUNNING_RECEIVED: {
    label: 'Negativação Recebida',
    variant: 'success',
    color: 'bg-green-500',
    icon: Receipt,
    description: 'Pagamento de negativação recebido',
    category: 'positive'
  },
  RECEIVED_SUPERAVIT: {
    label: 'Recebido pela Superavit (Inadimplência)',
    variant: 'success',
    color: 'bg-emerald-600',
    icon: Banknote,
    description: 'Pagamento de inadimplência recebido pela Superavit',
    category: 'positive'
  },

  // ===== STATUS DE PROCESSAMENTO (AZUL/CINZA) =====
  CREATED: {
    label: 'Criada',
    variant: 'info',
    color: 'bg-blue-500',
    icon: FileText,
    description: 'Cobrança criada',
    category: 'processing'
  },
  UPDATED: {
    label: 'Atualizada',
    variant: 'info',
    color: 'bg-blue-500',
    icon: RefreshCw,
    description: 'Cobrança atualizada',
    category: 'processing'
  },
  PENDING: {
    label: 'Pendente',
    variant: 'secondary',
    color: 'bg-gray-500',
    icon: Clock,
    description: 'Aguardando pagamento',
    category: 'processing'
  },
  AWAITING_RISK_ANALYSIS: {
    label: 'Em Análise de Risco',
    variant: 'info',
    color: 'bg-blue-500',
    icon: ShieldAlert,
    description: 'Aguardando análise de risco',
    category: 'processing'
  },
  REFUND_IN_PROGRESS: {
    label: 'Estorno em Progresso',
    variant: 'info',
    color: 'bg-blue-500',
    icon: RefreshCw,
    description: 'Processando estorno',
    category: 'processing'
  },
  BANK_SLIP_VIEWED: {
    label: 'Boleto Visualizado',
    variant: 'info',
    color: 'bg-blue-400',
    icon: Eye,
    description: 'Boleto foi visualizado pelo cliente',
    category: 'processing'
  },
  CHECKOUT_VIEWED: {
    label: 'Checkout Visualizado',
    variant: 'info',
    color: 'bg-blue-400',
    icon: Eye,
    description: 'Checkout foi visualizado pelo cliente',
    category: 'processing'
  },

  // ===== STATUS DE ALERTA (AMARELO/LARANJA) =====
  OVERDUE: {
    label: 'Vencido',
    variant: 'warning',
    color: 'bg-yellow-500',
    icon: AlertTriangle,
    description: 'Cobrança vencida',
    category: 'alert'
  },
  OVERDUE_NEGOCIADA: {
    label: 'Vencida e Negociada',
    variant: 'info',
    color: 'bg-purple-500',
    icon: Hourglass,
    description: 'Cobrança vencida mas negociada',
    category: 'alert'
  },
  CHARGEBACK_DISPUTE: {
    label: 'Chargeback em Disputa',
    variant: 'warning',
    color: 'bg-orange-500',
    icon: AlertCircle,
    description: 'Disputa de chargeback em andamento',
    category: 'alert'
  },
  AWAITING_CHARGEBACK_REVERSAL: {
    label: 'Aguardando Reversão',
    variant: 'warning',
    color: 'bg-orange-500',
    icon: Hourglass,
    description: 'Aguardando reversão de chargeback',
    category: 'alert'
  },
  DUNNING_REQUESTED: {
    label: 'Negativação Solicitada',
    variant: 'warning',
    color: 'bg-yellow-500',
    icon: AlertTriangle,
    description: 'Negativação solicitada',
    category: 'alert'
  },
  SPLIT_DIVERGENCE_BLOCK: {
    label: 'Split Bloqueado',
    variant: 'warning',
    color: 'bg-orange-500',
    icon: Lock,
    description: 'Split bloqueado por divergência',
    category: 'alert'
  },
  SPLIT_DIVERGENCE_BLOCK_FINISHED: {
    label: 'Bloqueio Finalizado',
    variant: 'warning',
    color: 'bg-yellow-600',
    icon: Split,
    description: 'Bloqueio de split finalizado',
    category: 'alert'
  },
  PARTIALLY_REFUNDED: {
    label: 'Parcialmente Estornado',
    variant: 'warning',
    color: 'bg-orange-500',
    icon: ArrowDownLeft,
    description: 'Pagamento parcialmente estornado',
    category: 'alert'
  },

  // ===== STATUS NEGATIVOS (VERMELHO) =====
  REPROVED_BY_RISK_ANALYSIS: {
    label: 'Reprovado (Análise)',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: ShieldX,
    description: 'Reprovado pela análise de risco',
    category: 'negative'
  },
  DELETED: {
    label: 'Excluída',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: Trash2,
    description: 'Cobrança excluída',
    category: 'negative'
  },
  REFUNDED: {
    label: 'Estornado',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: ArrowDownLeft,
    description: 'Pagamento estornado',
    category: 'negative'
  },
  REFUND_DENIED: {
    label: 'Estorno Negado',
    variant: 'destructive',
    color: 'bg-red-600',
    icon: Ban,
    description: 'Solicitação de estorno negada',
    category: 'negative'
  },
  RECEIVED_IN_CASH_UNDONE: {
    label: 'Dinheiro Desfeito',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: X,
    description: 'Recebimento em dinheiro desfeito',
    category: 'negative'
  },
  CHARGEBACK_REQUESTED: {
    label: 'Chargeback Solicitado',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: AlertCircle,
    description: 'Cliente solicitou chargeback',
    category: 'negative'
  },
  CREDIT_CARD_CAPTURE_REFUSED: {
    label: 'Cartão Recusado',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: CreditCard,
    description: 'Captura do cartão recusada',
    category: 'negative'
  },
  SPLIT_CANCELLED: {
    label: 'Split Cancelado',
    variant: 'destructive',
    color: 'bg-red-500',
    icon: Split,
    description: 'Split de pagamento cancelado',
    category: 'negative'
  }
};

// Função para obter configuração de status
export function getStatusConfig(status: string | null): StatusConfig {
  if (!status) {
    return {
      label: '-',
      variant: 'outline',
      color: 'bg-gray-400',
      icon: Clock,
      description: 'Status não definido',
      category: 'processing'
    };
  }

  // Remover prefixo PAYMENT_ se existir
  const normalizedStatus = status.replace(/^PAYMENT_/, '');
  
  return STATUS_CONFIG[normalizedStatus] || {
    label: normalizedStatus,
    variant: 'outline',
    color: 'bg-gray-400',
    icon: Clock,
    description: `Status: ${normalizedStatus}`,
    category: 'processing'
  };
}

// Função para obter lista de status por categoria
export function getStatusByCategory(category: StatusConfig['category']): string[] {
  return Object.entries(STATUS_CONFIG)
    .filter(([_, config]) => config.category === category)
    .map(([key]) => key);
}

// Lista de todos os status para selects
export function getAllStatusOptions(): { value: string; label: string; category: string }[] {
  return Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
    category: config.category
  }));
}

// Agrupar status por categoria para exibição
export function getStatusGroupedByCategory() {
  return {
    positive: getStatusByCategory('positive'),
    processing: getStatusByCategory('processing'),
    alert: getStatusByCategory('alert'),
    negative: getStatusByCategory('negative')
  };
}
