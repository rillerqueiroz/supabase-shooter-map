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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { useRemoverNegativacao, MOTIVOS_REMOCAO, useNegativacoesDatas } from "@/hooks/useNegativacoes";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { Search, ChevronUp, ChevronDown, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
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

interface RemoverNegativacaoTabProps {
  titulos: TituloTudoBelo[];
  isLoading: boolean;
}

export function RemoverNegativacaoTab({ titulos, isLoading }: RemoverNegativacaoTabProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showNaoPagos, setShowNaoPagos] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const removerMutation = useRemoverNegativacao();
  const { data: negativacoesDatas } = useNegativacoesDatas();

  const baseData = useMemo(() => {
    if (showNaoPagos) return titulos;
    return titulos.filter(t => t.status_titulo?.toLowerCase().includes('pago'));
  }, [titulos, showNaoPagos]);

  const filtered = useMemo(() => {
    if (!search) return baseData;
    const s = search.toLowerCase();
    return baseData.filter(t =>
      t.documento?.toLowerCase().includes(s) ||
      t.nome_parceiro?.toLowerCase().includes(s) ||
      t.cnpj_cpf?.toLowerCase().includes(s)
    );
  }, [baseData, search]);

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

  const handleOpenDialog = () => {
    const selected = titulos.filter(t => selectedIds.includes(t.id));
    const hasNaoPagos = selected.some(t => !t.status_titulo?.toLowerCase().includes('pago'));
    if (hasNaoPagos) {
      setAlertOpen(true);
    } else {
      setDialogOpen(true);
    }
  };

  const handleConfirmNaoPagos = () => {
    setAlertOpen(false);
    setDialogOpen(true);
  };

  const handleRemover = async () => {
    if (!motivo) return;
    setProcessing(true);
    const selected = titulos.filter(t => selectedIds.includes(t.id));
    for (const titulo of selected) {
      try {
        await removerMutation.mutateAsync({
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showNaoPagos ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowNaoPagos(!showNaoPagos)}
            >
              {showNaoPagos ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showNaoPagos ? "Ocultando não pagos" : "Exibir não pagos"}
            </Button>
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleOpenDialog}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                Remover negativação de {selectedIds.length} selecionados
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {filtered.length} títulos negativados
            </Badge>
          </div>
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
                      <SortableHeader column="data_vencimento" label="Vencimento" />
                      <SortableHeader column="status_titulo" label="Status" />
                      <TableHead>Data Negativação</TableHead>
                      <TableHead>Negativado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((titulo) => (
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
                        <TableCell>{formatDate(titulo.data_vencimento)}</TableCell>
                        <TableCell>
                          <Badge variant="default">{titulo.status_titulo || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDateTime(negativacoesDatas?.[titulo.id] || null)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30">
                            Negativado
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                          Nenhum título negativado encontrado
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

      {/* Alert para títulos não pagos */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção: Títulos não pagos selecionados</AlertDialogTitle>
            <AlertDialogDescription>
              Alguns dos títulos selecionados <strong>não possuem status "Pago"</strong>. 
              Tem certeza que deseja prosseguir com a remoção da negativação desses títulos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNaoPagos}>
              Sim, prosseguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Negativação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a remover a negativação de <strong>{selectedIds.length}</strong> título(s).
            </p>
            <div className="space-y-2">
              <Label>Motivo da remoção *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_REMOCAO.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleRemover}
              disabled={processing || !motivo}
            >
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes do título */}
      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
