import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, mapSetorSulClientesTable } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

// Interface para o tipo de dados dos clientes (baseada nos logs da estrutura real)
export interface SetorSulCliente {
  id?: number
  name?: string // campo real do banco
  cpf?: string
  phones?: string // campo real do banco (JSON array)
  email?: string
  address_street_name?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zip_code?: string
  person_type?: string
  // Campos para compatibilidade com o sistema atual
  nome?: string
  telefone?: string
  endereco?: string
  lote?: string
  quadra?: string
  situacao?: string
  observacoes?: string
  created_at?: string
  updated_at?: string
  [key: string]: any // Para campos dinâmicos
}

// Hook para buscar todos os clientes
export function useSetorSulClientes() {
  return useQuery({
    queryKey: ['setor-sul-clientes'],
    queryFn: async () => {
      console.log('🔄 Buscando clientes do setor sul...')
      
      // Primeiro mapeia a estrutura para ver quais colunas existem
      await mapSetorSulClientesTable()
      
      const { data, error } = await supabase
        .from('clientes_setor_sul')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) {
        console.error('❌ Erro ao buscar clientes:', error)
        throw error
      }
      
      console.log('✅ Clientes encontrados:', data?.length || 0)
      return data as SetorSulCliente[]
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  })
}

// Hook para buscar um cliente específico
export function useSetorSulCliente(id: number) {
  return useQuery({
    queryKey: ['setor-sul-cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_setor_sul')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as SetorSulCliente
    },
    enabled: !!id,
  })
}

// Hook para criar novo cliente
export function useCreateSetorSulCliente() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (newCliente: Omit<SetorSulCliente, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clientes_setor_sul')
        .insert([newCliente])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor-sul-clientes'] })
      toast({
        title: "Sucesso!",
        description: "Cliente criado com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Erro ao criar cliente:', error)
      toast({
        title: "Erro",
        description: "Falha ao criar cliente. Tente novamente.",
        variant: "destructive",
      })
    },
  })
}

// Hook para atualizar cliente
export function useUpdateSetorSulCliente() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SetorSulCliente> & { id: number }) => {
      const { data, error } = await supabase
        .from('clientes_setor_sul')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor-sul-clientes'] })
      queryClient.invalidateQueries({ queryKey: ['setor-sul-cliente'] })
      toast({
        title: "Sucesso!",
        description: "Cliente atualizado com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Erro ao atualizar cliente:', error)
      toast({
        title: "Erro",
        description: "Falha ao atualizar cliente. Tente novamente.",
        variant: "destructive",
      })
    },
  })
}

// Hook para deletar cliente
export function useDeleteSetorSulCliente() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('clientes_setor_sul')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setor-sul-clientes'] })
      toast({
        title: "Sucesso!",
        description: "Cliente excluído com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Erro ao deletar cliente:', error)
      toast({
        title: "Erro",
        description: "Falha ao excluir cliente. Tente novamente.",
        variant: "destructive",
      })
    },
  })
}