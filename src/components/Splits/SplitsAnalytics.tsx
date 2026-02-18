import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SplitDetalhado } from "@/hooks/useSplits";
import { useSplitsAnalytics, PeriodType } from "@/hooks/useSplitsAnalytics";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, Users, Wallet, Award } from "lucide-react";

interface SplitsAnalyticsProps {
  splits: SplitDetalhado[];
}

const COLORS = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  DONE: "#10b981",
  CANCELLED: "#ef4444",
  UNKNOWN: "#6b7280",
};

const CHART_COLORS = [
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#8b5cf6", // purple
  "#a855f7", // purple-500
];

export function SplitsAnalytics({ splits }: SplitsAnalyticsProps) {
  const [periodType, setPeriodType] = useState<PeriodType>("daily");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const {
    statusDistribution,
    temporalEvolution,
    topClients,
    topPayers,
    walletDistribution,
    bestDayOfMonth,
    averageValue,
    medianValue,
    averagePerClient,
  } = useSplitsAnalytics(splits, periodType);

  // Filtrar clientes selecionados
  const filteredTopClients = selectedClients.length > 0
    ? topClients.filter(client => selectedClients.includes(client.name))
    : topClients;

  // Obter lista única de clientes para o filtro
  const allClients = topClients.map(c => c.name);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
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

  if (splits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Nenhum dado disponível para análise. Ajuste os filtros para visualizar as métricas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por split recebido</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio por Cliente</CardTitle>
            <Users className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averagePerClient)}</div>
            <p className="text-xs text-muted-foreground mt-1">Média por cliente único</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Dia do Mês</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestDayOfMonth ? `Dia ${bestDayOfMonth.day}` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bestDayOfMonth ? formatCurrency(bestDayOfMonth.value) : "Sem dados"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controle de Período e Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Período de Agregação</CardTitle>
            <CardDescription>Selecione como agrupar os dados temporais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={periodType === "daily" ? "default" : "outline"}
                onClick={() => setPeriodType("daily")}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Diário
              </Button>
              <Button
                variant={periodType === "weekly" ? "default" : "outline"}
                onClick={() => setPeriodType("weekly")}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Semanal
              </Button>
              <Button
                variant={periodType === "monthly" ? "default" : "outline"}
                onClick={() => setPeriodType("monthly")}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Mensal
              </Button>
              <Button
                variant={periodType === "all" ? "default" : "outline"}
                onClick={() => setPeriodType("all")}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Todo o Período
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Cliente</CardTitle>
            <CardDescription>Selecione os clientes para análise detalhada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allClients.map((client) => (
                <Button
                  key={client}
                  variant={selectedClients.includes(client) ? "default" : "outline"}
                  onClick={() => {
                    setSelectedClients(prev =>
                      prev.includes(client)
                        ? prev.filter(c => c !== client)
                        : [...prev, client]
                    );
                  }}
                  size="sm"
                >
                  {client}
                </Button>
              ))}
              {selectedClients.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setSelectedClients([])}
                  size="sm"
                >
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Quantidade e valor total por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.label}: ${entry.count}`}
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.status} fill={COLORS[entry.status as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução Temporal - Valor */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Valores</CardTitle>
            <CardDescription>Valor total recebido por período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Valor"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução Temporal - Quantidade */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Quantidade</CardTitle>
            <CardDescription>Número de splits por período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={temporalEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="Quantidade" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clientes</CardTitle>
            <CardDescription>Clientes com maior valor total</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={filteredTopClients}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="value" name="Valor Total">
                  {filteredTopClients.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 Pagadores */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Pagadores</CardTitle>
            <CardDescription>Pagadores com maior valor total</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPayers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={formatCompactCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: "hsl(var(--foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Valor Total">
                  {topPayers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
