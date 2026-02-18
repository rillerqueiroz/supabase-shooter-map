import { ArrowUpCircle, ArrowDownCircle, DollarSign, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtratoMetrics } from "@/hooks/useExtratosBancarios";

interface MetricsCardsExtratoProps {
  metrics: ExtratoMetrics;
}

export function MetricsCardsExtrato({ metrics }: MetricsCardsExtratoProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: "Entradas",
      value: formatCurrency(metrics.totalCreditos),
      icon: ArrowUpCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Saídas",
      value: formatCurrency(metrics.totalDebitos),
      icon: ArrowDownCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Saldo Atual",
      value: formatCurrency(metrics.saldoAtual),
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Transações",
      value: metrics.quantidadeTransacoes.toString(),
      icon: Hash,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{card.title}</CardTitle>
            <div className={`rounded-full p-1.5 sm:p-2 ${card.bgColor}`}>
              <card.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
            <div className={`text-lg sm:text-xl md:text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
