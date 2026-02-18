
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useGestaoSplitsClientPermissions } from './useGestaoSplitsClientPermissions'

// Tipo baseado na estrutura real da tabela
export interface GestaoDisparosWhatsapp {
  id?: number
  cliente?: string
  devedor?: string
  mensagem?: string
  descricao?: string
  tipo_disparo?: string
  numero_enviado?: string
  telefone_asaas?: string
  id_cobranca?: string
  customer_asaas?: string
  id_devedor_cedrus?: string
  id_mensagem?: string
  data_hora?: string
  data_disparo?: string
  hora_disparo?: string
  data_vencimento?: string
  plataforma_envio?: string
  sucesso?: boolean
  numero_interno_que_enviou?: string
  json_resultado?: any
  motivo_erro?: string
  created_at?: string
  updated_at?: string
}

// Hook para listar todos os disparos
export function useGestaoDisparos() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);

  return useQuery({
    queryKey: ['gestao-disparos-whatsapp', user?.id, permissions],
    queryFn: async () => {
      console.log('🔄 Buscando dados da tabela gestao_disparos_whatsapp...')
      
      // Primeiro, vamos verificar o total de registros
      const { count, error: countError } = await supabase
        .from('gestao_disparos_whatsapp')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error('❌ Erro ao contar registros:', countError)
      } else {
        console.log(`📊 Total de registros no banco: ${count}`)
      }
      
      // Agora buscar dados com filtro de permissões
      let query = supabase
        .from('gestao_disparos_whatsapp')
        .select('*')
        .order('id', { ascending: false })
        .limit(10000); // Aumentar limite para garantir que pegue todos

      // Admin (permissions === null) vê tudo
      if (permissions === null) {
        console.log('👑 Admin: buscando todos os disparos');
      }
      // Sem permissões ou array vazio = não retornar nada (bloqueio padrão)
      else if (!permissions || permissions.length === 0) {
        console.log('🔒 Sem permissões: retornando vazio');
        return [] as GestaoDisparosWhatsapp[];
      }
      // Com permissões específicas = filtrar por Cliente (credor_cedrus)
      else {
        const allowedCredores = permissions.map(p => p.credor_cedrus);
        console.log('🔐 Filtrando disparos por clientes permitidos:', allowedCredores);
        query = query.in('cliente', allowedCredores);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar disparos:', error)
        throw new Error(`Erro ao buscar disparos: ${error.message}`)
      }
      
      console.log(`✅ Dados carregados: ${data?.length || 0} registros`)
      console.log(`📊 Range de IDs: ${data?.[data.length - 1]?.id} até ${data?.[0]?.id}`)
      console.log('📊 Primeiros 3 registros:', data?.slice(0, 3))
      
      return data as GestaoDisparosWhatsapp[]
    },
    retry: 3,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    enabled: !isLoadingPermissions && !!user
  })
}

// Hook para buscar um disparo específico
export function useGestaoDisparo(id: number) {
  return useQuery({
    queryKey: ['gestao-disparos-whatsapp', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_disparos_whatsapp')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        throw new Error(`Erro ao buscar disparo: ${error.message}`)
      }
      
      return data as GestaoDisparosWhatsapp
    },
    enabled: !!id,
  })
}

// Hook para criar novo disparo
export function useCreateGestaoDisparo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (newDisparo: Omit<GestaoDisparosWhatsapp, 'id'>) => {
      const { data, error } = await supabase
        .from('gestao_disparos_whatsapp')
        .insert([newDisparo])
        .select()
        .single()
      
      if (error) {
        throw new Error(`Erro ao criar disparo: ${error.message}`)
      }
      
      return data as GestaoDisparosWhatsapp
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-disparos-whatsapp'] })
    },
  })
}

// Hook para atualizar disparo
export function useUpdateGestaoDisparo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GestaoDisparosWhatsapp> & { id: number }) => {
      const { data, error } = await supabase
        .from('gestao_disparos_whatsapp')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Erro ao atualizar disparo: ${error.message}`)
      }
      
      return data as GestaoDisparosWhatsapp
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-disparos-whatsapp'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-disparos-whatsapp', data.id] })
    },
  })
}

// Hook para deletar disparo
export function useDeleteGestaoDisparo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('gestao_disparos_whatsapp')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Erro ao deletar disparo: ${error.message}`)
      }
      
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-disparos-whatsapp'] })
    },
  })
}

// Hook para testar conexão
export function useTestConnection() {
  return useQuery({
    queryKey: ['test-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_disparos_whatsapp')
        .select('count')
        .limit(1)
      
      if (error) {
        throw new Error(`Erro de conexão: ${error.message}`)
      }
      
      return { connected: true, data }
    },
    retry: 2,
    staleTime: 30000,
  })
}
