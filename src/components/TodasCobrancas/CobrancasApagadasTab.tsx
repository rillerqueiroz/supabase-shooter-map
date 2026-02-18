import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ValoresRecebidos/StatusBadge";
import { useCobrancasApagadas } from "@/hooks/useTodasCobrancas";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDateFromDatabase } from "@/lib/utils";
import { Trash2, AlertCircle } from "lucide-react";

export function CobrancasApagadasTab() {
  const { data: cobrancas, isLoading, error } = useCobrancasApagadas();

  // Ordenação
  const { sortedData, requestSort, getSortIcon } = useSortableTable(cobrancas || []);

  // Paginação
  const {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    totalItems,
  } = usePagination({ 
    data: sortedData, 
    initialPageSize: 50 
  });

  // Total geral das cobranças apagadas
  const totalGeral = useMemo(() => {
    return (cobrancas || []).reduce((sum, item) => sum + (item.valor || 0), 0);
  }, [cobrancas]);

  // Funções de formatação
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao carregar cobranças apagadas</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com métricas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobranças Apagadas</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{cobrancas?.length || 0}</p>
                  <Badge variant="outline" className="text-muted-foreground">
                    {formatCurrency(totalGeral)}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs text-right">
              Estas cobranças foram marcadas como apagadas e não aparecem nas métricas principais.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('nome')}
                      >
                        Nome {getSortIcon('nome')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm min-w-[200px]"
                        onClick={() => requestSort('descricao')}
                      >
                        Descrição {getSortIcon('descricao')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('credor_cedrus')}
                      >
                        Empresa {getSortIcon('credor_cedrus')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('status')}
                      >
                        Status {getSortIcon('status')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('vencimento')}
                      >
                        Vencimento {getSortIcon('vencimento')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('forma_pagamento')}
                      >
                        Forma Pag. {getSortIcon('forma_pagamento')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer font-bold hover:bg-muted/50 mobile-text-sm whitespace-nowrap"
                        onClick={() => requestSort('valor')}
                      >
                        Valor {getSortIcon('valor')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Trash2 className="h-8 w-8 text-muted-foreground/50" />
                            <span>Nenhuma cobrança apagada encontrada</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow 
                          key={item.Identificador}
                          className="opacity-70 bg-destructive/5 hover:opacity-100"
                        >
                          <TableCell className="font-medium mobile-text-sm whitespace-nowrap">
                            {item.nome || "-"}
                          </TableCell>
                          <TableCell className="mobile-text-sm">
                            <span className="line-clamp-2">{item.descricao || "-"}</span>
                          </TableCell>
                          <TableCell className="mobile-text-sm whitespace-nowrap">
                            {item.credor_cedrus || "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} size="sm" />
                          </TableCell>
                          <TableCell className="mobile-text-sm whitespace-nowrap">
                            {formatDate(item.vencimento)}
                          </TableCell>
                          <TableCell className="mobile-text-sm whitespace-nowrap">
                            {item.forma_pagamento || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium mobile-text-sm whitespace-nowrap">
                            {formatCurrency(item.valor || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {paginatedData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="text-right font-bold">
                          Total ({cobrancas?.length || 0} cobranças apagadas):
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalGeral)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>

              {/* Paginação */}
              {paginatedData.length > 0 && (
                <div className="p-4 border-t">
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
