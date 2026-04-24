import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import { TituloTudoBelo, TitulosFilters, useTitulosTudoBeloOptions } from "@/hooks/useTitulosTudoBelo";
import { useRemoverImpedimento } from "@/hooks/useNegativacoes";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { Search, ChevronUp, ChevronDown, Loader2, ShieldOff, ShieldCheck, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    return format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

interface ImpedidosNegativacaoTabProps {
  titulos: TituloTudoBelo[];
  isLoading: boolean;
}

export function ImpedidosNegativacaoTab({ titulos, isLoading }: ImpedidosNegativacaoTabProps) {
  const [filters, setFilters] = useState<TitulosFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [processing, setProcessing] = useState(false);
  const removerImpedimentoMutation = useRemoverImpedimento();
  const { data: options } = useTitulosTudoBeloOptions();
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filtered = useMemo(() => {
    let data = titulos;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(t =>
        t.documento?.toLowerCase().includes(s) ||
        t.nome_parceiro?.toLowerCase().includes(s) ||
        t.cnpj_cpf?.toLowerCase().includes(s) ||
        t.motivo_impedimento_negativacao?.toLowerCase().includes(s)
      );
    }
    if (filters.nomesParceiros?.length) {
      data = data.filter(t => t.nome_parceiro && filters.nomesParceiros!.includes(t.nome_parceiro));
    }
    if (filters.vendedores?.length) {
      data = data.filter(t => t.vendedor && filters.vendedores!.includes(t.vendedor));
    }
    if (filters.formasPagamento?.length) {
      data = data.filter(t => t.forma_pagamento && filters.formasPagamento!.includes(t.forma_pagamento));
    }
    if (filters.ufs?.length) {
      data = data.filter(t => t.uf && filters.ufs!.includes(t.uf));
    }
    if (filters.dataVencimentoRange?.from) {
      data = data.filter(t => {
        if (!t.data_vencimento) return false;
        const d = new Date(t.data_vencimento.split('T')[0]);
        return d >= filters.dataVencimentoRange!.from!;
      });
    }
    if (filters.dataVencimentoRange?.to) {
      data = data.filter(t => {
        if (!t.data_vencimento) return false;
        const d = new Date(t.data_vencimento.split('T')[0]);
        return d <= filters.dataVencimentoRange!.to!;
      });
    }
    return data;
  }, [titulos, filters]);

  const { sortedData, sortConfig, requestSort } = useSortableTable(filtered);
  const {
    paginatedData, pagination, pageCount, canPreviousPage, canNextPage,
    gotoPage, nextPage, previousPage, setPageSize, totalItems,
  } = usePagination<TituloTudoBelo>({ data: sortedData, initialPageSize: 100 });

  const totalSaldo = useMemo(
    () => filtered.reduce((s, t) => s + (t.saldo_parcela || 0), 0),
    [filtered]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...paginatedData.map(t => t.id)])));
    } else {
      const pageIds = new Set(paginatedData.map(t => t.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const clearFilters = () => setFilters({});

  const activeFilterCount = Object.keys(filters).filter(k => {
    const v = filters[k as keyof TitulosFilters];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object' && v !== null) return true;
    return !!v;
  }).length;

  const handleRemover = async () => {
    if (!motivo.trim()) return;
    setProcessing(true);
    const selected = titulos.filter(t => selectedIds.includes(t.id));
    try {
      await removerImpedimentoMutation.mutateAsync({
        titulos: selected.map(t => ({
          id: t.id,
          documento: t.documento,
          nome_parceiro: t.nome_parceiro,
        })),
        motivo,
        observacoes,
      });
    } finally {
      setProcessing(false);
      setDialogOpen(false);
      setSelectedIds([]);
      setMotivo("");
      setObservacoes("");
    }
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => requestSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig?.key === column && (
          sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento, parceiro, CNPJ ou motivo..."
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {selectedIds.length > 0 && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <ShieldCheck className="h-4 w-4 mr-1" />
                Remover impedimento ({selectedIds.length})
              </Button>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {filtered.length} impedidos · {formatCurrency(totalSaldo)}
            </Badge>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <MultiSelectFilter
                title="Parceiro"
                options={options?.nomesParceiros || []}
                selectedValues={filters.nomesParceiros || []}
                onSelectionChange={(v) => setFilters({ ...filters, nomesParceiros: v })}
              />
              <MultiSelectFilter
                title="Vendedor"
                options={options?.vendedores || []}
                selectedValues={filters.vendedores || []}
                onSelectionChange={(v) => setFilters({ ...filters, vendedores: v })}
              />
              <MultiSelectFilter
                title="Forma Pagamento"
                options={options?.formasPagamento || []}
                selectedValues={filters.formasPagamento || []}
                onSelectionChange={(v) => setFilters({ ...filters, formasPagamento: v })}
              />
              <MultiSelectFilter
                title="UF"
                options={options?.ufs || []}
                selectedValues={filters.ufs || []}
                onSelectionChange={(v) => setFilters({ ...filters, ufs: v })}
              />
              <DateFilterSelect
                label="Data Vencimento"
                value={filters.dataVencimentoRange}
                onChange={(v) => setFilters({ ...filters, dataVencimentoRange: v })}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedData.length > 0 && paginatedData.every(t => selectedIds.includes(t.id))}
                          onCheckedChange={handleSelectAll}
                          disabled={paginatedData.length === 0}
                        />
                      </TableHead>
                      <SortableHeader column="documento" label="Documento" />
                      <SortableHeader column="nome_parceiro" label="Parceiro" />
                      <SortableHeader column="cnpj_cpf" label="CNPJ/CPF" />
                      <SortableHeader column="saldo_parcela" label="Saldo" />
                      <SortableHeader column="data_vencimento" label="Vencimento" />
                      <SortableHeader column="motivo_impedimento_negativacao" label="Motivo Impedimento" />
                      <SortableHeader column="data_impedimento_negativacao" label="Data Impedimento" />
                      <SortableHeader column="status_titulo" label="Status" />
                      <SortableHeader column="forma_pagamento" label="Forma Pagamento" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((titulo) => (
                      <TableRow
                        key={titulo.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedTitulo(titulo); setDetailsOpen(true); }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(titulo.id)}
                            onCheckedChange={(checked) => handleSelectOne(titulo.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{titulo.documento || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{titulo.nome_parceiro || "-"}</TableCell>
                        <TableCell>{titulo.cnpj_cpf || "-"}</TableCell>
                        <TableCell>{formatCurrency(titulo.saldo_parcela)}</TableCell>
                        <TableCell>{formatDate(titulo.data_vencimento)}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <ShieldOff className="h-3 w-3 mr-1" />
                            <span className="truncate">{titulo.motivo_impedimento_negativacao || "Sem motivo"}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(titulo.data_impedimento_negativacao)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{titulo.status_titulo || "-"}</Badge>
                        </TableCell>
                        <TableCell>{titulo.forma_pagamento || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                          Nenhum título impedido de negativação
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Impedimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está removendo o impedimento de <strong>{selectedIds.length}</strong> título(s). Eles voltarão a ficar disponíveis para negativação.
            </p>
            <div className="space-y-2">
              <Label>Motivo da remoção <span className="text-destructive">*</span></Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Informe o motivo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleRemover} disabled={processing || !motivo.trim()}>
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
