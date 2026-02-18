import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useGestaoSplitsClientPermissions, useAllowedCredores } from './useGestaoSplitsClientPermissions';

export interface ValorRecebido {
  Identificador: string;
  nome: string | null;
  descricao: string | null;
  unidade: string | null;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  valor: number | null;
  vencimento: string | null;
  status: string | null;
  status_cedrus: string | null; // A = Aberto, C = Cancelado, N = Negociado
  projeto: string | null; // Campo projeto da cobrança
  // Campos adicionais para o modal de detalhes
  externalReference: string | null;
  tipo_cobranca: string | null;
  numero_boleto: string | null;
  invoice_number: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  email_adicional: string | null;
  celular: string | null;
  fone: string | null;
  vencimento_original: string | null;
  data_criacao: string | null;
  data_confirmacao: string | null;
  data_credito: string | null;
  data_estimada: string | null;
  valor_original: number | null;
  valor_liquido: number | null;
  desconto_pontualidade: string | null; // JSON string: {"value":100,"limitDate":null,"dueDateLimitDays":10,"type":"FIXED"}
  usuario: string | null;
  forma_insercao: string | null;
  credor_cedrus: string | null;
  hora_envio: string | null;
  customer: string | null;
  deleted: boolean | null;
  msg_enviada: string | null;
  split: any[] | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
}

export interface ValoresRecebidosFilters {
  nomes?: string[];
  unidades?: string[];
  formasPagamento?: string[];
  meiosPagamento?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  searchTerm?: string;
}

// Hook original - busca todos os dados com filtro de permissões
export function useValoresRecebidosAsaas() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ['valores-recebidos-asaas', user?.id, permissions],
    queryFn: async () => {
      console.info('🔄 Buscando valores recebidos Asaas...');
      console.info('🔍 DEBUG - User ID:', user?.id);
      console.info('🔍 DEBUG - Credores permitidos:', allowedCredores);
      
      let query = supabase
        .from('valores_totais_recebidos_asaas')
        .select('*');

      // Admin (allowedCredores === null) vê tudo
      if (allowedCredores === null) {
        console.info('👑 Admin: buscando todos os valores');
      } 
      // Sem permissões ou array vazio = não buscar nada (bloqueio padrão)
      else if (!allowedCredores || allowedCredores.length === 0) {
        console.warn('🔒 Sem permissões: retornando vazio');
        return [] as ValorRecebido[];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        console.info('🔐 Filtrando por credores permitidos:', allowedCredores);
        query = query.in('credor_cedrus', allowedCredores);
      }
      
      const { data, error } = await query.order('data_pagamento', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar valores recebidos:', error);
        throw error;
      }
      
      console.info('✅ Valores recebidos carregados:', data?.length || 0);
      
      return data as ValorRecebido[];
    },
    enabled: !isLoadingPermissions && !!user
  });
}

// Hook com filtros avançados
export function useValoresRecebidosComFiltros(filters: ValoresRecebidosFilters) {
  const { data: allData, isLoading, error, refetch } = useValoresRecebidosAsaas();

  // Opções únicas para filtros
  const filterOptions = useMemo(() => {
    if (!allData) return { nomes: [], unidades: [], formasPagamento: [], meiosPagamento: [] };

    const nomes = [...new Set(allData.map(v => v.nome).filter(Boolean))] as string[];
    const unidades = [...new Set(allData.map(v => v.credor_cedrus).filter(Boolean))] as string[];
    const formasPagamento = [...new Set(allData.map(v => v.forma_pagamento).filter(Boolean))] as string[];
    const meiosPagamento = ['Normal', 'Excepcional'];

    return {
      nomes: nomes.sort(),
      unidades: unidades.sort(),
      formasPagamento: formasPagamento.sort(),
      meiosPagamento
    };
  }, [allData]);

  // Aplicar filtros
  const filteredData = useMemo(() => {
    if (!allData) return [];

    let result = [...allData];

    // Filtro de nomes
    if (filters.nomes && filters.nomes.length > 0) {
      result = result.filter(item => filters.nomes!.includes(item.nome || ''));
    }

    // Filtro de unidades (empresas - credor_cedrus)
    if (filters.unidades && filters.unidades.length > 0) {
      result = result.filter(item => filters.unidades!.includes(item.credor_cedrus || ''));
    }

    // Filtro de formas de pagamento
    if (filters.formasPagamento && filters.formasPagamento.length > 0) {
      result = result.filter(item => filters.formasPagamento!.includes(item.forma_pagamento || ''));
    }

    // Filtro de meio de pagamento
    if (filters.meiosPagamento && filters.meiosPagamento.length > 0) {
      result = result.filter(item => {
        const meio = item.status === "RECEIVED" ? "Normal" : 
                      item.status === "RECEIVED_IN_CASH" ? "Excepcional" : null;
        return meio && filters.meiosPagamento!.includes(meio);
      });
    }

    // Filtro de data
    if (filters.dateRange?.from || filters.dateRange?.to) {
      result = result.filter(item => {
        if (!item.data_pagamento) return false;
        
        try {
          // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
          const itemDateStr = item.data_pagamento.split('T')[0];
          
          if (filters.dateRange!.from) {
            const fromDateStr = filters.dateRange!.from.toISOString().split('T')[0];
            if (itemDateStr < fromDateStr) return false;
          }
          
          if (filters.dateRange!.to) {
            const toDateStr = filters.dateRange!.to.toISOString().split('T')[0];
            if (itemDateStr > toDateStr) return false;
          }
          
          return true;
        } catch {
          return false;
        }
      });
    }

    // Filtro de busca livre
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        (item.nome && item.nome.toLowerCase().includes(searchLower)) ||
        (item.descricao && item.descricao.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [allData, filters]);

  return {
    data: filteredData,
    allData,
    isLoading,
    error,
    refetch,
    filterOptions
  };
}
