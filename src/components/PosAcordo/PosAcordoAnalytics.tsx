import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ControleZapsign } from "@/hooks/useControleZapsign";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileCheck, FileX, Clock, TrendingUp, Users, DollarSign, Calendar, Building2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportPosAcordoToExcel, exportPosAcordoToPDF } from '@/utils/exportPosAcordo';
import { toast } from 'sonner';

interface PosAcordoAnalyticsProps {
  registros: ControleZapsign[];
}
const COLORS = {
  assinado: '#22c55e',
  naoAssinado: '#ef4444',
  pendente: '#f59e0b',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  tertiary: '#06b6d4',
  quaternary: '#10b981',
  muted: '#94a3b8',
};

const STATUS_COLORS = {
  'Paga': '#22c55e',
  'Cancelada': '#ef4444',
  'Aberta': '#3b82f6',
  'Não localizada': '#f59e0b',
};

export function PosAcordoAnalytics({ registros }: PosAcordoAnalyticsProps) {
  const analytics = useMemo(() => {
    if (!registros || registros.length === 0) {
      return null;
    }


    const parseValorNegociado = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value !== 'string') return 0;

      const raw = value.replace(/[R$\s]/g, '').trim();
      const normalized = raw.includes(',')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw;

      const num = parseFloat(normalized.replace(/[^\d.-]/g, ''));
      return Number.isFinite(num) ? num : 0;
    };

    // 1. Status de Assinatura
    const assinados = registros.filter(r => r.assinado_zapsign === true).length;
    const naoAssinados = registros.filter(r => r.assinado_zapsign === false).length;
    const pendentes = registros.filter(r => r.assinado_zapsign === null).length;

    const statusAssinaturaData = [
      { name: 'Assinado', value: assinados, color: COLORS.assinado },
      { name: 'Não Assinado', value: naoAssinados, color: COLORS.naoAssinado },
      { name: 'Pendente', value: pendentes, color: COLORS.pendente },
    ].filter(d => d.value > 0);

    // 2. Status de Negociação
    const statusNegociacaoMap = new Map<string, number>();
    registros.forEach(r => {
      const status = r.status_negociacao || 'Não identificado';
      statusNegociacaoMap.set(status, (statusNegociacaoMap.get(status) || 0) + 1);
    });

    const statusNegociacaoData = Array.from(statusNegociacaoMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || COLORS.muted,
      }))
      .sort((a, b) => b.value - a.value);

    // 3. Por Credor
    const credorMap = new Map<string, { count: number; valor: number }>();
    registros.forEach(r => {
      const credor = r.credor_cedrus || 'Sem Credor';
      const valor = parseValorNegociado(r.valor_total_negociado);
      const current = credorMap.get(credor) || { count: 0, valor: 0 };
      credorMap.set(credor, {
        count: current.count + 1,
        valor: current.valor + valor,
      });
    });

    const credorData = Array.from(credorMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Por Origem
    const origemMap = new Map<string, number>();
    registros.forEach(r => {
      const origem = r.origem || 'Sem Origem';
      origemMap.set(origem, (origemMap.get(origem) || 0) + 1);
    });

    const origemData = Array.from(origemMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 5. Por Responsável
    const responsavelMap = new Map<string, number>();
    registros.forEach(r => {
      const responsavel = r.responsavel || 'Sem Responsável';
      responsavelMap.set(responsavel, (responsavelMap.get(responsavel) || 0) + 1);
    });

    const responsavelData = Array.from(responsavelMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // 6. Evolução Temporal (por mês)
    const temporalMap = new Map<string, { total: number; assinados: number; valor: number; sortKey: number }>();
    registros.forEach(r => {
      if (!r.data_criacao) return;
      try {
        const date = parseISO(r.data_criacao);
        const monthStart = startOfMonth(date);
        const monthKey = format(monthStart, 'MMM/yyyy', { locale: ptBR });
        const sortKey = monthStart.getTime(); // Use timestamp for proper sorting
        const valor = parseValorNegociado(r.valor_total_negociado);
        const current = temporalMap.get(monthKey) || { total: 0, assinados: 0, valor: 0, sortKey };
        temporalMap.set(monthKey, {
          total: current.total + 1,
          assinados: current.assinados + (r.assinado_zapsign === true ? 1 : 0),
          valor: current.valor + valor,
          sortKey,
        });
      } catch {
        // Invalid date
      }
    });

    const temporalData = Array.from(temporalMap.entries())
      .map(([period, data]) => ({
        period,
        total: data.total,
        assinados: data.assinados,
        valor: data.valor,
        sortKey: data.sortKey,
        taxaAssinatura: data.total > 0 ? Math.round((data.assinados / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    // 7. Valor Total
    const valorTotal = registros.reduce((sum, r) => {
      const valor = parseValorNegociado(r.valor_total_negociado);
      return sum + valor;
    }, 0);

    // 8. Taxa de Assinatura
    const taxaAssinatura = registros.length > 0 ? Math.round((assinados / registros.length) * 100) : 0;

    return {
      statusAssinaturaData,
      statusNegociacaoData,
      credorData,
      origemData,
      responsavelData,
      temporalData,
      valorTotal,
      taxaAssinatura,
      totalRegistros: registros.length,
      assinados,
      naoAssinados,
      pendentes,
    };
  }, [registros]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

  const handleExportExcel = () => {
    try {
      const result = exportPosAcordoToExcel(registros);
      if (result.success) {
        toast.success(`Excel exportado: ${result.filename}`);
      } else {
        toast.error('Erro ao exportar Excel');
      }
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel');
    }
  };

  const handleExportPDF = async () => {
    if (!analytics) return;
    try {
      const result = await exportPosAcordoToPDF(registros, {
        totalRegistros: analytics.totalRegistros,
        taxaAssinatura: analytics.taxaAssinatura,
        valorTotal: analytics.valorTotal,
        assinados: analytics.assinados,
        pendentes: analytics.pendentes,
        naoAssinados: analytics.naoAssinados,
        statusNegociacaoData: analytics.statusNegociacaoData,
        credorData: analytics.credorData,
      });
      if (result.success) {
        toast.success(`PDF exportado: ${result.filename}`);
      } else {
        toast.error('Erro ao exportar PDF');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Nenhum dado disponível para análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botões de Exportação */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Métricas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold">{analytics.totalRegistros}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <FileCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Assinatura</p>
                <p className="text-2xl font-bold">{analytics.taxaAssinatura}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Negociado</p>
                <p className="text-2xl font-bold">{formatCompactCurrency(analytics.valorTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{analytics.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status de Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Status de Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusAssinaturaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {analytics.statusAssinaturaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, 'Quantidade']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {analytics.statusAssinaturaData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status de Negociação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Status de Negociação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusNegociacaoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {analytics.statusNegociacaoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, 'Quantidade']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {analytics.statusNegociacaoData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Temporal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.temporalData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.name === 'Taxa de Assinatura' ? `${entry.value}%` : entry.value}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="total" name="Total" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="assinados" name="Assinados" fill={COLORS.assinado} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="taxaAssinatura" name="Taxa de Assinatura" stroke={COLORS.tertiary} strokeWidth={2} dot />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Por Credor e Responsável */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Credor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top 10 Credores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.credorData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10 }}
                    width={180}
                    tickFormatter={(value) => value.length > 25 ? `${value.slice(0, 25)}...` : value}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-sm">Quantidade: {data.count}</p>
                          <p className="text-sm">Valor: {formatCurrency(data.valor)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" name="Quantidade" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 10 Responsáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.responsavelData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10 }}
                    width={180}
                    tickFormatter={(value) => value.length > 25 ? `${value.slice(0, 25)}...` : value}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, 'Quantidade']}
                  />
                  <Bar dataKey="value" name="Quantidade" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Por Origem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Distribuição por Origem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.origemData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Quantidade']}
                />
                <Bar dataKey="value" name="Quantidade" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
