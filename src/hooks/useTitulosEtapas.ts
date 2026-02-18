import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface TituloEtapa {
  id: number;
  created_at: string;
  etapa: string | null;
}

export function useTitulosEtapas() {
  return useQuery({
    queryKey: ['titulos-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('base_tudobelo_etapas')
        .select('*')
        .order('etapa', { ascending: true });

      if (error) throw error;
      return data as TituloEtapa[];
    },
  });
}

export function useCreateTituloEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (etapa: string) => {
      const { data, error } = await supabase
        .from('base_tudobelo_etapas')
        .insert({ etapa })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-etapas'] });
      toast.success('Etapa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar etapa:', error);
      toast.error('Erro ao criar etapa');
    },
  });
}

export function useUpdateTituloEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, etapa }: { id: number; etapa: string }) => {
      const { data, error } = await supabase
        .from('base_tudobelo_etapas')
        .update({ etapa })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-etapas'] });
      toast.success('Etapa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar etapa:', error);
      toast.error('Erro ao atualizar etapa');
    },
  });
}

export function useDeleteTituloEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('base_tudobelo_etapas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-etapas'] });
      toast.success('Etapa excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir etapa:', error);
      toast.error('Erro ao excluir etapa');
    },
  });
}
