import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTitulosLogAlteracoes } from "@/hooks/useTitulosLogAlteracoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Loader2, User, Clock, Plus, Edit } from "lucide-react";

interface TituloHistoricoSectionProps {
  tituloId: string;
  dataCriacao?: string | null;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const getOrigemBadge = (origem: string) => {
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    sistema_interno: { variant: "default", label: "Sistema" },
    manual_externo: { variant: "secondary", label: "Manual Externo" },
    api: { variant: "outline", label: "API" },
    importacao: { variant: "outline", label: "Importação" },
    usuario: { variant: "default", label: "Usuário" },
    criacao: { variant: "secondary", label: "Criação" },
  };
  const config = variants[origem] || { variant: "outline" as const, label: origem };
  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
};

export function TituloHistoricoSection({ tituloId, dataCriacao }: TituloHistoricoSectionProps) {
  const { data: logs, isLoading } = useTitulosLogAlteracoes(tituloId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasLogs = logs && logs.length > 0;
  const hasCriacao = dataCriacao;

  if (!hasLogs && !hasCriacao) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <History className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhuma alteração registrada</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[350px] pr-4">
      <div className="space-y-3">
        {/* Logs de alterações */}
        {logs?.map((log) => (
          <div
            key={log.id}
            className="relative pl-6 pb-3 border-l-2 border-border"
          >
            <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
            
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono text-xs">
                    {log.campo_alterado}
                  </Badge>
                  {getOrigemBadge(log.origem)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(log.created_at)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Anterior:</span>
                  <p className="font-medium text-destructive/80 truncate">
                    {log.valor_anterior || "(vazio)"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Novo:</span>
                  <p className="font-medium text-green-600 dark:text-green-400 truncate">
                    {log.valor_novo || "(vazio)"}
                  </p>
                </div>
              </div>

              {log.descricao && (
                <p className="text-xs text-muted-foreground italic">{log.descricao}</p>
              )}

              {log.usuario_email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {log.usuario_email}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Evento de criação do título */}
        {hasCriacao && (
          <div className="relative pl-6 pb-3 border-l-2 border-transparent">
            <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-green-500" />
            
            <div className="bg-green-500/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-green-600" />
                  <span className="font-medium text-sm text-green-700 dark:text-green-400">
                    Título criado
                  </span>
                  {getOrigemBadge("criacao")}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(dataCriacao)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Registro inicial do título no sistema
              </p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
