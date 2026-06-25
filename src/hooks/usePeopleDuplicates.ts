import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchDuplicateGroups, mergePeople } from '@/utils/supabase-people-mapper';

export function useDuplicateGroups(limit = 100) {
  return useQuery({
    queryKey: ['people-duplicates', limit],
    queryFn: () => fetchDuplicateGroups(limit),
    staleTime: 30_000,
  });
}

export function useMergePeople() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ canonical, duplicates }: { canonical: string; duplicates: string[] }) =>
      mergePeople(canonical, duplicates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people-duplicates'] });
      qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('Pessoas mescladas');
    },
    onError: (e: any) => toast.error('Erro ao mesclar: ' + e.message),
  });
}
