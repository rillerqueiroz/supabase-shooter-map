import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CampoModelo {
  id: string;
  modelo_id: string;
  nome: string;
  tipo: 'texto' | 'numero' | 'data' | 'email' | 'telefone' | 'cpf_cnpj' | 'moeda' | 'textarea' | 'boolean' | 'multipla_escolha' | 'radio';
  obrigatorio: boolean;
  ordem: number;
  placeholder?: string;
  opcoes?: string; // Para multipla_escolha e radio: opções separadas por vírgula
  created_at: string;
}

export interface ModeloContrato {
  id: string;
  nome: string;
  google_docs_id: string;
  credor_cedrus: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  campos?: CampoModelo[];
}

export interface CreateModeloInput {
  nome: string;
  google_docs_id: string;
  credor_cedrus: string;
  ativo?: boolean;
}

export interface UpdateModeloInput {
  id: string;
  nome?: string;
  google_docs_id?: string;
  credor_cedrus?: string;
  ativo?: boolean;
}

export interface CreateCampoInput {
  modelo_id: string;
  nome: string;
  tipo: CampoModelo['tipo'];
  obrigatorio: boolean;
  ordem: number;
  placeholder?: string;
  opcoes?: string;
}

export interface UpdateCampoInput {
  id: string;
  nome?: string;
  tipo?: CampoModelo['tipo'];
  obrigatorio?: boolean;
  ordem?: number;
  placeholder?: string;
  opcoes?: string;
}

export function useModelosContrato() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-modelos-contrato'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_modelos_contrato')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar modelos de contrato:', error);
        throw error;
      }

      return data as ModeloContrato[];
    },
    enabled: !!user
  });
}

export function useModelosContratoByCredor(credorCedrus?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-modelos-contrato', credorCedrus],
    queryFn: async () => {
      if (!credorCedrus) return [];

      const { data, error } = await supabase
        .from('gestao_splits_modelos_contrato')
        .select('*')
        .eq('credor_cedrus', credorCedrus)
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar modelos por credor:', error);
        throw error;
      }

      return data as ModeloContrato[];
    },
    enabled: !!user && !!credorCedrus
  });
}

export function useCamposModelo(modeloId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-modelos-contrato-campos', modeloId],
    queryFn: async () => {
      if (!modeloId) return [];

      const { data, error } = await supabase
        .from('gestao_splits_modelos_contrato_campos')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('ordem');

      if (error) {
        console.error('Erro ao buscar campos do modelo:', error);
        throw error;
      }

      return data as CampoModelo[];
    },
    enabled: !!user && !!modeloId
  });
}

export function useCreateModeloContrato() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateModeloInput) => {
      const { data, error } = await supabase
        .from('gestao_splits_modelos_contrato')
        .insert({
          ...input,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato'] });
      toast.success('Modelo de contrato criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar modelo:', error);
      toast.error('Erro ao criar modelo de contrato');
    }
  });
}

export function useUpdateModeloContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateModeloInput) => {
      const { id, ...updateData } = input;

      const { error } = await supabase
        .from('gestao_splits_modelos_contrato')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato'] });
      toast.success('Modelo de contrato atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar modelo:', error);
      toast.error('Erro ao atualizar modelo de contrato');
    }
  });
}

export function useDeleteModeloContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gestao_splits_modelos_contrato')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato'] });
      toast.success('Modelo de contrato excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir modelo de contrato');
    }
  });
}

// Mutations para campos
export function useCreateCampoModelo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCampoInput) => {
      const { data, error } = await supabase
        .from('gestao_splits_modelos_contrato_campos')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato-campos', variables.modelo_id] });
      toast.success('Campo adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar campo:', error);
      toast.error('Erro ao adicionar campo');
    }
  });
}

export function useUpdateCampoModelo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCampoInput & { modelo_id: string }) => {
      const { id, modelo_id, ...updateData } = input;

      const { error } = await supabase
        .from('gestao_splits_modelos_contrato_campos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return { id, modelo_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato-campos', data.modelo_id] });
      toast.success('Campo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar campo:', error);
      toast.error('Erro ao atualizar campo');
    }
  });
}

export function useDeleteCampoModelo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, modelo_id }: { id: string; modelo_id: string }) => {
      const { error } = await supabase
        .from('gestao_splits_modelos_contrato_campos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, modelo_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato-campos', data.modelo_id] });
      toast.success('Campo excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir campo:', error);
      toast.error('Erro ao excluir campo');
    }
  });
}

