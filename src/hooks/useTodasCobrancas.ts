import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useGestaoSplitsClientPermissions, useAllowedCredores } from './useGestaoSplitsClientPermissions';
import { ValorRecebido } from './useValoresRecebidosAsaas';

export interface TodasCobrancasFilters {
  nomes?: string[];
  unidades?: string[];
  formasPagamento?: string[];
  statusList?: string[];
  statusCedrusList?: string[]; // A = Aberto, C = Cancelado, N = Negociado (filtro extra para OVERDUE)
  projetos?: string[]; // Filtro de projetos
  dataCriacaoRange?: {
    from?: Date;
    to?: Date;
  };
  dataVencimentoRange?: {
    from?: Date;
    to?: Date;
  };
  dataCreditoRange?: {
    from?: Date;
    to?: Date;
  };
  searchTerm?: string;
}

// Hook para buscar TODAS as cobranças (sem filtrar por status de pagamento)
export function useTodasCobrancas() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ['todas-cobrancas', user?.id, permissions],
    queryFn: async () => {
      console.info('🔄 Buscando todas as cobranças (excluindo deleted)...');
      
      let query = supabase
        .from('valores_totais_recebidos_asaas')
        .select('*')
        .or('deleted.is.null,deleted.eq.false'); // Excluir registros apagados

      // Admin (allowedCredores === null) vê tudo
      if (allowedCredores === null) {
        console.info('👑 Admin: buscando todas as cobranças');
      } 
      // Sem permissões ou array vazio = não buscar nada
      else if (!allowedCredores || allowedCredores.length === 0) {
        console.warn('🔒 Sem permissões: retornando vazio');
        return [] as ValorRecebido[];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        console.info('🔐 Filtrando por credores permitidos:', allowedCredores);
        query = query.in('credor_cedrus', allowedCredores);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar cobranças:', error);
        throw error;
      }
      
      console.info('✅ Cobranças carregadas:', data?.length || 0);
      return data as ValorRecebido[];
    },
    enabled: !isLoadingPermissions && !!user
  });
}

