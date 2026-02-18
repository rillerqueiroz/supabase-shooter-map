import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { History, Search, Eye, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useZapsignLogs, ZapsignLog } from "@/hooks/useZapsignLogs";
import { usePagination } from "@/hooks/usePagination";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LogsZapsign() {
  const { data: logs, isLoading, error } = useZapsignLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ZapsignLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    if (!searchTerm) return logs;
    
    const searchLower = searchTerm.toLowerCase();
    return logs.filter(log => 
      log.acao?.toLowerCase().includes(searchLower) ||
      log.registro_id?.toString().includes(searchLower) ||
      JSON.stringify(log.dados_novos)?.toLowerCase().includes(searchLower)
    );
  }, [logs, searchTerm]);

  const {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    gotoPage,
    previousPage,
    nextPage,
    setPageSize,
    totalItems,
  } = usePagination({ data: filteredLogs, initialPageSize: 25 });

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'apagar':
        return (
          <Badge variant="destructive" className="gap-1">
            <Trash2 className="h-3 w-3" />
            Apagar
          </Badge>
        );
      case 'apagar_falha':
        return (
          <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500">
            <AlertTriangle className="h-3 w-3" />
            Falha ao Apagar
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {acao}
          </Badge>
        );
    }
  };

  const handleViewDetails = (log: ZapsignLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getDocumentName = (log: ZapsignLog): string => {
    const nome = log.dados_anteriores?.nome || log.dados_novos?.nome;
    if (typeof nome === 'string') {
      return nome.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return '-';
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar logs: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Logs de Alterações</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de alterações nos documentos ZapSign
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ação, ID do registro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Contagem */}
          <div className="text-sm text-muted-foreground">
            Exibindo {paginatedData.length} de {totalItems} logs
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                      <TableHead className="whitespace-nowrap">Ação</TableHead>
                      <TableHead className="whitespace-nowrap">ID Registro</TableHead>
                      <TableHead className="whitespace-nowrap">Documento</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paginatedData as ZapsignLog[]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum log encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      (paginatedData as ZapsignLog[]).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            {getAcaoBadge(log.acao)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {log.registro_id}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {getDocumentName(log)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(log)}
                              className="gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalItems > 0 && (
                <DataTablePagination
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  pageCount={pageCount}
                  canPreviousPage={canPreviousPage}
                  canNextPage={canNextPage}
                  gotoPage={gotoPage}
                  previousPage={previousPage}
                  nextPage={nextPage}
                  setPageSize={setPageSize}
                  totalItems={totalItems}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Log</p>
                    <p className="font-mono">{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Registro</p>
                    <p className="font-mono">{selectedLog.registro_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ação</p>
                    {getAcaoBadge(selectedLog.acao)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p>{formatDate(selectedLog.created_at)}</p>
                  </div>
                </div>

                {selectedLog.dados_anteriores && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dados Anteriores</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.dados_anteriores, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.dados_novos && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dados Novos / Resposta</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.dados_novos, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
