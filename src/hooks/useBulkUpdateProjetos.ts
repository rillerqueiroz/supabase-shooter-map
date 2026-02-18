import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ProjetoSplit } from './useGestaoSplitsProjetos';

export interface BulkUpdateProjetosInput {
  projetoIds: string[];
  nome?: string;
  descricao?: string;
  credor_cedrus?: string;
  cliente_id?: number;
  credor_inadimplencia?: string;
  ativo?: boolean;
  splits?: ProjetoSplit[];
  appendSplits?: boolean; // true = adicionar aos existentes, false = substituir
}

export function useBulkUpdateProjetos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkUpdateProjetosInput) => {
      const { projetoIds, splits, appendSplits, ...updateData } = input;

      if (projetoIds.length === 0) {
        throw new Error('Nenhum projeto selecionado');
      }

      // Preparar dados de atualização (removendo undefined)
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );

      console.log('🔄 Atualizando projetos em lote:', {
        count: projetoIds.length,
        fields: Object.keys(cleanData),
        hasSplits: !!splits
      });

      let updatedCount = 0;

      // Atualizar cada projeto
      for (const projetoId of projetoIds) {
        // Atualizar campos do projeto se houver
        if (Object.keys(cleanData).length > 0) {
          const { error: projetoError } = await supabase
            .from('gestao_splits_projetos')
            .update(cleanData)
            .eq('id', projetoId);

          if (projetoError) {
            console.error(`Erro ao atualizar projeto ${projetoId}:`, projetoError);
            throw projetoError;
          }
        }

        // Atualizar splits se houver
        if (splits && splits.length > 0) {
          if (!appendSplits) {
            // Modo substituir: deletar splits existentes
            const { error: deleteError } = await supabase
              .from('gestao_splits_projeto_splits')
              .delete()
              .eq('projeto_id', projetoId);

            if (deleteError) {
              console.error(`Erro ao deletar splits do projeto ${projetoId}:`, deleteError);
              throw deleteError;
            }
          }

          // Inserir novos splits
          const splitsData = splits.map(split => ({
            wallet_id: split.wallet_id,
            tipo_valor: split.tipo_valor,
            valor: split.valor,
            description: split.description,
            projeto_id: projetoId
          }));

          const { error: splitsError } = await supabase
            .from('gestao_splits_projeto_splits')
            .insert(splitsData);

          if (splitsError) {
            console.error(`Erro ao inserir splits no projeto ${projetoId}:`, splitsError);
            throw splitsError;
          }
        }

        updatedCount++;
      }

      console.log('✅ Projetos atualizados:', updatedCount);
      return { updatedCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-projetos'] });
      toast.success(`${data.updatedCount} projeto(s) atualizado(s) com sucesso`);
    },
    onError: (error: Error) => {
      console.error('❌ Erro na atualização em lote:', error);
      toast.error(error.message || 'Erro ao atualizar projetos');
    }
  });
}
