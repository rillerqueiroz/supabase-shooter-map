import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows, BatchProgressCallback } from '@/lib/supabaseBatch';
import { toast } from 'sonner';

// Status do título disponíveis
export const STATUS_TITULO_OPTIONS = [
  'A vencer',
  'Cancelado', 
  'Vencido',
  'Negociado',
  'Pago',
  'Suspenso',
  'Não se aplica'
] as const;

// Status cedrus disponíveis
export const STATUS_CEDRUS_OPTIONS = [
  { value: 'A', label: 'A - Aberto' },
  { value: 'C', label: 'C - Cancelado' },
  { value: 'N', label: 'N - Negociado' },
  { value: 'P', label: 'P - Pago' },
] as const;

export interface TituloTudoBelo {
  id: string;
  selection: boolean | null;
  documento: string | null;
  tipo_documento: string | null;
  serie_documento: string | null;
  codigo_parceiro: string | null;
  nome_parceiro: string | null;
  cnpj_cpf: string | null;
  numero_parcela: string | null;
  valor_parcela: number | null;
  saldo_parcela: number | null;
  data_documento: string | null;
  data_vencimento: string | null;
  dias_atraso: string | null;
  observacoes: string | null;
  forma_pagamento: string | null;
  status_boleto: string | null;
  filial: string | null;
  vendedor: string | null;
  uf_cobranca: string | null;
  municipio_cobranca: string | null;
  inserido_cedrus: boolean | null;
  id_titulo_cedrus: string | null;
  credor_cedrus: string | null;
  data_criacao: string | null;
  ultima_atualizacao: string | null;
  processado_internamente: boolean | null;
  status_titulo: string | null;
  status_cedrus: string | null;
  etapa: string | null;
  tipo_titulo: string | null;
  id_negociacao_cedrus: string | null;
  linha_digitavel: string | null;
  data_pagamento: string | null;
  valor_pago: number | null;
  // Novos campos de contato e endereço
  nome_fantasia: string | null;
  fone1: string | null;
  fone2: string | null;
  email: string | null;
  endereco: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo_negocio: string | null;
  cod_devedor_cedrus: string | null;
  negativado: boolean | null;
  bloqueado: boolean | null;
}

export interface TitulosFilters {
  search?: string;
  nomesParceiros?: string[];
  statusTitulo?: string[];
  filiais?: string[];
  vendedores?: string[];
  tiposTitulo?: string[];
  ufs?: string[];
  formasPagamento?: string[];
  etapas?: string[];
  tipoTitulo?: string[];
  dataVencimentoRange?: { from?: Date; to?: Date };
  dataDocumentoRange?: { from?: Date; to?: Date };
  dataPagamentoRange?: { from?: Date; to?: Date };
  inseridoCedrus?: boolean | null;
  processadoInternamente?: boolean | null;
  bloqueado?: boolean | null;
}

export function useTitulosTudoBelo(filters?: TitulosFilters, tableName: string = 'base_tudobelo_intermediaria', onProgress?: BatchProgressCallback) {
  return useQuery({
    queryKey: ['titulos-tudobelo', tableName, filters],
    queryFn: async () => {
      const data = await fetchAllSupabaseRows<TituloTudoBelo>(async (from, to) => {
        let query = supabase
          .from(tableName)
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

        return query.range(from, to);
      }, 500, onProgress);

      return data;
    },
  });
}

export function useTitulosTudoBeloOptions(tableName: string = 'base_tudobelo_intermediaria') {
  return useQuery({
    queryKey: ['titulos-tudobelo-options', tableName],
    queryFn: async () => {
      const data = await fetchAllSupabaseRows<any>(async (from, to) => {
        const result = await supabase
          .from(tableName)
          .select('nome_parceiro, status_titulo, filial, vendedor, tipo_documento, uf_cobranca, forma_pagamento, tipo_titulo')
          .order('nome_parceiro', { ascending: true })
          .range(from, to);

        return result;
      });

      const unique = (arr: (string | null)[]) => [...new Set(arr.filter(Boolean))].sort() as string[];
      
      // For tipo_documento, include "Não informado" option for null values
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

export function useUpdateTituloTudoBelo(tableName: string = 'base_tudobelo_intermediaria') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TituloTudoBelo> }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updates, ultima_atualizacao: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['titulos-tudobelo', tableName] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TituloTudoBelo[]>(['titulos-tudobelo', tableName]);

      // Optimistically update the cache
      queryClient.setQueriesData<TituloTudoBelo[]>(
        { queryKey: ['titulos-tudobelo', tableName] },
        (old) => old?.map((t) => t.id === id ? { ...t, ...updates, ultima_atualizacao: new Date().toISOString() } : t)
      );

      return { previousData };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueriesData(
          { queryKey: ['titulos-tudobelo', tableName] },
          context.previousData
        );
      }
      console.error('Erro ao atualizar título:', error);
      toast.error('Erro ao atualizar título');
    },
    onSuccess: () => {
      toast.success('Título atualizado com sucesso!');
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['titulos-tudobelo', tableName] });
    },
  });
}

export function useBulkUpdateTitulosTudoBelo(tableName: string = 'base_tudobelo_intermediaria') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<TituloTudoBelo> }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updates, ultima_atualizacao: new Date().toISOString() })
        .in('id', ids)
        .select();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['titulos-tudobelo', tableName] });
      const previousData = queryClient.getQueryData<TituloTudoBelo[]>(['titulos-tudobelo', tableName]);

      queryClient.setQueriesData<TituloTudoBelo[]>(
        { queryKey: ['titulos-tudobelo', tableName] },
        (old) => old?.map((t) => ids.includes(t.id) ? { ...t, ...updates, ultima_atualizacao: new Date().toISOString() } : t)
      );

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueriesData(
          { queryKey: ['titulos-tudobelo', tableName] },
          context.previousData
        );
      }
      console.error('Erro ao atualizar títulos:', error);
      toast.error('Erro ao atualizar títulos em massa');
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.ids.length} títulos atualizados com sucesso!`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-tudobelo', tableName] });
    },
  });
}
