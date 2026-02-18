import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ControleZapsign {
  id: number
  nome: string | null
  cpf_cnpj: string | null
  valor_total_negociado: string | null
  credor_cedrus: string | null
  data_criacao: string | null
  negociacao_cedrus: string | null
  criado_no_zapsign: boolean | null
  link_assinatura_zapsign: string | null
  assinado_zapsign: boolean | null
  codigo_interno_zapsign: string | null
  telefone_devedor: string | null
  id_devedor_cedrus: string | null
  origem: string | null
  responsavel: string | null
  status_documento?: string | null
  status_negociacao?: string | null
}

export function useControleZapsign(includeDeleted = false) {
  return useQuery({
    queryKey: ['controle-zapsign-geral', includeDeleted],
    queryFn: async () => {
      console.log('🔄 Buscando controle Zapsign...')
      
      let query = supabase
        .from('controle_zapsign_geral')
        .select('*')
        .order('id', { ascending: false })
      
      // By default, exclude deleted documents
      if (!includeDeleted) {
        query = query.or('status_documento.is.null,status_documento.neq.apagado')
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('❌ Erro ao buscar controle Zapsign:', error)
        throw error
      }
      
      console.log('✅ Registros Zapsign encontrados:', data?.length || 0)
      return data as ControleZapsign[]
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  })
}
