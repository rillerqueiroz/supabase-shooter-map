import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoSuperavit from "@/assets/logo-superavit.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCobrancasAnalytics, AnalyticsFilters } from "@/hooks/useCobrancasAnalytics";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths, addYears, subYears, format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { AlertTriangle, TrendingUp, Banknote, CreditCard, Calendar, BarChart3, Filter, Building2, ListFilter, ChevronDown, Download, Hourglass, BadgeCheck, Percent, DollarSign, FolderKanban } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface CobrancasAnalyticsProps {
  cobrancas: any[];
  onDateFilterChange?: (dateRange: { from?: Date; to?: Date }) => void;
  useDescontoValor?: boolean;
  onToggleDesconto?: () => void;
}

type PresetPeriod = "este-mes" | "mes-passado" | "proximo-mes" | "este-ano" | "proximo-ano" | "ano-passado" | "personalizado";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "A Vencer",
  RECEIVED: "Recebido",
  RECEIVED_IN_CASH: "Recebido em Dinheiro",
  RECEIVED_SUPERAVIT: "Recebido Superavit",
  OVERDUE_NEGOCIADA: "Vencida e Negociada",
  CONFIRMED: "Confirmado",
  OVERDUE: "Vencido",
  REFUNDED: "Estornado",
  REFUND_REQUESTED: "Estorno Solicitado",
  CHARGEBACK_REQUESTED: "Chargeback Solicitado",
  CHARGEBACK_DISPUTE: "Disputa Chargeback",
  AWAITING_CHARGEBACK_REVERSAL: "Aguardando Reversão",
  DUNNING_REQUESTED: "Negativação Solicitada",
  DUNNING_RECEIVED: "Negativação Recebida",
  AWAITING_RISK_ANALYSIS: "Análise de Risco",
  CREATED: "Criado",
};

