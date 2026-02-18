import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, TrendingUp, ArrowUpCircle } from "lucide-react";
import { ValorRecebido } from "@/hooks/useValoresRecebidosAsaas";

interface MetricsCardsProps {
  data: ValorRecebido[];
}

export function MetricsCards({ data }: MetricsCardsProps) {
  // Calcular métricas
  const totalRecebido = data.reduce((sum, item) => sum + (item.valor || 0), 0);
  const quantidadeRegistros = data.length;
  const ticketMedio = quantidadeRegistros > 0 ? totalRecebido / quantidadeRegistros : 0;
  const maiorValor = data.reduce((max, item) => Math.max(max, item.valor || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const metrics = [
    {
      title: "Total Recebido",
      value: formatCurrency(totalRecebido),
      icon: DollarSign,
      iconColor: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Recebimentos",
      value: quantidadeRegistros.toString(),
      icon: FileText,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      icon: TrendingUp,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    {
      title: "Maior Valor",
      value: formatCurrency(maiorValor),
      icon: ArrowUpCircle,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
