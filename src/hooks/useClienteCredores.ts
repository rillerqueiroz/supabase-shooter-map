import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useClientesParaSelecao() {
  return useQuery({
    queryKey: ['clientes-para-selecao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_superavit')
        .select('id, credor_cedrus, nome_credor')
        .order('credor_cedrus', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });
}
