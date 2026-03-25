import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { useNegativarTitulo } from "@/hooks/useNegativacoes";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { Search, ChevronUp, ChevronDown, Loader2, ShieldAlert, Filter, X, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
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

const calcularDiasAtraso = (dataVencimento: string | null) => {
  if (!dataVencimento) return null;
  try {
    const [year, month, day] = dataVencimento.split('T')[0].split('-').map(Number);
    const vencimento = new Date(year, month - 1, day);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dias = differenceInDays(hoje, vencimento);
    return dias > 0 ? dias : 0;
  } catch {
    return null;
  }
};

interface NegativarTabProps {
  titulos: TituloTudoBelo[];
  isLoading: boolean;
}

export function NegativarTab({ titulos, isLoading }: NegativarTabProps) {
  const [filters, setFilters] = useState<TitulosFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [only15Days, setOnly15Days] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [processing, setProcessing] = useState(false);
  const negativarMutation = useNegativarTitulo();
  const { data: options } = useTitulosTudoBeloOptions();
  const { data: etapasDisponiveis } = useTitulosEtapas();
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filtered = useMemo(() => {
    let data = titulos;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(t =>
        t.documento?.toLowerCase().includes(s) ||
        t.nome_parceiro?.toLowerCase().includes(s) ||
        t.cnpj_cpf?.toLowerCase().includes(s)
      );
    }
    if (filters.nomesParceiros?.length) {
      data = data.filter(t => t.nome_parceiro && filters.nomesParceiros!.includes(t.nome_parceiro));
    }
    if (filters.statusTitulo?.length) {
      data = data.filter(t => t.status_titulo && filters.statusTitulo!.includes(t.status_titulo));
    }
    if (filters.vendedores?.length) {
      data = data.filter(t => t.vendedor && filters.vendedores!.includes(t.vendedor));
    }
    if (filters.tiposTitulo?.length) {
      data = data.filter(t => {
        if (filters.tiposTitulo!.includes('Não informado') && !t.tipo_documento) return true;
        return t.tipo_documento && filters.tiposTitulo!.includes(t.tipo_documento);
      });
    }
    if (filters.formasPagamento?.length) {
      data = data.filter(t => t.forma_pagamento && filters.formasPagamento!.includes(t.forma_pagamento));
    }
    if (filters.ufs?.length) {
      data = data.filter(t => t.uf && filters.ufs!.includes(t.uf));
    }
    if (filters.etapas?.length) {
      data = data.filter(t => t.etapa && filters.etapas!.includes(t.etapa));
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
    if (filters.inseridoCedrus !== null && filters.inseridoCedrus !== undefined) {
      data = data.filter(t => t.inserido_cedrus === filters.inseridoCedrus);
    }
    if (only15Days) {
      data = data.filter(t => {
        const dias = calcularDiasAtraso(t.data_vencimento);
        return dias !== null && dias > 15;
      });
    }
    return data;
  }, [titulos, filters, only15Days]);

  const { sortedData, sortConfig, requestSort } = useSortableTable(filtered);
  const {
    paginatedData, pagination, pageCount, canPreviousPage, canNextPage,
    gotoPage, nextPage, previousPage, setPageSize, totalItems,
  } = usePagination<TituloTudoBelo>({ data: sortedData, initialPageSize: 100 });

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? paginatedData.map(t => t.id) : []);
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

  const handleNegativar = async () => {
    setProcessing(true);
    const selected = titulos.filter(t => selectedIds.includes(t.id));
    for (const titulo of selected) {
      try {
        await negativarMutation.mutateAsync({
          tituloId: titulo.id,
          documento: titulo.documento,
          nomeParceiro: titulo.nome_parceiro,
          motivo,
          observacoes,
        });
      } catch {
        // Error handled by mutation
      }
    }
    setProcessing(false);
    setDialogOpen(false);
    setSelectedIds([]);
    setMotivo("");
    setObservacoes("");
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
                placeholder="Buscar por documento, parceiro ou CNPJ..."
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
            <Button
              variant={only15Days ? "secondary" : "outline"}
              size="sm"
              onClick={() => setOnly15Days(!only15Days)}
            >
              <Clock className="h-4 w-4 mr-1" />
              {only15Days ? "Exibindo +15 dias" : "Exibir apenas +15 dias"}
            </Button>
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setDialogOpen(true)}
              >
                <ShieldAlert className="h-4 w-4 mr-1" />
                Negativar {selectedIds.length} selecionados
              </Button>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {filtered.length} títulos disponíveis para negativação
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
                title="Status Título"
                options={options?.statusTitulo || []}
                selectedValues={filters.statusTitulo || []}
                onSelectionChange={(v) => setFilters({ ...filters, statusTitulo: v })}
              />
              <MultiSelectFilter
                title="Vendedor"
                options={options?.vendedores || []}
                selectedValues={filters.vendedores || []}
                onSelectionChange={(v) => setFilters({ ...filters, vendedores: v })}
              />
              <MultiSelectFilter
                title="Tipo Título"
                options={options?.tiposTitulo || []}
                selectedValues={filters.tiposTitulo || []}
                onSelectionChange={(v) => setFilters({ ...filters, tiposTitulo: v })}
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
              <MultiSelectFilter
                title="Etapa"
                options={etapasDisponiveis?.map(e => e.etapa).filter(Boolean) as string[] || []}
                selectedValues={filters.etapas || []}
                onSelectionChange={(v) => setFilters({ ...filters, etapas: v })}
              />
              <DateFilterSelect
                label="Data Vencimento"
                value={filters.dataVencimentoRange}
                onChange={(v) => setFilters({ ...filters, dataVencimentoRange: v })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Inserido Cedrus</label>
                <Select
                  value={filters.inseridoCedrus === null || filters.inseridoCedrus === undefined ? "todos" : filters.inseridoCedrus ? "sim" : "nao"}
                  onValueChange={(v) => setFilters({
                    ...filters,
                    inseridoCedrus: v === "todos" ? null : v === "sim"
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                          checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <SortableHeader column="documento" label="Documento" />
                      <SortableHeader column="nome_parceiro" label="Parceiro" />
                      <SortableHeader column="cnpj_cpf" label="CNPJ/CPF" />
                      <SortableHeader column="saldo_parcela" label="Saldo" />
                      <SortableHeader column="forma_pagamento" label="Forma Pagamento" />
                      <SortableHeader column="data_vencimento" label="Vencimento" />
                      <TableHead>Dias Atraso</TableHead>
                      <SortableHeader column="status_titulo" label="Status" />
                      <SortableHeader column="etapa" label="Etapa" />
                      <TableHead>Cedrus</TableHead>
                      <SortableHeader column="status_cedrus" label="Status Cedrus" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((titulo) => {
                      const diasAtraso = calcularDiasAtraso(titulo.data_vencimento);
                      return (
                        <TableRow key={titulo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedTitulo(titulo); setDetailsOpen(true); }}>
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
                          <TableCell>{titulo.forma_pagamento || "-"}</TableCell>
                          <TableCell>{formatDate(titulo.data_vencimento)}</TableCell>
                          <TableCell>
                            {diasAtraso !== null && diasAtraso > 0 ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {diasAtraso} dias
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{titulo.status_titulo || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{titulo.etapa || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            {titulo.inserido_cedrus ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sim</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-muted-foreground">Não</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {titulo.status_cedrus ? (
                              <Badge variant="outline" className="text-xs">{titulo.status_cedrus}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginatedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                          Nenhum título disponível para negativação
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
            <DialogTitle>Confirmar Negativação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a negativar <strong>{selectedIds.length}</strong> título(s).
            </p>
            <div className="space-y-2">
              <Label>Motivo da negativação</Label>
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
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleNegativar}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
              Confirmar Negativação
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
