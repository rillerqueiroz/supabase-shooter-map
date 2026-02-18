import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// =====================================================
// INTERFACES
// =====================================================

export interface ContratoEtapa {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type StatusIntegracao = 'pendente' | 'enviando' | 'sucesso' | 'erro' | 'reprocessar';
export type TipoGeracao = 'contrato' | 'contrato_boleto' | 'boleto';
export type TipoDesconto = 'fixo' | 'percentual';

export interface Contrato {
  id: string;
  externalReference: string;
  nome: string;
  descricao: string | null;
  credor_cedrus: string;
  projeto_id: string | null;
  modelo_contrato_id: string | null;
  contratante_nome: string;
  contratante_cpf_cnpj: string | null;
  contratante_email: string | null;
  contratante_telefone: string | null;
  contratante_endereco: string | null;
  contratante_bairro: string | null;
  contratante_cidade: string | null;
  contratante_estado: string | null;
  contratante_cep: string | null;
  valor_total: number | null;
  
  etapa_atual_id: string | null;
  // Campos de tipo de geração
  tipo_geracao: TipoGeracao;
  // Campos de boleto
  objeto_contrato: string | null;
  valor_boleto: number | null;
  data_primeiro_boleto: string | null;
  numero_boletos: number;
  tem_desconto_pontualidade: boolean;
  tipo_desconto: TipoDesconto | null;
  valor_desconto: number | null;
  dias_antecedencia_desconto: number | null;
  // Campos de cobrança (Asaas)
  cobranca_gerada: boolean;
  cobranca_gerada_em: string | null;
  cobranca_webhook_payload: any;
  cobranca_webhook_response: any;
  cobranca_status: StatusIntegracao;
  cobranca_id_externo: string | null;
  cobranca_erro_mensagem: string | null;
  // Campos de contrato (ZapSign)
  contrato_gerado: boolean;
  contrato_gerado_em: string | null;
  contrato_webhook_payload: any;
  contrato_webhook_response: any;
  contrato_url: string | null;
  contrato_assinado: boolean;
  contrato_assinado_em: string | null;
  contrato_status: StatusIntegracao;
  contrato_id_externo: string | null;
  contrato_erro_mensagem: string | null;
  // Outros
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  etapa_atual?: ContratoEtapa;
  projeto?: { id: string; nome: string };
  modelo_contrato?: { id: string; nome: string };
  contrato_splits?: ContratoSplit[];
}

export interface ContratoSplit {
  id: string;
  contrato_id: string;
  beneficiario_id: string | null;
  wallet_id: string;
  tipo_valor: string;
  valor: number;
  description: string | null;
  tipo_cobranca: string | null;
  created_at: string;
  beneficiario?: { id: string; nome: string; wallet_id: string };
}

export interface ContratoHistorico {
  id: string;
  contrato_id: string;
  etapa_anterior_id: string | null;
  etapa_nova_id: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  etapa_anterior?: ContratoEtapa;
  etapa_nova?: ContratoEtapa;
}

export interface CreateContratoInput {
  nome?: string;
  descricao?: string;
  credor_cedrus: string;
  projeto_id?: string;
  modelo_contrato_id?: string;
  contratante_nome: string;
  contratante_cpf_cnpj?: string;
  contratante_email?: string;
  contratante_telefone?: string;
  contratante_endereco?: string;
  contratante_bairro?: string;
  contratante_cidade?: string;
  contratante_estado?: string;
  contratante_cep?: string;
  valor_total?: number;
  // Novos campos
  tipo_geracao?: TipoGeracao;
  objeto_contrato?: string;
  valor_boleto?: number;
  data_primeiro_boleto?: string;
  numero_boletos?: number;
  tem_desconto_pontualidade?: boolean;
  tipo_desconto?: TipoDesconto;
  valor_desconto?: number;
  dias_antecedencia_desconto?: number;
  observacoes?: string;
}

export interface UpdateContratoInput {
  id: string;
  nome?: string;
  descricao?: string;
  credor_cedrus?: string;
  projeto_id?: string;
  modelo_contrato_id?: string;
  contratante_nome?: string;
  contratante_cpf_cnpj?: string;
  contratante_email?: string;
  contratante_telefone?: string;
  contratante_endereco?: string;
  contratante_bairro?: string;
  contratante_cidade?: string;
  contratante_estado?: string;
  contratante_cep?: string;
  valor_total?: number;
  
  etapa_atual_id?: string;
  // Novos campos
  tipo_geracao?: TipoGeracao;
  objeto_contrato?: string;
  valor_boleto?: number;
  data_primeiro_boleto?: string;
  numero_boletos?: number;
  tem_desconto_pontualidade?: boolean;
  tipo_desconto?: TipoDesconto;
  valor_desconto?: number;
  dias_antecedencia_desconto?: number;
  observacoes?: string;
}

// =====================================================
// HOOKS DE ETAPAS
// =====================================================

export function useContratosEtapas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-contratos-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_contratos_etapas')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) {
        console.error('Erro ao buscar etapas:', error);
        throw error;
      }

      return data as ContratoEtapa[];
    },
    enabled: !!user
  });
}

export function useCreateEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string; ordem?: number; cor?: string }) => {
      const { data, error } = await supabase
        .from('gestao_splits_contratos_etapas')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos-etapas'] });
      toast.success('Etapa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar etapa:', error);
      toast.error('Erro ao criar etapa');
    }
  });
}