export function useBulkSaveCamposModelo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ modelo_id, campos }: { modelo_id: string; campos: Omit<CreateCampoInput, 'modelo_id'>[] }) => {
      // Primeiro, deletar todos os campos existentes
      const { error: deleteError } = await supabase
        .from('gestao_splits_modelos_contrato_campos')
        .delete()
        .eq('modelo_id', modelo_id);

      if (deleteError) throw deleteError;

      // Depois, inserir os novos campos
      if (campos.length > 0) {
        const camposComModeloId = campos.map(campo => ({
          ...campo,
          modelo_id
        }));

        const { error: insertError } = await supabase
          .from('gestao_splits_modelos_contrato_campos')
          .insert(camposComModeloId);

        if (insertError) throw insertError;
      }

      return { modelo_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato-campos', data.modelo_id] });
      toast.success('Campos salvos com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar campos:', error);
      toast.error('Erro ao salvar campos');
    }
  });
}

// Duplicar modelo com seus campos
export function useDuplicateModeloContrato() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (modeloId: string) => {
      // Buscar modelo original
      const { data: modeloOriginal, error: fetchError } = await supabase
        .from('gestao_splits_modelos_contrato')
        .select('*')
        .eq('id', modeloId)
        .single();

      if (fetchError) throw fetchError;

      // Buscar campos do modelo original
      const { data: camposOriginais, error: camposError } = await supabase
        .from('gestao_splits_modelos_contrato_campos')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('ordem');

      if (camposError) throw camposError;

      // Criar novo modelo (cópia)
      const { data: novoModelo, error: insertError } = await supabase
        .from('gestao_splits_modelos_contrato')
        .insert({
          nome: `${modeloOriginal.nome} (Cópia)`,
          google_docs_id: modeloOriginal.google_docs_id,
          credor_cedrus: modeloOriginal.credor_cedrus,
          ativo: true,
          created_by: user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Copiar campos para o novo modelo
      if (camposOriginais && camposOriginais.length > 0) {
        const novosCampos = camposOriginais.map(campo => ({
          modelo_id: novoModelo.id,
          nome: campo.nome,
          tipo: campo.tipo,
          obrigatorio: campo.obrigatorio,
          ordem: campo.ordem,
          placeholder: campo.placeholder,
          opcoes: campo.opcoes
        }));

        const { error: insertCamposError } = await supabase
          .from('gestao_splits_modelos_contrato_campos')
          .insert(novosCampos);

        if (insertCamposError) throw insertCamposError;
      }

      return novoModelo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-modelos-contrato'] });
      toast.success('Modelo duplicado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao duplicar modelo:', error);
      toast.error('Erro ao duplicar modelo');
    }
  });
}

// Interface para valores dos campos
export interface CampoValor {
  id: string;
  contrato_id: string;
  campo_id: string;
  campo_nome: string;
  campo_tipo: string;
  valor: string | null;
  created_at: string;
  updated_at: string;
}

// Hook para buscar valores dos campos de um contrato
export function useContratoCamposValores(contratoId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-contratos-campos-valores', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];

      const { data, error } = await supabase
        .from('gestao_splits_contratos_campos_valores')
        .select('*')
        .eq('contrato_id', contratoId);

      if (error) {
        console.error('Erro ao buscar valores dos campos:', error);
        throw error;
      }

      return data as CampoValor[];
    },
    enabled: !!user && !!contratoId
  });
}

// Hook para salvar valores dos campos de um contrato
export function useSaveContratoCamposValores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contrato_id, campos }: { 
      contrato_id: string; 
      campos: Array<{ campo_id: string; campo_nome: string; campo_tipo: string; valor: string | null }> 
    }) => {
      // Deletar valores existentes
      await supabase
        .from('gestao_splits_contratos_campos_valores')
        .delete()
        .eq('contrato_id', contrato_id);

      // Inserir novos valores
      if (campos.length > 0) {
        const valoresParaInserir = campos.map(campo => ({
          contrato_id,
          campo_id: campo.campo_id,
          campo_nome: campo.campo_nome,
          campo_tipo: campo.campo_tipo,
          valor: campo.valor
        }));

        const { error } = await supabase
          .from('gestao_splits_contratos_campos_valores')
          .insert(valoresParaInserir);

        if (error) throw error;
      }

      return { contrato_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos-campos-valores', data.contrato_id] });
    },
    onError: (error) => {
      console.error('Erro ao salvar valores dos campos:', error);
      toast.error('Erro ao salvar campos personalizados');
    }
  });
}
