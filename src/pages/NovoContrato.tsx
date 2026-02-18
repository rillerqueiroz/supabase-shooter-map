import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, UserCheck, UserPlus, FileText, MapPin, Receipt, ClipboardCheck, Plus, Trash2, Users } from 'lucide-react';
import { validarCPFouCNPJ, formatarCPFouCNPJ, formatarCEP } from '@/utils/validators';
import { buscarCEP } from '@/utils/cepService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  useCreateContrato, 
  useContrato,
  useUpdateContrato,
  CreateContratoInput,
  TipoGeracao,
  TipoDesconto
} from '@/hooks/useGestaoContratos';
import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';
import { useProjetosByCredor, ProjetoSplit } from '@/hooks/useGestaoSplitsProjetos';
import { useModelosContratoByCredor, useCamposModelo, useSaveContratoCamposValores } from '@/hooks/useGestaoSplitsModelosContrato';
import { useBeneficiariosPorProjeto, useBeneficiariosAtivos, useBeneficiariosVendedores } from '@/hooks/useGestaoSplitsBeneficiarios';
import { toast } from 'sonner';
import { useCreateVendedorContrato, useVendedoresByContrato } from '@/hooks/useVendedoresContratos';

interface SplitAdicional {
  beneficiario_id: string;
  beneficiario_nome: string;
  wallet_id: string;
  tipo_valor: 'fixedValue' | 'percentualValue';
  valor: number;
  description: string;
}

interface VendedorItem {
  beneficiario_id: string;
  beneficiario_nome: string;
  percentual: number;
  description: string;
}

