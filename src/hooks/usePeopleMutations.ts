import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  updatePerson,
  addPersonPhone,
  updatePersonPhone,
  deletePersonPhone,
  validatePersonPhone,
  invalidatePersonPhone,
  addPersonCreditor,
  upsertPersonExternalId,
} from '@/utils/supabase-people-mapper';
import type { Person, PersonPhone, PersonCreditor } from '@/types/people';

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Person> }) => updatePerson(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['person', id] });
      qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('Pessoa atualizada');
    },
    onError: (e: any) => toast.error('Erro ao atualizar: ' + e.message),
  });
}

export function useAddPersonPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, payload }: { personId: string; payload: Partial<PersonPhone> & { phone: string } }) =>
      addPersonPhone(personId, payload),
    onSuccess: (_, { personId }) => {
      qc.invalidateQueries({ queryKey: ['person-phones', personId] });
      toast.success('Telefone adicionado');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdatePersonPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PersonPhone>; personId: string }) =>
      updatePersonPhone(id, patch),
    onSuccess: (_, { personId }) => {
      qc.invalidateQueries({ queryKey: ['person-phones', personId] });
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeletePersonPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; personId: string }) => deletePersonPhone(id),
    onSuccess: (_, { personId }) => {
      qc.invalidateQueries({ queryKey: ['person-phones', personId] });
      toast.success('Telefone removido');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useValidatePhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, valid }: { id: string; valid: boolean; personId: string }) =>
      valid ? validatePersonPhone(id) : invalidatePersonPhone(id),
    onSuccess: (_, { personId }) => {
      qc.invalidateQueries({ queryKey: ['person-phones', personId] });
    },
  });
}

export function useAddPersonCreditor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PersonCreditor) => addPersonCreditor(payload),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ['person-creditors', payload.person_id] });
      qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('Credor vinculado');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useAddExternalId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      personId,
      system,
      externalId,
      metadata,
    }: {
      personId: string;
      system: string;
      externalId: string;
      metadata?: Record<string, any>;
    }) => upsertPersonExternalId(personId, system, externalId, metadata),
    onSuccess: (_, { personId }) => {
      qc.invalidateQueries({ queryKey: ['person-external-ids', personId] });
      toast.success('ID externo salvo');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}
