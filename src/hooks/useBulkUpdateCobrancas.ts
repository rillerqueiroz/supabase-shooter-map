import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export interface BulkUpdateInput {
  identificadores: string[];
  projeto?: string | null;
  credor_cedrus?: string | null;
  status_cedrus?: string | null;
}

export function useBulkUpdateCobrancas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkUpdateInput) => {
      const { identificadores, ...updateData } = input;

      if (identificadores.length === 0) {
        throw new Error('Nenhum registro selecionado');
      }

      // Remover campos undefined/null quando não devem ser atualizados
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(cleanData).length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      console.log('🔄 Atualizando em lote:', {
        count: identificadores.length,
        fields: Object.keys(cleanData)
      });

      const { data, error } = await supabase
        .from('valores_totais_recebidos_asaas')
        .update(cleanData)
        .in('Identificador', identificadores)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar em lote:', error);
        throw error;
      }

      console.log('✅ Registros atualizados:', data?.length);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['valores-recebidos-asaas'] });
      queryClient.invalidateQueries({ queryKey: ['todas-cobrancas'] });
      
      toast({
        title: "Sucesso",
        description: `${data?.length || 0} cobranças atualizadas com sucesso`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar as cobranças",
        variant: "destructive"
      });
    }
  });
}
