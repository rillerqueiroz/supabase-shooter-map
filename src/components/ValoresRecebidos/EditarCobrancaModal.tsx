import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ValorRecebido } from "@/hooks/useValoresRecebidosAsaas";
import { useUpdateValorRecebido, SplitItem } from "@/hooks/useValoresRecebidosMutation";
import { useCobrancaSplitsByIdentificador, useSaveCobrancaSplits } from "@/hooks/useCobrancaSplits";
import { useProjetosByCredor } from "@/hooks/useGestaoSplitsProjetos";
import { useBeneficiariosAtivos, useBeneficiariosVendedores } from "@/hooks/useGestaoSplitsBeneficiarios";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, X, Plus, Trash2, Settings, UserCheck, Percent, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useEffect, useMemo, useCallback } from "react";

const editarCobrancaSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").max(500, "Máximo 500 caracteres"),
  valor: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  vencimento: z.string().min(1, "Vencimento é obrigatório"),
  status: z.enum(['PENDING', 'RECEIVED_IN_CASH'], {
    errorMap: () => ({ message: "Selecione um status válido" })
  }),
  observacoes: z.string().max(1000, "Máximo 1000 caracteres").optional()
}).refine((data) => {
  if (data.status === 'PENDING') {
    const hoje = new Date().toISOString().split('T')[0];
    return data.vencimento >= hoje;
  }
  return true;
}, { message: "Para status 'A Vencer', a data deve ser hoje ou futura", path: ['vencimento'] });

type EditarCobrancaFormData = z.infer<typeof editarCobrancaSchema>;

interface LocalSplitItem {
  walletId: string;
  tipo: 'fixedValue' | 'percentualValue';
  valor: number;
  description: string;
}

interface EditarCobrancaModalProps {
  isOpen: boolean;
  onClose: () => void;
  registro: ValorRecebido | null;
}

