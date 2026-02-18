import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface StatusDistribution {
  status: string;
  count: number;
  value: number;
  valueWithDiscount: number;
  label: string;
  color: string;
}

export interface TemporalData {
  period: string;
  received: number;
  overdue: number;
  overdueNegociada: number;
  receivedInCash: number;
  receivedSuperavit: number;
  pending: number;
  sortKey: number;
}

export interface InadimplenciaData {
  categoria: string;
  valor: number;
  count: number;
  percentual: number;
  color: string;
}

export interface RecebimentoComparativo {
  tipo: string;
  valor: number;
  count: number;
  label: string;
  color: string;
}

export interface RankingItem {
  name: string;
  value: number;
  count: number;
}

interface CobrancaRecord {
  status?: string | null;
  status_cedrus?: string | null;
  valor?: number | null;
  desconto_pontualidade?: string | null;
  vencimento?: string | null;
  credor_cedrus?: string | null;
  nome?: string | null;
  created_at?: string | null;
  projeto?: string | null;
}

// Função para calcular o valor com desconto de pontualidade
function calcularValorComDesconto(item: CobrancaRecord): number {
  const valorBase = Number(item.valor) || 0;
  if (!item.desconto_pontualidade) return valorBase;
  
  try {
    const desconto = JSON.parse(item.desconto_pontualidade);
    if (desconto.type === 'FIXED') {
      return Math.max(0, valorBase - Number(desconto.value));
    } else if (desconto.type === 'PERCENTAGE') {
      return Math.max(0, valorBase * (1 - Number(desconto.value) / 100));
    }
    return valorBase;
  } catch {
    return valorBase;
  }
}

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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  RECEIVED: "#22c55e",
  RECEIVED_IN_CASH: "#10b981",
  RECEIVED_SUPERAVIT: "#059669",
  OVERDUE_NEGOCIADA: "#a855f7",
  CONFIRMED: "#3b82f6",
  OVERDUE: "#ef4444",
  REFUNDED: "#6b7280",
  REFUND_REQUESTED: "#a855f7",
  CHARGEBACK_REQUESTED: "#ec4899",
  CHARGEBACK_DISPUTE: "#f97316",
  AWAITING_CHARGEBACK_REVERSAL: "#eab308",
  DUNNING_REQUESTED: "#dc2626",
  DUNNING_RECEIVED: "#b91c1c",
  AWAITING_RISK_ANALYSIS: "#8b5cf6",
  CREATED: "#64748b",
};

export interface AnalyticsFilters {
  credores?: string[];
  statusList?: string[];
  dateRange?: { from?: Date; to?: Date };
  useDescontoValor?: boolean;
}

