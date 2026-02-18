import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useGestaoDisparos() {
  return useQuery({
    queryKey: ['gestao-disparos'],
    queryFn: async () => {
      // Placeholder - disparos functionality
      return [];
    }
  });
}