// Section wrapper component - defined outside to avoid re-creation on render
function SectionCard({ icon: Icon, title, number, children }: {
  icon: any; title: string; number: number; children: React.ReactNode;
}) {
  return (
    <Card className="border-l-4 border-l-amber-500 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500 text-white text-xs font-bold">
            {number}
          </span>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function NovoContrato() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;

  // Estados para busca de CPF
  const [cpfBusca, setCpfBusca] = useState('');
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [cpfVerificado, setCpfVerificado] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);

  // Estado para seleção de tipo de geração
  const [tipoGeracaoSelecionado, setTipoGeracaoSelecionado] = useState(false);

  // Estado para validação de campos
  const [tentouSalvar, setTentouSalvar] = useState(false);

  // Estado para confirmação de criação
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Estado para busca de CEP
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepInput, setCepInput] = useState('');
  const [cpfError, setCpfError] = useState('');

  // Splits adicionais
  const [splitsAdicionais, setSplitsAdicionais] = useState<SplitAdicional[]>([]);

  // Vendedores
  const [vendedores, setVendedores] = useState<VendedorItem[]>([]);
  const createVendedorContrato = useCreateVendedorContrato();

  const [formData, setFormData] = useState<CreateContratoInput & {
    contratante_endereco?: string;
    contratante_numero?: string;
    contratante_complemento?: string;
    contratante_bairro?: string;
    contratante_cidade?: string;
    contratante_estado?: string;
    contratante_cep?: string;
  }>({
    nome: '',
    descricao: '',
    credor_cedrus: '',
    projeto_id: '',
    modelo_contrato_id: '',
    contratante_nome: '',
    contratante_cpf_cnpj: '',
    contratante_email: '',
    contratante_telefone: '',
    contratante_endereco: '',
    contratante_numero: '',
    contratante_complemento: '',
    contratante_bairro: '',
    contratante_cidade: '',
    contratante_estado: '',
    contratante_cep: '',
    valor_total: undefined,
    tipo_geracao: 'contrato_boleto',
    objeto_contrato: '',
    valor_boleto: undefined,
    data_primeiro_boleto: '',
    numero_boletos: 1,
    tem_desconto_pontualidade: false,
    tipo_desconto: undefined,
    valor_desconto: undefined,
    dias_antecedencia_desconto: undefined,
    observacoes: ''
  });

  const { data: clientes } = useClientesGerenciamentoRecebiveis();
  const { data: projetos } = useProjetosByCredor(formData.credor_cedrus);
  const { data: modelos } = useModelosContratoByCredor(formData.credor_cedrus);
  const { data: camposModelo } = useCamposModelo(formData.modelo_contrato_id || undefined);
  const { data: beneficiariosProjeto } = useBeneficiariosPorProjeto(formData.projeto_id || undefined);
  const { data: todosbeneficiariosAtivos } = useBeneficiariosAtivos();
  const { data: beneficiariosVendedores } = useBeneficiariosVendedores();

  const createContrato = useCreateContrato();
  const updateContrato = useUpdateContrato();
  const saveContratoCamposValores = useSaveContratoCamposValores();

  // Fetch existing contract data for edit mode
  const { data: existingContrato, isLoading: isLoadingContrato } = useContrato(editId);
  const { data: existingVendedores } = useVendedoresByContrato(editId);

  // Populate form with existing data when editing
  useEffect(() => {
    if (!isEditMode || !existingContrato) return;
    
    setFormData(prev => ({
      ...prev,
      nome: existingContrato.nome || '',
      descricao: existingContrato.descricao || '',
      credor_cedrus: existingContrato.credor_cedrus,
      projeto_id: existingContrato.projeto_id || '',
      modelo_contrato_id: existingContrato.modelo_contrato_id || '',
      contratante_nome: existingContrato.contratante_nome,
      contratante_cpf_cnpj: existingContrato.contratante_cpf_cnpj || '',
      contratante_email: existingContrato.contratante_email || '',
      contratante_telefone: existingContrato.contratante_telefone || '',
      contratante_endereco: existingContrato.contratante_endereco || '',
      contratante_bairro: existingContrato.contratante_bairro || '',
      contratante_cidade: existingContrato.contratante_cidade || '',
      contratante_estado: existingContrato.contratante_estado || '',
      contratante_cep: existingContrato.contratante_cep || '',
      valor_total: existingContrato.valor_total || undefined,
      tipo_geracao: existingContrato.tipo_geracao || 'contrato_boleto',
      objeto_contrato: existingContrato.objeto_contrato || '',
      valor_boleto: existingContrato.valor_boleto || undefined,
      data_primeiro_boleto: existingContrato.data_primeiro_boleto || '',
      numero_boletos: existingContrato.numero_boletos || 1,
      tem_desconto_pontualidade: existingContrato.tem_desconto_pontualidade || false,
      tipo_desconto: existingContrato.tipo_desconto || undefined,
      valor_desconto: existingContrato.valor_desconto || undefined,
      dias_antecedencia_desconto: existingContrato.dias_antecedencia_desconto || undefined,
      observacoes: existingContrato.observacoes || '',
    }));
    
    if (existingContrato.contratante_cep) {
      setCepInput(existingContrato.contratante_cep);
    }
    
    // Populate splits adicionais from contrato_splits
    if (existingContrato.contrato_splits && existingContrato.contrato_splits.length > 0) {
      setSplitsAdicionais(existingContrato.contrato_splits.map(s => ({
        beneficiario_id: s.beneficiario_id || '',
        beneficiario_nome: s.beneficiario?.nome || '',
        wallet_id: s.wallet_id,
        tipo_valor: s.tipo_valor as 'fixedValue' | 'percentualValue',
        valor: s.valor,
        description: s.description || 'Vendedor',
      })));
    }
    
    // Skip CPF check and tipo geracao selection for edit mode
    setCpfVerificado(true);
    setTipoGeracaoSelecionado(true);
  }, [isEditMode, existingContrato]);

  // Populate vendedores when editing
  useEffect(() => {
    if (!isEditMode || !existingVendedores || existingVendedores.length === 0) return;
    setVendedores(existingVendedores.map(v => ({
      beneficiario_id: v.beneficiario_id,
      beneficiario_nome: v.beneficiario?.nome || '',
      percentual: v.percentual,
      description: v.description || 'Vendedor',
    })));
  }, [isEditMode, existingVendedores]);

  // Estado para valores dos campos personalizados
  const [camposValores, setCamposValores] = useState<Record<string, string>>({});

  useEffect(() => {
    setCamposValores({});
  }, [formData.modelo_contrato_id]);

  // Estado para valor formatado do boleto
  const [valorBoletoFormatado, setValorBoletoFormatado] = useState('');
  const [valorDescontoFormatado, setValorDescontoFormatado] = useState('');

  useEffect(() => {
    if (formData.valor_boleto) {
      setValorBoletoFormatado(formData.valor_boleto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setValorBoletoFormatado('');
    }
  }, [formData.valor_boleto]);

  useEffect(() => {
    if (formData.valor_desconto && formData.tipo_desconto === 'fixo') {
      setValorDescontoFormatado(formData.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else if (formData.valor_desconto && formData.tipo_desconto === 'percentual') {
      setValorDescontoFormatado(String(formData.valor_desconto));
    } else {
      setValorDescontoFormatado('');
    }
  }, [formData.valor_desconto, formData.tipo_desconto]);

  // CEP auto-search with debounce to wait for user to finish typing
  useEffect(() => {
    const cleanCep = cepInput.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, contratante_cep: cepInput }));
    if (cleanCep.length === 8) {
      const timeout = setTimeout(() => {
        setBuscandoCep(true);
        buscarCEP(cleanCep).then(result => {
          setBuscandoCep(false);
          if (result) {
            setFormData(prev => ({
              ...prev,
              contratante_endereco: result.logradouro || prev.contratante_endereco,
              contratante_bairro: result.bairro || prev.contratante_bairro,
              contratante_cidade: result.localidade || prev.contratante_cidade,
              contratante_estado: result.uf || prev.contratante_estado,
            }));
            toast.success('Endereço preenchido automaticamente!');
          } else {
            toast.error('CEP não encontrado');
          }
        });
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [cepInput]);

  const formatCurrencyInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const numericValue = parseInt(numbers || '0', 10);
    const reais = numericValue / 100;
    return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyToNumber = (value: string): number | undefined => {
    if (!value) return undefined;
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const isFieldInvalid = (fieldValue: any): boolean => {
    if (!tentouSalvar) return false;
    if (typeof fieldValue === 'string') return !fieldValue.trim();
    if (typeof fieldValue === 'number') return !fieldValue;
    return !fieldValue;
  };

  const isBoletoRequired = formData.tipo_geracao === 'boleto' || formData.tipo_geracao === 'contrato_boleto';
  const isContratoRequired = formData.tipo_geracao === 'contrato' || formData.tipo_geracao === 'contrato_boleto';

  // Get selected project splits
  const projetoSelecionado = useMemo(() => {
    if (!formData.projeto_id || !projetos) return null;
    return projetos.find(p => p.id === formData.projeto_id) || null;
  }, [formData.projeto_id, projetos]);

  const projetoSplits = projetoSelecionado?.splits || [];

  // Calculate total split percentage
  const totalSplitPercentual = useMemo(() => {
    const projetoPerc = projetoSplits
      .filter(s => s.tipo_valor === 'percentualValue')
      .reduce((sum, s) => sum + s.valor, 0);
    const adicionaisPerc = splitsAdicionais
      .filter(s => s.tipo_valor === 'percentualValue')
      .reduce((sum, s) => sum + s.valor, 0);
    return projetoPerc + adicionaisPerc;
  }, [projetoSplits, splitsAdicionais]);

  // Taxa fixa da cobrança (Asaas)
  const TAXA_COBRANCA = 2.00;

  // Calcula o valor líquido disponível para splits (valor do boleto - taxa - desconto pontualidade)
  const valorLiquidoDisponivel = useMemo(() => {
    if (!formData.valor_boleto) return 0;
    let valorBase = formData.valor_boleto;
    
    // Considerar desconto de pontualidade
    if (formData.tem_desconto_pontualidade && formData.valor_desconto && formData.tipo_desconto) {
      if (formData.tipo_desconto === 'fixo') {
        valorBase -= formData.valor_desconto;
      } else if (formData.tipo_desconto === 'percentual') {
        valorBase -= (formData.valor_desconto / 100) * formData.valor_boleto;
      }
    }
    
    return Math.max(0, valorBase - TAXA_COBRANCA);
  }, [formData.valor_boleto, formData.tem_desconto_pontualidade, formData.valor_desconto, formData.tipo_desconto]);

  // Calcula o total de splits em R$ (fixos + percentuais convertidos + vendedores)
  const totalSplitsEmReais = useMemo(() => {
    if (!formData.valor_boleto) return 0;
    
    const projetoFixo = projetoSplits
      .filter(s => s.tipo_valor === 'fixedValue')
      .reduce((sum, s) => sum + s.valor, 0);
    const projetoPerc = projetoSplits
      .filter(s => s.tipo_valor === 'percentualValue')
      .reduce((sum, s) => sum + (s.valor * formData.valor_boleto! / 100), 0);
    
    const adicionaisFixo = splitsAdicionais
      .filter(s => s.tipo_valor === 'fixedValue')
      .reduce((sum, s) => sum + s.valor, 0);
    const adicionaisPerc = splitsAdicionais
      .filter(s => s.tipo_valor === 'percentualValue')
      .reduce((sum, s) => sum + (s.valor * formData.valor_boleto! / 100), 0);
    
    const vendedoresTotal = vendedores
      .reduce((sum, v) => sum + (v.percentual * formData.valor_boleto! / 100), 0);
    
    return projetoFixo + projetoPerc + adicionaisFixo + adicionaisPerc + vendedoresTotal;
  }, [projetoSplits, splitsAdicionais, vendedores, formData.valor_boleto]);

  const splitsExcedemLimite = formData.valor_boleto ? totalSplitsEmReais > valorLiquidoDisponivel : false;

  // Available beneficiaries (not already added as extra)
  const beneficiariosDisponiveis = useMemo(() => {
    if (!beneficiariosProjeto) return [];
    const usedWallets = new Set([
      ...projetoSplits.map(s => s.wallet_id),
      ...splitsAdicionais.map(s => s.wallet_id),
    ]);
    return beneficiariosProjeto.filter(b => !usedWallets.has(b.wallet_id));
  }, [beneficiariosProjeto, projetoSplits, splitsAdicionais]);

  const handleAddSplitAdicional = () => {
    if (beneficiariosDisponiveis.length === 0) {
      toast.error('Não há mais beneficiários disponíveis para este projeto');
      return;
    }
    const b = beneficiariosDisponiveis[0];
    setSplitsAdicionais(prev => [...prev, {
      beneficiario_id: b.id,
      beneficiario_nome: b.nome,
      wallet_id: b.wallet_id,
      tipo_valor: 'percentualValue',
      valor: 0,
      description: 'Vendedor',
    }]);
  };

  const handleRemoveSplitAdicional = (index: number) => {
    setSplitsAdicionais(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSplitAdicional = (index: number, field: keyof SplitAdicional, value: any) => {
    setSplitsAdicionais(prev => prev.map((s, i) => {
      if (i !== index) return s;
      if (field === 'beneficiario_id') {
        const b = beneficiariosProjeto?.find(b => b.id === value);
        return { ...s, beneficiario_id: value, beneficiario_nome: b?.nome || '', wallet_id: b?.wallet_id || '' };
      }
      return { ...s, [field]: value };
    }));
  };

  // Helper to avoid stale closures causing cursor loss
  const updateField = useCallback((fields: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  const buscarClientePorCpf = useCallback(async () => {
    if (!cpfBusca.trim()) return;
    const cpfLimpoCheck = cpfBusca.replace(/\D/g, '');
    if (cpfLimpoCheck.length === 11 || cpfLimpoCheck.length === 14) {
      if (!validarCPFouCNPJ(cpfLimpoCheck)) {
        toast.error(cpfLimpoCheck.length === 11 ? 'CPF inválido.' : 'CNPJ inválido.');
        return;
      }
    } else if (cpfLimpoCheck.length > 0) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.');
      return;
    }
    setBuscandoCpf(true);
    try {
      const cpfLimpo = cpfBusca.replace(/\D/g, '');
      const { data, error } = await supabase
        .from('valores_totais_recebidos_asaas')
        .select('nome, cpf_cnpj, email, celular, fone, credor_cedrus')
        .or(`cpf_cnpj.eq.${cpfLimpo},cpf_cnpj.eq.${cpfBusca}`)
        .limit(1)
        .maybeSingle();
      if (error) { setCpfVerificado(true); setClienteEncontrado(null); return; }
      setCpfVerificado(true);
      if (data) {
        setClienteEncontrado(data);
        setFormData(prev => ({
          ...prev,
          nome: data.nome || '',
          contratante_nome: data.nome || '',
          contratante_cpf_cnpj: data.cpf_cnpj || cpfBusca,
          contratante_email: data.email || '',
          contratante_telefone: data.celular || data.fone || '',
          credor_cedrus: data.credor_cedrus || prev.credor_cedrus
        }));
      } else {
        setClienteEncontrado(null);
        setFormData(prev => ({ ...prev, contratante_cpf_cnpj: cpfBusca }));
      }
    } catch {
      setCpfVerificado(true);
      setClienteEncontrado(null);
    } finally {
      setBuscandoCpf(false);
    }
  }, [cpfBusca]);

  const getProjetoNome = () => {
    if (!formData.projeto_id) return '-';
    return projetos?.find(p => p.id === formData.projeto_id)?.nome || '-';
  };

  const validateForm = (): boolean => {
    setTentouSalvar(true);
    const hasErrors =
      !formData.credor_cedrus ||
      !formData.projeto_id ||
      !formData.contratante_nome ||
      !formData.contratante_cpf_cnpj ||
      !formData.contratante_email ||
      !formData.contratante_telefone ||
      (isBoletoRequired && (
        !formData.objeto_contrato ||
        !formData.valor_boleto ||
        !formData.data_primeiro_boleto ||
        !formData.numero_boletos ||
        (formData.tem_desconto_pontualidade && (!formData.tipo_desconto || !formData.valor_desconto || !formData.dias_antecedencia_desconto))
      ));
    if (hasErrors) { toast.error('Preencha todos os campos obrigatórios'); return false; }
    const docLimpo = formData.contratante_cpf_cnpj.replace(/\D/g, '');
    if ((docLimpo.length === 11 || docLimpo.length === 14) && !validarCPFouCNPJ(docLimpo)) {
      setCpfError(docLimpo.length === 11 ? 'CPF inválido' : 'CNPJ inválido');
      return false;
    }
    setCpfError('');
    if (totalSplitPercentual > 100) {
      toast.error('O somatório dos splits percentuais não pode ultrapassar 100%');
      return false;
    }
    if (splitsExcedemLimite) {
      toast.error(`O total dos splits (${formatCurrency(totalSplitsEmReais)}) excede o valor disponível (${formatCurrency(valorLiquidoDisponivel)}). Lembre-se que a taxa de R$ 2,00 é descontada do valor do boleto${formData.tem_desconto_pontualidade ? ', além do desconto de pontualidade' : ''}.`);
      return false;
    }
    if (isBoletoRequired && formData.data_primeiro_boleto) {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const dataBoleto = new Date(formData.data_primeiro_boleto + 'T00:00:00');
      if (dataBoleto < hoje) { toast.error('Data do primeiro boleto não pode ser inferior a hoje'); return false; }
    }
    return true;
  };

  const handleSaveClick = () => {
    if (!validateForm()) return;
    setConfirmDialogOpen(true);
  };

  const handleSaveConfirmed = async () => {
    setConfirmDialogOpen(false);
    
    let contratoId: string | undefined;
    let contratoExternalRef: string | undefined;
    
    if (isEditMode && editId) {
      // Update existing contract
      await updateContrato.mutateAsync({
        id: editId,
        ...formData,
        projeto_id: formData.projeto_id || undefined,
        modelo_contrato_id: formData.modelo_contrato_id || undefined
      });
      contratoId = editId;
      
      // Buscar o externalReference do contrato existente
      const { data: contratoAtual } = await supabase
        .from('gestao_splits_contratos')
        .select('"externalReference"')
        .eq('id', editId)
        .single();
      contratoExternalRef = contratoAtual?.externalReference;
      
      // Delete existing splits and vendedores to re-insert
      await supabase.from('gestao_splits_contrato_splits').delete().eq('contrato_id', editId);
      await supabase.from('gestao_splits_vendedores_contratos').delete().eq('contrato_id', editId);
      // Delete existing cobrancas_splits linked to this contract
      if (contratoExternalRef) {
        await supabase.from('gestao_splits_cobrancas_splits').delete().eq('externalReference', contratoExternalRef);
      }
    } else {
      // Create new contract
      const novoContrato = await createContrato.mutateAsync({
        ...formData,
        projeto_id: formData.projeto_id || undefined,
        modelo_contrato_id: formData.modelo_contrato_id || undefined
      });
      contratoId = novoContrato?.id;
      contratoExternalRef = novoContrato?.externalReference;
    }
    
    if (contratoId && camposModelo && camposModelo.length > 0 && Object.keys(camposValores).length > 0) {
      const camposParaSalvar = camposModelo.map(campo => ({
        campo_id: campo.id,
        campo_nome: campo.nome,
        campo_tipo: campo.tipo,
        valor: camposValores[campo.id] || null
      }));
      await saveContratoCamposValores.mutateAsync({ contrato_id: contratoId, campos: camposParaSalvar });
    }
    // Persist additional splits
    if (contratoId && splitsAdicionais.length > 0) {
      const { error: splitsError } = await supabase
        .from('gestao_splits_contrato_splits')
        .insert(
          splitsAdicionais.map(s => ({
            contrato_id: contratoId,
            beneficiario_id: s.beneficiario_id,
            wallet_id: s.wallet_id,
            tipo_valor: s.tipo_valor,
            valor: s.valor,
            description: s.description || 'Vendedor',
            tipo_cobranca: 'normal'
          }))
        );
      if (splitsError) {
        console.error('Erro ao salvar splits adicionais:', splitsError);
        toast.error(isEditMode ? 'Contrato atualizado, mas houve erro ao salvar splits adicionais' : 'Contrato criado, mas houve erro ao salvar splits adicionais');
      }
    }
    // Persist vendedores
    if (contratoId && vendedores.length > 0) {
      await createVendedorContrato.mutateAsync(
        vendedores.map(v => ({
          contrato_id: contratoId!,
          beneficiario_id: v.beneficiario_id,
          percentual: v.percentual,
          description: v.description || 'Vendedor'
        }))
      );
    }
    
    // Salvar todos os splits na tabela gestao_splits_cobrancas_splits usando externalReference
    if (contratoId && contratoExternalRef) {
      const allSplitsToSave: any[] = [];
      
      // 1. Splits do projeto
      projetoSplits.forEach(s => {
        const beneficiario = beneficiariosProjeto?.find(b => b.wallet_id === s.wallet_id);
        allSplitsToSave.push({
          identificador: contratoExternalRef,
          wallet_id: s.wallet_id,
          beneficiario_id: beneficiario?.id || null,
          tipo_valor: s.tipo_valor,
          percentualValue: s.tipo_valor === 'percentualValue' ? s.valor : 0,
          fixedValue: s.tipo_valor === 'fixedValue' ? s.valor : null,
          description: s.description || null,
          origem: 'projeto',
          "externalReference": contratoExternalRef,
          tipo_cobranca: s.tipo_cobranca || 'normal'
        });
      });
      
      // 2. Splits adicionais
      splitsAdicionais.forEach(s => {
        allSplitsToSave.push({
          identificador: contratoExternalRef,
          wallet_id: s.wallet_id,
          beneficiario_id: s.beneficiario_id || null,
          tipo_valor: s.tipo_valor,
          percentualValue: s.tipo_valor === 'percentualValue' ? s.valor : 0,
          fixedValue: s.tipo_valor === 'fixedValue' ? s.valor : null,
          description: s.description || null,
          origem: 'adicional',
          "externalReference": contratoExternalRef,
          tipo_cobranca: 'normal'
        });
      });
      
      // 3. Vendedores (comissões percentuais)
      vendedores.forEach(v => {
        const beneficiario = beneficiariosVendedores?.find(b => b.id === v.beneficiario_id);
        if (beneficiario) {
          allSplitsToSave.push({
            identificador: contratoExternalRef,
            wallet_id: beneficiario.wallet_id,
            beneficiario_id: v.beneficiario_id,
            tipo_valor: 'percentualValue',
            percentualValue: v.percentual,
            fixedValue: null,
            description: v.description || 'Vendedor',
            origem: 'adicional',
            "externalReference": contratoExternalRef,
            tipo_cobranca: 'normal'
          });
        }
      });
      
      if (allSplitsToSave.length > 0) {
        const { error: cobrancaSplitsError } = await supabase
          .from('gestao_splits_cobrancas_splits')
          .insert(allSplitsToSave);
        
        if (cobrancaSplitsError) {
          console.error('Erro ao salvar splits em cobrancas_splits:', cobrancaSplitsError);
          toast.error('Contrato salvo, mas houve erro ao registrar splits na tabela de cobranças');
        }
      }
    }
    
    navigate('/gestao-contratos');
  };


  // Loading state for edit mode
  if (isEditMode && isLoadingContrato) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show initial steps if not yet past CPF check
  if (!cpfVerificado) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestao-contratos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Editar Contrato' : 'Novo Contrato'}</h1>
        </div>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-600" />
              Buscar Contratante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Informe o CPF/CNPJ do contratante para verificar se já existe cadastro no sistema.
            </p>
            <div className="flex gap-2">
              <Input
                value={cpfBusca}
                onChange={(e) => setCpfBusca(formatarCPFouCNPJ(e.target.value))}
                placeholder="Digite o CPF ou CNPJ"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && buscarClientePorCpf()}
              />
              <Button onClick={buscarClientePorCpf} disabled={buscandoCpf || !cpfBusca.trim()}>
                {buscandoCpf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tipoGeracaoSelecionado) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestao-contratos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Editar Contrato' : 'Novo Contrato'}</h1>
        </div>

        {/* Feedback da busca */}
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          clienteEncontrado ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
        }`}>
          {clienteEncontrado ? (
            <>
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Cliente encontrado!</p>
                <p className="text-sm text-green-600 dark:text-green-400">Dados preenchidos automaticamente.</p>
              </div>
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Cliente não encontrado</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">Preencha os dados do novo contratante.</p>
              </div>
            </>
          )}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
            setCpfVerificado(false);
            setCpfBusca('');
            setClienteEncontrado(null);
            setFormData(prev => ({ ...prev, contratante_nome: '', contratante_cpf_cnpj: '', contratante_email: '', contratante_telefone: '', credor_cedrus: '' }));
          }}>
            Buscar outro CPF
          </Button>
        </div>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Tipo de Geração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">O que será gerado para este contrato?</p>
            <RadioGroup
              value={formData.tipo_geracao}
              onValueChange={(value) => updateField({ tipo_geracao: value as TipoGeracao })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="contrato" id="tipo-contrato" />
                <Label htmlFor="tipo-contrato" className="flex-1 cursor-pointer">
                  <div className="font-medium">Apenas Contrato</div>
                  <div className="text-sm text-muted-foreground">Gerar somente o documento de contrato para assinatura</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="contrato_boleto" id="tipo-contrato-boleto" />
                <Label htmlFor="tipo-contrato-boleto" className="flex-1 cursor-pointer">
                  <div className="font-medium">Contrato e Boletos</div>
                  <div className="text-sm text-muted-foreground">Gerar contrato e boletos de cobrança</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="boleto" id="tipo-boleto" />
                <Label htmlFor="tipo-boleto" className="flex-1 cursor-pointer">
                  <div className="font-medium">Apenas Boletos</div>
                  <div className="text-sm text-muted-foreground">Gerar somente boletos de cobrança, sem contrato</div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setTipoGeracaoSelecionado(true)}>Continuar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestao-contratos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Editar Contrato' : 'Novo Contrato'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {formData.tipo_geracao === 'contrato' && 'Apenas Contrato'}
            {formData.tipo_geracao === 'contrato_boleto' && 'Contrato e Boletos'}
            {formData.tipo_geracao === 'boleto' && 'Apenas Boletos'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setTipoGeracaoSelecionado(false)}>Alterar tipo</Button>
        </div>
      </div>

      {/* Feedback da busca */}
      <div className={`p-4 rounded-lg flex items-center gap-3 ${
        clienteEncontrado ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
      }`}>
        {clienteEncontrado ? (
          <>
            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Cliente encontrado: {formData.contratante_nome}</p>
              <p className="text-sm text-green-600 dark:text-green-400">CPF/CNPJ: {formData.contratante_cpf_cnpj}</p>
            </div>
          </>
        ) : (
          <>
            <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Novo contratante</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">CPF/CNPJ: {formData.contratante_cpf_cnpj}</p>
            </div>
          </>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
          setCpfVerificado(false);
          setCpfBusca('');
          setClienteEncontrado(null);
          setTipoGeracaoSelecionado(false);
          setFormData(prev => ({ ...prev, contratante_nome: '', contratante_cpf_cnpj: '', contratante_email: '', contratante_telefone: '', credor_cedrus: '' }));
        }}>
          Buscar outro CPF
        </Button>
      </div>

      {/* Seção 1: Dados do Contratante */}
      <SectionCard icon={UserCheck} title="Dados do Contratante" number={1}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Contratante *</Label>
            <Input value={formData.contratante_nome} onChange={(e) => updateField({ contratante_nome: e.target.value, nome: e.target.value })} placeholder="Nome completo" className={isFieldInvalid(formData.contratante_nome) ? 'border-destructive ring-destructive' : ''} />
            {isFieldInvalid(formData.contratante_nome) && <span className="text-sm text-destructive">Campo obrigatório</span>}
          </div>
          <div className="space-y-2">
            <Label>CPF/CNPJ *</Label>
            <Input
              value={formData.contratante_cpf_cnpj}
              onChange={(e) => { setCpfError(''); updateField({ contratante_cpf_cnpj: formatarCPFouCNPJ(e.target.value) }); }}
              onBlur={() => {
                const docLimpo = formData.contratante_cpf_cnpj.replace(/\D/g, '');
                if ((docLimpo.length === 11 || docLimpo.length === 14) && !validarCPFouCNPJ(docLimpo)) {
                  setCpfError(docLimpo.length === 11 ? 'CPF inválido' : 'CNPJ inválido');
                } else { setCpfError(''); }
              }}
              placeholder="000.000.000-00"
              readOnly={!!clienteEncontrado}
              className={`${clienteEncontrado ? 'bg-muted' : ''} ${isFieldInvalid(formData.contratante_cpf_cnpj) || cpfError ? 'border-destructive ring-destructive' : ''}`}
            />
            {isFieldInvalid(formData.contratante_cpf_cnpj) && <span className="text-sm text-destructive">Campo obrigatório</span>}
            {cpfError && !isFieldInvalid(formData.contratante_cpf_cnpj) && <span className="text-sm text-destructive">{cpfError}</span>}
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input type="email" value={formData.contratante_email} onChange={(e) => updateField({ contratante_email: e.target.value })} placeholder="email@exemplo.com" className={isFieldInvalid(formData.contratante_email) ? 'border-destructive ring-destructive' : ''} />
            {isFieldInvalid(formData.contratante_email) && <span className="text-sm text-destructive">Campo obrigatório</span>}
          </div>
          <div className="space-y-2">
            <Label>Telefone/WhatsApp *</Label>
            <Input value={formData.contratante_telefone} onChange={(e) => updateField({ contratante_telefone: e.target.value })} placeholder="(00) 00000-0000" className={isFieldInvalid(formData.contratante_telefone) ? 'border-destructive ring-destructive' : ''} />
            {isFieldInvalid(formData.contratante_telefone) && <span className="text-sm text-destructive">Campo obrigatório</span>}
          </div>
        </div>
      </SectionCard>

      {/* Seção 2: Endereço */}
      <SectionCard icon={MapPin} title="Endereço" number={2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="relative">
              <Input
                value={cepInput}
                onChange={(e) => setCepInput(formatarCEP(e.target.value))}
                placeholder="00000-000"
              />
              {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <span className="text-xs text-muted-foreground">Informe o CEP para busca automática</span>
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input value={formData.contratante_bairro} onChange={(e) => updateField({ contratante_bairro: e.target.value })} placeholder="Nome do bairro" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Endereço (Rua)</Label>
            <Input value={formData.contratante_endereco} onChange={(e) => updateField({ contratante_endereco: e.target.value })} placeholder="Rua Exemplo" />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input value={formData.contratante_numero} onChange={(e) => updateField({ contratante_numero: e.target.value })} placeholder="123" />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input value={formData.contratante_complemento} onChange={(e) => updateField({ contratante_complemento: e.target.value })} placeholder="Apto 101, Bloco B" />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={formData.contratante_cidade} onChange={(e) => updateField({ contratante_cidade: e.target.value })} placeholder="Nome da cidade" />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={formData.contratante_estado || "none"} onValueChange={(v) => updateField({ contratante_estado: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione</SelectItem>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Seção 3: Dados do Boleto */}
      <SectionCard icon={Receipt} title="Dados do Boleto" number={3}>
        <div className="space-y-6">
          {/* Credor e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credor *</Label>
              <Select value={formData.credor_cedrus} onValueChange={(value) => updateField({ credor_cedrus: value, projeto_id: '', modelo_contrato_id: '' })}>
                <SelectTrigger className={`text-left ${isFieldInvalid(formData.credor_cedrus) ? 'border-destructive ring-destructive' : ''}`}>
                  <SelectValue placeholder="Selecione o credor" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => <SelectItem key={c.credor_cedrus} value={c.credor_cedrus}>{c.nome_credor ? `${c.nome_credor} (${c.credor_cedrus})` : c.credor_cedrus}</SelectItem>)}
                </SelectContent>
              </Select>
              {isFieldInvalid(formData.credor_cedrus) && <span className="text-sm text-destructive">Campo obrigatório</span>}
            </div>
            {isContratoRequired && (
              <div className="space-y-2">
                <Label>Modelo de Contrato</Label>
                <Select value={formData.modelo_contrato_id || "none"} onValueChange={(v) => updateField({ modelo_contrato_id: v === "none" ? "" : v })} disabled={!formData.credor_cedrus}>
                  <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {modelos?.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Boleto fields */}
          {isBoletoRequired && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="md:col-span-2 space-y-2">
                <Label>Objeto do Contrato *</Label>
                <Input value={formData.objeto_contrato || ''} onChange={(e) => updateField({ objeto_contrato: e.target.value })} placeholder="Descrição do objeto do contrato" className={isBoletoRequired && isFieldInvalid(formData.objeto_contrato) ? 'border-destructive ring-destructive' : ''} />
                {isBoletoRequired && isFieldInvalid(formData.objeto_contrato) && <span className="text-sm text-destructive">Campo obrigatório</span>}
              </div>
              <div className="space-y-2">
                <Label>Valor do Boleto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input value={valorBoletoFormatado} onChange={(e) => { const f = formatCurrencyInput(e.target.value); setValorBoletoFormatado(f); updateField({ valor_boleto: parseCurrencyToNumber(f) }); }} placeholder="0,00" className={`pl-10 ${isBoletoRequired && isFieldInvalid(formData.valor_boleto) ? 'border-destructive ring-destructive' : ''}`} />
                </div>
                {isBoletoRequired && isFieldInvalid(formData.valor_boleto) && <span className="text-sm text-destructive">Campo obrigatório</span>}
              </div>
              <div className="space-y-2">
                <Label>Data do Primeiro Boleto *</Label>
                <Input type="date" value={formData.data_primeiro_boleto || ''} min={new Date().toISOString().split('T')[0]} onChange={(e) => updateField({ data_primeiro_boleto: e.target.value })} className={isBoletoRequired && isFieldInvalid(formData.data_primeiro_boleto) ? 'border-destructive ring-destructive' : ''} />
                {isBoletoRequired && isFieldInvalid(formData.data_primeiro_boleto) && <span className="text-sm text-destructive">Campo obrigatório</span>}
              </div>
              <div className="space-y-2">
                <Label>Número de Boletos *</Label>
                <Input type="number" min={1} value={formData.numero_boletos || 1} onChange={(e) => updateField({ numero_boletos: parseInt(e.target.value) || 1 })} className={isBoletoRequired && isFieldInvalid(formData.numero_boletos) ? 'border-destructive ring-destructive' : ''} />
                {isBoletoRequired && isFieldInvalid(formData.numero_boletos) && <span className="text-sm text-destructive">Campo obrigatório</span>}
              </div>
              <div className="space-y-2">
                <Label>Terá Desconto de Pontualidade?</Label>
                <div className="flex items-center gap-3">
                  <Switch checked={formData.tem_desconto_pontualidade || false} onCheckedChange={(checked) => updateField({ tem_desconto_pontualidade: checked, tipo_desconto: checked ? formData.tipo_desconto : undefined, valor_desconto: checked ? formData.valor_desconto : undefined, dias_antecedencia_desconto: checked ? formData.dias_antecedencia_desconto : undefined })} />
                  <span className="text-sm text-muted-foreground">{formData.tem_desconto_pontualidade ? 'Sim' : 'Não'}</span>
                </div>
              </div>
              {formData.tem_desconto_pontualidade && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Desconto *</Label>
                    <Select value={formData.tipo_desconto || "none"} onValueChange={(v) => updateField({ tipo_desconto: v === "none" ? undefined : v as TipoDesconto })}>
                      <SelectTrigger className={isBoletoRequired && formData.tem_desconto_pontualidade && isFieldInvalid(formData.tipo_desconto) ? 'border-destructive ring-destructive' : ''}>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="fixo">Fixo (R$)</SelectItem>
                        <SelectItem value="percentual">Percentual (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Desconto *</Label>
                    {formData.tipo_desconto === 'fixo' ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input value={valorDescontoFormatado} onChange={(e) => { const f = formatCurrencyInput(e.target.value); setValorDescontoFormatado(f); updateField({ valor_desconto: parseCurrencyToNumber(f) }); }} placeholder="0,00" className="pl-10" />
                      </div>
                    ) : (
                      <div className="relative">
                        <Input type="number" step="0.01" value={formData.valor_desconto || ''} onChange={(e) => updateField({ valor_desconto: parseFloat(e.target.value) || undefined })} placeholder="0" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de Antecedência *</Label>
                    <Input type="number" min={1} value={formData.dias_antecedencia_desconto || ''} onChange={(e) => updateField({ dias_antecedencia_desconto: parseInt(e.target.value) || undefined })} placeholder="Ex: 5" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Descrição e Observações */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={(e) => updateField({ descricao: e.target.value })} placeholder="Descrição do contrato..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => updateField({ observacoes: e.target.value })} placeholder="Observações adicionais..." rows={3} />
            </div>
          </div>

          {/* Projeto (Splits) - after Observações */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Projeto (Splits) *</Label>
              <Select value={formData.projeto_id || "none"} onValueChange={(v) => { updateField({ projeto_id: v === "none" ? "" : v }); setSplitsAdicionais([]); }} disabled={!formData.credor_cedrus}>
                <SelectTrigger className={isFieldInvalid(formData.projeto_id) ? 'border-destructive ring-destructive' : ''}>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione</SelectItem>
                  {projetos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {isFieldInvalid(formData.projeto_id) && <span className="text-sm text-destructive">Campo obrigatório</span>}
            </div>

            {/* Splits do projeto */}
            {projetoSplits.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Splits do Projeto
                  <Badge variant="outline" className="text-xs">{totalSplitPercentual.toFixed(1)}% alocado</Badge>
                </h4>
                <div className="space-y-2">
                  {projetoSplits.map((split, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-background border">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {split.tipo_cobranca === 'inadimplencia' ? 'Inadimplência' : 'Normal'}
                        </Badge>
                        <span className="text-xs">{beneficiariosProjeto?.find(b => b.wallet_id === split.wallet_id)?.nome || todosbeneficiariosAtivos?.find(b => b.wallet_id === split.wallet_id)?.nome || split.description || split.wallet_id}</span>
                      </div>
                      <span className="font-semibold">
                        {split.tipo_valor === 'percentualValue' 
                          ? `${split.valor}%${formData.valor_boleto ? ` (${formatCurrency(split.valor * formData.valor_boleto / 100)})` : ''}`
                          : formatCurrency(split.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Splits Adicionais - always visible when project is selected */}
            {formData.projeto_id && (
              <div className="space-y-3">
                {splitsAdicionais.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <h5 className="text-sm font-semibold text-muted-foreground">Splits Adicionais</h5>
                    {splitsAdicionais.map((split, idx) => (
                      <div key={idx} className="p-2 rounded bg-background border space-y-2">
                        <div className="flex items-center gap-2">
                          <Select value={split.beneficiario_id} onValueChange={(v) => handleUpdateSplitAdicional(idx, 'beneficiario_id', v)}>
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {beneficiariosProjeto?.filter(b => 
                                b.id === split.beneficiario_id || 
                                !splitsAdicionais.some((s, i) => i !== idx && s.beneficiario_id === b.id)
                              ).map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveSplitAdicional(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={split.description}
                            onChange={(e) => handleUpdateSplitAdicional(idx, 'description', e.target.value)}
                            className="flex-1 h-8 text-xs"
                            placeholder="Descrição (ex: Vendedor, Supervisor)"
                          />
                          <Select value={split.tipo_valor} onValueChange={(v) => handleUpdateSplitAdicional(idx, 'tipo_valor', v)}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentualValue">%</SelectItem>
                              <SelectItem value="fixedValue">R$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            value={split.valor || ''}
                            onChange={(e) => handleUpdateSplitAdicional(idx, 'valor', parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-xs"
                            placeholder="Valor"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

            {totalSplitPercentual > 100 && (
                  <p className="text-xs text-destructive font-medium">⚠ Total de splits percentuais excede 100%</p>
                )}
                {splitsExcedemLimite && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 space-y-1">
                    <p className="text-xs text-destructive font-medium">⚠ Total dos splits excede o valor disponível</p>
                    <p className="text-xs text-destructive/80">
                      Total splits: <strong>{formatCurrency(totalSplitsEmReais)}</strong> | 
                      Valor disponível: <strong>{formatCurrency(valorLiquidoDisponivel)}</strong>
                      {formData.tem_desconto_pontualidade && ' (já descontada pontualidade)'}
                      {' '}(Taxa Asaas: R$ 2,00)
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleAddSplitAdicional}
                  disabled={beneficiariosDisponiveis.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar mais beneficiários de split
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Seção 4: Vendedores */}
      <SectionCard icon={Users} title="Vendedores" number={4}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vincule vendedores ao contrato com o percentual de comissão de cada um.
          </p>

          {vendedores.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              {vendedores.map((vendedor, idx) => (
                <div key={idx} className="p-2 rounded bg-background border space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={vendedor.beneficiario_id}
                      onValueChange={(v) => {
                        const b = beneficiariosVendedores?.find(b => b.id === v);
                        setVendedores(prev => prev.map((vd, i) => i === idx ? {
                          ...vd,
                          beneficiario_id: v,
                          beneficiario_nome: b?.nome || ''
                        } : vd));
                      }}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {beneficiariosVendedores?.filter(b =>
                          b.id === vendedor.beneficiario_id ||
                          !vendedores.some((v, i) => i !== idx && v.beneficiario_id === b.id)
                        ).map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setVendedores(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={vendedor.description}
                      onChange={(e) => setVendedores(prev => prev.map((vd, i) => i === idx ? { ...vd, description: e.target.value } : vd))}
                      className="flex-1 h-8 text-xs"
                      placeholder="Descrição (ex: Vendedor principal)"
                    />
                    <div className="relative w-28">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={vendedor.percentual || ''}
                        onChange={(e) => setVendedores(prev => prev.map((vd, i) => i === idx ? { ...vd, percentual: parseFloat(e.target.value) || 0 } : vd))}
                        className="h-8 text-xs pr-6"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  {formData.valor_boleto && vendedor.percentual > 0 && (
                    <p className="text-xs text-muted-foreground pl-1">
                      Comissão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendedor.percentual * formData.valor_boleto / 100)} por boleto
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const primeiro = beneficiariosVendedores?.find(b => !vendedores.some(v => v.beneficiario_id === b.id));
              if (!primeiro) { toast.error('Nenhum vendedor disponível. Marque beneficiários como vendedor na tela de Beneficiários.'); return; }
              setVendedores(prev => [...prev, {
                beneficiario_id: primeiro.id,
                beneficiario_nome: primeiro.nome,
                percentual: 0,
                description: ''
              }]);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar vendedor
          </Button>
        </div>
      </SectionCard>

      {isContratoRequired && camposModelo && camposModelo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos do Modelo</CardTitle>
            <p className="text-sm text-muted-foreground">Preencha os campos personalizados definidos no modelo de contrato</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {camposModelo.map((campo) => {
                const opcoes = campo.opcoes?.split(',').map(o => o.trim()).filter(Boolean) || [];
                return (
                  <div key={campo.id} className={campo.tipo === 'textarea' || campo.tipo === 'multipla_escolha' || campo.tipo === 'radio' ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                    <Label>{campo.nome}{campo.obrigatorio && <span className="text-destructive ml-1">*</span>}</Label>
                    {campo.tipo === 'textarea' ? (
                      <Textarea value={camposValores[campo.id] || ''} onChange={(e) => setCamposValores(prev => ({ ...prev, [campo.id]: e.target.value }))} placeholder={campo.placeholder || ''} rows={3} />
                    ) : campo.tipo === 'boolean' ? (
                      <div className="flex items-center gap-3">
                        <Switch checked={camposValores[campo.id] === 'true'} onCheckedChange={(c) => setCamposValores(prev => ({ ...prev, [campo.id]: c ? 'true' : 'false' }))} />
                        <span className="text-sm text-muted-foreground">{camposValores[campo.id] === 'true' ? 'Sim' : 'Não'}</span>
                      </div>
                    ) : campo.tipo === 'multipla_escolha' ? (
                      <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-muted/30">
                        {opcoes.length > 0 ? opcoes.map((opcao) => {
                          const valores = (camposValores[campo.id] || '').split(',').map(v => v.trim());
                          const isChecked = valores.includes(opcao);
                          return (
                            <label key={opcao} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={isChecked} onCheckedChange={(checked) => {
                                const newValores = checked ? [...valores.filter(v => v), opcao] : valores.filter(v => v !== opcao);
                                setCamposValores(prev => ({ ...prev, [campo.id]: newValores.join(', ') }));
                              }} />
                              <span className="text-sm">{opcao}</span>
                            </label>
                          );
                        }) : <span className="text-sm text-muted-foreground">Nenhuma opção configurada</span>}
                      </div>
                    ) : campo.tipo === 'radio' ? (
                      <RadioGroup value={camposValores[campo.id] || ''} onValueChange={(v) => setCamposValores(prev => ({ ...prev, [campo.id]: v }))} className="flex flex-wrap gap-4">
                        {opcoes.length > 0 ? opcoes.map((opcao) => (
                          <div key={opcao} className="flex items-center gap-2">
                            <RadioGroupItem value={opcao} id={`${campo.id}-${opcao}`} />
                            <Label htmlFor={`${campo.id}-${opcao}`} className="text-sm font-normal cursor-pointer">{opcao}</Label>
                          </div>
                        )) : <span className="text-sm text-muted-foreground">Nenhuma opção configurada</span>}
                      </RadioGroup>
                    ) : (
                      <Input
                        type={campo.tipo === 'numero' || campo.tipo === 'moeda' ? 'number' : campo.tipo === 'data' ? 'date' : campo.tipo === 'email' ? 'email' : 'text'}
                        step={campo.tipo === 'moeda' ? '0.01' : undefined}
                        value={camposValores[campo.id] || ''}
                        onChange={(e) => setCamposValores(prev => ({ ...prev, [campo.id]: e.target.value }))}
                        placeholder={campo.placeholder || ''}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção 4: Resumo */}
      <SectionCard icon={ClipboardCheck} title="Resumo do Contrato" number={isBoletoRequired ? 4 : 3}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo:</span>
            <p className="font-medium">
              {formData.tipo_geracao === 'contrato' && 'Apenas Contrato'}
              {formData.tipo_geracao === 'contrato_boleto' && 'Contrato e Boletos'}
              {formData.tipo_geracao === 'boleto' && 'Apenas Boletos'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Credor:</span>
            <p className="font-medium">{formData.credor_cedrus || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Projeto:</span>
            <p className="font-medium">{getProjetoNome()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contratante:</span>
            <p className="font-medium">{formData.contratante_nome || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">CPF/CNPJ:</span>
            <p className="font-medium">{formData.contratante_cpf_cnpj || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">E-mail:</span>
            <p className="font-medium">{formData.contratante_email || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Telefone:</span>
            <p className="font-medium">{formData.contratante_telefone || '-'}</p>
          </div>
          {isBoletoRequired && (
            <>
              <div>
                <span className="text-muted-foreground">Valor do Boleto:</span>
                <p className="font-medium">{formData.valor_boleto ? formatCurrency(formData.valor_boleto) : '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nº Boletos:</span>
                <p className="font-medium">{formData.numero_boletos || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total:</span>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formData.valor_boleto && formData.numero_boletos ? formatCurrency(formData.valor_boleto * formData.numero_boletos) : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">1º Vencimento:</span>
                <p className="font-medium">{formData.data_primeiro_boleto || '-'}</p>
              </div>
              {formData.tem_desconto_pontualidade && (
                <div>
                  <span className="text-muted-foreground">Desconto:</span>
                  <p className="font-medium">
                    {formData.tipo_desconto === 'fixo' ? formatCurrency(formData.valor_desconto || 0) : `${formData.valor_desconto || 0}%`}
                    {' '}({formData.dias_antecedencia_desconto} dias antec.)
                  </p>
                </div>
              )}
            </>
          )}
          {formData.observacoes && (
            <div className="col-span-2 md:col-span-3">
              <span className="text-muted-foreground">Observações:</span>
              <p className="font-medium">{formData.observacoes}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Ações */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/gestao-contratos')}>Cancelar</Button>
        <Button onClick={handleSaveClick} size="lg">{isEditMode ? 'Salvar Alterações' : 'Criar Contrato'}</Button>
      </div>

      {/* Dialog Confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{isEditMode ? 'Confirmar Alterações do Contrato' : 'Confirmar Criação do Contrato'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Revise todos os dados abaixo antes de confirmar:</p>

                {/* Tipo e Credor */}
                <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Tipo de Geração</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Tipo:</span><p className="font-medium">
                      {formData.tipo_geracao === 'contrato' && 'Apenas Contrato'}
                      {formData.tipo_geracao === 'contrato_boleto' && 'Contrato e Boletos'}
                      {formData.tipo_geracao === 'boleto' && 'Apenas Boletos'}
                    </p></div>
                    <div><span className="text-muted-foreground">Credor:</span><p className="font-medium">{formData.credor_cedrus}</p></div>
                    <div><span className="text-muted-foreground">Projeto:</span><p className="font-medium">{getProjetoNome()}</p></div>
                    {formData.modelo_contrato_id && modelos && (
                      <div><span className="text-muted-foreground">Modelo:</span><p className="font-medium">{modelos.find(m => m.id === formData.modelo_contrato_id)?.nome || '-'}</p></div>
                    )}
                  </div>
                </div>

                {/* Contratante */}
                <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Dados do Contratante</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span><p className="font-medium">{formData.contratante_nome}</p></div>
                    <div><span className="text-muted-foreground">CPF/CNPJ:</span><p className="font-medium">{formData.contratante_cpf_cnpj}</p></div>
                    <div><span className="text-muted-foreground">E-mail:</span><p className="font-medium">{formData.contratante_email || '-'}</p></div>
                    <div><span className="text-muted-foreground">Telefone:</span><p className="font-medium">{formData.contratante_telefone || '-'}</p></div>
                  </div>
                </div>

                {/* Endereço */}
                {(formData.contratante_cep || formData.contratante_endereco || formData.contratante_cidade) && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Endereço</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {formData.contratante_cep && <div><span className="text-muted-foreground">CEP:</span><p className="font-medium">{formData.contratante_cep}</p></div>}
                      {formData.contratante_endereco && <div><span className="text-muted-foreground">Endereço:</span><p className="font-medium">{formData.contratante_endereco}{formData.contratante_numero ? `, ${formData.contratante_numero}` : ''}{formData.contratante_complemento ? ` - ${formData.contratante_complemento}` : ''}</p></div>}
                      {formData.contratante_bairro && <div><span className="text-muted-foreground">Bairro:</span><p className="font-medium">{formData.contratante_bairro}</p></div>}
                      {formData.contratante_cidade && <div><span className="text-muted-foreground">Cidade/UF:</span><p className="font-medium">{formData.contratante_cidade}{formData.contratante_estado ? `/${formData.contratante_estado}` : ''}</p></div>}
                    </div>
                  </div>
                )}

                {/* Dados do Boleto */}
                {isBoletoRequired && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Dados do Boleto</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {formData.objeto_contrato && <div className="col-span-2"><span className="text-muted-foreground">Objeto:</span><p className="font-medium">{formData.objeto_contrato}</p></div>}
                      <div><span className="text-muted-foreground">Valor do Boleto:</span><p className="font-medium">{formData.valor_boleto ? formatCurrency(formData.valor_boleto) : '-'}</p></div>
                      <div><span className="text-muted-foreground">Nº Boletos:</span><p className="font-medium">{formData.numero_boletos}</p></div>
                      <div><span className="text-muted-foreground">Valor Total:</span><p className="font-medium text-primary">{formData.valor_boleto && formData.numero_boletos ? formatCurrency(formData.valor_boleto * formData.numero_boletos) : '-'}</p></div>
                      <div><span className="text-muted-foreground">1º Vencimento:</span><p className="font-medium">{formData.data_primeiro_boleto || '-'}</p></div>
                      {formData.tem_desconto_pontualidade && (
                        <div className="col-span-2"><span className="text-muted-foreground">Desconto Pontualidade:</span><p className="font-medium">
                          {formData.tipo_desconto === 'fixo' ? formatCurrency(formData.valor_desconto || 0) : `${formData.valor_desconto || 0}%`}
                          {' '}({formData.dias_antecedencia_desconto} dias de antecedência)
                        </p></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Splits do Projeto */}
                {projetoSplits.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Splits do Projeto</h4>
                    <div className="space-y-1">
                      {projetoSplits.map((s, i) => {
                        const benefNome = beneficiariosProjeto?.find(b => b.wallet_id === s.wallet_id)?.nome || s.wallet_id;
                        const valorCalc = s.tipo_valor === 'percentualValue' && formData.valor_boleto
                          ? formatCurrency(s.valor * formData.valor_boleto / 100)
                          : s.tipo_valor === 'fixedValue' ? formatCurrency(s.valor) : '';
                        return (
                          <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0">
                            <span>{benefNome} <span className="text-muted-foreground">({s.description || 'Projeto'})</span></span>
                            <span className="font-medium">
                              {s.tipo_valor === 'percentualValue' ? `${s.valor}%` : formatCurrency(s.valor)}
                              {valorCalc && s.tipo_valor === 'percentualValue' && <span className="text-muted-foreground ml-1">({valorCalc})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Splits Adicionais */}
                {splitsAdicionais.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Splits Adicionais</h4>
                    <div className="space-y-1">
                      {splitsAdicionais.map((s, i) => {
                        const valorCalc = s.tipo_valor === 'percentualValue' && formData.valor_boleto
                          ? formatCurrency(s.valor * formData.valor_boleto / 100)
                          : s.tipo_valor === 'fixedValue' ? formatCurrency(s.valor) : '';
                        return (
                          <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0">
                            <span>{s.beneficiario_nome} <span className="text-muted-foreground">({s.description || 'Adicional'})</span></span>
                            <span className="font-medium">
                              {s.tipo_valor === 'percentualValue' ? `${s.valor}%` : formatCurrency(s.valor)}
                              {valorCalc && s.tipo_valor === 'percentualValue' && <span className="text-muted-foreground ml-1">({valorCalc})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Vendedores */}
                {vendedores.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Comissões de Vendedores</h4>
                    <div className="space-y-1">
                      {vendedores.map((v, i) => {
                        const valorCalc = formData.valor_boleto ? formatCurrency(v.percentual * formData.valor_boleto / 100) : '';
                        return (
                          <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-border/30 last:border-0">
                            <span>{v.beneficiario_nome} <span className="text-muted-foreground">({v.description || 'Vendedor'})</span></span>
                            <span className="font-medium">
                              {v.percentual}%
                              {valorCalc && <span className="text-muted-foreground ml-1">({valorCalc})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Total Splits */}
                {(projetoSplits.length > 0 || splitsAdicionais.length > 0 || vendedores.length > 0) && (
                  <div className="flex justify-between items-center text-sm font-semibold px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                    <span>Total Splits Percentuais</span>
                    <span className={totalSplitPercentual > 100 ? 'text-destructive' : 'text-primary'}>
                      {totalSplitPercentual.toFixed(2)}%
                      {formData.valor_boleto && <span className="ml-1 font-normal text-muted-foreground">({formatCurrency(totalSplitPercentual * formData.valor_boleto / 100)})</span>}
                    </span>
                  </div>
                )}

                {/* Descrição e Observações */}
                {(formData.descricao || formData.observacoes || formData.nome) && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Informações Adicionais</h4>
                    <div className="text-sm space-y-1">
                      {formData.nome && <div><span className="text-muted-foreground">Nome do Contrato:</span><p className="font-medium">{formData.nome}</p></div>}
                      {formData.descricao && <div><span className="text-muted-foreground">Descrição:</span><p className="font-medium">{formData.descricao}</p></div>}
                      {formData.observacoes && <div><span className="text-muted-foreground">Observações:</span><p className="font-medium">{formData.observacoes}</p></div>}
                    </div>
                  </div>
                )}

                {/* Campos personalizados do modelo */}
                {camposModelo && camposModelo.length > 0 && Object.keys(camposValores).some(k => camposValores[k]) && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Campos do Modelo</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {camposModelo.filter(c => camposValores[c.id]).map(campo => (
                        <div key={campo.id}>
                          <span className="text-muted-foreground">{campo.nome}:</span>
                          <p className="font-medium">{camposValores[campo.id]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e Editar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveConfirmed}>{isEditMode ? 'Confirmar e Salvar' : 'Confirmar e Criar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
