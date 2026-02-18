import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, GripVertical, Phone } from 'lucide-react';
import { ControleZapsign } from '@/hooks/useControleZapsign';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  registro: ControleZapsign;
  onNameClick: (nome: string) => void;
  onCredorClick: (credor: string) => void;
  isDragOverlay?: boolean;
}

export function KanbanCard({ 
  registro, 
  onNameClick, 
  onCredorClick,
  isDragOverlay = false 
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: registro.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Format name for better readability
  const formatName = (name: string | null) => {
    if (!name) return '-';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab active:cursor-grabbing bg-card shadow-sm hover:shadow-md transition-shadow',
        isDragging && 'opacity-50',
        isDragOverlay && 'shadow-lg rotate-2'
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 text-muted-foreground hover:text-foreground cursor-grab"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => registro.nome && onNameClick(registro.nome)}
              className="font-medium text-sm text-left hover:text-primary hover:underline transition-colors block w-full truncate"
              title={registro.nome || undefined}
            >
              {formatName(registro.nome)}
            </button>
            <p className="text-xs text-muted-foreground truncate">
              {registro.cpf_cnpj || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-primary">
            {formatCurrency(registro.valor_total_negociado)}
          </span>
          <span className="text-muted-foreground">
            {formatDate(registro.data_criacao)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {registro.credor_cedrus && (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-accent"
              onClick={() => onCredorClick(registro.credor_cedrus!)}
            >
              {registro.credor_cedrus}
            </Badge>
          )}
          {registro.origem && (
            <Badge variant="secondary" className="text-xs">
              {registro.origem}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          {registro.telefone_devedor && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{registro.telefone_devedor}</span>
            </div>
          )}
          {registro.link_assinatura_zapsign && (
            <a
              href={registro.link_assinatura_zapsign}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Link
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