// Hook com filtros avançados para todas as cobranças
export function useTodasCobrancasComFiltros(filters: TodasCobrancasFilters) {
  const { data: allData, isLoading, error, refetch } = useTodasCobrancas();

  // Opções únicas para filtros
  const filterOptions = useMemo(() => {
    if (!allData) return { nomes: [], unidades: [], formasPagamento: [], statusList: [], statusCedrusList: [], projetos: [] };

    const nomes = [...new Set(allData.map(v => v.nome).filter(Boolean))] as string[];
    const unidades = [...new Set(allData.map(v => v.credor_cedrus).filter(Boolean))] as string[];
    const formasPagamento = [...new Set(allData.map(v => v.forma_pagamento).filter(Boolean))] as string[];
    const baseStatusList = [...new Set(allData.map(v => v.status).filter(Boolean))] as string[];
    
    // Sempre adicionar opções especiais
    const statusList = [...baseStatusList, 'RECEIVED_SUPERAVIT', 'OVERDUE_NEGOCIADA'].sort();
    
    // Status Cedrus disponíveis apenas para itens OVERDUE
    const statusCedrusList = [...new Set(
      allData
        .filter(v => v.status === 'OVERDUE')
        .map(v => v.status_cedrus)
        .filter(Boolean)
    )] as string[];

    // Projetos - adiciona "Sem Projeto" para itens sem projeto
    const projetosSet = new Set<string>();
    allData.forEach(v => {
      if (v.projeto && v.projeto.trim() !== '') {
        projetosSet.add(v.projeto);
      } else {
        projetosSet.add('Sem Projeto');
      }
    });
    const projetos = [...projetosSet].sort((a, b) => {
      // "Sem Projeto" sempre no final
      if (a === 'Sem Projeto') return 1;
      if (b === 'Sem Projeto') return -1;
      return a.localeCompare(b);
    });

    return {
      nomes: nomes.sort(),
      unidades: unidades.sort(),
      formasPagamento: formasPagamento.sort(),
      statusList,
      statusCedrusList: statusCedrusList.sort(),
      projetos
    };
  }, [allData]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (!allData) return {
      total: 0,
      pendentes: 0,
      recebidos: 0,
      vencidos: 0,
      estornados: 0,
      recebidosSuperavit: 0,
      valorTotal: 0,
      valorRecebido: 0,
      valorPendente: 0,
      valorVencido: 0,
      valorRecebidoSuperavit: 0
    };

    const statusPositivos = ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED', 'ANTICIPATED'];
    const statusPendentes = ['PENDING', 'CREATED', 'AWAITING_RISK_ANALYSIS', 'AUTHORIZED'];
    const statusVencidos = ['OVERDUE'];
    const statusEstornados = ['REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_IN_PROGRESS'];
    
    // Recebido pela Superavit (Inadimplência) = RECEIVED_IN_CASH + status_cedrus = N
    const recebidosSuperavit = allData.filter(d => d.status === 'RECEIVED_IN_CASH' && d.status_cedrus === 'N');

    return {
      total: allData.length,
      pendentes: allData.filter(d => statusPendentes.includes(d.status || '')).length,
      recebidos: allData.filter(d => statusPositivos.includes(d.status || '')).length,
      vencidos: allData.filter(d => statusVencidos.includes(d.status || '')).length,
      estornados: allData.filter(d => statusEstornados.includes(d.status || '')).length,
      recebidosSuperavit: recebidosSuperavit.length,
      valorTotal: allData.reduce((sum, d) => sum + (d.valor || 0), 0),
      valorRecebido: allData
        .filter(d => statusPositivos.includes(d.status || ''))
        .reduce((sum, d) => sum + (d.valor || 0), 0),
      valorPendente: allData
        .filter(d => statusPendentes.includes(d.status || ''))
        .reduce((sum, d) => sum + (d.valor || 0), 0),
      valorVencido: allData
        .filter(d => statusVencidos.includes(d.status || ''))
        .reduce((sum, d) => sum + (d.valor || 0), 0),
      valorRecebidoSuperavit: recebidosSuperavit.reduce((sum, d) => sum + (d.valor || 0), 0)
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

    // Filtro de status
    if (filters.statusList && filters.statusList.length > 0) {
      result = result.filter(item => {
        const hasReceivedSuperavit = filters.statusList!.includes('RECEIVED_SUPERAVIT');
        const hasOverdueNegociada = filters.statusList!.includes('OVERDUE_NEGOCIADA');
        const specialFilters = ['RECEIVED_SUPERAVIT', 'OVERDUE_NEGOCIADA'];
        const otherStatusFilters = filters.statusList!.filter(s => !specialFilters.includes(s));
        
        // Verificar se item é "Recebido pela Superavit" (RECEIVED_IN_CASH + status_cedrus = N)
        const isReceivedSuperavit = item.status === 'RECEIVED_IN_CASH' && item.status_cedrus === 'N';
        
        // Verificar se item é "Vencida e Negociada" (OVERDUE + status_cedrus = N)
        const isOverdueNegociada = item.status === 'OVERDUE' && item.status_cedrus === 'N';
        
        // Se RECEIVED_SUPERAVIT está selecionado e item corresponde
        if (hasReceivedSuperavit && isReceivedSuperavit) {
          return true;
        }
        
        // Se OVERDUE_NEGOCIADA está selecionado e item corresponde
        if (hasOverdueNegociada && isOverdueNegociada) {
          return true;
        }
        
        // Se há outros filtros de status selecionados
        if (otherStatusFilters.length > 0) {
          const normalizedStatus = (item.status || '').replace(/^PAYMENT_/, '');
          return otherStatusFilters.some(s => s === item.status || s === normalizedStatus);
        }
        
        // Se só filtros especiais estão selecionados mas item não corresponde
        return false;
      });
    }

    // Filtro de data de criação
    if (filters.dataCriacaoRange?.from || filters.dataCriacaoRange?.to) {
      result = result.filter(item => {
        const dateField = (item as any).date_created;
        if (!dateField) return false;
        
        try {
          const itemDateStr = dateField.split('T')[0];
          
          if (filters.dataCriacaoRange!.from) {
            const fromDateStr = filters.dataCriacaoRange!.from.toISOString().split('T')[0];
            if (itemDateStr < fromDateStr) return false;
          }
          
          if (filters.dataCriacaoRange!.to) {
            const toDateStr = filters.dataCriacaoRange!.to.toISOString().split('T')[0];
            if (itemDateStr > toDateStr) return false;
          }
          
          return true;
        } catch {
          return false;
        }
      });
    }

    // Filtro de data de vencimento
    if (filters.dataVencimentoRange?.from || filters.dataVencimentoRange?.to) {
      result = result.filter(item => {
        const dateField = item.vencimento;
        if (!dateField) return false;
        
        try {
          const itemDateStr = dateField.split('T')[0];
          
          if (filters.dataVencimentoRange!.from) {
            const fromDateStr = filters.dataVencimentoRange!.from.toISOString().split('T')[0];
            if (itemDateStr < fromDateStr) return false;
          }
          
          if (filters.dataVencimentoRange!.to) {
            const toDateStr = filters.dataVencimentoRange!.to.toISOString().split('T')[0];
            if (itemDateStr > toDateStr) return false;
          }
          
          return true;
        } catch {
          return false;
        }
      });
    }

    // Filtro de data de crédito
    if (filters.dataCreditoRange?.from || filters.dataCreditoRange?.to) {
      result = result.filter(item => {
        const dateField = (item as any).credit_date;
        if (!dateField) return false;
        
        try {
          const itemDateStr = dateField.split('T')[0];
          
          if (filters.dataCreditoRange!.from) {
            const fromDateStr = filters.dataCreditoRange!.from.toISOString().split('T')[0];
            if (itemDateStr < fromDateStr) return false;
          }
          
          if (filters.dataCreditoRange!.to) {
            const toDateStr = filters.dataCreditoRange!.to.toISOString().split('T')[0];
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
        (item.descricao && item.descricao.toLowerCase().includes(searchLower)) ||
        (item.Identificador && item.Identificador.toLowerCase().includes(searchLower))
      );
    }

    // Filtro de status Cedrus (aplica apenas em itens OVERDUE)
    if (filters.statusCedrusList && filters.statusCedrusList.length > 0) {
      result = result.filter(item => {
        // Se o item não for OVERDUE, mantém no resultado (não filtra)
        if (item.status !== 'OVERDUE') return true;
        // Se for OVERDUE, filtra pelo status_cedrus
        return filters.statusCedrusList!.includes(item.status_cedrus || '');
      });
    }

    // Filtro de projetos
    if (filters.projetos && filters.projetos.length > 0) {
      result = result.filter(item => {
        const projetoItem = item.projeto && item.projeto.trim() !== '' ? item.projeto : 'Sem Projeto';
        return filters.projetos!.includes(projetoItem);
      });
    }

    return result;
  }, [allData, filters]);

  return {
    data: filteredData,
    allData,
    isLoading,
    error,
    refetch,
    filterOptions,
    metrics
  };
}

// Hook para buscar APENAS cobranças apagadas (deleted = true)
export function useCobrancasApagadas() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ['cobrancas-apagadas', user?.id, permissions],
    queryFn: async () => {
      console.info('🔄 Buscando cobranças apagadas...');
      
      let query = supabase
        .from('valores_totais_recebidos_asaas')
        .select('*')
        .eq('deleted', true); // Apenas registros apagados

      // Admin (allowedCredores === null) vê tudo
      if (allowedCredores === null) {
        console.info('👑 Admin: buscando todas as cobranças apagadas');
      } 
      // Sem permissões ou array vazio = não buscar nada
      else if (!allowedCredores || allowedCredores.length === 0) {
        console.warn('🔒 Sem permissões: retornando vazio');
        return [] as ValorRecebido[];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        console.info('🔐 Filtrando por credores permitidos:', allowedCredores);
        query = query.in('credor_cedrus', allowedCredores);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar cobranças apagadas:', error);
        throw error;
      }
      
      console.info('✅ Cobranças apagadas carregadas:', data?.length || 0);
      return data as ValorRecebido[];
    },
    enabled: !isLoadingPermissions && !!user
  });
}
