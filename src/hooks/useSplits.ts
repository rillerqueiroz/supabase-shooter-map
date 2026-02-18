import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { useGestaoSplitsClientPermissions, useAllowedCredores } from "./useGestaoSplitsClientPermissions";

export interface SplitDetalhado {
  // Dados do split
  splitId: string;
  walletId: string;
  fixedValue: number | null;
  percentualValue: number | null;
  totalValue: number;
  status: string;
  cancellationReason: string | null;
  description: string;
  
  // Dados do PAGADOR (da cobrança original)
  nomePagador: string | null;
  identificador: string | null;
  
  // Dados do CLIENTE (da tabela clientes_superavit)
  nomeCliente: string | null;
  cpfCnpjCliente: string | null;
  emailCliente: string | null;
  
  // Dados da cobrança original
  cobrancaId: string;
  credorCedrus: string | null;
  descricaoCobranca: string | null;
  unidade: string | null;
  dataPagamento: string | null;
  valorCobranca: number | null;
  formaPagamento: string | null;
}

export interface SplitsFilters {
  status?: string[];
  pagadores?: string[];
  walletIds?: string[];
  clientes?: string[];
  dateRange?: { from?: Date; to?: Date };
  searchTerm?: string;
}

// Hook para buscar dados brutos da tabela
export function useSplitsData() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ["splits-data-com-beneficiarios", user?.id, permissions],
    queryFn: async () => {
      console.log("🔄 Buscando dados de splits e clientes...");
      
      // Buscar splits com filtro de permissões
      let splitsQuery = supabase
        .from("valores_totais_recebidos_asaas")
        .select("*")
        .not("split", "is", null)
        .order("data_pagamento", { ascending: false });

      // Admin (allowedCredores === null) vê tudo
      if (allowedCredores === null) {
        // Query sem filtro
      }
      // Sem permissões ou array vazio = não retornar nada (bloqueio padrão)
      else if (!allowedCredores || allowedCredores.length === 0) {
        console.log('🔒 Sem permissões: retornando vazio');
        return { splitsData: [], clientesMap: new Map() };
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        console.log('🔐 Filtrando splits por credores permitidos:', allowedCredores);
        splitsQuery = splitsQuery.in('credor_cedrus', allowedCredores);
      }

      const { data: splitsData, error: splitsError } = await splitsQuery;

      console.log(`✅ Registros com split encontrados: ${splitsData?.length || 0}`);

      if (splitsError) {
        console.error("❌ Erro ao buscar splits:", splitsError);
        throw splitsError;
      }

      // Buscar clientes superávit com filtro
      let clientesQuery = supabase.from("clientes_superavit").select("*");

      // Admin (allowedCredores === null) vê tudo
      if (allowedCredores === null) {
        // Query sem filtro
      }
      // Sem permissões ou array vazio = não buscar clientes
      else if (!allowedCredores || allowedCredores.length === 0) {
        // Retornar mapa vazio
        return { splitsData: splitsData || [], clientesMap: new Map() };
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        clientesQuery = clientesQuery.in('credor_cedrus', allowedCredores);
      }

      const { data: clientesData, error: clientesError } = await clientesQuery;

      if (clientesError) {
        console.error("❌ Erro ao buscar clientes:", clientesError);
        throw clientesError;
      }

      // Criar mapa de walletId -> cliente
      const clientesMap = new Map(
        clientesData?.map((cliente) => [cliente.walletId, cliente]) || []
      );

      console.log("✅ Dados carregados - Splits:", splitsData?.length, "| Clientes:", clientesData?.length);
      return { splitsData: splitsData || [], clientesMap };
    },
    enabled: !isLoadingPermissions && !!user
  });
}

