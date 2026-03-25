import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TituloTudoBelo, TitulosFilters } from './useTitulosTudoBelo';

const TABLE_NAME = 'base_tudobelo_para_testes';
const QUERY_KEY = 'titulos-para-testes';

export function useTitulosParaTestes(filters?: TitulosFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select('*')
        .order('data_vencimento', { ascending: false });

      if (filters?.search) {
        query = query.or(`documento.ilike.%${filters.search}%,nome_parceiro.ilike.%${filters.search}%,cnpj_cpf.ilike.%${filters.search}%,fone1.ilike.%${filters.search}%,fone2.ilike.%${filters.search}%,id_titulo_cedrus.ilike.%${filters.search}%`);
      }

      if (filters?.nomesParceiros?.length) {
        query = query.in('nome_parceiro', filters.nomesParceiros);
      }

      if (filters?.statusTitulo?.length) {
        query = query.in('status_titulo', filters.statusTitulo);
      }

      if (filters?.filiais?.length) {
        query = query.in('filial', filters.filiais);
      }

      if (filters?.vendedores?.length) {
        query = query.in('vendedor', filters.vendedores);
      }

      if (filters?.tiposTitulo?.length) {
        const hasNaoInformado = filters.tiposTitulo.includes('Não informado');
        const otherValues = filters.tiposTitulo.filter(v => v !== 'Não informado');
        
        if (hasNaoInformado && otherValues.length > 0) {
          query = query.or(`tipo_documento.is.null,tipo_documento.in.(${otherValues.join(',')})`);
        } else if (hasNaoInformado) {
          query = query.is('tipo_documento', null);
        } else {
          query = query.in('tipo_documento', otherValues);
        }
      }

      if (filters?.ufs?.length) {
        query = query.in('uf_cobranca', filters.ufs);
      }

      if (filters?.formasPagamento?.length) {
        query = query.in('forma_pagamento', filters.formasPagamento);
      }

      if (filters?.etapas?.length) {
        query = query.in('etapa', filters.etapas);
      }

      if (filters?.tipoTitulo?.length) {
        query = query.in('tipo_titulo', filters.tipoTitulo);
      }

      if (filters?.dataVencimentoRange?.from) {
        const fromDate = filters.dataVencimentoRange.from;
        const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
        query = query.gte('data_vencimento', fromStr);
      }
      if (filters?.dataVencimentoRange?.to) {
        const toDate = filters.dataVencimentoRange.to;
        const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;
        query = query.lte('data_vencimento', toStr);
      }

      if (filters?.dataDocumentoRange?.from) {
        const fromDate = filters.dataDocumentoRange.from;
        const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
        query = query.gte('data_documento', fromStr);
      }
      if (filters?.dataDocumentoRange?.to) {
        const toDate = filters.dataDocumentoRange.to;
        const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;
        query = query.lte('data_documento', toStr);
      }

      if (filters?.dataPagamentoRange?.from) {
        const fromDate = filters.dataPagamentoRange.from;
        const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
        query = query.gte('data_pagamento', fromStr);
      }
      if (filters?.dataPagamentoRange?.to) {
        const toDate = filters.dataPagamentoRange.to;
        const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;
        query = query.lte('data_pagamento', toStr);
      }

      if (filters?.inseridoCedrus !== undefined && filters?.inseridoCedrus !== null) {
        query = query.eq('inserido_cedrus', filters.inseridoCedrus);
      }

      if (filters?.processadoInternamente !== undefined && filters?.processadoInternamente !== null) {
        query = query.eq('processado_internamente', filters.processadoInternamente);
      }

      if (filters?.bloqueado !== undefined && filters?.bloqueado !== null) {
        query = query.eq('bloqueado', filters.bloqueado);
      }

      const { data, error } = await query.range(0, 49999);
      if (error) throw error;
      return data as TituloTudoBelo[];
    },
  });
}

export function useTitulosParaTestesOptions() {
  return useQuery({
    queryKey: [`${QUERY_KEY}-options`],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('nome_parceiro, status_titulo, filial, vendedor, tipo_documento, uf_cobranca, forma_pagamento, tipo_titulo')
        .range(0, 49999);

      if (error) throw error;

      const unique = (arr: (string | null)[]) => [...new Set(arr.filter(Boolean))].sort() as string[];
      
      const tiposDocumento = data?.map(d => d.tipo_documento) || [];
      const uniqueTipos = unique(tiposDocumento);
      const hasNulls = tiposDocumento.some(t => t === null);

      return {
        nomesParceiros: unique(data?.map(d => d.nome_parceiro) || []),
        statusTitulo: unique(data?.map(d => d.status_titulo) || []),
        filiais: unique(data?.map(d => d.filial) || []),
        vendedores: unique(data?.map(d => d.vendedor) || []),
        tiposTitulo: hasNulls ? ['Não informado', ...uniqueTipos] : uniqueTipos,
        ufs: unique(data?.map(d => d.uf_cobranca) || []),
        formasPagamento: unique(data?.map(d => d.forma_pagamento) || []),
        tiposTituloReal: unique(data?.map(d => (d as any).tipo_titulo) || []),
      };
    },
  });
}

export function useUpdateTituloParaTestes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TituloTudoBelo> }) => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({ ...updates, ultima_atualizacao: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Título (teste) atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar título (teste):', error);
      toast.error('Erro ao atualizar título (teste)');
    },
  });
}

export function useBulkUpdateTitulosParaTestes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<TituloTudoBelo> }) => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({ ...updates, ultima_atualizacao: new Date().toISOString() })
        .in('id', ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`${variables.ids.length} títulos (teste) atualizados com sucesso!`);
    },
    onError: (error) => {
      console.error('Erro ao atualizar títulos (teste):', error);
      toast.error('Erro ao atualizar títulos (teste) em massa');
    },
  });
}
