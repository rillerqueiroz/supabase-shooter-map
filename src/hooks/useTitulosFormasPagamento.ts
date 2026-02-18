import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface FormaPagamento {
  id: number;
  created_at: string;
  updated_at: string;
  forma_pagamento: string;
  credor_cedrus: string | null;
  prazo_recompra: number | null;
}

export function useTitulosFormasPagamento() {
  return useQuery({
    queryKey: ["titulos-formas-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("base_tudobelo_formas_pagamento")
        .select("*")
        .order("forma_pagamento", { ascending: true });

      if (error) throw error;
      return data as FormaPagamento[];
    },
  });
}

export function useCreateFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formaPagamento: string) => {
      const { data, error } = await supabase
        .from("base_tudobelo_formas_pagamento")
        .insert({ forma_pagamento: formaPagamento })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-formas-pagamento"] });
      toast.success("Forma de pagamento criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar forma de pagamento: ${error.message}`);
    },
  });
}

export function useUpdateFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      forma_pagamento, 
      credor_cedrus,
      prazo_recompra
    }: { 
      id: number; 
      forma_pagamento?: string; 
      credor_cedrus?: string | null;
      prazo_recompra?: number | null;
    }) => {
      const updateData: Partial<FormaPagamento> = {};
      if (forma_pagamento !== undefined) updateData.forma_pagamento = forma_pagamento;
      if (credor_cedrus !== undefined) updateData.credor_cedrus = credor_cedrus;
      if (prazo_recompra !== undefined) updateData.prazo_recompra = prazo_recompra;

      const { data, error } = await supabase
        .from("base_tudobelo_formas_pagamento")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-formas-pagamento"] });
      toast.success("Forma de pagamento atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar forma de pagamento: ${error.message}`);
    },
  });
}

export function useDeleteFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("base_tudobelo_formas_pagamento")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulos-formas-pagamento"] });
      toast.success("Forma de pagamento excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir forma de pagamento: ${error.message}`);
    },
  });
}