export function useCobrancasAnalytics(
  cobrancas: CobrancaRecord[], 
  filters?: AnalyticsFilters
) {
  const analytics = useMemo(() => {
    // Função para obter o valor baseado no toggle de desconto
    const getValor = (item: CobrancaRecord): number => {
      if (filters?.useDescontoValor) {
        return calcularValorComDesconto(item);
      }
      return Number(item.valor) || 0;
    };

    if (!cobrancas || cobrancas.length === 0) {
      return {
        statusDistribution: [],
        temporalEvolution: [],
        inadimplencia: [],
        recebimentoComparativo: [],
        topEmpresas: [],
        topClientes: [],
        taxaInadimplencia: 0,
        totalRecebidoNormal: 0,
        totalRecebidoDinheiro: 0,
        countRecebidoNormal: 0,
        countRecebidoDinheiro: 0,
        totalRecebidoSuperavit: 0,
        countRecebidoSuperavit: 0,
        totalOverdueNegociada: 0,
        countOverdueNegociada: 0,
        availableCredores: [],
        availableStatus: [],
        availableProjetos: [],
        projetoData: [],
        isMonthlyView: false,
      };
    }

    // Extrair credores e status disponíveis antes de filtrar
    const availableCredores = Array.from(
      new Set(cobrancas.map(c => c.credor_cedrus).filter(Boolean))
    ).sort() as string[];

    const availableStatus = Array.from(
      new Set(cobrancas.map(c => c.status).filter(Boolean))
    ).sort() as string[];

    // Aplicar filtros
    let filteredCobrancas = cobrancas;

    const dateToYMD = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    if (filters?.credores && filters.credores.length > 0) {
      filteredCobrancas = filteredCobrancas.filter((c) =>
        filters.credores!.includes(c.credor_cedrus || "")
      );
    }

    if (filters?.statusList && filters.statusList.length > 0) {
      filteredCobrancas = filteredCobrancas.filter((c) =>
        filters.statusList!.includes(c.status || "")
      );
    }

    // Filtro de período (sempre por vencimento)
    if (filters?.dateRange?.from || filters?.dateRange?.to) {
      const fromStr = filters.dateRange?.from ? dateToYMD(filters.dateRange.from) : undefined;
      const toStr = filters.dateRange?.to ? dateToYMD(filters.dateRange.to) : undefined;

      filteredCobrancas = filteredCobrancas.filter((c) => {
        const vencimentoStr = c.vencimento?.split("T")[0];
        if (!vencimentoStr) return false;
        if (fromStr && vencimentoStr < fromStr) return false;
        if (toStr && vencimentoStr > toStr) return false;
        return true;
      });
    }
    if (filteredCobrancas.length === 0) {
      return {
        statusDistribution: [],
        temporalEvolution: [],
        inadimplencia: [],
        recebimentoComparativo: [],
        topEmpresas: [],
        topClientes: [],
        taxaInadimplencia: 0,
        totalRecebidoNormal: 0,
        totalRecebidoDinheiro: 0,
        countRecebidoNormal: 0,
        countRecebidoDinheiro: 0,
        totalRecebidoSuperavit: 0,
        countRecebidoSuperavit: 0,
        totalOverdueNegociada: 0,
        countOverdueNegociada: 0,
        availableCredores,
        availableStatus,
        availableProjetos: [],
        projetoData: [],
      };
    }

    // 1. Distribuição por Status
    const statusMap = new Map<string, { count: number; value: number; valueWithDiscount: number }>();

    filteredCobrancas.forEach((cobranca) => {
      const status = cobranca.status || "UNKNOWN";
      const current = statusMap.get(status) || { count: 0, value: 0, valueWithDiscount: 0 };
      statusMap.set(status, {
        count: current.count + 1,
        value: current.value + getValor(cobranca),
        valueWithDiscount: current.valueWithDiscount + calcularValorComDesconto(cobranca),
      });
    });

    const statusDistribution: StatusDistribution[] = Array.from(statusMap.entries()).map(
      ([status, data]) => ({
        status,
        ...data,
        label: STATUS_LABELS[status] || status,
        color: STATUS_COLORS[status] || "#94a3b8",
      })
    );

    // 2. Evolução Temporal - Mensal ou Diário baseado no filtro de período
    // Detectar se o filtro é de um único mês
    const isMonthlyFilter = filters?.dateRange?.from && filters?.dateRange?.to && 
      isSameMonth(filters.dateRange.from, filters.dateRange.to);

    const temporalMap = new Map<string, { received: number; overdue: number; overdueNegociada: number; receivedInCash: number; receivedSuperavit: number; pending: number; sortKey: number }>();

    filteredCobrancas.forEach((cobranca) => {
      const dateField = cobranca.vencimento;
      if (!dateField) return;

      try {
        // Parse manual para evitar problemas de timezone
        // Formato esperado: "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS..."
        const dateParts = dateField.split('T')[0].split('-');
        if (dateParts.length !== 3) return;
        
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(dateParts[2], 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return;
        if (month < 0 || month > 11) return;

        let key: string;
        let sortKey: number;

        if (isMonthlyFilter) {
          // Agrupar por dia quando filtro é de um único mês
          key = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}`;
          sortKey = year * 10000 + (month + 1) * 100 + day;
        } else {
          // Agrupar por mês quando filtro é anual ou outro
          const monthStart = new Date(year, month, 1);
          const monthLabel = format(monthStart, "MMMM/yyyy", { locale: ptBR });
          key = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
          sortKey = year * 100 + (month + 1);
        }

        const current = temporalMap.get(key) || { received: 0, overdue: 0, overdueNegociada: 0, receivedInCash: 0, receivedSuperavit: 0, pending: 0, sortKey };
        const status = cobranca.status || "";
        const statusCedrus = cobranca.status_cedrus || "";
        const valor = getValor(cobranca);

        // Verificar status especiais
        const isReceivedSuperavit = status === "RECEIVED_IN_CASH" && statusCedrus === "N";
        const isOverdueNegociada = status === "OVERDUE" && statusCedrus === "N";

        temporalMap.set(key, {
          received: current.received + (status === "RECEIVED" ? valor : 0),
          overdue: current.overdue + (status === "OVERDUE" && !isOverdueNegociada ? valor : 0),
          overdueNegociada: current.overdueNegociada + (isOverdueNegociada ? valor : 0),
          receivedInCash: current.receivedInCash + (status === "RECEIVED_IN_CASH" && !isReceivedSuperavit ? valor : 0),
          receivedSuperavit: current.receivedSuperavit + (isReceivedSuperavit ? valor : 0),
          pending: current.pending + (status === "PENDING" ? valor : 0),
          sortKey,
        });
      } catch (error) {
        console.error("Error parsing date:", dateField);
      }
    });

    const temporalEvolution: TemporalData[] = Array.from(temporalMap.entries())
      .map(([period, data]) => ({
        period,
        received: data.received,
        overdue: data.overdue,
        overdueNegociada: data.overdueNegociada,
        receivedInCash: data.receivedInCash,
        receivedSuperavit: data.receivedSuperavit,
        pending: data.pending,
        sortKey: data.sortKey,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    // 3. Dados de Inadimplência
    const total = filteredCobrancas.length;
    // Vencidos agora exclui os negociados (status_cedrus = 'N')
    const vencidos = filteredCobrancas.filter(c => c.status === "OVERDUE" && c.status_cedrus !== "N").length;
    const valorVencido = filteredCobrancas.filter(c => c.status === "OVERDUE" && c.status_cedrus !== "N").reduce((sum, c) => sum + getValor(c), 0);
    
    const recebidos = filteredCobrancas.filter(c => ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(c.status || "")).length;
    const valorRecebido = filteredCobrancas.filter(c => ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"].includes(c.status || "")).reduce((sum, c) => sum + getValor(c), 0);
    
    const pendentes = filteredCobrancas.filter(c => ["PENDING", "CREATED", "AWAITING_RISK_ANALYSIS"].includes(c.status || "")).length;
    const valorPendente = filteredCobrancas.filter(c => ["PENDING", "CREATED", "AWAITING_RISK_ANALYSIS"].includes(c.status || "")).reduce((sum, c) => sum + getValor(c), 0);

    const taxaInadimplencia = total > 0 ? (vencidos / total) * 100 : 0;

    const inadimplencia: InadimplenciaData[] = [
      {
        categoria: "Vencido",
        valor: valorVencido,
        count: vencidos,
        percentual: total > 0 ? (vencidos / total) * 100 : 0,
        color: "#ef4444",
      },
      {
        categoria: "Em Dia",
        valor: valorRecebido,
        count: recebidos,
        percentual: total > 0 ? (recebidos / total) * 100 : 0,
        color: "#22c55e",
      },
      {
        categoria: "A Vencer",
        valor: valorPendente,
        count: pendentes,
        percentual: total > 0 ? (pendentes / total) * 100 : 0,
        color: "#f59e0b",
      },
    ];

    // 4. Comparativo Recebido Normal vs Dinheiro
    const recebidoNormal = filteredCobrancas.filter(c => c.status === "RECEIVED");
    const recebidoDinheiro = filteredCobrancas.filter(c => c.status === "RECEIVED_IN_CASH");

    const totalRecebidoNormal = recebidoNormal.reduce((sum, c) => sum + getValor(c), 0);
    const totalRecebidoDinheiro = recebidoDinheiro.reduce((sum, c) => sum + getValor(c), 0);
    const countRecebidoNormal = recebidoNormal.length;
    const countRecebidoDinheiro = recebidoDinheiro.length;

    // 4.1 Status Especiais
    // Recebido Superavit = RECEIVED_IN_CASH + status_cedrus = N
    const recebidoSuperavit = filteredCobrancas.filter(c => c.status === "RECEIVED_IN_CASH" && c.status_cedrus === "N");
    const totalRecebidoSuperavit = recebidoSuperavit.reduce((sum, c) => sum + getValor(c), 0);
    const countRecebidoSuperavit = recebidoSuperavit.length;

    // Vencida e Negociada = OVERDUE + status_cedrus = N
    const overdueNegociada = filteredCobrancas.filter(c => c.status === "OVERDUE" && c.status_cedrus === "N");
    const totalOverdueNegociada = overdueNegociada.reduce((sum, c) => sum + getValor(c), 0);
    const countOverdueNegociada = overdueNegociada.length;

    const recebimentoComparativo: RecebimentoComparativo[] = [
      {
        tipo: "RECEIVED",
        valor: totalRecebidoNormal,
        count: countRecebidoNormal,
        label: "Recebido Normal",
        color: "#3b82f6",
      },
      {
        tipo: "RECEIVED_IN_CASH",
        valor: totalRecebidoDinheiro,
        count: countRecebidoDinheiro,
        label: "Recebido em Dinheiro",
        color: "#10b981",
      },
      {
        tipo: "RECEIVED_SUPERAVIT",
        valor: totalRecebidoSuperavit,
        count: countRecebidoSuperavit,
        label: "Recebido Superavit",
        color: "#059669",
      },
      {
        tipo: "OVERDUE_NEGOCIADA",
        valor: totalOverdueNegociada,
        count: countOverdueNegociada,
        label: "Vencida e Negociada",
        color: "#a855f7",
      },
    ];

    // 5. Top Empresas (credor_cedrus)
    const empresaMap = new Map<string, { value: number; count: number }>();
    filteredCobrancas.forEach((cobranca) => {
      const empresa = cobranca.credor_cedrus || "Sem Empresa";
      const current = empresaMap.get(empresa) || { value: 0, count: 0 };
      empresaMap.set(empresa, {
        value: current.value + getValor(cobranca),
        count: current.count + 1,
      });
    });

    const topEmpresas: RankingItem[] = Array.from(empresaMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 6. Top Clientes (nome)
    const clienteMap = new Map<string, { value: number; count: number }>();
    filteredCobrancas.forEach((cobranca) => {
      const cliente = cobranca.nome || "Sem Nome";
      const current = clienteMap.get(cliente) || { value: 0, count: 0 };
      clienteMap.set(cliente, {
        value: current.value + getValor(cobranca),
        count: current.count + 1,
      });
    });

    const topClientes: RankingItem[] = Array.from(clienteMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 7. Available Projects
    const availableProjetos = Array.from(
      new Set(filteredCobrancas.map(c => c.projeto && c.projeto.trim() !== '' ? c.projeto : 'Sem Projeto'))
    ).sort((a, b) => {
      if (a === 'Sem Projeto') return 1;
      if (b === 'Sem Projeto') return -1;
      return a.localeCompare(b);
    }) as string[];

    // 8. Per-project analytics
    const projetoAnalytics = new Map<string, {
      count: number;
      totalValor: number;
      vencidos: number;
      valorVencido: number;
      recebidos: number;
      valorRecebido: number;
      pendentes: number;
      valorPendente: number;
      recebidoNormal: number;
      recebidoDinheiro: number;
      recebidoSuperavit: number;
      overdueNegociada: number;
    }>();

    filteredCobrancas.forEach((c) => {
      const proj = c.projeto && c.projeto.trim() !== '' ? c.projeto : 'Sem Projeto';
      const current = projetoAnalytics.get(proj) || {
        count: 0, totalValor: 0, vencidos: 0, valorVencido: 0,
        recebidos: 0, valorRecebido: 0, pendentes: 0, valorPendente: 0,
        recebidoNormal: 0, recebidoDinheiro: 0, recebidoSuperavit: 0, overdueNegociada: 0,
      };
      const valor = getValor(c);
      const status = c.status || '';
      const isOverdueNegociada = status === 'OVERDUE' && c.status_cedrus === 'N';
      const isReceivedSuperavit = status === 'RECEIVED_IN_CASH' && c.status_cedrus === 'N';

      current.count += 1;
      current.totalValor += valor;
      if (status === 'OVERDUE' && !isOverdueNegociada) { current.vencidos += 1; current.valorVencido += valor; }
      if (['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED'].includes(status)) { current.recebidos += 1; current.valorRecebido += valor; }
      if (['PENDING', 'CREATED', 'AWAITING_RISK_ANALYSIS'].includes(status)) { current.pendentes += 1; current.valorPendente += valor; }
      if (status === 'RECEIVED') current.recebidoNormal += valor;
      if (status === 'RECEIVED_IN_CASH' && !isReceivedSuperavit) current.recebidoDinheiro += valor;
      if (isReceivedSuperavit) current.recebidoSuperavit += valor;
      if (isOverdueNegociada) current.overdueNegociada += valor;

      projetoAnalytics.set(proj, current);
    });

    const projetoData = Array.from(projetoAnalytics.entries()).map(([name, data]) => ({
      name,
      ...data,
      taxaInadimplencia: data.count > 0 ? (data.vencidos / data.count) * 100 : 0,
    })).sort((a, b) => b.totalValor - a.totalValor);

    return {
      statusDistribution,
      temporalEvolution,
      inadimplencia,
      recebimentoComparativo,
      topEmpresas,
      topClientes,
      taxaInadimplencia,
      totalRecebidoNormal,
      totalRecebidoDinheiro,
      countRecebidoNormal,
      countRecebidoDinheiro,
      totalRecebidoSuperavit,
      countRecebidoSuperavit,
      totalOverdueNegociada,
      countOverdueNegociada,
      availableCredores,
      availableStatus,
      availableProjetos,
      projetoData,
      isMonthlyView: !!isMonthlyFilter,
    };
  }, [cobrancas, filters]);

  return analytics;
}
