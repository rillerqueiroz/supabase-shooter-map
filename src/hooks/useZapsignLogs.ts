import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ZapsignLog {
  id: number;
  registro_id: number;
  acao: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  usuario_id: string | null;
  created_at: string;
}

export function useZapsignLogs() {
  return useQuery({
    queryKey: ['controle-zapsign-log'],
    queryFn: async () => {
      console.log('🔄 Buscando logs Zapsign...');
      
      const { data, error } = await supabase
        .from('controle_zapsign_log')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar logs:', error);
        throw error;
      }
      
      console.log('✅ Logs encontrados:', data?.length || 0);
      return data as ZapsignLog[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