export function useUpdateEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; nome?: string; descricao?: string; ordem?: number; cor?: string; ativo?: boolean }) => {
      const { id, ...updateData } = input;
      const { error } = await supabase
        .from('gestao_splits_contratos_etapas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos-etapas'] });
      toast.success('Etapa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar etapa:', error);
      toast.error('Erro ao atualizar etapa');
    }
  });
}

export function useDeleteEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestao_splits_contratos_etapas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos-etapas'] });
      toast.success('Etapa desativada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao desativar etapa:', error);
      toast.error('Erro ao desativar etapa');
    }
  });
}

// =====================================================
// HOOKS DE CONTRATOS
// =====================================================

export function useContratos(filters?: { credor_cedrus?: string; etapa_id?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-contratos', filters],
    queryFn: async () => {
      let query = supabase
        .from('gestao_splits_contratos')
        .select(`
          *,
          etapa_atual:gestao_splits_contratos_etapas!etapa_atual_id(*),
          projeto:gestao_splits_projetos!projeto_id(id, nome),
          modelo_contrato:gestao_splits_modelos_contrato!modelo_contrato_id(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (filters?.credor_cedrus) {
        query = query.eq('credor_cedrus', filters.credor_cedrus);
      }

      if (filters?.etapa_id) {
        query = query.eq('etapa_atual_id', filters.etapa_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
      }

      return data as Contrato[];
    },
    enabled: !!user
  });
}

export function useContrato(id?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-contrato', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('gestao_splits_contratos')
        .select(`
          *,
          etapa_atual:gestao_splits_contratos_etapas!etapa_atual_id(*),
          projeto:gestao_splits_projetos!projeto_id(id, nome),
          modelo_contrato:gestao_splits_modelos_contrato!modelo_contrato_id(id, nome),
          contrato_splits:gestao_splits_contrato_splits(*, beneficiario:gestao_splits_beneficiarios!beneficiario_id(id, nome, wallet_id))
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar contrato:', error);
        throw error;
      }

      return data as Contrato;
    },
    enabled: !!user && !!id
  });
}

// Buscar contrato vinculado a uma cobrança pelo identificador externo
export function useContratoByIdentificadorExterno(externalReference?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-contrato-by-identificador', externalReference],
    queryFn: async () => {
      if (!externalReference) return null;

      const { data, error } = await supabase
        .from('gestao_splits_contratos')
        .select(`
          *,
          etapa_atual:gestao_splits_contratos_etapas!etapa_atual_id(*),
          projeto:gestao_splits_projetos!projeto_id(id, nome),
          modelo_contrato:gestao_splits_modelos_contrato!modelo_contrato_id(id, nome)
        `)
        .eq('externalReference', externalReference)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar contrato por identificador:', error);
        throw error;
      }

      return data as Contrato | null;
    },
    enabled: !!user && !!externalReference
  });
}

function generateExternalReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CTR-${timestamp}-${random}`;
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateContratoInput) => {
      // Buscar primeira etapa ativa
      const { data: etapas } = await supabase
        .from('gestao_splits_contratos_etapas')
        .select('id')
        .eq('ativo', true)
        .order('ordem')
        .limit(1);

      const etapaInicialId = etapas?.[0]?.id;

      const { data, error } = await supabase
        .from('gestao_splits_contratos')
        .insert({
          ...input,
          "externalReference": generateExternalReference(),
          etapa_atual_id: etapaInicialId,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
      toast.success('Contrato criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar contrato:', error);
      toast.error('Erro ao criar contrato');
    }
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateContratoInput) => {
      const { id, etapa_atual_id, ...updateData } = input;

      // Se está mudando etapa, primeiro buscar etapa atual e registrar histórico
      if (etapa_atual_id) {
        const { data: contratoAtual, error: fetchError } = await supabase
          .from('gestao_splits_contratos')
          .select('etapa_atual_id')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Erro ao buscar contrato atual:', fetchError);
        }

        // Registrar histórico de mudança de etapa
        if (contratoAtual && contratoAtual.etapa_atual_id !== etapa_atual_id) {
          const { error: historicoError } = await supabase
            .from('gestao_splits_contratos_historico')
            .insert({
              contrato_id: id,
              etapa_anterior_id: contratoAtual.etapa_atual_id || null,
              etapa_nova_id: etapa_atual_id,
              created_by: user?.id
            });

          if (historicoError) {
            console.error('Erro ao registrar histórico:', historicoError);
            // Não bloquear a atualização, apenas logar o erro
          }
        }
      }

      const { error } = await supabase
        .from('gestao_splits_contratos')
        .update({ ...updateData, etapa_atual_id })
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contrato'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contrato-historico'] });
      toast.success('Contrato atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar contrato:', error);
      toast.error('Erro ao atualizar contrato');
    }
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestao_splits_contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
      toast.success('Contrato excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir contrato:', error);
      toast.error('Erro ao excluir contrato');
    }
  });
}

// =====================================================
// HOOKS DE HISTÓRICO
// =====================================================

export function useContratoHistorico(contratoId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-contrato-historico', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];

      const { data, error } = await supabase
        .from('gestao_splits_contratos_historico')
        .select(`
          *,
          etapa_anterior:gestao_splits_contratos_etapas!etapa_anterior_id(id, nome, cor),
          etapa_nova:gestao_splits_contratos_etapas!etapa_nova_id(id, nome, cor)
        `)
        .eq('contrato_id', contratoId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        throw error;
      }

      return data as ContratoHistorico[];
    },
    enabled: !!user && !!contratoId
  });
}
