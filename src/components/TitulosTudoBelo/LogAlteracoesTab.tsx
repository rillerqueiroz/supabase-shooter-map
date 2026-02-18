import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTitulosLogAlteracoes, LogAlteracao } from "@/hooks/useTitulosLogAlteracoes";
import { useTitulosTudoBelo, TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { useInserirCedrusWebhook } from "@/hooks/useInserirCedrusWebhook";
import { TituloDetailsModal } from "./TituloDetailsModal";
import { CedrusConfirmDialog } from "./CedrusConfirmDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, History, Upload, Check, X, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatDateShort = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getOrigemBadge = (origem: string) => {
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    sistema_interno: { variant: "default", label: "Sistema" },
    manual_externo: { variant: "secondary", label: "Manual" },
    api: { variant: "outline", label: "API" },
    importacao: { variant: "outline", label: "Importação" },
    usuario: { variant: "secondary", label: "Usuário" },
  };
  const config = variants[origem] || { variant: "outline" as const, label: origem };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

interface GroupedLog {
  groupKey: string;
  tituloId: string;
  timestamp: string;
  origem: string;
  usuarioEmail: string | null;
  changes: {
    campo: string;
    valorAnterior: string | null;
    valorNovo: string | null;
  }[];
}

export function LogAlteracoesTab() {
  const [searchLogs, setSearchLogs] = useState("");
  const [selectedTituloId, setSelectedTituloId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [removingCedrusId, setRemovingCedrusId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const { data: logs, isLoading: loadingLogs } = useTitulosLogAlteracoes();
  const { data: titulos } = useTitulosTudoBelo();
  const inserirCedrus = useInserirCedrusWebhook();
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    actionType: "inserir" | "cancelar" | "marcar_pago";
    tituloId: string | null;
  }>({ open: false, actionType: "inserir", tituloId: null });

  // Agrupa logs do mesmo título ocorridos no mesmo minuto
  const groupedLogs = useMemo(() => {
    if (!logs) return [];

    const groups = new Map<string, GroupedLog>();

    logs.forEach((log) => {
      // Cria uma chave baseada no titulo_id e timestamp (arredondado para o minuto)
      const timestamp = new Date(log.created_at);
      const roundedTimestamp = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes()
      ).toISOString();

      const groupKey = `${log.titulo_id}_${roundedTimestamp}`;

      if (groups.has(groupKey)) {
        const group = groups.get(groupKey)!;
        group.changes.push({
          campo: log.campo_alterado,
          valorAnterior: log.valor_anterior,
          valorNovo: log.valor_novo,
        });
      } else {
        groups.set(groupKey, {
          groupKey,
          tituloId: log.titulo_id,
          timestamp: log.created_at,
          origem: log.origem,
          usuarioEmail: log.usuario_email,
          changes: [{
            campo: log.campo_alterado,
            valorAnterior: log.valor_anterior,
            valorNovo: log.valor_novo,
          }],
        });
      }
    });

    return Array.from(groups.values());
  }, [logs]);

  const filteredGroups = useMemo(() => {
    if (!searchLogs) return groupedLogs;

    const searchLower = searchLogs.toLowerCase();
    return groupedLogs.filter((group) => {
      const titulo = titulos?.find(t => t.id === group.tituloId);
      const nomeParceiro = titulo?.nome_parceiro?.toLowerCase() || "";
      
      return (
        nomeParceiro.includes(searchLower) ||
        group.tituloId.toLowerCase().includes(searchLower) ||
        group.usuarioEmail?.toLowerCase().includes(searchLower) ||
        group.changes.some(c => c.campo.toLowerCase().includes(searchLower))
      );
    });
  }, [groupedLogs, searchLogs, titulos]);

  const handleRowClick = (tituloId: string) => {
    setSelectedTituloId(tituloId);
    setDetailsOpen(true);
  };

  const handleInserirCedrus = (tituloId: string) => {
    const titulo = titulos?.find(t => t.id === tituloId);
    if (titulo) {
      inserirCedrus.mutate(titulo);
    }
    setConfirmDialog({ open: false, actionType: "inserir", tituloId: null });
  };

  const handleRemoverCedrus = async (tituloId: string) => {
    const titulo = titulos?.find(t => t.id === tituloId);
    if (!titulo) return;
    
    setRemovingCedrusId(tituloId);
    try {
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cancelar-titulo-tudobelo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(titulo),
      });
      
      if (response.ok) {
        toast.success(`Título ${titulo.documento} enviado para remoção com sucesso.`);
      } else {
        throw new Error('Falha ao remover do Cedrus');
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar remover o título do Cedrus.");
    } finally {
      setRemovingCedrusId(null);
      setConfirmDialog({ open: false, actionType: "cancelar", tituloId: null });
    }
  };

  const handleMarcarPago = async (tituloId: string) => {
    const titulo = titulos?.find(t => t.id === tituloId);
    if (!titulo) return;
    
    setMarkingPaidId(tituloId);
    try {
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/marcar-titulo-como-pago-tudobelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(titulo),
      });
      if (response.ok) {
        toast.success(`Título ${titulo.documento} marcado como pago.`);
      } else {
        throw new Error('Falha');
      }
    } catch (error) {
      toast.error("Erro ao marcar título como pago.");
    } finally {
      setMarkingPaidId(null);
      setConfirmDialog({ open: false, actionType: "marcar_pago", tituloId: null });
    }
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.tituloId) return;
    
    switch (confirmDialog.actionType) {
      case "inserir":
        handleInserirCedrus(confirmDialog.tituloId);
        break;
      case "cancelar":
        handleRemoverCedrus(confirmDialog.tituloId);
        break;
      case "marcar_pago":
        handleMarcarPago(confirmDialog.tituloId);
        break;
    }
  };

  const getTituloInfo = (tituloId: string) => {
    const titulo = titulos?.find(t => t.id === tituloId);
    return {
      nomeParceiro: titulo?.nome_parceiro || "-",
      dataVencimento: titulo?.data_vencimento,
      valor: titulo?.valor_parcela || titulo?.saldo_parcela,
      inseridoCedrus: titulo?.inserido_cedrus ?? false,
      statusCedrus: titulo?.status_cedrus || null,
    };
  };

  const selectedTitulo = titulos?.find(t => t.id === selectedTituloId) || null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Log de Alterações</CardTitle>
              {filteredGroups.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredGroups.length} registros
                </Badge>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por parceiro, campo ou usuário..."
                value={searchLogs}
                onChange={(e) => setSearchLogs(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLogs ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Alterações</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>St. Cedrus</TableHead>
                  <TableHead className="text-center">No Cedrus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => {
                  const tituloInfo = getTituloInfo(group.tituloId);
                  return (
                    <TableRow 
                      key={group.groupKey} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(group.tituloId)}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(group.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {tituloInfo.nomeParceiro}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateShort(tituloInfo.dataVencimento)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(tituloInfo.valor)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {group.changes.map((change, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs"
                              title={`${change.valorAnterior || "-"} → ${change.valorNovo || "-"}`}
                            >
                              {change.campo}
                              {group.changes.length === 1 && (
                                <span className="ml-1 text-muted-foreground">
                                  : {change.valorAnterior?.substring(0, 10) || "-"} → {change.valorNovo?.substring(0, 10) || "-"}
                                </span>
                              )}
                            </Badge>
                          ))}
                          {group.changes.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({group.changes.length} campos)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getOrigemBadge(group.origem)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {group.usuarioEmail || "-"}
                      </TableCell>
                      <TableCell>
                        {tituloInfo.statusCedrus ? (
                          <Badge variant="outline" className="text-xs">
                            {tituloInfo.statusCedrus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {tituloInfo.inseridoCedrus ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              Sim
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                              disabled={markingPaidId === group.tituloId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({ open: true, actionType: "marcar_pago", tituloId: group.tituloId });
                              }}
                            >
                              {markingPaidId === group.tituloId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              <span>Marcar como Pago</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              disabled={removingCedrusId === group.tituloId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({ open: true, actionType: "cancelar", tituloId: group.tituloId });
                              }}
                            >
                              {removingCedrusId === group.tituloId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3" />
                                  <span>Cancelar</span>
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Não
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({ open: true, actionType: "inserir", tituloId: group.tituloId });
                              }}
                              disabled={inserirCedrus.isPending}
                            >
                              {inserirCedrus.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="h-3 w-3 mr-1" />
                                  Inserir
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      Nenhum log de alteração encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        initialTab="historico"
      />

      <CedrusConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        actionType={confirmDialog.actionType}
        documentoTitulo={titulos?.find(t => t.id === confirmDialog.tituloId)?.documento || null}
        onConfirm={handleConfirmAction}
        isLoading={
          (confirmDialog.actionType === "cancelar" && removingCedrusId === confirmDialog.tituloId) ||
          (confirmDialog.actionType === "marcar_pago" && markingPaidId === confirmDialog.tituloId) ||
          (confirmDialog.actionType === "inserir" && inserirCedrus.isPending)
        }
      />
    </div>
  );
}
