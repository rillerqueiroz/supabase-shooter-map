import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { StatusIntegracao } from '@/hooks/useGestaoContratos';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusIntegracaoBadgeProps {
  status: StatusIntegracao;
  tipo: 'cobranca' | 'contrato';
  erroMensagem?: string | null;
  className?: string;
}

const statusConfig: Record<StatusIntegracao, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ElementType;
}> = {
  pendente: {
    label: 'Pendente',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground',
    icon: Clock
  },
  enviando: {
    label: 'Enviando...',
    variant: 'outline',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: Loader2
  },
  sucesso: {
    label: 'Sucesso',
    variant: 'default',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle
  },
  erro: {
    label: 'Erro',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: XCircle
  },
  reprocessar: {
    label: 'Reprocessar',
    variant: 'outline',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: RefreshCw
  }
};

export function StatusIntegracaoBadge({ status, tipo, erroMensagem, className }: StatusIntegracaoBadgeProps) {
  const config = statusConfig[status] || statusConfig.pendente;
  const Icon = config.icon;
  const isAnimating = status === 'enviando';

  const badge = (
    <Badge 
      variant={config.variant} 
      className={`text-xs ${config.className} ${className || ''}`}
    >
      <Icon className={`h-3 w-3 mr-1 ${isAnimating ? 'animate-spin' : ''}`} />
      {tipo === 'cobranca' ? 'Cobrança' : 'Contrato'}: {config.label}
    </Badge>
  );

  if (status === 'erro' && erroMensagem) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{erroMensagem}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
