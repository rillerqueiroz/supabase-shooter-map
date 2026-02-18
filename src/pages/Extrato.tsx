import { useState, useEffect } from "react";
import { FileDown, RefreshCw, Receipt, AlertCircle, CalendarIcon } from "lucide-react";
import { ClientDataFilter } from '@/components/Auth/ClientDataFilter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useClientesExtratoSuperavit } from "@/hooks/useClientesSuperavit";
import { useExtratoWebhook } from "@/hooks/useExtratoWebhook";
import { calculateMetrics, TransacaoFinanceira } from "@/hooks/useExtratosBancarios";
import { MetricsCardsExtrato } from "@/components/Extrato/MetricsCardsExtrato";
import { TransacaoDetailsModal } from "@/components/Extrato/TransacaoDetailsModal";
import { TipoTransacaoBadge } from "@/components/Extrato/TipoTransacaoBadge";
import { formatDateFromDatabase } from "@/lib/utils";
import { exportExtratoToExcel, exportExtratoToPDF } from "@/utils/exportExtrato";
import { supabase } from "@/lib/supabase";

export default function Extrato() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedCredorCedrus, setSelectedCredorCedrus] = useState<string>("");
  const [selectedCredorCedrusCode, setSelectedCredorCedrusCode] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [periodType, setPeriodType] = useState<string>("esta-semana");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoFinanceira | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [devedoresCache, setDevedoresCache] = useState<Record<string, string>>({});

  // Função para extrair o invoice_number da descrição
  const extractInvoiceNumber = (description: string | null | undefined): string | null => {
    if (!description) return null;
    const match = description.match(/fatura\s+nr\.?\s*(\d+)/i);
    return match ? match[1] : null;
  };

  // Calcular datas baseadas no período selecionado
  useEffect(() => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date = hoje;

    switch (periodType) {
      case "hoje":
        inicio = hoje;
        break;
      case "ontem":
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 1);
        fim = new Date(hoje);
        fim.setDate(hoje.getDate() - 1);
        break;
      case "esta-semana":
        inicio = new Date(hoje);
        const diaSemana = hoje.getDay();
        inicio.setDate(hoje.getDate() - diaSemana);
        break;
      case "este-mes":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case "personalizado":
        if (customStartDate && customEndDate) {
          setDataInicio(format(customStartDate, "yyyy-MM-dd"));
          setDataFim(format(customEndDate, "yyyy-MM-dd"));
        }
        return;
      default:
        inicio = hoje;
    }

    setDataInicio(format(inicio, "yyyy-MM-dd"));
    setDataFim(format(fim, "yyyy-MM-dd"));
  }, [periodType, customStartDate, customEndDate]);

  const { data: clientes = [], isLoading: loadingClientes } = useClientesExtratoSuperavit();
  const {
    data: transacoes = [],
    isLoading: loadingTransacoes,
    refetch,
    error: webhookError,
  } = useExtratoWebhook(selectedWalletId, selectedCredorCedrus, selectedCredorCedrusCode, dataInicio, dataFim);

  const metrics = calculateMetrics(transacoes);

  const handleClienteChange = (walletId: string) => {
    setSelectedWalletId(walletId);
    const cliente = clientes.find((c) => c.wallet_id === walletId);
    setSelectedCredorCedrus(cliente?.nome || "");
    setSelectedCredorCedrusCode(cliente?.credor_cedrus || "");
    console.log("🎯 Cliente selecionado:", cliente);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Dados atualizados",
      description: "O extrato foi recarregado com sucesso.",
    });
  };

  const handleExportExcel = () => {
    if (!selectedWalletId) {
      toast({
        title: "Selecione um cliente",
        description: "É necessário selecionar um cliente para exportar.",
        variant: "destructive",
      });
      return;
    }

    const result = exportExtratoToExcel(transacoes, selectedCredorCedrus);
    if (result.success) {
      toast({
        title: "Exportado com sucesso",
        description: `Arquivo ${result.filename} criado.`,
      });
    } else {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o extrato.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    if (!selectedWalletId) {
      toast({
        title: "Selecione um cliente",
        description: "É necessário selecionar um cliente para exportar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportExtratoToPDF(transacoes, selectedCredorCedrus, metrics, devedoresCache);
      toast({
        title: "PDF gerado",
        description: "O extrato foi exportado em PDF.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o PDF.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleTransacaoClick = (transacao: TransacaoFinanceira) => {
    setSelectedTransacao(transacao);
    setModalOpen(true);
  };

  // Buscar nomes dos devedores para transações INTERNAL_TRANSFER_CREDIT
  useEffect(() => {
    const fetchDevedores = async () => {
      const transacoesCredito = transacoes.filter(
        (t) => t.type === "INTERNAL_TRANSFER_CREDIT"
      );
      
      for (const transacao of transacoesCredito) {
        const invoiceNumber = extractInvoiceNumber(transacao.description);
        if (invoiceNumber && !devedoresCache[invoiceNumber]) {
          try {
            const { data } = await supabase
              .from("Atualizar cobranças futuras com CEDRUS")
              .select('"Nome"')
              .eq('"Número da fatura"', invoiceNumber)
              .maybeSingle();
            
            if (data?.Nome) {
              setDevedoresCache((prev) => ({
                ...prev,
                [invoiceNumber]: data.Nome,
              }));
            }
          } catch (error) {
            console.error("Erro ao buscar devedor:", error);
          }
        }
      }
    };

    if (transacoes.length > 0) {
      fetchDevedores();
    }
  }, [transacoes]);

  return (
    <div className="container mx-auto mobile-container py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0 mt-1" />
        <div>
          <h1 className="mobile-heading font-bold">Extrato Bancário</h1>
          <p className="mobile-text-sm text-muted-foreground">
            Visualize as transações financeiras de um cliente
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3 sm:space-y-4">
        {/* Linha 1: Cliente e Período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="w-full">
            <label className="mobile-text-sm font-medium mb-2 block">
              Cliente <span className="text-red-500">*</span>
            </label>
            <ClientDataFilter
              data={clientes}
              getCredorCedrus={(item) => item.credor_cedrus || ""}
            >
              {(filteredClientes) => (
                <Select
                  value={selectedWalletId || ""}
                  onValueChange={handleClienteChange}
                  disabled={loadingClientes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {filteredClientes
                      .filter((cliente) => !!cliente.wallet_id && cliente.wallet_id !== "")
                      .map((cliente) => (
                        <SelectItem key={`${cliente.wallet_id}-${cliente.credor_cedrus}`} value={cliente.wallet_id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </ClientDataFilter>
          </div>

          <div className="w-full">
            <label className="mobile-text-sm font-medium mb-2 block">Período</label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="ontem">Ontem</SelectItem>
                <SelectItem value="esta-semana">Esta Semana</SelectItem>
                <SelectItem value="este-mes">Este Mês</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Datas personalizadas (se selecionado) */}
        {periodType === "personalizado" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="w-full">
              <label className="mobile-text-sm font-medium mb-2 block">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mobile-text-sm",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{customStartDate ? format(customStartDate, "PPP") : "Selecione..."}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-full">
              <label className="mobile-text-sm font-medium mb-2 block">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mobile-text-sm",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{customEndDate ? format(customEndDate, "PPP") : "Selecione..."}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Linha 3: Botões de ação */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mobile-button">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button onClick={handleExportExcel} variant="outline" size="sm" className="mobile-button">
            <FileDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button onClick={handleExportPDF} variant="outline" size="sm" className="mobile-button">
            <FileDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Erro do Webhook */}
      {webhookError && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-destructive font-medium">
              Erro ao buscar extrato do servidor
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique sua conexão e tente novamente
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}

      {/* Métricas */}
      {selectedWalletId && !loadingTransacoes && !webhookError && (
        <MetricsCardsExtrato metrics={metrics} />
      )}

      {/* Tabela de Transações */}
      {!selectedWalletId ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Selecione um cliente</p>
          <p className="text-sm">Escolha um cliente acima para visualizar o extrato</p>
        </div>
      ) : loadingTransacoes ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando extrato do servidor...</p>
        </div>
      ) : transacoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhuma transação encontrada</p>
          <p className="text-sm">Não há transações para o período selecionado</p>
        </div>
      ) : (
        <div className="border rounded-lg table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="mobile-text-sm">Data</TableHead>
                <TableHead className="mobile-text-sm">Descrição</TableHead>
                <TableHead className="mobile-text-sm text-right">Valor</TableHead>
                <TableHead className="mobile-text-sm text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map((transacao) => {
                const invoiceNumber = transacao.type === "INTERNAL_TRANSFER_CREDIT" 
                  ? extractInvoiceNumber(transacao.description) 
                  : null;
                const nomeDevedor = invoiceNumber ? devedoresCache[invoiceNumber] : null;

                return (
                  <TableRow
                    key={transacao.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleTransacaoClick(transacao)}
                  >
                    <TableCell className="font-medium mobile-text-sm whitespace-nowrap">
                      {formatDateFromDatabase(transacao.date)}
                    </TableCell>
                    <TableCell className="mobile-text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="line-clamp-2">
                          {transacao.description || "-"}
                        </span>
                        {transacao.type === "INTERNAL_TRANSFER_CREDIT" && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {`Repasse${nomeDevedor ? ` - ${nomeDevedor}` : "..."}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold mobile-text-sm whitespace-nowrap ${
                        transacao.value > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(transacao.value)}
                    </TableCell>
                    <TableCell className="text-right font-medium mobile-text-sm whitespace-nowrap">
                      {formatCurrency(transacao.balance)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de Detalhes */}
      <TransacaoDetailsModal
        transacao={selectedTransacao}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
      </div>
  );
}
