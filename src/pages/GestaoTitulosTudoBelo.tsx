import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import {
  useTitulosTudoBelo,
  useTitulosTudoBeloOptions,
  TitulosFilters,
  TituloTudoBelo,
} from "@/hooks/useTitulosTudoBelo";
import { useInserirCedrusWebhook } from "@/hooks/useInserirCedrusWebhook";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { useTitulosFormasPagamento } from "@/hooks/useTitulosFormasPagamento";
import { useSortableTable } from "@/hooks/useSortableTable";
import { usePagination } from "@/hooks/usePagination";
import { TituloDetailsModal } from "@/components/TitulosTudoBelo/TituloDetailsModal";
import { HistoricoAtualizacoesTab } from "@/components/TitulosTudoBelo/HistoricoAtualizacoesTab";
import { LogAlteracoesTab } from "@/components/TitulosTudoBelo/LogAlteracoesTab";
import { TitulosBulkEditModal } from "@/components/TitulosTudoBelo/TitulosBulkEditModal";
import { BulkInsercaoCedrusModal } from "@/components/TitulosTudoBelo/BulkInsercaoCedrusModal";
import { TitulosPendentesTab } from "@/components/TitulosTudoBelo/TitulosPendentesTab";
import { VisaoEtapasTab } from "@/components/TitulosTudoBelo/VisaoEtapasTab";
import { InadimplenciaCredorTab } from "@/components/TitulosTudoBelo/InadimplenciaCredorTab";
import { InlineEtapaSelect } from "@/components/TitulosTudoBelo/InlineEtapaSelect";
import { CedrusConfirmDialog } from "@/components/TitulosTudoBelo/CedrusConfirmDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TitulosBaixadosTab } from "@/components/TitulosTudoBelo/TitulosBaixadosTab";
import { exportTitulosToExcel, exportTitulosToPDF } from "@/utils/exportTitulosTudoBelo";
import {
  Search,
  FileSpreadsheet,
  FileText,
  Filter,
  Edit,
  ChevronUp,
  ChevronDown,
  Loader2,
  TableIcon,
  History,
  X,
  ClipboardList,
  Layers,
  Upload,
  AlertTriangle,
  FileEdit,
  Trash2,
  Send,
  Download,
  Lock,
  LockOpen,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoSuperavit from "@/assets/logo-superavit.png";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

// Calcula dias restantes para recompra considerando data de hoje (Brasil)
const calcularDiasRecompra = (dataVencimento: string | null, prazoRecompra: number | null) => {
  if (!dataVencimento || prazoRecompra === null || prazoRecompra === undefined || prazoRecompra === 0) return null;
  
  try {
    const datePart = dataVencimento.split('T')[0];
    if (!datePart || datePart.split('-').length !== 3) return null;
    
    const [year, month, day] = datePart.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    const vencimento = new Date(year, month - 1, day);
    if (isNaN(vencimento.getTime())) return null;
    
    // Data limite = data de vencimento + prazo de recompra
    const limiteRecompra = addDays(vencimento, prazoRecompra);
    if (isNaN(limiteRecompra.getTime())) return null;
    
    // Hoje no Brasil (UTC-3)
    const hoje = new Date();
    // Ajusta para horário de Brasília
    const brasilOffset = -3 * 60; // UTC-3 em minutos
    const localOffset = hoje.getTimezoneOffset();
    hoje.setMinutes(hoje.getMinutes() + localOffset + brasilOffset);
    hoje.setHours(0, 0, 0, 0);
    
    // Contagem regressiva: dias restantes até a data limite
    const diasRestantes = differenceInDays(limiteRecompra, hoje);
    
    return {
      diasRestantes,
      prazoTotal: prazoRecompra,
      dataLimite: limiteRecompra
    };
  } catch {
    return null;
  }
};

// Retorna classes de cor baseado na porcentagem de tempo restante
const getRecompraColorClasses = (diasRestantes: number, prazoTotal: number) => {
  if (diasRestantes <= 0) {
    return "bg-red-600 text-white border-red-700";
  }
  
  const porcentagemRestante = (diasRestantes / prazoTotal) * 100;
  
  if (porcentagemRestante > 66) {
    return "bg-green-100 text-green-800 border-green-300";
  } else if (porcentagemRestante > 33) {
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  } else if (porcentagemRestante > 10) {
    return "bg-orange-100 text-orange-800 border-orange-300";
  } else {
    return "bg-red-100 text-red-800 border-red-300";
  }
};

export default function GestaoTitulosTudoBelo() {
  const [filters, setFilters] = useState<TitulosFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkInsercaoOpen, setBulkInsercaoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  const [removingCedrusId, setRemovingCedrusId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [emailDisparoOpen, setEmailDisparoOpen] = useState(false);
  const [emailDisparoLoading, setEmailDisparoLoading] = useState(false);
  const [emailRelatorio, setEmailRelatorio] = useState<{nome_parceiro: string[], email: string[], saldo_parcela: number[], data_vencimento: string[]} | null>(null);
  const [emailRelatorioOpen, setEmailRelatorioOpen] = useState(false);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    actionType: "inserir" | "cancelar" | "marcar_pago";
    titulo: TituloTudoBelo | null;
  }>({ open: false, actionType: "inserir", titulo: null });

  const { data: titulos, isLoading, error } = useTitulosTudoBelo(filters);
  const { data: options } = useTitulosTudoBeloOptions();
  const { data: etapasDisponiveis } = useTitulosEtapas();
  const { data: formasPagamento } = useTitulosFormasPagamento();
  const inserirCedrusMutation = useInserirCedrusWebhook();

  // Mapeamento de forma_pagamento para prazo_recompra
  const prazoRecompraMap = useMemo(() => {
    if (!formasPagamento) return new Map<string, number>();
    const map = new Map<string, number>();
    formasPagamento.forEach((fp) => {
      if (fp.forma_pagamento && fp.prazo_recompra !== null) {
        map.set(fp.forma_pagamento, fp.prazo_recompra);
      }
    });
    return map;
  }, [formasPagamento]);

  const { sortedData, sortConfig, requestSort } = useSortableTable(titulos || []);

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
  } = usePagination<TituloTudoBelo>({ data: sortedData, initialPageSize: 100 });

  const metrics = useMemo(() => {
    if (!titulos) return { total: 0, valorTotal: 0, saldoTotal: 0, cedrus: 0 };
    return {
      total: titulos.length,
      valorTotal: titulos.reduce((sum, t) => sum + (t.valor_parcela || 0), 0),
      saldoTotal: titulos.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0),
      cedrus: titulos.filter((t) => t.inserido_cedrus).length,
    };
  }, [titulos]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedData.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleRemoverCedrus = async (titulo: TituloTudoBelo) => {
    setRemovingCedrusId(titulo.id);
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
      setConfirmDialog({ open: false, actionType: "cancelar", titulo: null });
    }
  };

  const handleMarcarPago = async (titulo: TituloTudoBelo, valorPagoApurado?: number) => {
    setMarkingPaidId(titulo.id);
    try {
      const payload = {
        ...titulo,
        valor_pago_apurado_manualmente: valorPagoApurado,
      };
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/marcar-titulo-como-pago-tudobelo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        toast.success(`Título ${titulo.documento} marcado como pago com sucesso.`);
      } else {
        throw new Error('Falha ao marcar como pago');
      }
    } catch (error) {
      toast.error("Erro ao marcar título como pago.");
    } finally {
      setMarkingPaidId(null);
      setConfirmDialog({ open: false, actionType: "marcar_pago", titulo: null });
    }
  };

  const handleInserirCedrusWithConfirm = (titulo: TituloTudoBelo) => {
    inserirCedrusMutation.mutate(titulo);
    setConfirmDialog({ open: false, actionType: "inserir", titulo: null });
  };

  const handleConfirmAction = (valorPago?: number) => {
    if (!confirmDialog.titulo) return;
    
    switch (confirmDialog.actionType) {
      case "inserir":
        handleInserirCedrusWithConfirm(confirmDialog.titulo);
        break;
      case "cancelar":
        handleRemoverCedrus(confirmDialog.titulo);
        break;
      case "marcar_pago":
        handleMarcarPago(confirmDialog.titulo, valorPago);
        break;
    }
  };

  const handleRowClick = (titulo: TituloTudoBelo) => {
    setSelectedTitulo(titulo);
    setDetailsOpen(true);
  };

  const handleEnviarEmailsCobranca = async () => {
    setEmailDisparoLoading(true);
    try {
      const response = await fetch('https://n8n.superavit.app.br/webhook/44d426da-4706-480d-9700-4d0e4027d8c6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: 'disparo de emails tudo belo' }),
      });
      if (response.ok) {
        const data = await response.json();
        const relatorio = Array.isArray(data) ? data[0] : data;
        setEmailRelatorio(relatorio);
        setEmailDisparoOpen(false);
        setEmailRelatorioOpen(true);
        toast.success('Disparo de emails de cobrança realizado com sucesso!');
      } else {
        throw new Error('Falha no disparo');
      }
    } catch {
      toast.error('Erro ao disparar emails de cobrança.');
    } finally {
      setEmailDisparoLoading(false);
    }
  };

  const handleDownloadRelatorioPDF = async () => {
    if (!emailRelatorio) return;
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const jsPDF = jsPDFModule.default;
    const autoTable = autoTableModule.default;
    
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Relatório de Emails de Cobrança - Tudo Belo', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);
    doc.text(`Total de emails enviados: ${emailRelatorio.nome_parceiro.length}`, 14, 36);

    const totalSaldo = emailRelatorio.saldo_parcela.reduce((s, v) => s + v, 0);
    doc.text(`Saldo total cobrado: ${formatCurrency(totalSaldo)}`, 14, 42);

    const tableData = emailRelatorio.nome_parceiro.map((nome, i) => [
      nome,
      emailRelatorio.email[i] || '-',
      formatCurrency(emailRelatorio.saldo_parcela[i]),
      formatDate(emailRelatorio.data_vencimento[i]),
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Parceiro', 'Email', 'Saldo', 'Vencimento']],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 30, 30], textColor: [212, 175, 55] },
      alternateRowStyles: { fillColor: [245, 243, 237] },
    });

    doc.save(`relatorio-emails-cobranca-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => requestSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig?.key === column && (
          sortConfig.direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </TableHead>
  );

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoSuperavit} alt="Superávit" className="h-10" />
          <div>
            <h1 className="text-2xl font-bold">Gestão de Títulos Tudo Belo</h1>
            <p className="text-muted-foreground text-sm">
              Gerenciamento de títulos e boletos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md"
            onClick={() => setEmailDisparoOpen(true)}
            disabled={emailDisparoLoading}
          >
            <Send className="h-4 w-4 mr-1" />
            {emailDisparoLoading ? 'Enviando...' : 'Enviar emails de cobrança'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTitulosToExcel(titulos || [])}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTitulosToPDF(titulos || [])}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.saldoTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Cedrus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.cedrus.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Inserções
          </TabsTrigger>
          <TabsTrigger value="log-alteracoes" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Log de Alterações
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Títulos pendentes de análise
          </TabsTrigger>
          <TabsTrigger value="visao-etapas" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Visão por Etapas
          </TabsTrigger>
          <TabsTrigger value="inadimplencia-credor" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Inadimplência por Credor
          </TabsTrigger>
          <TabsTrigger value="baixados" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Títulos Baixados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          {/* Search and Filters */}
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
                </Button>
                {selectedIds.length > 0 && (
                  <>
                    <Button size="sm" onClick={() => setBulkEditOpen(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar {selectedIds.length} selecionados
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setBulkInsercaoOpen(true)}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Inserir no Cedrus em massa
                    </Button>
                  </>
                )}
                {Object.keys(filters).filter((k) => filters[k as keyof TitulosFilters]).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t max-h-[300px] overflow-y-auto">
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
                    title="Tipo Documento"
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
                  <MultiSelectFilter
                    title="Tipo Título"
                    options={options?.tiposTituloReal || ['Original', 'Negociação']}
                    selectedValues={filters.tipoTitulo || []}
                    onSelectionChange={(v) => setFilters({ ...filters, tipoTitulo: v })}
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
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Bloqueado</label>
                    <Select
                      value={filters.bloqueado === null || filters.bloqueado === undefined ? "todos" : filters.bloqueado ? "sim" : "nao"}
                      onValueChange={(v) => setFilters({ 
                        ...filters, 
                        bloqueado: v === "todos" ? null : v === "sim" 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="sim">Bloqueados</SelectItem>
                        <SelectItem value="nao">Desbloqueados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
                          <SortableHeader column="prazo_recompra" label="Dias Recompra" />
                          <SortableHeader column="status_titulo" label="Status / Etapa" />
                          <SortableHeader column="status_cedrus" label="Status Cedrus" />
                          <TableHead>Cedrus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((titulo) => (
                          <TableRow
                            key={titulo.id}
                            className={`cursor-pointer hover:bg-muted/50 ${titulo.bloqueado ? 'opacity-75 bg-muted/30' : ''}`}
                            onClick={() => handleRowClick(titulo)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  checked={selectedIds.includes(titulo.id)}
                                  onCheckedChange={(checked) => handleSelectOne(titulo.id, !!checked)}
                                />
                                {titulo.bloqueado ? (
                                  <Lock className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <LockOpen className="h-4 w-4 text-muted-foreground/40" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{titulo.documento || "-"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{titulo.nome_parceiro || "-"}</TableCell>
                            <TableCell>{titulo.cnpj_cpf || "-"}</TableCell>
                            <TableCell>{formatCurrency(titulo.saldo_parcela)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{titulo.forma_pagamento || "-"}</span>
                                {titulo.credor_cedrus && (
                                  <span className="text-xs text-muted-foreground">Credor Cedrus: {titulo.credor_cedrus}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(titulo.data_vencimento)}</TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                // Busca prazo_recompra da tabela formas_pagamento pelo forma_pagamento do título
                                const prazoRecompra = titulo.forma_pagamento 
                                  ? prazoRecompraMap.get(titulo.forma_pagamento) ?? null 
                                  : null;
                                const recompraInfo = calcularDiasRecompra(titulo.data_vencimento, prazoRecompra);
                                if (!recompraInfo) return "-";
                                
                                const colorClasses = getRecompraColorClasses(recompraInfo.diasRestantes, recompraInfo.prazoTotal);
                                
                                return (
                                  <Badge variant="outline" className={`${colorClasses} font-semibold`}>
                                    {recompraInfo.diasRestantes <= 0 
                                      ? `Vencido há ${Math.abs(recompraInfo.diasRestantes)} dias`
                                      : `${recompraInfo.diasRestantes} dias`
                                    }
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-1">
                                <Badge variant={titulo.status_titulo === "Pago em dia" || titulo.status_titulo === "Pago via renegociação" ? "default" : "secondary"}>
                                  {titulo.status_titulo || "-"}
                                </Badge>
                                <InlineEtapaSelect 
                                  tituloId={titulo.id} 
                                  currentEtapa={titulo.etapa}
                                  bloqueado={!!titulo.bloqueado}
                                />
                                <Badge variant="outline" className={`text-[10px] ${
                                  titulo.tipo_titulo === 'Negociação'
                                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                                }`}>
                                  {titulo.tipo_titulo || 'Original'}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${
                                  titulo.negativado 
                                    ? 'bg-red-500/10 text-red-700 border-red-500/30' 
                                    : 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                                }`}>
                                  {titulo.negativado ? 'Negativado' : 'Não Negativado'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {titulo.status_cedrus ? (
                                <Badge variant="outline" className="text-xs">
                                  {titulo.status_cedrus}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-center gap-1">
                                {titulo.inserido_cedrus ? (
                                  <>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Sim
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs px-2 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                      disabled={markingPaidId === titulo.id || !!titulo.bloqueado}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDialog({ open: true, actionType: "marcar_pago", titulo });
                                      }}
                                    >
                                      {markingPaidId === titulo.id ? (
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
                                      disabled={removingCedrusId === titulo.id || !!titulo.bloqueado}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDialog({ open: true, actionType: "cancelar", titulo });
                                      }}
                                    >
                                      {removingCedrusId === titulo.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Trash2 className="h-3 w-3" />
                                          <span>Cancelar</span>
                                        </>
                                      )}
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Badge variant="outline" className="bg-gray-50 text-gray-500">
                                      Não
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2"
                                      disabled={inserirCedrusMutation.isPending || !!titulo.bloqueado}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDialog({ open: true, actionType: "inserir", titulo });
                                      }}
                                    >
                                      {inserirCedrusMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <Upload className="h-3 w-3 mr-1" />
                                      )}
                                      Inserir
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {paginatedData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                              Nenhum título encontrado
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
        </TabsContent>


        <TabsContent value="historico">
          <HistoricoAtualizacoesTab />
        </TabsContent>

        <TabsContent value="log-alteracoes">
          <LogAlteracoesTab />
        </TabsContent>

        <TabsContent value="pendentes">
          <TitulosPendentesTab />
        </TabsContent>

        <TabsContent value="visao-etapas">
          <VisaoEtapasTab />
        </TabsContent>


        <TabsContent value="inadimplencia-credor">
          <InadimplenciaCredorTab titulos={titulos || []} />
        </TabsContent>

        <TabsContent value="baixados">
          <TitulosBaixadosTab />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onTituloUpdated={setSelectedTitulo}
      />

      <TitulosBulkEditModal
        selectedIds={selectedIds}
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        onSuccess={() => setSelectedIds([])}
        blockedIds={(titulos || []).filter(t => selectedIds.includes(t.id) && t.bloqueado).map(t => t.id)}
      />

      <BulkInsercaoCedrusModal
        open={bulkInsercaoOpen}
        onOpenChange={setBulkInsercaoOpen}
        titulos={(titulos || []).filter(t => selectedIds.includes(t.id) && !t.inserido_cedrus)}
        onComplete={() => setSelectedIds([])}
      />

      <CedrusConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        actionType={confirmDialog.actionType}
        documentoTitulo={confirmDialog.titulo?.documento || null}
        tituloInfo={confirmDialog.titulo}
        onConfirm={handleConfirmAction}
        isLoading={
          (confirmDialog.actionType === "cancelar" && removingCedrusId === confirmDialog.titulo?.id) ||
          (confirmDialog.actionType === "marcar_pago" && markingPaidId === confirmDialog.titulo?.id) ||
          (confirmDialog.actionType === "inserir" && inserirCedrusMutation.isPending)
        }
      />

      {/* Confirmação de disparo de emails */}
      <AlertDialog open={emailDisparoOpen} onOpenChange={setEmailDisparoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio de emails de cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              {emailDisparoLoading 
                ? 'Aguardando retorno do servidor... Isso pode levar alguns minutos.'
                : 'Deseja realmente enviar os emails de cobrança para todos os títulos Tudo Belo? Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {emailDisparoLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              <span className="ml-3 text-sm text-muted-foreground">Processando disparo de emails...</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={emailDisparoLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleEnviarEmailsCobranca();
              }}
              disabled={emailDisparoLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {emailDisparoLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Aguardando...</>
              ) : 'Confirmar Envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Relatório de emails enviados */}
      <AlertDialog open={emailRelatorioOpen} onOpenChange={setEmailRelatorioOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-orange-600" />
              Relatório de Emails Enviados
            </AlertDialogTitle>
            <AlertDialogDescription>
              {emailRelatorio && `${emailRelatorio.nome_parceiro.length} emails enviados • Saldo total: ${formatCurrency(emailRelatorio.saldo_parcela.reduce((s, v) => s + v, 0))}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {emailRelatorio && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Parceiro</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs text-right">Saldo</TableHead>
                    <TableHead className="text-xs">Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailRelatorio.nome_parceiro.map((nome, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{nome}</TableCell>
                      <TableCell className="text-xs">{emailRelatorio.email[i]}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(emailRelatorio.saldo_parcela[i])}</TableCell>
                      <TableCell className="text-xs">{formatDate(emailRelatorio.data_vencimento[i])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDownloadRelatorioPDF();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <FileText className="h-4 w-4 mr-1" />
              Baixar PDF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
