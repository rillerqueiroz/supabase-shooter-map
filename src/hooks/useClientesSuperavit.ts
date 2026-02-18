import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useGestaoSplitsClientPermissions, useAllowedCredores } from "./useGestaoSplitsClientPermissions";

export interface ClienteSuperavit {
  id: number;
  credor_cedrus: string | null;
  nome_credor: string | null;
  walletId: string | null;
  split_interno: string | null;
  wallet_id_parceiro: string | null;
  pct_split_parceiro: string | null;
  email: string[] | null;
  whatsapp: string[] | null;
  faz_split: boolean | null;
  forma_notificacao_baixas: string | null;
  qualificacao_credor: string | null;
  pct_split: number | null;
  chave_pix: string | null;
  apikey: string | null;
  status: boolean | null;
  pct_comissao_correcao: number | null;
  pct_comissao_multa: number | null;
  pct_comissao_juros: number | null;
  pct_comissao_honorarios: number | null;
  pct_comissao_juros_parcelamento: number | null;
  pct_comissao_saldo: number | null;
  pct_comissao_taxa: number | null;
  gerenciamento_recebiveis_splits: boolean | null;
  modelo_contrato_splits: string | null;
  avisa_recebimentos_boletos: boolean | null;
  created_at: string | null;
  empresa_sistema_externo: string | null;
  tipo_negocio_padrao: string | null;
  tipo_titulo_padrao: string | null;
  termo_acordo_google_docs: string | null;
  nome_para_audio: string | null;
}

export function useClientesSuperavit() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ["clientes-superavit", user?.id, permissions],
    queryFn: async () => {
      let query = supabase.from("clientes_superavit").select("*");

      // Admin (permissions === null) vê tudo
      if (allowedCredores === null) {
        // Query sem filtro
      }
      // Sem permissões ou array vazio = não retornar nada (bloqueio padrão)
      else if (!allowedCredores || allowedCredores.length === 0) {
        return [];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        query = query.in('credor_cedrus', allowedCredores);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("❌ Erro ao buscar clientes superávit:", error);
        throw error;
      }
      
      console.log("✅ Clientes Superávit carregados:", data?.length);
      return data || [];
    },
    enabled: !isLoadingPermissions && !!user
  });
}

export function useClientesExtratoSuperavit() {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = useGestaoSplitsClientPermissions(user?.id);
  const allowedCredores = useAllowedCredores(user?.id);

  return useQuery({
    queryKey: ["clientes-extrato-superavit", user?.id, permissions],
    queryFn: async () => {
      let query = supabase
        .from("clientes_superavit")
        .select('"walletId", credor_cedrus, nome_credor, faz_split, gerenciamento_recebiveis_splits')
        .or('faz_split.eq.true,gerenciamento_recebiveis_splits.eq.true')
        .order("credor_cedrus");

      // Admin (permissions === null) vê tudo
      if (allowedCredores === null) {
        // Query sem filtro
      }
      // Sem permissões ou array vazio = não retornar nada (bloqueio padrão)
      else if (!allowedCredores || allowedCredores.length === 0) {
        return [];
      }
      // Com permissões específicas = filtrar por credor_cedrus
      else {
        query = query.in('credor_cedrus', allowedCredores);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("❌ Erro ao buscar clientes para extrato:", error);
        throw error;
      }
      
      console.log("✅ Clientes com Faz Split ou Gerenciamento Recebíveis:", data?.length);
      
      return (data || [])
        .filter((cliente) => typeof cliente.walletId === "string" && cliente.walletId.trim() !== "")
        .map((cliente) => ({
          wallet_id: cliente.walletId as string,
          nome: cliente.nome_credor || cliente.credor_cedrus || "Sem nome",
          credor_cedrus: cliente.credor_cedrus
        }));
    },
    enabled: !isLoadingPermissions && !!user
  });
}
