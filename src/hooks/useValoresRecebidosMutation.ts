import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export interface SplitItem {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  description?: string;
}

export interface UpdateValorRecebidoInput {
  Identificador: string;
  descricao?: string;
  valor?: number;
  vencimento?: string;
  status?: string;
  observacoes?: string;
  split?: SplitItem[];
}

export function useUpdateValorRecebido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateValorRecebidoInput) => {
      const { Identificador, ...updateData } = input;

      // Remover campos undefined
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from('valores_totais_recebidos_asaas')
        .update(cleanData)
        .eq('Identificador', Identificador)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar cobrança:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar cache para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['valores-recebidos-asaas'] });
      
      toast({
        title: "Sucesso",
        description: "Cobrança atualizada com sucesso"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar a cobrança",
        variant: "destructive"
      });
    }
  });
}
