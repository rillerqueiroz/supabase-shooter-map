import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Negativacao {
  id: string;
  titulo_id: string;
  data_negativacao: string;
  motivo_negativacao: string | null;
  data_remocao: string | null;
  motivo_remocao: string | null;
  usuario_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NegativacaoLog {
  id: string;
  negativacao_id: string | null;
  titulo_id: string | null;
  documento: string | null;
  nome_parceiro: string | null;
  acao: string;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  origem: string;
  descricao: string | null;
  usuario_id: string | null;
  created_at: string;
}

export const MOTIVOS_REMOCAO = [
  'Título pago',
  'Decisão Judicial',
  'A pedido do cliente',
] as const;

export function useNegativacoesDatas() {
  return useQuery({
    queryKey: ['negativacoes-datas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('base_tudobelo_negativacoes')
        .select('titulo_id, data_negativacao')
        .is('data_remocao', null)
        .order('data_negativacao', { ascending: false });

      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach(n => {
        if (!map[n.titulo_id]) map[n.titulo_id] = n.data_negativacao;
      });
      return map;
    },
  });
}

export function useNegativacoesLog() {
  return useQuery({
    queryKey: ['negativacoes-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('base_tudobelo_negativacoes_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as NegativacaoLog[];
    },
  });
}

export function useNegativarTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      tituloId, 
      documento, 
      nomeParceiro, 
      motivo, 
      observacoes 
    }: { 
      tituloId: string; 
      documento: string | null;
      nomeParceiro: string | null;
      motivo?: string; 
      observacoes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create negativacao record
      const { data: negativacao, error: negError } = await supabase
        .from('base_tudobelo_negativacoes')
        .insert({
          titulo_id: tituloId,
          motivo_negativacao: motivo || null,
          observacoes: observacoes || null,
          usuario_id: user?.id || null,
        })
        .select()
        .single();
      if (negError) throw negError;

      // Update titulo
      const { error: updateError } = await supabase
        .from('base_tudobelo_intermediaria')
        .update({ negativado: true, ultima_atualizacao: new Date().toISOString() })
        .eq('id', tituloId);
      if (updateError) throw updateError;

      // Create log
      const { error: logError } = await supabase
        .from('base_tudobelo_negativacoes_log')
        .insert({
          negativacao_id: negativacao.id,
          titulo_id: tituloId,
          documento,
          nome_parceiro: nomeParceiro,
          acao: 'negativacao',
          campo_alterado: 'negativado',
          valor_anterior: 'false',
          valor_novo: 'true',
          origem: 'usuario',
          descricao: motivo ? `Negativação: ${motivo}` : 'Título negativado',
          usuario_id: user?.id || null,
        });
      if (logError) console.error('Erro ao criar log:', logError);

      return negativacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-tudobelo'] });
      queryClient.invalidateQueries({ queryKey: ['negativacoes-log'] });
      toast.success('Título negativado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao negativar título:', error);
      toast.error('Erro ao negativar título');
    },
  });
}

export function useRemoverNegativacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      tituloId, 
      documento, 
      nomeParceiro, 
      motivo, 
      observacoes 
    }: { 
      tituloId: string; 
      documento: string | null;
      nomeParceiro: string | null;
      motivo: string; 
      observacoes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Find active negativacao
      const { data: negativacao } = await supabase
        .from('base_tudobelo_negativacoes')
        .select('*')
        .eq('titulo_id', tituloId)
        .is('data_remocao', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (negativacao) {
        const { error: updateNegError } = await supabase
          .from('base_tudobelo_negativacoes')
          .update({
            data_remocao: new Date().toISOString(),
            motivo_remocao: motivo,
            observacoes: observacoes
              ? `${negativacao.observacoes || ''}\nRemoção: ${observacoes}`.trim()
              : negativacao.observacoes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', negativacao.id);
        if (updateNegError) throw updateNegError;
      }

      // Update titulo
      const { error: updateError } = await supabase
        .from('base_tudobelo_intermediaria')
        .update({ negativado: false, ultima_atualizacao: new Date().toISOString() })
        .eq('id', tituloId);
      if (updateError) throw updateError;

      // Create log
      const { error: logError } = await supabase
        .from('base_tudobelo_negativacoes_log')
        .insert({
          negativacao_id: negativacao?.id || null,
          titulo_id: tituloId,
          documento,
          nome_parceiro: nomeParceiro,
          acao: 'remocao',
          campo_alterado: 'negativado',
          valor_anterior: 'true',
          valor_novo: 'false',
          origem: 'usuario',
          descricao: `Remoção: ${motivo}`,
          usuario_id: user?.id || null,
        });
      if (logError) console.error('Erro ao criar log:', logError);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-tudobelo'] });
      queryClient.invalidateQueries({ queryKey: ['negativacoes-log'] });
      toast.success('Negativação removida com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover negativação:', error);
      toast.error('Erro ao remover negativação');
    },
  });
}
