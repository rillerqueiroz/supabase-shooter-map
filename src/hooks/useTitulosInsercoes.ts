import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TituloInsercao {
  id: number;
  created_at: string;
  id_google_drive: string | null;
  quantidade_inserida: string | null;
  nome_arquivo: string | null;
}

export function useTitulosInsercoes() {
  return useQuery({
    queryKey: ["titulos-insercoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("base_tudobelo_insercoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TituloInsercao[];
    },
  });
}
