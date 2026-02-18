import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useGestaoSplitsClientPermissions, useAllowedCredores } from './useGestaoSplitsClientPermissions';
import { ValorRecebido } from './useValoresRecebidosAsaas';

// Hook para buscar cobranças sem splits (split vazio ou null)
export function useCobrancasSemSplits() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  const { data: allData, isLoading, error, refetch } = useQuery({
    queryKey: ['cobrancas-sem-splits', user?.id, permissions],
    queryFn: async () => {
      console.info('🔄 Buscando cobranças sem splits...');
      
      let query = supabase
        .from('valores_totais_recebidos_asaas')
        .select('*')
        .or('deleted.is.null,deleted.eq.false'); // Excluir registros apagados

      // Admin (allowedCredores === null) vê tudo
      if (allowedCredores === null) {
        console.info('👑 Admin: buscando todas as cobranças sem splits');
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
      
      // Filtrar cobranças sem splits (split é null, vazio ou array vazio)
      const cobrancasSemSplits = (data || []).filter(item => {
        if (!item.split) return true;
        if (Array.isArray(item.split) && item.split.length === 0) return true;
        // Se for string vazia ou "[]"
        if (typeof item.split === 'string') {
          const trimmed = item.split.trim();
          if (trimmed === '' || trimmed === '[]' || trimmed === 'null') return true;
        }
        return false;
      });
      
      console.info('✅ Cobranças sem splits carregadas:', cobrancasSemSplits.length);
      return cobrancasSemSplits as ValorRecebido[];
    },
    enabled: !isLoadingPermissions && !!user
  });

  // Opções únicas para filtros
  const filterOptions = useMemo(() => {
    if (!allData) return { nomes: [], unidades: [], formasPagamento: [], statusList: [], projetos: [] };

    const nomes = [...new Set(allData.map(v => v.nome).filter(Boolean))] as string[];
    const unidades = [...new Set(allData.map(v => v.credor_cedrus).filter(Boolean))] as string[];
    const formasPagamento = [...new Set(allData.map(v => v.forma_pagamento).filter(Boolean))] as string[];
    const statusList = [...new Set(allData.map(v => v.status).filter(Boolean))] as string[];
    
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
      if (a === 'Sem Projeto') return 1;
      if (b === 'Sem Projeto') return -1;
      return a.localeCompare(b);
    });

    return {
      nomes: nomes.sort(),
      unidades: unidades.sort(),
      formasPagamento: formasPagamento.sort(),
      statusList: statusList.sort(),
      projetos
    };
  }, [allData]);

  return {
    data: allData,
    isLoading,
    error,
    refetch,
    filterOptions
  };
}
