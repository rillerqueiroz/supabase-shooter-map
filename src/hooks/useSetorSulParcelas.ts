import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, mapSetorSulParcelasTable } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

// Interface para o tipo de dados das parcelas (baseada nos campos reais do banco)
export interface SetorSulParcela {
  id?: number
  data_vecto?: string // Campo real do banco
  cliente?: string
  cd_cliente?: number
  documento?: string
  titulo?: number
  parc?: string
  tc?: any
  unid_princ?: string // Lote/Quadra combinados
  valor_original?: number
  total?: number // Valor real da parcela
  status?: string
  nome_empresa?: string
  id_titulo_unico?: string
  id_envio?: string
  inserido_em?: string
  "Tipo de Disparo"?: string
  // Campos dinâmicos para compatibilidade
  lote?: string
  quadra?: string
  valor_parcela?: number
  data_vencimento?: string
  telefone?: string
  observacoes?: string
  created_at?: string
  updated_at?: string
  [key: string]: any
}

// Hook para buscar todas as parcelas
export function useSetorSulParcelas() {
  return useQuery({
    queryKey: ['setor-sul-parcelas'],
    queryFn: async () => {
      console.log('🔄 Buscando parcelas do setor sul...')
      
      // Primeiro mapeia a estrutura para ver quais colunas existem
      await mapSetorSulParcelasTable()
      
      const { data, error } = await supabase
        .from('setor_sul_parcelas_futuras')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao buscar parcelas:', error)
        throw error
      }
      
      console.log('✅ Parcelas encontradas:', data?.length || 0)
      return data as SetorSulParcela[]
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  })
}

// Hook para buscar uma parcela específica
export function useSetorSulParcela(id: number) {
  return useQuery({
    queryKey: ['setor-sul-parcela', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setor_sul_parcelas_futuras')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as SetorSulParcela
    },
    enabled: !!id,
  })
}

// Hook para criar nova parcela
export function useCreateSetorSulParcela() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (newParcela: Omit<SetorSulParcela, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('setor_sul_parcelas_futuras')
        .insert([newParcela])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor-sul-parcelas'] })
      toast({
        title: "Sucesso!",
        description: "Parcela criada com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Erro ao criar parcela:', error)
      toast({
        title: "Erro",
        description: "Falha ao criar parcela. Tente novamente.",
        variant: "destructive",
      })
    },
  })
}

// Hook para atualizar parcela
export function useUpdateSetorSulParcela() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ id, id_titulo_unico, ...updates }: Partial<SetorSulParcela> & { id?: number; id_titulo_unico?: string }) => {
      console.log('🔄 Atualizando parcela com:', { id, id_titulo_unico, updates })
      
      let data, error
      
      // Use id if available, otherwise use id_titulo_unico
      if (id) {
        const result = await supabase
          .from('setor_sul_parcelas_futuras')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else if (id_titulo_unico) {
        const result = await supabase
          .from('setor_sul_parcelas_futuras')
          .update(updates)
          .eq('id_titulo_unico', id_titulo_unico)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        throw new Error('ID ou id_titulo_unico é obrigatório para atualizar parcela')
      }
      
      if (error) {
        console.error('Erro no Supabase:', error)
        throw error
      }
      
      console.log('✅ Parcela atualizada:', data)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor-sul-parcelas'] })
      queryClient.invalidateQueries({ queryKey: ['setor-sul-parcela'] })
      queryClient.invalidateQueries({ queryKey: ['setor-sul-parcelas-cliente'] })
      toast({
        title: "Sucesso!",
        description: "Parcela atualizada com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Erro ao atualizar parcela:', error)
      toast({
        title: "Erro",
        description: `Falha ao atualizar parcela: ${error.message}`,
        variant: "destructive",
      })
    },
  })
}

// Hook para buscar parcelas de um cliente específico
export function useSetorSulParcelasCliente(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['setor-sul-parcelas-cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return []
      
      console.log(`🔄 Buscando parcelas do cliente ${clienteId}...`)
      
      const { data, error } = await supabase
        .from('setor_sul_parcelas_futuras')
        .select('*')
        .eq('cd_cliente', clienteId)
        .order('data_vecto', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao buscar parcelas do cliente:', error)
        throw error
      }
      
      console.log(`✅ Parcelas do cliente ${clienteId} encontradas:`, data?.length || 0)
      return data as SetorSulParcela[]
    },
    enabled: !!clienteId,
    staleTime: 30000, // 30 segundos
    gcTime: 60000, // 1 minuto
  })
}

// Hook para deletar parcela
export function useDeleteSetorSulParcela() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('setor_sul_parcelas_futuras')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor-sul-parcelas'] })
      queryClient.invalidateQueries({ queryKey: ['setor-sul-parcelas-cliente'] })
      toast({
        title: "Sucesso!",
        description: "Parcela excluída com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Erro ao deletar parcela:', error)
      toast({
        title: "Erro",
        description: "Falha ao excluir parcela. Tente novamente.",
        variant: "destructive",
      })
    },
  })
}