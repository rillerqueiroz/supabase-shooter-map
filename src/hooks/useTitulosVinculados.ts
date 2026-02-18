import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TituloTudoBelo } from './useTitulosTudoBelo';

export interface TituloVinculadoGroup {
  documento: string;
  titulos: TituloTudoBelo[];
  saldoTotal: number;
}

export function useTitulosVinculados(codigoParceiro: string | null, tituloIdAtual: string) {
  return useQuery({
    queryKey: ['titulos-vinculados', codigoParceiro, tituloIdAtual],
    queryFn: async () => {
      if (!codigoParceiro) return { groups: [], tituloIdAtual };

      const { data, error } = await supabase
        .from('base_tudobelo_intermediaria')
        .select('*')
        .eq('codigo_parceiro', codigoParceiro)
        .order('documento', { ascending: true })
        .order('numero_parcela', { ascending: true })
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      
      // Agrupar por documento
      const grouped = (data as TituloTudoBelo[]).reduce((acc, titulo) => {
        const doc = titulo.documento || 'Sem documento';
        if (!acc[doc]) {
          acc[doc] = [];
        }
        acc[doc].push(titulo);
        return acc;
      }, {} as Record<string, TituloTudoBelo[]>);

      // Converter para array com totais
      const groups: TituloVinculadoGroup[] = Object.entries(grouped).map(([documento, titulos]) => ({
        documento,
        titulos: titulos.sort((a, b) => {
          // Ordenar por parcela, depois por vencimento, depois por saldo
          const parcelaA = parseInt(a.numero_parcela || '0');
          const parcelaB = parseInt(b.numero_parcela || '0');
          if (parcelaA !== parcelaB) return parcelaA - parcelaB;
          
          const dateA = a.data_vencimento ? new Date(a.data_vencimento).getTime() : 0;
          const dateB = b.data_vencimento ? new Date(b.data_vencimento).getTime() : 0;
          if (dateA !== dateB) return dateA - dateB;
          
          return (a.saldo_parcela || 0) - (b.saldo_parcela || 0);
        }),
        saldoTotal: titulos.reduce((sum, t) => sum + (t.saldo_parcela || 0), 0),
      }));

      return { groups, tituloIdAtual };
    },
    enabled: !!codigoParceiro,
  });
}
