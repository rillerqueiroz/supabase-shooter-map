import { useQuery } from '@tanstack/react-query';
import { fetchTitulosByDocumento } from '@/utils/supabase-people-mapper';

export function useTitulosByCpf(documentDigits: string | null | undefined) {
  return useQuery({
    queryKey: ['titulos-by-cpf', documentDigits],
    queryFn: () => fetchTitulosByDocumento(documentDigits || ''),
    enabled: !!documentDigits,
  });
}