const formatCurrencyBR = (value: number | null): string => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCentsToBRL = (cents: number): string => {
  const value = cents / 100;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const parseBRLToNumber = (formatted: string): number => {
  const digits = formatted.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};

interface DescontoPontualidade {
  value: number;
  limitDate: null;
  dueDateLimitDays: number;
  type: 'FIXED' | 'PERCENTAGE';
}

export function EditarCobrancaModal({ isOpen, onClose, registro }: EditarCobrancaModalProps) {
  const updateMutation = useUpdateValorRecebido();
  const saveCobrancaSplits = useSaveCobrancaSplits();
  const [editarSplits, setEditarSplits] = useState(false);
  const [splits, setSplits] = useState<LocalSplitItem[]>([]);
  const [vendedorSplits, setVendedorSplits] = useState<LocalSplitItem[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("");
  const [valorDisplay, setValorDisplay] = useState('');
  const [desconto, setDesconto] = useState<DescontoPontualidade>({
    value: 0, limitDate: null, dueDateLimitDays: 0, type: 'FIXED'
  });
  const [descontoDisplay, setDescontoDisplay] = useState('');
  const [editarDesconto, setEditarDesconto] = useState(false);

  const { data: projetosSplits } = useProjetosByCredor(registro?.credor_cedrus || undefined);
  const { data: beneficiarios } = useBeneficiariosAtivos();
  const { data: vendedores } = useBeneficiariosVendedores();
  const { data: splitsLocais } = useCobrancaSplitsByIdentificador(registro?.Identificador);

  // Beneficiários filtrados pelo credor (via projetos vinculados)
  const beneficiariosFiltrados = useMemo(() => {
    if (!beneficiarios || !projetosSplits) return beneficiarios || [];
    
    // Collect all wallet_ids from project splits for this creditor
    const walletIdsFromProjetos = new Set<string>();
    projetosSplits.forEach(p => {
      p.splits?.forEach(s => {
        if (s.wallet_id) walletIdsFromProjetos.add(s.wallet_id);
      });
    });

    // Filter beneficiaries to only those linked to creditor projects
    if (walletIdsFromProjetos.size === 0) return beneficiarios;
    return beneficiarios.filter(b => walletIdsFromProjetos.has(b.wallet_id));
  }, [beneficiarios, projetosSplits]);

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = parseISO(dateString);
      return format(date, "yyyy-MM-dd");
    } catch {
      return "";
    }
  };

  const parseSplits = (rawSplit: any): LocalSplitItem[] => {
    if (!rawSplit) return [];
    let splitArray = rawSplit;
    
    if (typeof rawSplit === 'string') {
      try { splitArray = JSON.parse(rawSplit); } 
      catch { return []; }
    }
    
    if (!Array.isArray(splitArray)) {
      splitArray = [splitArray];
    }
    
    return splitArray.map((s: any) => ({
      walletId: s.walletId || '',
      tipo: s.fixedValue ? 'fixedValue' : 'percentualValue',
      valor: s.fixedValue || s.percentualValue || 0,
      description: s.description || ''
    }));
  };

  // Carregar splits: priorizar tabela local, fallback para JSON
  useEffect(() => {
    if (splitsLocais && splitsLocais.length > 0) {
      const normalSplits: LocalSplitItem[] = [];
      const vSplits: LocalSplitItem[] = [];
      
      splitsLocais.forEach(s => {
        const item: LocalSplitItem = {
          walletId: s.wallet_id,
          tipo: s.tipo_valor,
          valor: s.tipo_valor === 'fixedValue' ? (s.fixedValue || 0) : (s.percentualValue || 0),
          description: s.description || ''
        };
        // Separate vendor splits by description
        if (s.description?.toLowerCase().includes('vendedor') || s.description?.toLowerCase().includes('supervisor')) {
          vSplits.push(item);
        } else {
          normalSplits.push(item);
        }
      });
      
      setSplits(normalSplits);
      setVendedorSplits(vSplits);
    } else if (registro?.split) {
      setSplits(parseSplits(registro.split));
      setVendedorSplits([]);
    } else {
      setSplits([]);
      setVendedorSplits([]);
    }
    setEditarSplits(false);
    setEditarDesconto(false);
    setProjetoSelecionado("");
  }, [registro, splitsLocais]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<EditarCobrancaFormData>({
    resolver: zodResolver(editarCobrancaSchema),
    defaultValues: {
      descricao: registro?.descricao || "",
      valor: registro?.valor || 0,
      vencimento: formatDateForInput(registro?.vencimento),
      status: (registro?.status === 'PENDING' || registro?.status === 'RECEIVED_IN_CASH') 
        ? registro.status as 'PENDING' | 'RECEIVED_IN_CASH'
        : 'PENDING',
      observacoes: ""
    }
  });

  useEffect(() => {
    if (registro) {
      setValue("descricao", registro.descricao || "");
      setValue("valor", registro.valor || 0);
      setValorDisplay(formatCurrencyBR(registro.valor || 0));
      setValue("vencimento", formatDateForInput(registro.vencimento));
      setValue("status", (registro.status === 'PENDING' || registro.status === 'RECEIVED_IN_CASH') 
        ? registro.status as 'PENDING' | 'RECEIVED_IN_CASH'
        : 'PENDING');
      setValue("observacoes", "");

      // Parse desconto
      if (registro.desconto_pontualidade) {
        try {
          const d = JSON.parse(registro.desconto_pontualidade);
          const descontoObj: DescontoPontualidade = {
            value: Number(d.value) || 0,
            limitDate: null,
            dueDateLimitDays: Number(d.dueDateLimitDays) || 0,
            type: d.type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED'
          };
          setDesconto(descontoObj);
          if (descontoObj.type === 'FIXED') {
            setDescontoDisplay(formatCurrencyBR(descontoObj.value));
          } else {
            setDescontoDisplay(String(descontoObj.value));
          }
        } catch {
          setDesconto({ value: 0, limitDate: null, dueDateLimitDays: 0, type: 'FIXED' });
          setDescontoDisplay('');
        }
      } else {
        setDesconto({ value: 0, limitDate: null, dueDateLimitDays: 0, type: 'FIXED' });
        setDescontoDisplay('');
      }
    }
  }, [registro, setValue]);

  const statusValue = watch("status");
  const valorCobranca = watch("valor");

  const handleValorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const cents = parseInt(raw || '0', 10);
    const numValue = cents / 100;
    setValorDisplay(formatCentsToBRL(cents));
    setValue("valor", numValue, { shouldValidate: true });
  }, [setValue]);

  const handleDescontoValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (desconto.type === 'FIXED') {
      const raw = e.target.value.replace(/\D/g, '');
      const cents = parseInt(raw || '0', 10);
      const numValue = cents / 100;
      setDescontoDisplay(formatCentsToBRL(cents));
      setDesconto(prev => ({ ...prev, value: numValue }));
    } else {
      const val = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
      setDescontoDisplay(val);
      setDesconto(prev => ({ ...prev, value: parseFloat(val) || 0 }));
    }
  }, [desconto.type]);

  const TAXA_COBRANCA = 2.00;

  const valorLiquidoDisponivel = useMemo(() => {
    if (!valorCobranca) return 0;
    let valorBase = valorCobranca;

    if (desconto.value > 0) {
      if (desconto.type === 'FIXED') {
        valorBase -= desconto.value;
      } else if (desconto.type === 'PERCENTAGE') {
        valorBase -= (desconto.value / 100) * valorCobranca;
      }
    }

    return Math.max(0, valorBase - TAXA_COBRANCA);
  }, [valorCobranca, desconto]);

  // Total de splits em R$
  const totalSplitsEmReais = useMemo(() => {
    const allSplits = [...splits, ...vendedorSplits];
    return allSplits.reduce((acc, s) => {
      if (!s.walletId) return acc;
      if (s.tipo === 'fixedValue') return acc + (s.valor || 0);
      if (s.tipo === 'percentualValue') return acc + ((s.valor || 0) / 100) * (valorCobranca || 0);
      return acc;
    }, 0);
  }, [splits, vendedorSplits, valorCobranca]);

  const splitsExcedemLimite = totalSplitsEmReais > valorLiquidoDisponivel && valorLiquidoDisponivel > 0;

  // Soma dos percentuais
  const somaPercentual = useMemo(() => {
    return [...splits, ...vendedorSplits]
      .filter(s => s.tipo === 'percentualValue')
      .reduce((acc, s) => acc + (s.valor || 0), 0);
  }, [splits, vendedorSplits]);

  const carregarSplitsDoProjeto = (projetoId: string) => {
    setProjetoSelecionado(projetoId);
    const projeto = projetosSplits?.find(p => p.id === projetoId);
    if (projeto?.splits) {
      const splitsNormais = projeto.splits.filter(s => s.tipo_cobranca === 'normal');
      setSplits(splitsNormais.map(s => ({
        walletId: s.wallet_id,
        tipo: s.tipo_valor,
        valor: s.valor,
        description: s.description || ''
      })));
    }
  };

  const addSplit = () => {
    setSplits([...splits, { walletId: '', tipo: 'percentualValue', valor: 0, description: '' }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: keyof LocalSplitItem, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  // Vendedor splits
  const addVendedorSplit = () => {
    setVendedorSplits([...vendedorSplits, { walletId: '', tipo: 'percentualValue', valor: 0, description: 'Vendedor' }]);
  };

  const removeVendedorSplit = (index: number) => {
    setVendedorSplits(vendedorSplits.filter((_, i) => i !== index));
  };

  const updateVendedorSplit = (index: number, field: keyof LocalSplitItem, value: any) => {
    const newSplits = [...vendedorSplits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setVendedorSplits(newSplits);
  };

  const getBeneficiarioNome = (walletId: string): string => {
    const beneficiario = beneficiarios?.find(b => b.wallet_id === walletId);
    return beneficiario?.nome || walletId;
  };

  const onSubmit = async (data: EditarCobrancaFormData) => {
    if (!registro) return;

    if (editarSplits && splitsExcedemLimite) {
      toast({
        title: "Splits excedem o limite",
        description: `O total dos splits (${formatCurrencyBR(totalSplitsEmReais)}) excede o valor disponível (${formatCurrencyBR(valorLiquidoDisponivel)})`,
        variant: "destructive"
      });
      return;
    }

    const allSplitsForPayload = [...splits, ...vendedorSplits];

    const payload: any = {
      Identificador: registro.Identificador,
      descricao: data.descricao,
      valor: data.valor,
      vencimento: data.vencimento,
      status: data.status,
      observacoes: data.observacoes,
      splits_editados: editarSplits,
      ...(editarDesconto ? { desconto_pontualidade: JSON.stringify(desconto) } : {})
    };

    if (editarSplits) {
      payload.split = allSplitsForPayload
        .filter(s => s.walletId)
        .map(s => ({
          walletId: s.walletId,
          ...(s.tipo === 'fixedValue' ? { fixedValue: s.valor } : { percentualValue: s.valor }),
          externalReference: registro.externalReference || undefined,
          description: s.description || undefined
        }));
    }

    try {
      const webhookPayload = {
        ...registro,
        ...payload,
        editadoEm: new Date().toISOString(),
        splitsEditados: editarSplits
      };
      
      const response = await fetch('https://n8n.superavit.app.br/webhook/2ddcbdbe-ce70-4878-99c8-22435ab5c126', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      const responseData = await response.json();
      
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0]?.retorno) {
        const retorno = responseData[0].retorno;
        if (retorno.toLowerCase().includes('erro')) {
          let errorMessage = "Erro desconhecido";
          try {
            const jsonMatch = retorno.match(/\{.*"errors".*\}/);
            if (jsonMatch) {
              const errorJson = JSON.parse(jsonMatch[0]);
              if (errorJson.errors && errorJson.errors.length > 0 && errorJson.errors[0].description) {
                errorMessage = errorJson.errors[0].description;
              }
            }
          } catch {
            errorMessage = "Não foi possível processar a edição";
          }
          
          toast({
            title: "Erro na edição",
            description: errorMessage,
            variant: "destructive"
          });
          return;
        }
      }

      if (!response.ok) {
        throw new Error('Erro ao enviar edição');
      }

      // Salvar splits na tabela local
      if (editarSplits && registro.Identificador) {
        const splitsParaSalvar = allSplitsForPayload
          .filter(s => s.walletId)
          .map(s => {
            const beneficiario = beneficiarios?.find(b => b.wallet_id === s.walletId);
            return {
              identificador: registro.Identificador,
              wallet_id: s.walletId,
              beneficiario_id: beneficiario?.id,
              tipo_valor: s.tipo as 'fixedValue' | 'percentualValue',
              percentualValue: s.tipo === 'percentualValue' ? s.valor : 0,
              fixedValue: s.tipo === 'fixedValue' ? s.valor : null,
              description: s.description || undefined,
              externalReference: registro.externalReference || undefined,
              origem: 'manual' as const
            };
          });
        
        await saveCobrancaSplits.mutateAsync({
          identificador: registro.Identificador,
          splits: splitsParaSalvar
        });
      }

      await updateMutation.reset();
      
      toast({
        title: "Edição enviada",
        description: "As alterações foram enviadas para processamento"
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      toast({
        title: "Erro ao enviar edição",
        description: error instanceof Error ? error.message : "Não foi possível enviar as alterações",
        variant: "destructive"
      });
    }
  };

  if (!registro) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Save className="h-5 w-5" />
            Editar Cobrança
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="editar-cobranca-form">
            {/* Nome do cliente (somente leitura) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Cliente</Label>
              <Input 
                value={registro.nome || "Não informado"} 
                disabled 
                className="bg-muted"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Descrição da cobrança"
                rows={3}
              />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            {/* Valor com formatação */}
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="text"
                inputMode="numeric"
                value={valorDisplay}
                onChange={handleValorChange}
                placeholder="R$ 0,00"
              />
              {errors.valor && (
                <p className="text-sm text-destructive">{errors.valor.message}</p>
              )}
            </div>

            {/* Vencimento */}
            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                {...register("vencimento")}
              />
              {errors.vencimento && (
                <p className="text-sm text-destructive">{errors.vencimento.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={statusValue} 
                onValueChange={(value) => setValue("status", value as 'PENDING' | 'RECEIVED_IN_CASH')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">A Vencer</SelectItem>
                  <SelectItem value="RECEIVED_IN_CASH">Recebido em Dinheiro</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                {...register("observacoes")}
                placeholder="Observações adicionais (opcional)"
                rows={2}
              />
              {errors.observacoes && (
                <p className="text-sm text-destructive">{errors.observacoes.message}</p>
              )}
            </div>

            {/* Desconto de Pontualidade */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Desconto de Pontualidade
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="editarDesconto"
                      checked={editarDesconto}
                      onCheckedChange={(checked) => setEditarDesconto(checked === true)}
                    />
                    <Label htmlFor="editarDesconto" className="text-sm cursor-pointer">
                      Editar desconto
                    </Label>
                  </div>
                </div>
              </CardHeader>

              {!editarDesconto && desconto.value > 0 && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-1">Desconto configurado:</p>
                  <div className="text-sm bg-muted/50 px-3 py-2 rounded">
                    <span className="font-medium">
                      {desconto.type === 'FIXED' 
                        ? formatCurrencyBR(desconto.value) 
                        : `${desconto.value}%`}
                    </span>
                    {desconto.dueDateLimitDays > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({desconto.dueDateLimitDays} dias antes do vencimento)
                      </span>
                    )}
                  </div>
                </CardContent>
              )}

              {editarDesconto && (
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select 
                        value={desconto.type} 
                        onValueChange={(value: 'FIXED' | 'PERCENTAGE') => {
                          setDesconto(prev => ({ ...prev, type: value, value: 0 }));
                          setDescontoDisplay(value === 'FIXED' ? 'R$ 0,00' : '0');
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                          <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {desconto.type === 'FIXED' ? 'Valor (R$)' : 'Percentual (%)'}
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-9"
                        value={descontoDisplay}
                        onChange={handleDescontoValueChange}
                        placeholder={desconto.type === 'FIXED' ? 'R$ 0,00' : '0'}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dias antes do vencimento</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-9"
                      value={desconto.dueDateLimitDays}
                      onChange={(e) => setDesconto(prev => ({ ...prev, dueDateLimitDays: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  {desconto.value > 0 && valorCobranca > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Desconto: {desconto.type === 'FIXED' 
                        ? formatCurrencyBR(desconto.value) 
                        : `${desconto.value}% = ${formatCurrencyBR((desconto.value / 100) * valorCobranca)}`}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Seção de Splits */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuração de Splits
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="editarSplits"
                      checked={editarSplits}
                      onCheckedChange={(checked) => setEditarSplits(checked === true)}
                    />
                    <Label htmlFor="editarSplits" className="text-sm cursor-pointer">
                      Editar splits
                    </Label>
                  </div>
                </div>
                {editarSplits && (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">⚠️</span>
                    <span>Ao editar esse split, você editará o de todas as outras cobranças. Concorda com essa edição?</span>
                  </div>
                )}
              </CardHeader>
              
              {!editarSplits && (splits.length > 0 || vendedorSplits.length > 0) && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-2">Splits configurados:</p>
                  <div className="space-y-1">
                    {[...splits, ...vendedorSplits].map((split, index) => (
                      <div key={index} className="text-sm bg-muted/50 px-3 py-2 rounded">
                        <span className="font-medium">{getBeneficiarioNome(split.walletId)}</span>
                        <span className="ml-2 text-muted-foreground">
                          {split.tipo === 'percentualValue' 
                            ? `${split.valor}%` 
                            : formatCurrencyBR(split.valor)}
                        </span>
                        {split.description && (
                          <span className="ml-2 text-muted-foreground">- {split.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {editarSplits && (
                <CardContent className="pt-0 space-y-4">
                  {/* Carregar de projeto */}
                  {projetosSplits && projetosSplits.length > 0 && (
                    <div className="space-y-2">
                      <Label>Carregar de projeto</Label>
                      <Select value={projetoSelecionado} onValueChange={carregarSplitsDoProjeto}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um projeto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projetosSplits.map(projeto => (
                            <SelectItem key={projeto.id} value={projeto.id}>
                              {projeto.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Lista de splits normais */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Splits do Projeto</Label>
                    {splits.map((split, index) => (
                      <SplitRow
                        key={`split-${index}`}
                        split={split}
                        index={index}
                        beneficiariosList={beneficiariosFiltrados}
                        onUpdate={updateSplit}
                        onRemove={removeSplit}
                        formatCurrency={formatCurrencyBR}
                        valorCobranca={valorCobranca}
                      />
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSplit}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Split
                  </Button>

                  {/* Vendedores */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Splits de Vendedores
                    </Label>
                    {vendedorSplits.map((split, index) => (
                      <Card key={`vendedor-${index}`} className="p-3">
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Label className="text-xs">Vendedor</Label>
                            <Select 
                              value={split.walletId} 
                              onValueChange={(value) => updateVendedorSplit(index, 'walletId', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {vendedores?.map(v => (
                                  <SelectItem key={v.id} value={v.wallet_id}>
                                    {v.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Tipo</Label>
                            <Select 
                              value={split.tipo} 
                              onValueChange={(value) => updateVendedorSplit(index, 'tipo', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentualValue">%</SelectItem>
                                <SelectItem value="fixedValue">R$</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Valor</Label>
                            <Input
                              type="number"
                              step={split.tipo === 'percentualValue' ? "0.1" : "0.01"}
                              min="0"
                              className="h-9"
                              value={split.valor}
                              onChange={(e) => updateVendedorSplit(index, 'valor', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              className="h-9"
                              value={split.description}
                              onChange={(e) => updateVendedorSplit(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              onClick={() => removeVendedorSplit(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {split.valor > 0 && split.tipo === 'percentualValue' && valorCobranca > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 pl-1">
                            = {formatCurrencyBR((split.valor / 100) * valorCobranca)}
                          </p>
                        )}
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVendedorSplit}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Vendedor
                    </Button>
                  </div>

                  {/* Resumo */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor da cobrança:</span>
                      <span className="font-medium">{formatCurrencyBR(valorCobranca)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa Asaas:</span>
                      <span className="font-medium text-destructive">- {formatCurrencyBR(TAXA_COBRANCA)}</span>
                    </div>
                    {desconto.value > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Desconto pontualidade:</span>
                        <span className="font-medium text-destructive">
                          - {desconto.type === 'FIXED' 
                            ? formatCurrencyBR(desconto.value) 
                            : formatCurrencyBR((desconto.value / 100) * valorCobranca)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Disponível para splits:</span>
                      <span className="font-medium">{formatCurrencyBR(valorLiquidoDisponivel)}</span>
                    </div>
                    <div className={`flex justify-between ${splitsExcedemLimite ? 'text-destructive' : ''}`}>
                      <span>Total splits:</span>
                      <span className="font-medium">{formatCurrencyBR(totalSplitsEmReais)}</span>
                    </div>
                  </div>

                  {somaPercentual > 100 && (
                    <p className="text-sm text-destructive">
                      A soma dos percentuais não pode ultrapassar 100%
                    </p>
                  )}

                  {splitsExcedemLimite && (
                    <p className="text-sm text-destructive">
                      O total dos splits excede o valor disponível (descontando taxa e desconto de pontualidade)
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          </form>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="editar-cobranca-form"
            disabled={isSubmitting || updateMutation.isPending || (editarSplits && (somaPercentual > 100 || splitsExcedemLimite))}
          >
            {(isSubmitting || updateMutation.isPending) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for split rows
function SplitRow({ 
  split, index, beneficiariosList, onUpdate, onRemove, formatCurrency, valorCobranca 
}: { 
  split: LocalSplitItem; 
  index: number; 
  beneficiariosList: any[];
  onUpdate: (i: number, field: keyof LocalSplitItem, value: any) => void;
  onRemove: (i: number) => void;
  formatCurrency: (v: number) => string;
  valorCobranca: number;
}) {
  return (
    <Card className="p-3">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <Label className="text-xs">Beneficiário</Label>
          <Select 
            value={split.walletId} 
            onValueChange={(value) => onUpdate(index, 'walletId', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {beneficiariosList?.map((b: any) => (
                <SelectItem key={b.id} value={b.wallet_id}>
                  {b.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Tipo</Label>
          <Select 
            value={split.tipo} 
            onValueChange={(value) => onUpdate(index, 'tipo', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentualValue">%</SelectItem>
              <SelectItem value="fixedValue">R$</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Valor</Label>
          <Input
            type="number"
            step={split.tipo === 'percentualValue' ? "0.1" : "0.01"}
            min="0"
            className="h-9"
            value={split.valor}
            onChange={(e) => onUpdate(index, 'valor', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Descrição</Label>
          <Input
            className="h-9"
            placeholder="Opcional"
            value={split.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
          />
        </div>
        <div className="col-span-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {split.valor > 0 && split.tipo === 'percentualValue' && valorCobranca > 0 && (
        <p className="text-xs text-muted-foreground mt-1 pl-1">
          = {formatCurrency((split.valor / 100) * valorCobranca)}
        </p>
      )}
    </Card>
  );
}
