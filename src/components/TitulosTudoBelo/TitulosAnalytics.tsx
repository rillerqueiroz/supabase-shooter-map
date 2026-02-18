import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TituloTudoBelo, TitulosFilters } from "@/hooks/useTitulosTudoBelo";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { DateFilterSelect } from "@/components/Filters/DateFilterSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BrazilMap } from "./BrazilMap";
import { Filter, X } from "lucide-react";

interface TitulosAnalyticsProps {
  data: TituloTudoBelo[];
  filters: TitulosFilters;
  onFiltersChange: (filters: TitulosFilters) => void;
  options?: {
    nomesParceiros?: string[];
    statusTitulo?: string[];
    vendedores?: string[];
    tiposTitulo?: string[];
    formasPagamento?: string[];
    ufs?: string[];
  };
  etapas?: string[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

export function TitulosAnalytics({ data, filters, onFiltersChange, options, etapas }: TitulosAnalyticsProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Análise por Status do Boleto
  const statusData = data.reduce((acc, item) => {
    const status = item.status_boleto || "Sem Status";
    if (!acc[status]) {
      acc[status] = { name: status, count: 0, value: 0 };
    }
    acc[status].count += 1;
    acc[status].value += item.saldo_parcela || 0;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number }>);
  const statusChartData = Object.values(statusData);

  // Análise por Filial
  const filialData = data.reduce((acc, item) => {
    const filial = item.filial || "Sem Filial";
    if (!acc[filial]) {
      acc[filial] = { name: filial, count: 0, value: 0 };
    }
    acc[filial].count += 1;
    acc[filial].value += item.saldo_parcela || 0;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number }>);
  const filialChartData = Object.values(filialData).sort((a, b) => b.value - a.value).slice(0, 10);

  // Análise por UF - usando saldo_parcela com sanitização
  const ufData = data.reduce((acc, item) => {
    const rawUf = (item.uf_cobranca || "").toUpperCase().trim();
    const uf = rawUf || "N/A";
    if (!acc[uf]) {
      acc[uf] = { name: uf, count: 0, value: 0 };
    }
    acc[uf].count += 1;
    acc[uf].value += item.saldo_parcela || 0;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number }>);
  const ufChartData = Object.values(ufData).sort((a, b) => b.value - a.value).slice(0, 10);

  // Análise temporal por mês de vencimento
  const monthlyData = data.reduce((acc, item) => {
    if (!item.data_vencimento) return acc;
    try {
      const monthKey = format(startOfMonth(parseISO(item.data_vencimento)), "yyyy-MM");
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, valor: 0, saldo: 0, count: 0 };
      }
      acc[monthKey].valor += item.valor_parcela || 0;
      acc[monthKey].saldo += item.saldo_parcela || 0;
      acc[monthKey].count += 1;
    } catch {}
    return acc;
  }, {} as Record<string, { month: string; valor: number; saldo: number; count: number }>);
  
  const monthlyChartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map((item) => ({
      ...item,
      monthLabel: format(parseISO(`${item.month}-01`), "MMM/yy", { locale: ptBR }),
    }));

  // Análise Cedrus
  const cedrusData = [
    { name: "Inserido", value: data.filter((d) => d.inserido_cedrus).length },
    { name: "Não Inserido", value: data.filter((d) => !d.inserido_cedrus).length },
  ];

  // Análise por Vendedor
  const vendedorData = data.reduce((acc, item) => {
    const vendedor = item.vendedor || "Sem Vendedor";
    if (!acc[vendedor]) {
      acc[vendedor] = { name: vendedor, count: 0, value: 0 };
    }
    acc[vendedor].count += 1;
    acc[vendedor].value += item.saldo_parcela || 0;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number }>);
  const vendedorChartData = Object.values(vendedorData).sort((a, b) => b.value - a.value).slice(0, 8);

  // Métricas gerais
  const totalValor = data.reduce((sum, item) => sum + (item.valor_parcela || 0), 0);
  const totalSaldo = data.reduce((sum, item) => sum + (item.saldo_parcela || 0), 0);
  const avgDiasAtraso = data.filter(d => d.dias_atraso).reduce((sum, d) => sum + parseInt(d.dias_atraso || "0"), 0) / (data.filter(d => d.dias_atraso).length || 1);

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).filter((k) => filters[k as keyof TitulosFilters]).length > 0;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <MultiSelectFilter
                title="Parceiro"
                options={options?.nomesParceiros || []}
                selectedValues={filters.nomesParceiros || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, nomesParceiros: v })}
              />
              <MultiSelectFilter
                title="Status Título"
                options={options?.statusTitulo || []}
                selectedValues={filters.statusTitulo || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, statusTitulo: v })}
              />
              <MultiSelectFilter
                title="Vendedor"
                options={options?.vendedores || []}
                selectedValues={filters.vendedores || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, vendedores: v })}
              />
              <MultiSelectFilter
                title="Tipo Título"
                options={options?.tiposTitulo || []}
                selectedValues={filters.tiposTitulo || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, tiposTitulo: v })}
              />
              <MultiSelectFilter
                title="Forma Pagamento"
                options={options?.formasPagamento || []}
                selectedValues={filters.formasPagamento || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, formasPagamento: v })}
              />
              <MultiSelectFilter
                title="UF"
                options={options?.ufs || []}
                selectedValues={filters.ufs || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, ufs: v })}
              />
              <MultiSelectFilter
                title="Etapa"
                options={etapas || []}
                selectedValues={filters.etapas || []}
                onSelectionChange={(v) => onFiltersChange({ ...filters, etapas: v })}
              />
              <DateFilterSelect
                label="Data Vencimento"
                value={filters.dataVencimentoRange}
                onChange={(v) => onFiltersChange({ ...filters, dataVencimentoRange: v })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Inserido Cedrus</label>
                <Select
                  value={filters.inseridoCedrus === null || filters.inseridoCedrus === undefined ? "todos" : filters.inseridoCedrus ? "sim" : "nao"}
                  onValueChange={(v) => onFiltersChange({ 
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

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Títulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalSaldo)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média Dias Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDiasAtraso.toFixed(0)} dias</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapa do Brasil por UF - baseado em Saldo Parcela */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>📍 Distribuição por Estado (Saldo Parcela)</CardTitle>
          </CardHeader>
          <CardContent className="h-[500px]">
            <BrazilMap data={Object.values(ufData)} />
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução Mensal por Vencimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="valor" name="Valor Parcela" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cedrus */}
        <Card>
          <CardHeader>
            <CardTitle>Status Cedrus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={cedrusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR")} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por UF - Gráfico de barras */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 UFs por Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ufChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} className="text-xs" />
                <YAxis dataKey="name" type="category" width={60} className="text-xs" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
