import { useMemo } from "react";
import { SplitDetalhado } from "./useSplits";
import { format, parseISO, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface StatusDistribution {
  status: string;
  count: number;
  value: number;
  label: string;
}

export interface TemporalData {
  period: string;
  value: number;
  count: number;
}

export interface RankingItem {
  name: string;
  value: number;
  count: number;
}

export interface BestDayOfMonth {
  day: number;
  value: number;
  count: number;
}

export type PeriodType = "daily" | "weekly" | "monthly" | "all";

export function useSplitsAnalytics(splits: SplitDetalhado[], periodType: PeriodType = "daily") {
  const analytics = useMemo(() => {
    if (!splits || splits.length === 0) {
      return {
        statusDistribution: [],
        temporalEvolution: [],
        topClients: [],
        topPayers: [],
        walletDistribution: [],
        bestDayOfMonth: null,
        averageValue: 0,
        medianValue: 0,
        averagePerClient: 0,
      };
    }

    // 1. Distribuição por Status
    const statusMap = new Map<string, { count: number; value: number; label: string }>();
    const statusLabels: Record<string, string> = {
      PENDING: "Pendente",
      CONFIRMED: "Confirmado",
      DONE: "Pago",
      CANCELLED: "Cancelado",
      UNKNOWN: "Desconhecido",
    };

    splits.forEach((split) => {
      const status = split.status || "UNKNOWN";
      const label = statusLabels[status] || statusLabels.UNKNOWN;
      const current = statusMap.get(status) || { count: 0, value: 0, label };
      statusMap.set(status, {
        count: current.count + 1,
        value: current.value + split.totalValue,
        label,
      });
    });

    const statusDistribution: StatusDistribution[] = Array.from(statusMap.entries()).map(
      ([status, data]) => ({
        status,
        ...data,
      })
    );

    // 2. Evolução Temporal
    const temporalMap = new Map<string, { value: number; count: number }>();

    splits.forEach((split) => {
      if (!split.dataPagamento) return;

      try {
        const date = parseISO(split.dataPagamento);
        let key: string;

        switch (periodType) {
          case "all":
            key = "Todo o Período";
            break;
          case "weekly":
            key = format(startOfWeek(date, { locale: ptBR }), "dd/MM/yyyy", { locale: ptBR });
            break;
          case "monthly":
            key = format(startOfMonth(date), "MMM/yyyy", { locale: ptBR });
            break;
          default: // daily
            key = format(startOfDay(date), "dd/MM", { locale: ptBR });
        }

        const current = temporalMap.get(key) || { value: 0, count: 0 };
        temporalMap.set(key, {
          value: current.value + split.totalValue,
          count: current.count + 1,
        });
      } catch (error) {
        console.error("Error parsing date:", split.dataPagamento);
      }
    });

    const temporalEvolution: TemporalData[] = Array.from(temporalMap.entries())
      .map(([period, data]) => ({
        period,
        ...data,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // 3. Top Clientes
    const clientMap = new Map<string, { value: number; count: number }>();
    splits.forEach((split) => {
      const client = split.credorCedrus || "Sem Cliente";
      const current = clientMap.get(client) || { value: 0, count: 0 };
      clientMap.set(client, {
        value: current.value + split.totalValue,
        count: current.count + 1,
      });
    });

    const topClients: RankingItem[] = Array.from(clientMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. Top Pagadores
    const payerMap = new Map<string, { value: number; count: number }>();
    splits.forEach((split) => {
      const payer = split.nomePagador || "Sem Pagador";
      const current = payerMap.get(payer) || { value: 0, count: 0 };
      payerMap.set(payer, {
        value: current.value + split.totalValue,
        count: current.count + 1,
      });
    });

    const topPayers: RankingItem[] = Array.from(payerMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 5. Distribuição por Wallet
    const walletMap = new Map<string, { value: number; count: number }>();
    splits.forEach((split) => {
      const wallet = split.walletId || "Sem Wallet";
      const current = walletMap.get(wallet) || { value: 0, count: 0 };
      walletMap.set(wallet, {
        value: current.value + split.totalValue,
        count: current.count + 1,
      });
    });

    const walletDistribution: RankingItem[] = Array.from(walletMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    // 6. Melhor Dia do Mês
    const dayMap = new Map<number, { value: number; count: number }>();
    splits.forEach((split) => {
      if (!split.dataPagamento) return;
      try {
        const date = parseISO(split.dataPagamento);
        const day = date.getDate();
        const current = dayMap.get(day) || { value: 0, count: 0 };
        dayMap.set(day, {
          value: current.value + split.totalValue,
          count: current.count + 1,
        });
      } catch (error) {
        console.error("Error parsing date:", split.dataPagamento);
      }
    });

    const bestDayOfMonth: BestDayOfMonth | null = Array.from(dayMap.entries())
      .map(([day, data]) => ({ day, ...data }))
      .sort((a, b) => b.value - a.value)[0] || null;

    // 7. Estatísticas
    const values = splits.map((s) => s.totalValue).sort((a, b) => a - b);
    const averageValue = values.reduce((sum, v) => sum + v, 0) / values.length || 0;
    const medianValue = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
    
    // 8. Valor médio por cliente
    const averagePerClient = clientMap.size > 0
      ? Array.from(clientMap.values()).reduce((sum, data) => sum + data.value, 0) / clientMap.size
      : 0;

    return {
      statusDistribution,
      temporalEvolution,
      topClients,
      topPayers,
      walletDistribution,
      bestDayOfMonth,
      averageValue,
      medianValue,
      averagePerClient,
    };
  }, [splits, periodType]);

  return analytics;
}
