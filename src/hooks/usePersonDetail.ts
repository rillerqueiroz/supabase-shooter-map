import { useQuery } from '@tanstack/react-query';
import {
  getPersonById,
  fetchPersonPhones,
  fetchPersonCreditors,
  fetchPersonExternalIds,
} from '@/utils/supabase-people-mapper';

export function usePerson(id: string | null) {
  return useQuery({
    queryKey: ['person', id],
    queryFn: () => getPersonById(id!),
    enabled: !!id,
  });
}

export function usePersonPhones(id: string | null) {
  return useQuery({
    queryKey: ['person-phones', id],
    queryFn: () => fetchPersonPhones(id!),
    enabled: !!id,
  });
}

export function usePersonCreditors(id: string | null) {
  return useQuery({
    queryKey: ['person-creditors', id],
    queryFn: () => fetchPersonCreditors(id!),
    enabled: !!id,
  });
}

export function usePersonExternalIds(id: string | null) {
  return useQuery({
    queryKey: ['person-external-ids', id],
    queryFn: () => fetchPersonExternalIds(id!),
    enabled: !!id,
  });
}
