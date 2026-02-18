import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

export interface ContratanteAdicional {
  nome: string;
  cpf: string;
  telefone?: string;
  email?: string;
}

export interface Cobranca {
  id: string;
  projeto_id: string;
  nome_contratante: string;
  cpf_contratante: string;
  telefone_contratante?: string;
  email_contratante?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  estado?: string;
  contratantes_adicionais?: ContratanteAdicional[];
  quantidade_boletos: number;
  valor_sem_desconto: number;
  data_primeiro_boleto: string;
  tipo_desconto?: 'fixo' | 'percentual';
  valor_desconto?: number;
  descricao_boleto?: string;
  gerar_contrato: boolean;
  modelo_contrato_id?: string;
  payload_gerado?: object;
  status: 'pendente' | 'enviado' | 'processado' | 'erro';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateCobrancaInput {
  projeto_id: string;
  nome_contratante: string;
  cpf_contratante: string;
  telefone_contratante?: string;
  email_contratante?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  estado?: string;
  tem_contratante_adicional: boolean;
  contratantes_adicionais?: ContratanteAdicional[];
  quantidade_boletos: number;
  valor_sem_desconto: number;
  data_primeiro_boleto: Date;
  tipo_desconto?: 'fixo' | 'percentual';
  valor_desconto?: number;
  descricao_boleto?: string;
  gerar_contrato: boolean;
  modelo_contrato_id?: string;
}

interface ProjetoComSplits {
  id: string;
  nome: string;
  credor_cedrus: string;
  splits: {
    wallet_id: string;
    tipo_valor: 'fixedValue' | 'percentualValue';
    valor: number;
    description?: string;
  }[];
}

export function useCobrancas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestao-splits-cobrancas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_cobrancas')
        .select(`
          *,
          projeto:gestao_splits_projetos(nome, credor_cedrus),
          modelo:gestao_splits_modelos_contrato(nome)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar cobranças:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user
  });
}

export function useCreateCobranca() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCobrancaInput) => {
      // Buscar projeto e splits
      const { data: projeto, error: projetoError } = await supabase
        .from('gestao_splits_projetos')
        .select(`
          id,
          nome,
          credor_cedrus,
          splits:gestao_splits_projeto_splits(wallet_id, tipo_valor, valor, description)
        `)
        .eq('id', input.projeto_id)
        .single();

      if (projetoError) throw projetoError;

      const projetoData = projeto as ProjetoComSplits;

      // Gerar payload para sistema externo
      const payload = generatePayload(input, projetoData);

      // Salvar cobrança
      const { data, error } = await supabase
        .from('gestao_splits_cobrancas')
        .insert({
          projeto_id: input.projeto_id,
          nome_contratante: input.nome_contratante,
          cpf_contratante: input.cpf_contratante,
          telefone_contratante: input.telefone_contratante,
          email_contratante: input.email_contratante,
          endereco: input.endereco,
          bairro: input.bairro,
          cidade: input.cidade,
          cep: input.cep,
          estado: input.estado,
          contratantes_adicionais: input.tem_contratante_adicional ? input.contratantes_adicionais : null,
          quantidade_boletos: input.quantidade_boletos,
          valor_sem_desconto: input.valor_sem_desconto,
          data_primeiro_boleto: format(input.data_primeiro_boleto, 'yyyy-MM-dd'),
          tipo_desconto: input.tipo_desconto,
          valor_desconto: input.valor_desconto,
          descricao_boleto: input.descricao_boleto,
          gerar_contrato: input.gerar_contrato,
          modelo_contrato_id: input.gerar_contrato ? input.modelo_contrato_id : null,
          payload_gerado: payload,
          status: 'pendente',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return { cobranca: data, payload };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-cobrancas'] });
      toast.success('Cobrança criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar cobrança:', error);
      toast.error('Erro ao criar cobrança');
    }
  });
}

function generatePayload(input: CreateCobrancaInput, projeto: ProjetoComSplits) {
  // Gerar datas dos boletos
  const boletos = [];
  let dataAtual = new Date(input.data_primeiro_boleto);
  
  for (let i = 0; i < input.quantidade_boletos; i++) {
    const dueDate = format(dataAtual, 'yyyy-MM-dd');
    
    const boleto: Record<string, unknown> = {
      billingType: 'BOLETO',
      customer: {
        name: input.nome_contratante,
        cpfCnpj: input.cpf_contratante.replace(/\D/g, ''),
        email: input.email_contratante,
        phone: input.telefone_contratante?.replace(/\D/g, ''),
        address: input.endereco,
        addressNumber: '',
        province: input.bairro,
        postalCode: input.cep?.replace(/\D/g, ''),
        city: input.cidade,
        state: input.estado
      },
      dueDate,
      value: input.valor_sem_desconto,
      description: input.descricao_boleto || `Boleto ${i + 1}/${input.quantidade_boletos}`,
      externalReference: projeto.nome
    };

    // Adicionar desconto de pontualidade se configurado
    if (input.tipo_desconto && input.valor_desconto) {
      boleto.discount = {
        type: input.tipo_desconto === 'fixo' ? 'FIXED' : 'PERCENTAGE',
        value: input.valor_desconto,
        dueDateLimitDays: 0
      };
    }

    // Adicionar splits
    if (projeto.splits && projeto.splits.length > 0) {
      boleto.split = projeto.splits.map(split => {
        const splitItem: Record<string, unknown> = {
          walletId: split.wallet_id,
          externalReference: projeto.nome
        };

        if (split.tipo_valor === 'fixedValue') {
          splitItem.fixedValue = split.valor;
        } else {
          splitItem.percentualValue = split.valor;
        }

        if (split.description) {
          splitItem.description = split.description;
        }

        return splitItem;
      });
    }

    boletos.push(boleto);
    
    // Próximo mês
    dataAtual = addMonths(dataAtual, 1);
  }

  return {
    cobrancas: boletos,
    contratantes_adicionais: input.tem_contratante_adicional ? input.contratantes_adicionais : null,
    gerar_contrato: input.gerar_contrato,
    modelo_contrato_id: input.modelo_contrato_id
  };
}