// Hook principal para processar e filtrar splits
export function useSplits(filters?: SplitsFilters) {
  const { data: rawData, isLoading, error, refetch } = useSplitsData();

  // Processar e "desempacotar" os splits
  const splitsDetalhados = useMemo(() => {
    if (!rawData) return [];

    const { splitsData, clientesMap } = rawData;
    const splits: SplitDetalhado[] = [];

    splitsData.forEach((cobranca) => {
      // Parsing robusto do campo split
      let splitItems: any[] = [];
      const rawSplit = cobranca.split;

      if (!rawSplit) return;

      // Se for array, usar diretamente
      if (Array.isArray(rawSplit)) {
        splitItems = rawSplit;
      }
      // Se for string, tentar fazer parse do JSON
      else if (typeof rawSplit === "string") {
        try {
          const parsed = JSON.parse(rawSplit);
          // Se o parse resultou em array, usar diretamente
          if (Array.isArray(parsed)) {
            splitItems = parsed;
          }
          // Se resultou em objeto único, encapsular em array
          else if (typeof parsed === "object" && parsed !== null) {
            splitItems = [parsed];
          }
        } catch (error) {
          console.warn("Erro ao fazer parse do split JSON:", error, rawSplit);
          return;
        }
      }
      // Se for objeto único, encapsular em array
      else if (typeof rawSplit === "object" && rawSplit !== null) {
        splitItems = [rawSplit];
      }

      // Processar cada item do split
      splitItems.forEach((split: any) => {
        // Buscar dados do CLIENTE usando o walletId
        const cliente = clientesMap.get(split.walletId);
        
        // Normalizar walletId vazio/null para "Sem Split"
        const walletIdNormalizado = split.walletId && split.walletId.trim() !== "" 
          ? split.walletId 
          : "Sem Split";
        
        splits.push({
          // Dados do split
          splitId: split.id || "",
          walletId: walletIdNormalizado,
          fixedValue: split.fixedValue,
          percentualValue: split.percentualValue,
          totalValue: split.totalValue || 0,
          status: split.status || "UNKNOWN",
          cancellationReason: split.cancellationReason,
          description: split.description || "",

          // Dados do PAGADOR (da cobrança)
          nomePagador: cobranca.nome || null,
          identificador: cobranca.Identificador || null,

          // Dados do CLIENTE (da tabela clientes_superavit)
          nomeCliente: cliente?.nome_credor || cliente?.credor_cedrus || null,
          cpfCnpjCliente: cliente?.credor_cedrus || null,
          emailCliente: Array.isArray(cliente?.email) ? cliente.email[0] : cliente?.email || null,

          // Dados da cobrança original
          cobrancaId: cobranca.id || "",
          credorCedrus: cobranca.credor_cedrus || null,
          descricaoCobranca: cobranca.descricao,
          unidade: cobranca.unidade,
          dataPagamento: cobranca.data_pagamento,
          valorCobranca: cobranca.valor,
          formaPagamento: cobranca.forma_pagamento,
        });
      });
    });

    // LOG: Verificar quantos splits têm "Sem Split"
    const semSplitCount = splits.filter(s => s.walletId === "Sem Split").length;
    console.log(`📊 Splits processados: ${splits.length} | Com "Sem Split": ${semSplitCount}`);

    return splits;
  }, [rawData]);

  // Aplicar filtros
  const splitsFiltrados = useMemo(() => {
    if (!filters) return splitsDetalhados;

    return splitsDetalhados.filter((split) => {
      // Filtro por status
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(split.status)) return false;
      }

      // Filtro por pagador
      if (filters.pagadores && filters.pagadores.length > 0) {
        if (!filters.pagadores.includes(split.nomePagador || "")) return false;
      }

      // Filtro por wallet ID
      if (filters.walletIds && filters.walletIds.length > 0) {
        if (!filters.walletIds.includes(split.walletId || "")) return false;
      }

      // Filtro por cliente (credor cedrus)
      if (filters.clientes && filters.clientes.length > 0) {
        if (!filters.clientes.includes(split.credorCedrus || "")) return false;
      }

      // Filtro por período
      if (filters.dateRange?.from || filters.dateRange?.to) {
        if (!split.dataPagamento) return false;
        
        try {
          // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
          const itemDateStr = split.dataPagamento.split('T')[0];
          
          if (filters.dateRange.from) {
            const fromDateStr = filters.dateRange.from.toISOString().split('T')[0];
            if (itemDateStr < fromDateStr) return false;
          }
          
          if (filters.dateRange.to) {
            const toDateStr = filters.dateRange.to.toISOString().split('T')[0];
            if (itemDateStr > toDateStr) return false;
          }
          
          return true;
        } catch {
          return false;
        }
      }

      // Filtro por busca livre
      if (filters.searchTerm && filters.searchTerm.trim() !== "") {
        const term = filters.searchTerm.toLowerCase();
        const searchableFields = [
          split.nomePagador,
          split.identificador,
          split.nomeCliente,
          split.cpfCnpjCliente,
          split.description,
          split.descricaoCobranca,
          split.walletId,
          split.status,
        ];

        const match = searchableFields.some(
          (field) => field && field.toLowerCase().includes(term)
        );

        if (!match) return false;
      }

      return true;
    });
  }, [splitsDetalhados, filters]);

  // Calcular opções únicas para filtros
  const filterOptions = useMemo(() => {
    const statuses = [...new Set(splitsDetalhados.map((s) => s.status))].filter(Boolean).sort();
    const pagadores = [...new Set(splitsDetalhados.map((s) => s.nomePagador))]
      .filter(Boolean)
      .sort();
    const walletIds = [...new Set(splitsDetalhados.map((s) => s.walletId))]
      .filter(Boolean)
      .sort();
    const clientes = [...new Set(splitsDetalhados.map((s) => s.credorCedrus))]
      .filter(Boolean)
      .sort();

    console.log(`🔍 Wallet IDs únicos encontrados: ${walletIds.length}`, walletIds.slice(0, 10));

    return { statuses, pagadores, walletIds, clientes };
  }, [splitsDetalhados]);

  // Calcular métricas
  const metrics = useMemo(() => {
    const total = splitsFiltrados.length;
    const valorTotal = splitsFiltrados.reduce((sum, split) => sum + split.totalValue, 0);
    const pendentes = splitsFiltrados.filter((s) => s.status === "PENDING").length;
    const confirmados = splitsFiltrados.filter((s) => s.status === "CONFIRMED").length;
    const cancelados = splitsFiltrados.filter((s) => s.status === "CANCELLED").length;

    return {
      total,
      valorTotal,
      pendentes,
      confirmados,
      cancelados,
    };
  }, [splitsFiltrados]);

  return {
    splits: splitsFiltrados,
    allSplits: splitsDetalhados,
    isLoading,
    error,
    refetch,
    filterOptions,
    metrics,
  };
}
