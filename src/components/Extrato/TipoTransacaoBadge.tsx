import { Badge } from "@/components/ui/badge";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  Minus,
  CreditCard,
  DollarSign,
  RefreshCw,
  Send,
} from "lucide-react";

interface TipoTransacaoBadgeProps {
  type: string;
  description?: string | null;
}

const TRANSACTION_TYPES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success"; icon: any }
> = {
  REPASSE_SUPERAVIT: {
    label: "Repasse Superávit - Inadimplência",
    variant: "success",
    icon: CheckCircle,
  },
  INTERNAL_TRANSFER_CREDIT: {
    label: "Transferência (Crédito)",
    variant: "default",
    icon: ArrowDownCircle,
  },
  PAYMENT_RECEIVED: {
    label: "Pagamento Recebido",
    variant: "default",
    icon: CheckCircle,
  },
  PAYMENT_FEE: {
    label: "Taxa de Pagamento",
    variant: "destructive",
    icon: Minus,
  },
  INTERNAL_TRANSFER_DEBIT: {
    label: "Transferência (Débito)",
    variant: "destructive",
    icon: ArrowUpCircle,
  },
  PAYMENT_REFUND: {
    label: "Reembolso",
    variant: "secondary",
    icon: RefreshCw,
  },
  BANK_SLIP_FEE: {
    label: "Taxa de Boleto",
    variant: "destructive",
    icon: CreditCard,
  },
  CREDIT_CARD_FEE: {
    label: "Taxa de Cartão",
    variant: "destructive",
    icon: CreditCard,
  },
  PIX_FEE: {
    label: "Taxa PIX",
    variant: "destructive",
    icon: DollarSign,
  },
  TRANSFER: {
    label: "Transferência PIX",
    variant: "destructive",
    icon: Send,
  },
};

export function TipoTransacaoBadge({ type, description }: TipoTransacaoBadgeProps) {
  // Se for INTERNAL_TRANSFER_CREDIT e descrição contém SUPERAVIT SOLUCOES FINANCEIRAS
  const isRepasseSuperavit = 
    type === "INTERNAL_TRANSFER_CREDIT" && 
    description?.toUpperCase().includes("SUPERAVIT SOLUCOES FINANCEIRAS");
  
  const finalType = isRepasseSuperavit ? "REPASSE_SUPERAVIT" : type;
  
  const config = TRANSACTION_TYPES[finalType] || {
    label: type,
    variant: "outline" as const,
    icon: DollarSign,
  };

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
