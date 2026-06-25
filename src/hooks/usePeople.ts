import { useQuery } from '@tanstack/react-query';
import { fetchPeople, FetchPeopleParams } from '@/utils/supabase-people-mapper';

export function usePeople(params: FetchPeopleParams) {
  return useQuery({
    queryKey: ['people', params],
    queryFn: () => fetchPeople(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