export function CobrancasAnalytics({ cobrancas, onDateFilterChange, useDescontoValor = false, onToggleDesconto }: CobrancasAnalyticsProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>("este-mes");
  const [selectedCredores, setSelectedCredores] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState<{ from?: Date; to?: Date }>({});
  const analyticsRef = useRef<HTMLDivElement>(null);

  const filters: AnalyticsFilters = useMemo(() => ({
    credores: selectedCredores.length > 0 ? selectedCredores : undefined,
    statusList: selectedStatus.length > 0 ? selectedStatus : undefined,
    dateRange: currentDateRange,
    useDescontoValor,
  }), [selectedCredores, selectedStatus, currentDateRange, useDescontoValor]);

  const analytics = useCobrancasAnalytics(cobrancas, filters);

  const getCredorDisplayText = () => {
    if (selectedCredores.length === 0) return "Todos os credores";
    if (selectedCredores.length === analytics.availableCredores.length) return "Todos selecionados";
    if (selectedCredores.length === 1) return selectedCredores[0];
    if (selectedCredores.length === 2) return selectedCredores.join(", ");
    return `${selectedCredores.slice(0, 2).join(", ")} +${selectedCredores.length - 2}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

  const handlePresetChange = (preset: PresetPeriod) => {
    setSelectedPreset(preset);
    const now = new Date();

    let dateRange: { from?: Date; to?: Date } = {};

    switch (preset) {
      case "este-mes":
        dateRange = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "mes-passado":
        const lastMonth = subMonths(now, 1);
        dateRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      case "proximo-mes":
        const nextMonth = addMonths(now, 1);
        dateRange = { from: startOfMonth(nextMonth), to: endOfMonth(nextMonth) };
        break;
      case "este-ano":
        dateRange = { from: startOfYear(now), to: endOfYear(now) };
        break;
      case "proximo-ano":
        const nextYear = addYears(now, 1);
        dateRange = { from: startOfYear(nextYear), to: endOfYear(nextYear) };
        break;
      case "ano-passado":
        const lastYear = subYears(now, 1);
        dateRange = { from: startOfYear(lastYear), to: endOfYear(lastYear) };
        break;
      case "personalizado":
        // Keep current date range, user will pick manually
        return;
    }

    setCurrentDateRange(dateRange);
    onDateFilterChange?.(dateRange);
  };

  const handleCustomDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    setSelectedPreset("personalizado");
    const newRange = { ...currentDateRange, [field]: date };
    setCurrentDateRange(newRange);
    onDateFilterChange?.(newRange);
  };

  const handleCredorToggle = (credor: string) => {
    setSelectedCredores(prev => 
      prev.includes(credor)
        ? prev.filter(c => c !== credor)
        : [...prev, credor]
    );
  };

  const handleSelectAllCredores = () => {
    if (selectedCredores.length === analytics.availableCredores.length) {
      setSelectedCredores([]);
    } else {
      setSelectedCredores([...analytics.availableCredores]);
    }
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSelectAllStatus = () => {
    if (selectedStatus.length === analytics.availableStatus.length) {
      setSelectedStatus([]);
    } else {
      setSelectedStatus([...analytics.availableStatus]);
    }
  };

  const presetButtons: { value: PresetPeriod; label: string }[] = [
    { value: "este-mes", label: "Este Mês" },
    { value: "mes-passado", label: "Mês Anterior" },
    { value: "proximo-mes", label: "Próximo Mês" },
    { value: "este-ano", label: "Este Ano" },
    { value: "proximo-ano", label: "Próximo Ano" },
    { value: "ano-passado", label: "Ano Passado" },
  ];

  const exportToPDF = async () => {
    if (!analyticsRef.current) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Header with logo
      pdf.setFillColor(50, 50, 50);
      pdf.rect(0, 0, pageWidth, 22, "F");

      // Add logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = logoSuperavit;
        });
        const logoHeight = 14;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        pdf.addImage(logoImg, 'PNG', margin, 4, logoWidth, logoHeight);
      } catch { /* logo optional */ }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Relatório de Analytics - Cobranças", pageWidth / 2, 14, { align: "center" });
      yPos = 28;

      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;

      const presetLabel = presetButtons.find(p => p.value === selectedPreset)?.label || selectedPreset;
      pdf.text(`Período: ${presetLabel} | Credores: ${getCredorDisplayText()} | Status: ${selectedStatus.length === 0 ? "Todos" : selectedStatus.map(s => STATUS_LABELS[s] || s).join(", ")}`, margin, yPos);
      yPos += 8;

      pdf.setTextColor(0);

      // Capture all chart sections as compressed JPEG images
      const sections = analyticsRef.current.querySelectorAll('[data-pdf-section]');
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        try {
          const canvas = await html2canvas(section, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height / canvas.width) * imgWidth;

          // Check if we need a new page
          if (yPos + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
          }

          pdf.addImage(imgData, 'JPEG', margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 6;
        } catch (err) {
          console.warn('Erro ao capturar seção:', err);
        }
      }

      pdf.save(`analytics-cobrancas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (!cobrancas || cobrancas.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum dado disponível para análise</p>
          <p className="text-sm">Selecione um período com dados para ver os gráficos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" ref={analyticsRef}>
      {/* Filtros de Período e Analytics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Análise
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToPDF}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Período (baseado em vencimento) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Período (Vencimento)
            </Label>
            <div className="flex flex-wrap gap-2">
              {presetButtons.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedPreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant={selectedPreset === "personalizado" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange("personalizado")}
              >
                Personalizado
              </Button>
            </div>
            {/* Date pickers for custom range */}
            {selectedPreset === "personalizado" && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !currentDateRange.from && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {currentDateRange.from ? format(currentDateRange.from, "dd/MM/yyyy") : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={currentDateRange.from}
                      onSelect={(date) => handleCustomDateChange('from', date)}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-sm">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !currentDateRange.to && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {currentDateRange.to ? format(currentDateRange.to, "dd/MM/yyyy") : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={currentDateRange.to}
                      onSelect={(date) => handleCustomDateChange('to', date)}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {(currentDateRange.from || currentDateRange.to) && (
                  <span className="text-xs text-muted-foreground">
                    {currentDateRange.from && currentDateRange.to
                      ? `${format(currentDateRange.from, "dd/MM/yyyy")} - ${format(currentDateRange.to, "dd/MM/yyyy")}`
                      : currentDateRange.from
                        ? `A partir de ${format(currentDateRange.from, "dd/MM/yyyy")}`
                        : `Até ${format(currentDateRange.to!, "dd/MM/yyyy")}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Filtros de Credor e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {/* Filtro de Credor */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                Credor
                {selectedCredores.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {selectedCredores.length}
                  </span>
                )}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" title={selectedCredores.join(", ")}>
                    <span className="truncate">
                      {getCredorDisplayText()}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-credores"
                        checked={selectedCredores.length === analytics.availableCredores.length && analytics.availableCredores.length > 0}
                        onCheckedChange={handleSelectAllCredores}
                      />
                      <Label htmlFor="select-all-credores" className="text-sm font-medium cursor-pointer">
                        Selecionar todos
                      </Label>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-3 space-y-2">
                      {analytics.availableCredores.map((credor) => (
                        <div key={credor} className="flex items-center space-x-2">
                          <Checkbox
                            id={`credor-${credor}`}
                            checked={selectedCredores.includes(credor)}
                            onCheckedChange={() => handleCredorToggle(credor)}
                          />
                          <Label 
                            htmlFor={`credor-${credor}`} 
                            className="text-sm cursor-pointer truncate flex-1"
                          >
                            {credor}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro de Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ListFilter className="h-4 w-4" />
                Status
                {selectedStatus.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {selectedStatus.length}
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-between">
                      <span className="truncate">
                        {selectedStatus.length === 0 
                          ? "Todos os status" 
                          : selectedStatus.length === analytics.availableStatus.length
                            ? "Todos selecionados"
                            : `${selectedStatus.length} selecionado(s)`
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all-status"
                          checked={selectedStatus.length === analytics.availableStatus.length && analytics.availableStatus.length > 0}
                          onCheckedChange={handleSelectAllStatus}
                        />
                        <Label htmlFor="select-all-status" className="text-sm font-medium cursor-pointer">
                          Selecionar todos
                        </Label>
                      </div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="p-3 space-y-2">
                        {analytics.availableStatus.map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedStatus.includes(status)}
                              onCheckedChange={() => handleStatusToggle(status)}
                            />
                            <Label 
                              htmlFor={`status-${status}`} 
                              className="text-sm cursor-pointer truncate flex-1"
                            >
                              {STATUS_LABELS[status] || status}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                
                {/* Toggle Desconto de Pontualidade */}
                {onToggleDesconto && (
                  <Button
                    variant={useDescontoValor ? "default" : "outline"}
                    size="icon"
                    onClick={onToggleDesconto}
                    title={useDescontoValor ? "Valor com Desconto de Pontualidade" : "Valor Cheio"}
                    className="shrink-0"
                  >
                    {useDescontoValor ? (
                      <Percent className="h-4 w-4" />
                    ) : (
                      <DollarSign className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div data-pdf-section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Inadimplência</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analytics.taxaInadimplencia.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.inadimplencia.find(i => i.categoria === "Vencido")?.count || 0} cobranças vencidas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-500/20">
                <CreditCard className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido Normal</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCompactCurrency(analytics.totalRecebidoNormal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.countRecebidoNormal} cobranças
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-500/20">
                <Banknote className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido em Dinheiro</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCompactCurrency(analytics.totalRecebidoDinheiro)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.countRecebidoDinheiro} cobranças
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-200 dark:border-teal-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-teal-500/20">
                <BadgeCheck className="h-6 w-6 text-teal-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido Superavit</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {formatCompactCurrency(analytics.totalRecebidoSuperavit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.countRecebidoSuperavit} cobranças
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Hourglass className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencida e Negociada</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCompactCurrency(analytics.totalOverdueNegociada)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.countOverdueNegociada} cobranças
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div data-pdf-section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Inadimplência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">% de Inadimplência</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.inadimplencia}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="categoria"
                  label={({ categoria, percentual }) => `${categoria}: ${percentual.toFixed(1)}%`}
                  labelLine={true}
                >
                  {analytics.inadimplencia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${value} cobranças (${formatCurrency(props.payload.valor)})`,
                    props.payload.categoria,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Recebido Normal vs Dinheiro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recebido Normal vs Dinheiro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.recebimentoComparativo} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} />
                <YAxis type="category" dataKey="label" width={130} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {analytics.recebimentoComparativo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-muted-foreground">Qtd. Normal</p>
                <p className="font-bold text-blue-600">{analytics.countRecebidoNormal}</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <p className="text-muted-foreground">Qtd. Dinheiro</p>
                <p className="font-bold text-emerald-600">{analytics.countRecebidoDinheiro}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Temporal */}
      <Card data-pdf-section>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Evolução Temporal ({analytics.isMonthlyView ? "Diário" : "Mensal"} por Vencimento)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.temporalEvolution.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado de vencimento disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.temporalEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="A Vencer"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="received"
                  name="Recebido"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="overdue"
                  name="Vencido"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="overdueNegociada"
                  name="Vencida e Negociada"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ fill: "#a855f7", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="receivedInCash"
                  name="Recebido em Dinheiro"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ fill: "#eab308", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="receivedSuperavit"
                  name="Recebido Superavit"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ fill: "#059669", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Distribuição por Status e Top Empresas */}
      <div data-pdf-section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.statusDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${value} cobranças | Valor: ${formatCurrency(props.payload.value)} | c/ Desc.: ${formatCurrency(props.payload.valueWithDiscount)}`,
                    props.payload.label,
                  ]}
                />
                <Bar dataKey="count" name="Quantidade" radius={[0, 4, 4, 0]}>
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 Empresas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Empresas por Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topEmpresas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="value" name="Valor Total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Visualização por Projeto */}
      {analytics.projetoData && analytics.projetoData.length > 0 && (
        <>
          <Card data-pdf-section>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="h-5 w-5" />
                Visão por Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Valor total por projeto */}
              <ResponsiveContainer width="100%" height={Math.max(250, analytics.projetoData.length * 40)}>
                <BarChart data={analytics.projetoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => [formatCurrency(value), name]}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  <Bar dataKey="recebidoNormal" name="Recebido" stackId="a" fill="#22c55e" />
                  <Bar dataKey="recebidoDinheiro" name="Rec. Dinheiro" stackId="a" fill="#10b981" />
                  <Bar dataKey="recebidoSuperavit" name="Rec. Superavit" stackId="a" fill="#059669" />
                  <Bar dataKey="valorVencido" name="Vencido" stackId="a" fill="#ef4444" />
                  <Bar dataKey="overdueNegociada" name="Venc. Negociada" stackId="a" fill="#a855f7" />
                  <Bar dataKey="valorPendente" name="A Vencer" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div data-pdf-section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inadimplência por Projeto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Taxa de Inadimplência por Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(250, analytics.projetoData.length * 40)}>
                  <BarChart data={analytics.projetoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 'auto']} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                    <Bar dataKey="taxaInadimplencia" name="Inadimplência %" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quantidade por Projeto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quantidade de Cobranças por Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(250, analytics.projetoData.length * 40)}>
                  <BarChart data={analytics.projetoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="recebidos" name="Recebidos" stackId="a" fill="#22c55e" />
                    <Bar dataKey="vencidos" name="Vencidos" stackId="a" fill="#ef4444" />
                    <Bar dataKey="pendentes" name="A Vencer" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela resumo por projeto */}
          <Card data-pdf-section>
            <CardHeader>
              <CardTitle className="text-base">Resumo por Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Projeto</th>
                      <th className="text-right py-2 px-3 font-medium">Qtd</th>
                      <th className="text-right py-2 px-3 font-medium">Valor Total</th>
                      <th className="text-right py-2 px-3 font-medium">Recebido</th>
                      <th className="text-right py-2 px-3 font-medium">Vencido</th>
                      <th className="text-right py-2 px-3 font-medium">A Vencer</th>
                      <th className="text-right py-2 px-3 font-medium">Inadimplência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.projetoData.map((proj) => (
                      <tr key={proj.name} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{proj.name}</td>
                        <td className="text-right py-2 px-3">{proj.count}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(proj.totalValor)}</td>
                        <td className="text-right py-2 px-3 text-emerald-600">{formatCurrency(proj.valorRecebido)}</td>
                        <td className="text-right py-2 px-3 text-red-600">{formatCurrency(proj.valorVencido)}</td>
                        <td className="text-right py-2 px-3 text-amber-600">{formatCurrency(proj.valorPendente)}</td>
                        <td className="text-right py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            proj.taxaInadimplencia > 30 ? 'bg-red-500/10 text-red-700' :
                            proj.taxaInadimplencia > 10 ? 'bg-amber-500/10 text-amber-700' :
                            'bg-emerald-500/10 text-emerald-700'
                          }`}>
                            {proj.taxaInadimplencia.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      let tCount = 0, tTotal = 0, tRecebido = 0, tVencido = 0, tPendente = 0, tVencidos = 0;
                      analytics.projetoData.forEach(p => {
                        tCount += p.count; tTotal += p.totalValor; tRecebido += p.valorRecebido;
                        tVencido += p.valorVencido; tPendente += p.valorPendente; tVencidos += p.vencidos;
                      });
                      const taxaTotal = tCount > 0 ? (tVencidos / tCount) * 100 : 0;
                      return (
                        <tr className="border-t-2 border-foreground/20 bg-muted/50 font-bold">
                          <td className="py-2 px-3">TOTAL</td>
                          <td className="text-right py-2 px-3">{tCount}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(tTotal)}</td>
                          <td className="text-right py-2 px-3 text-emerald-600">{formatCurrency(tRecebido)}</td>
                          <td className="text-right py-2 px-3 text-red-600">{formatCurrency(tVencido)}</td>
                          <td className="text-right py-2 px-3 text-amber-600">{formatCurrency(tPendente)}</td>
                          <td className="text-right py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              taxaTotal > 30 ? 'bg-red-500/10 text-red-700' :
                              taxaTotal > 10 ? 'bg-amber-500/10 text-amber-700' :
                              'bg-emerald-500/10 text-emerald-700'
                            }`}>
                              {taxaTotal.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Inadimplência por Projeto - Tabela + Pizza */}
          {(() => {
            let totalVencidosGeral = 0, totalValorVencidoGeral = 0;
            analytics.projetoData.forEach(p => { totalVencidosGeral += p.vencidos; totalValorVencidoGeral += p.valorVencido; });
            const inadimplenciaProjetos = analytics.projetoData
              .filter(p => p.vencidos > 0)
              .map(p => ({
                name: p.name,
                vencidos: p.vencidos,
                valorVencido: p.valorVencido,
                taxaInadimplencia: p.taxaInadimplencia,
                percDoTotal: totalVencidosGeral > 0 ? (p.vencidos / totalVencidosGeral) * 100 : 0,
                percValorDoTotal: totalValorVencidoGeral > 0 ? (p.valorVencido / totalValorVencidoGeral) * 100 : 0,
              }))
              .sort((a, b) => b.valorVencido - a.valorVencido);

            const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7', '#ec4899', '#6366f1', '#14b8a6', '#64748b', '#dc2626', '#d946ef'];

            if (inadimplenciaProjetos.length === 0) return null;

            return (
              <div data-pdf-section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Inadimplência por Projeto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium">Projeto</th>
                            <th className="text-right py-2 px-3 font-medium">Qtd Vencidos</th>
                            <th className="text-right py-2 px-3 font-medium">Valor Vencido</th>
                            <th className="text-right py-2 px-3 font-medium">% Inadimpl.</th>
                            <th className="text-right py-2 px-3 font-medium">% do Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inadimplenciaProjetos.map((proj) => (
                            <tr key={proj.name} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-3 font-medium">{proj.name}</td>
                              <td className="text-right py-2 px-3">{proj.vencidos}</td>
                              <td className="text-right py-2 px-3 text-red-600">{formatCurrency(proj.valorVencido)}</td>
                              <td className="text-right py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  proj.taxaInadimplencia > 30 ? 'bg-red-500/10 text-red-700' :
                                  proj.taxaInadimplencia > 10 ? 'bg-amber-500/10 text-amber-700' :
                                  'bg-emerald-500/10 text-emerald-700'
                                }`}>
                                  {proj.taxaInadimplencia.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-2 px-3 font-medium">{proj.percValorDoTotal.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-foreground/20 bg-muted/50 font-bold">
                            <td className="py-2 px-3">TOTAL</td>
                            <td className="text-right py-2 px-3">{totalVencidosGeral}</td>
                            <td className="text-right py-2 px-3 text-red-600">{formatCurrency(totalValorVencidoGeral)}</td>
                            <td className="text-right py-2 px-3">—</td>
                            <td className="text-right py-2 px-3 font-medium">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Inadimplência por Projeto (Valor)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(300, inadimplenciaProjetos.length * 45)}>
                      <BarChart data={inadimplenciaProjetos} layout="vertical" margin={{ right: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} />
                        <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: any, name: string) => [formatCurrency(value), name]}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Bar dataKey="valorVencido" name="Valor Vencido" fill="#ef4444" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => formatCompactCurrency(v), fontSize: 11 }}>
                          {inadimplenciaProjetos.map((_, index) => (
                            <Cell key={`bar-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
