import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useNegativacoesLog, NegativacaoLog } from "@/hooks/useNegativacoes";
import { usePagination } from "@/hooks/usePagination";
import { Loader2, Search, FileDown, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const getAcaoBadge = (acao: string) => {
  switch (acao) {
    case 'negativacao':
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/30" variant="outline">Negativação</Badge>;
    case 'remocao':
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30" variant="outline">Remoção</Badge>;
    case 'edicao':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30" variant="outline">Edição</Badge>;
    default:
      return <Badge variant="outline">{acao}</Badge>;
  }
};

const getOrigemBadge = (origem: string) => {
  switch (origem) {
    case 'usuario':
      return <Badge variant="secondary">Usuário</Badge>;
    case 'sistema':
      return <Badge variant="outline">Sistema</Badge>;
    case 'externo':
      return <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/30" variant="outline">Externo</Badge>;
    default:
      return <Badge variant="outline">{origem}</Badge>;
  }
};

const getAcaoLabel = (acao: string) => {
  switch (acao) {
    case 'negativacao': return 'Negativação';
    case 'remocao': return 'Remoção';
    case 'edicao': return 'Edição';
    default: return acao;
  }
};

const getOrigemLabel = (origem: string) => {
  switch (origem) {
    case 'usuario': return 'Usuário';
    case 'sistema': return 'Sistema';
    case 'externo': return 'Externo';
    default: return origem;
  }
};

function exportHistoricoPDF(data: NegativacaoLog[]) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text("Histórico de Negativações", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);
  doc.text(`Total de registros: ${data.length}`, 14, 36);

  const tableData = data.map((log) => [
    formatDateTime(log.created_at),
    log.documento || "-",
    log.nome_parceiro?.substring(0, 25) || "-",
    getAcaoLabel(log.acao),
    log.descricao?.substring(0, 40) || "-",
    getOrigemLabel(log.origem),
  ]);

  autoTable(doc, {
    startY: 44,
    head: [["Data/Hora", "Documento", "Parceiro", "Ação", "Descrição", "Origem"]],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const filename = `historico-negativacoes-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
  doc.save(filename);
}

export function HistoricoNegativacoesTab() {
  const { data: logs, isLoading } = useNegativacoesLog();

  const [search, setSearch] = useState("");
  const [acaoFilter, setAcaoFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filteredLogs = useMemo(() => {
    let result = logs || [];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.documento?.toLowerCase().includes(s) ||
          l.nome_parceiro?.toLowerCase().includes(s) ||
          l.descricao?.toLowerCase().includes(s)
      );
    }

    if (acaoFilter !== "all") {
      result = result.filter((l) => l.acao === acaoFilter);
    }

    if (origemFilter !== "all") {
      result = result.filter((l) => l.origem === origemFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((l) => l.created_at && new Date(l.created_at) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((l) => l.created_at && new Date(l.created_at) <= to);
    }

    return result;
  }, [logs, search, acaoFilter, origemFilter, dateFrom, dateTo]);

  const {
    paginatedData, pagination, pageCount, canPreviousPage, canNextPage,
    gotoPage, nextPage, previousPage, setPageSize, totalItems,
  } = usePagination<NegativacaoLog>({ data: filteredLogs, initialPageSize: 100 });

  const hasFilters = search || acaoFilter !== "all" || origemFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setAcaoFilter("all");
    setOrigemFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento, parceiro ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={acaoFilter} onValueChange={setAcaoFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                <SelectItem value="negativacao">Negativação</SelectItem>
                <SelectItem value="remocao">Remoção</SelectItem>
                <SelectItem value="edicao">Edição</SelectItem>
              </SelectContent>
            </Select>

            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="usuario">Usuário</SelectItem>
                <SelectItem value="sistema">Sistema</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length} registros {hasFilters ? "(filtrado)" : "no histórico"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportHistoricoPDF(filteredLogs)}
              disabled={filteredLogs.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">{log.documento || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.nome_parceiro || "-"}</TableCell>
                        <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm">
                          {log.descricao || "-"}
                        </TableCell>
                        <TableCell>{getOrigemBadge(log.origem)}</TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t p-4">
                <DataTablePagination
                  pageIndex={pagination.pageIndex}
                  pageSize={pagination.pageSize}
                  pageCount={pageCount}
                  totalItems={totalItems}
                  canPreviousPage={canPreviousPage}
                  canNextPage={canNextPage}
                  gotoPage={gotoPage}
                  previousPage={previousPage}
                  nextPage={nextPage}
                  setPageSize={setPageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
