import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useInserirCedrusWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (titulo: any) => {
      const { data, error } = await supabase.functions.invoke('webhook-cria-cobranca', {
        body: { titulo }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos-tudobelo'] });
      toast({ title: 'Sucesso', description: 'Títulos inseridos no Cedrus com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao inserir no Cedrus', variant: 'destructive' });
    }
  });
}
