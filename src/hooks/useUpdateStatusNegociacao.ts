import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UpdateStatusNegociacaoParams {
  id: number
  status_negociacao: string | null
}

export function useUpdateStatusNegociacao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status_negociacao }: UpdateStatusNegociacaoParams) => {
      const { data, error } = await supabase
        .from('controle_zapsign_geral')
        .update({ status_negociacao })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-zapsign-geral'] })
      toast.success('Status de negociação atualizado')
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status de negociação')
    },
  })
}
