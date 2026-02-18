import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GestaoSplitsScreen } from '@/types/gestaoSplitsPermissions';

export function useGestaoSplitsScreensList() {
  return useQuery({
    queryKey: ['gestao-splits-screens-list'],
    queryFn: async (): Promise<GestaoSplitsScreen[]> => {
      const { data, error } = await supabase
        .from('gestao_splits_screens')
        .select('id, slug, nome, descricao, ordem, ativo')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) {
        console.error('❌ [GestaoSplits] Erro ao buscar telas:', error);
        throw error;
      }
      
      const screens: GestaoSplitsScreen[] = data?.map((item) => ({
        id: item.id,
        slug: item.slug,
        nome: item.nome,
        descricao: item.descricao,
        ordem: item.ordem,
        ativo: item.ativo
      })) || [];
      
      console.log('✅ [GestaoSplits] Telas carregadas:', screens.length);
      return screens;
    }
  });
}
