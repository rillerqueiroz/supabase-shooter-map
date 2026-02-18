import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface LogAlteracao {
  id: number;
  created_at: string;
  titulo_id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  origem: string;
  usuario_id: string | null;
  usuario_email: string | null;
  descricao: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateLogAlteracaoInput {
  titulo_id: string;
  campo_alterado: string;
  valor_anterior?: string | null;
  valor_novo?: string | null;
  origem?: string;
  usuario_id?: string | null;
  usuario_email?: string | null;
  descricao?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function useTitulosLogAlteracoes(tituloId?: string) {
  return useQuery({
    queryKey: ["titulos-log-alteracoes", tituloId],
    queryFn: async () => {
      let query = supabase
        .from("base_tudobelo_log_alteracoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (tituloId) {
        query = query.eq("titulo_id", tituloId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as LogAlteracao[];
    },
    enabled: true,
  });
}

export function useCreateLogAlteracao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateLogAlteracaoInput) => {
      const { data, error } = await supabase
        .from("base_tudobelo_log_alteracoes")
        .insert({
          titulo_id: input.titulo_id,
          campo_alterado: input.campo_alterado,
          valor_anterior: input.valor_anterior,
          valor_novo: input.valor_novo,
          origem: input.origem || "sistema_interno",
          usuario_id: input.usuario_id,
          usuario_email: input.usuario_email,
          descricao: input.descricao,
          metadata: input.metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-log-alteracoes"] });
    },
    onError: (error) => {
      console.error("Erro ao registrar log:", error);
    },
  });
}

// Helper para registrar múltiplas alterações de uma vez
export function useCreateMultipleLogAlteracoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateLogAlteracaoInput[]) => {
      const records = inputs.map((input) => ({
        titulo_id: input.titulo_id,
        campo_alterado: input.campo_alterado,
        valor_anterior: input.valor_anterior,
        valor_novo: input.valor_novo,
        origem: input.origem || "sistema_interno",
        usuario_id: input.usuario_id,
        usuario_email: input.usuario_email,
        descricao: input.descricao,
        metadata: input.metadata,
      }));

      const { data, error } = await supabase
        .from("base_tudobelo_log_alteracoes")
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-log-alteracoes"] });
    },
  });
}
