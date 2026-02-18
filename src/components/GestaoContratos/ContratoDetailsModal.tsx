import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, DollarSign, User, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, Clock, Loader2, Eye, Download, Camera, RefreshCw, AlertTriangle, Trash2, ExternalLink, Edit, FileDown, Ban, Users, Percent } from 'lucide-react';
import { exportContratoPDF } from '@/utils/exportContratoPDF';
import { DetalhesModal } from '@/components/ValoresRecebidos/DetalhesModal';
import { supabase } from '@/lib/supabase';
import { useVendedoresByContrato } from '@/hooks/useVendedoresContratos';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Contrato, ContratoEtapa, ContratoSplit } from '@/hooks/useGestaoContratos';
import { ValorRecebido } from '@/hooks/useValoresRecebidosAsaas';
import { toast } from 'sonner';

// Interface para dados do documento ZapSign
interface Signer {
  name: string;
  email: string;
  phone_number: string;
  status: 'signed' | 'new' | 'pending' | string;
  sign_url: string;
  signed_at: string | null;
  last_view_at: string | null;
  times_viewed: number;
  geo_latitude: string | null;
  geo_longitude: string | null;
  signature_image: string | null;
  selfie_photo_url: string | null;
  ip: string | null;
}

interface DocumentData {
  name: string;
  status: string;
  folder_path: string;
  original_file: string;
  signed_file: string;
  created_at: string;
  last_update_at: string;
  created_by: { email: string };
  signers: Signer[];
  token: string;
  use_timestamp: boolean;
  deleted?: boolean;
  deleted_at?: string | null;
}

const WEBHOOK_URL = 'https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/consulta-documento-zapsign';

interface ContratoDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: Contrato | null;
  etapas?: ContratoEtapa[];
  onEdit?: (contrato: Contrato) => void;
}

// Hook para buscar cobranças vinculadas pelo externalReference
// Só busca quando cobranca_status for "sucesso"
function useCobrancasVinculadas(externalReference: string | undefined, cobrancaStatus: string | undefined) {
  
  return useQuery({
    queryKey: ['cobrancas-vinculadas', externalReference, cobrancaStatus],
    queryFn: async () => {
      if (!externalReference) return [];
      
      console.info('🔍 Buscando cobranças para identificador:', externalReference);
      
      const { data, error } = await supabase
        .from('valores_totais_recebidos_asaas')
        .select('*')
        .eq('externalReference', externalReference)
        .order('vencimento', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar cobranças vinculadas:', error);
        throw error;
      }
      
      console.info('✅ Cobranças encontradas:', data?.length || 0);
      return data as ValorRecebido[];
    },
    enabled: !!externalReference
  });
}

export function ContratoDetailsModal({ open, onOpenChange, contrato, etapas, onEdit }: ContratoDetailsModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [gerandoContrato, setGerandoContrato] = useState(false);
  const [loadingDocumento, setLoadingDocumento] = useState(false);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingBoletos, setCancelingBoletos] = useState(false);
  const [cancelProgress, setCancelProgress] = useState<{ current: number; total: number; results: { id: string; desc: string; success: boolean }[] }>({ current: 0, total: 0, results: [] });
  const [selectedCobranca, setSelectedCobranca] = useState<ValorRecebido | null>(null);
  
  const { data: cobrancas, isLoading: isLoadingCobrancas } = useCobrancasVinculadas(contrato?.externalReference, contrato?.cobranca_status);
  const { data: vendedoresContrato } = useVendedoresByContrato(contrato?.id);

  // Buscar todos os splits do contrato via gestao_splits_cobrancas_splits
  const { data: cobrancaSplits } = useQuery({
    queryKey: ['cobranca-splits-contrato', contrato?.externalReference],
    queryFn: async () => {
      if (!contrato?.externalReference) return [];
      const { data, error } = await supabase
        .from('gestao_splits_cobrancas_splits')
        .select(`
          *,
          beneficiario:gestao_splits_beneficiarios!beneficiario_id(id, nome, wallet_id)
        `)
        .eq('externalReference', contrato.externalReference)
        .order('origem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!contrato?.externalReference
  });

  const etapaAtual = useMemo(() => {
    if (!contrato?.etapa_atual_id || !etapas) return null;
    return etapas.find(e => e.id === contrato.etapa_atual_id);
  }, [contrato?.etapa_atual_id, etapas]);

  const canShowStatusContrato = contrato?.contrato_status === 'sucesso' && contrato?.contrato_id_externo;

  // Buscar documento automaticamente quando modal abre e contrato está gerado
  useEffect(() => {
    if (open && canShowStatusContrato && !documentData) {
      fetchDocumentData();
    }
  }, [open, canShowStatusContrato]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDateFull = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string | null, deleted?: boolean) => {
    if (deleted) {
      return <Badge variant="destructive" className="gap-1"><Trash2 className="h-3 w-3" /> Apagada</Badge>;
    }
    switch (status) {
      case 'RECEIVED':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Recebido</Badge>;
      case 'RECEIVED_IN_CASH':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Recebido em Dinheiro</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Vencida</Badge>;
      default:
        return <Badge variant="secondary">{status || '-'}</Badge>;
    }
  };

  const getSignerStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle className="h-3 w-3" /> Assinado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'new':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aguardando</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string, deleted?: boolean) => {
    if (deleted) {
      return <Badge variant="destructive" className="gap-1 text-sm"><Trash2 className="h-3 w-3" /> APAGADO</Badge>;
    }
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle className="h-3 w-3" /> Concluído</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Totais das cobranças
  const totaisCobrancas = useMemo(() => {
    if (!cobrancas || cobrancas.length === 0) return { total: 0, recebido: 0, pendente: 0 };
    
    return cobrancas.reduce((acc, c) => ({
      total: acc.total + (c.valor || 0),
      recebido: acc.recebido + (c.status === 'RECEIVED' || c.status === 'RECEIVED_IN_CASH' ? (c.valor || 0) : 0),
      pendente: acc.pendente + (c.status === 'PENDING' || c.status === 'OVERDUE' ? (c.valor || 0) : 0)
    }), { total: 0, recebido: 0, pendente: 0 });
  }, [cobrancas]);

  // Handler para gerar cobrança
  const handleGerarCobranca = async () => {
    if (!contrato) return;

    // Validar data não inferior a hoje
    if (contrato.data_primeiro_boleto) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataBoleto = new Date(contrato.data_primeiro_boleto + 'T00:00:00');
      if (dataBoleto < hoje) {
        toast.error('A data do primeiro boleto não pode ser inferior a hoje. Edite o contrato para corrigir.');
        return;
      }
    }
    
    setGerandoCobranca(true);
    try {
      const payload = {
        contrato_id: contrato.id,
        "externalReference": contrato.externalReference,
        contratante_nome: contrato.contratante_nome,
        contratante_cpf_cnpj: contrato.contratante_cpf_cnpj,
        contratante_email: contrato.contratante_email,
        contratante_telefone: contrato.contratante_telefone,
        credor_cedrus: contrato.credor_cedrus,
        projeto_id: contrato.projeto_id,
        valor_boleto: contrato.valor_boleto,
        valor_total: contrato.valor_total,
        numero_boletos: contrato.numero_boletos,
        data_primeiro_boleto: contrato.data_primeiro_boleto,
        objeto_contrato: contrato.objeto_contrato,
        tipo_geracao: contrato.tipo_geracao,
        tem_desconto_pontualidade: contrato.tem_desconto_pontualidade,
        tipo_desconto: contrato.tipo_desconto,
        valor_desconto: contrato.valor_desconto,
        dias_antecedencia_desconto: contrato.dias_antecedencia_desconto,
      };

      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cria-cobranca-geral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.retorno === 'erro') {
        toast.error(data?.descricao || 'Erro ao gerar cobrança');
        return;
      }

      toast.success(data?.message || data?.descricao || 'Cobrança gerada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['cobrancas-vinculadas'] });
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
    } catch (error: any) {
      console.error('Erro ao gerar cobrança:', error);
      toast.error('Erro ao gerar cobrança', {
        description: error.message || 'Erro na comunicação com o servidor'
      });
    } finally {
      setGerandoCobranca(false);
    }
  };

  // Buscar dados do documento ZapSign
  const fetchDocumentData = async () => {
    if (!contrato?.contrato_id_externo) return;
    
    setLoadingDocumento(true);
    setDocumentError(null);
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: contrato.contrato_id_externo }),
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();
      const doc = Array.isArray(data) ? data[0] : data;
      setDocumentData(doc);
    } catch (err) {
      console.error('Erro ao buscar documento:', err);
      setDocumentError(err instanceof Error ? err.message : 'Erro ao buscar documento');
      toast.error('Erro ao buscar informações do documento');
    } finally {
      setLoadingDocumento(false);
    }
  };

  // Handler para cancelar boletos
  const handleCancelarBoletos = async () => {
    if (!contrato || !cobrancas || cobrancas.length === 0) return;
    setCancelingBoletos(true);
    const cobrancasAtivas = cobrancas.filter(c => !(c as any).deleted);
    setCancelProgress({ current: 0, total: cobrancasAtivas.length, results: [] });
    
    try {
      for (let i = 0; i < cobrancasAtivas.length; i++) {
        const c = cobrancasAtivas[i];
        const payload = {
          cobrancas: [{
            Identificador: c.Identificador,
            "externalReference": c.externalReference,
            nome: c.nome,
            credor_cedrus: c.credor_cedrus
          }]
        };

        let success = true;
        try {
          const response = await fetch('https://n8n.superavit.app.br/webhook/cancela-boletos-asaas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) success = false;
        } catch {
          success = false;
        }

        setCancelProgress(prev => ({
          ...prev,
          current: i + 1,
          results: [...prev.results, { id: c.Identificador, desc: c.descricao || c.nome || c.Identificador, success }]
        }));

        if (i < cobrancasAtivas.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(`${cobrancasAtivas.length} cobrança(s) processada(s)!`);
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
      queryClient.invalidateQueries({ queryKey: ['cobrancas-vinculadas'] });
    } catch (error: any) {
      console.error('Erro ao cancelar boletos:', error);
      toast.error('Erro ao cancelar boletos', { description: error.message });
    } finally {
      setCancelingBoletos(false);
    }
  };

  if (!contrato) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Contrato
          </DialogTitle>
          <DialogDescription className="sr-only">
            Informações do contrato, cobranças vinculadas e status do documento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Identificador e Status */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ID:</span>
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{contrato.externalReference}</code>
              </div>
              {etapaAtual && (
                <Badge style={{ backgroundColor: `${etapaAtual.cor}20`, color: etapaAtual.cor, borderColor: `${etapaAtual.cor}50` }}>
                  {etapaAtual.nome}
                </Badge>
              )}
              {contrato.cobranca_gerada && (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Cobrança Gerada
                </Badge>
              )}
              {contrato.contrato_assinado && (
                <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Contrato Assinado
                </Badge>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    exportContratoPDF(contrato, cobrancas || []);
                    toast.success('PDF gerado com sucesso!');
                  }}
                >
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </Button>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(contrato);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Informações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informações do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{contrato.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credor:</span>
                    <span className="font-medium">{contrato.credor_cedrus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Total:</span>
                    <span className="font-medium text-green-600">
                      {contrato.valor_total 
                        ? formatCurrency(contrato.valor_total) 
                        : contrato.valor_boleto && contrato.numero_boletos 
                          ? formatCurrency(contrato.valor_boleto * contrato.numero_boletos)
                          : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcelas:</span>
                    <span className="font-medium">{contrato.numero_boletos}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em:</span>
                    <span className="font-medium">{formatDate(contrato.created_at)}</span>
                  </div>
                  {contrato.descricao && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Descrição:</span>
                      <p className="mt-1 text-foreground">{contrato.descricao}</p>
                    </div>
                  )}
                  {contrato.observacoes && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Observações:</span>
                      <p className="mt-1 text-foreground">{contrato.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Contratante
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{contrato.contratante_nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF/CNPJ:</span>
                    <span className="font-medium font-mono">{contrato.contratante_cpf_cnpj || '-'}</span>
                  </div>
                  {contrato.contratante_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span>{contrato.contratante_email}</span>
                    </div>
                  )}
                  {contrato.contratante_telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{contrato.contratante_telefone}</span>
                    </div>
                  )}
                  {(contrato.contratante_endereco || contrato.contratante_bairro || contrato.contratante_cidade) && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div>
                          {contrato.contratante_endereco && <p>{contrato.contratante_endereco}</p>}
                          {contrato.contratante_bairro && <p>{contrato.contratante_bairro}</p>}
                          {(contrato.contratante_cidade || contrato.contratante_estado) && (
                            <p>{[contrato.contratante_cidade, contrato.contratante_estado].filter(Boolean).join(' - ')}</p>
                          )}
                          {contrato.contratante_cep && <p>CEP: {contrato.contratante_cep}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* === SEÇÃO DE SPLITS E COMISSÕES === */}
            {cobrancaSplits && cobrancaSplits.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Splits e Comissões
                  </h3>

                  <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                    {/* Splits do Projeto */}
                    {(() => {
                      const projetoItems = cobrancaSplits.filter((s: any) => s.origem === 'projeto');
                      if (projetoItems.length === 0) return null;
                      const getSplitValue = (s: any) => s.tipo_valor === 'fixedValue' ? (s.fixedValue || 0) : (s.percentualValue || 0);
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Percent className="h-3.5 w-3.5" />
                            Splits do Projeto
                            {contrato.projeto?.nome && (
                              <span className="font-normal text-xs text-muted-foreground">({contrato.projeto.nome})</span>
                            )}
                          </h4>
                          {projetoItems.map((split: any) => {
                            const isPercentual = split.tipo_valor === 'percentualValue';
                            const valor = getSplitValue(split);
                            const valorCalculado = isPercentual && contrato.valor_boleto
                              ? (valor / 100) * contrato.valor_boleto
                              : null;
                            return (
                              <div key={split.id} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-medium">{split.beneficiario?.nome || split.wallet_id}</p>
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                  {split.tipo_cobranca && split.tipo_cobranca !== 'normal' && (
                                    <Badge variant="outline" className="text-[10px] mt-1">{split.tipo_cobranca}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {isPercentual ? `${valor}%` : formatCurrency(valor)}
                                  </Badge>
                                  {valorCalculado !== null && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      = {formatCurrency(valorCalculado)}/boleto
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Splits Adicionais / Comissões */}
                    {(() => {
                      const adicionaisItems = cobrancaSplits.filter((s: any) => s.origem === 'adicional');
                      if (adicionaisItems.length === 0) return null;
                      const getSplitValue = (s: any) => s.tipo_valor === 'fixedValue' ? (s.fixedValue || 0) : (s.percentualValue || 0);
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Splits Adicionais / Comissões
                          </h4>
                          {adicionaisItems.map((split: any) => {
                            const isPercentual = split.tipo_valor === 'percentualValue';
                            const valor = getSplitValue(split);
                            const valorCalculado = isPercentual && contrato.valor_boleto
                              ? (valor / 100) * contrato.valor_boleto
                              : null;
                            return (
                              <div key={split.id} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-medium">{split.beneficiario?.nome || split.wallet_id}</p>
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {isPercentual ? `${valor}%` : formatCurrency(valor)}
                                  </Badge>
                                  {valorCalculado !== null && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      = {formatCurrency(valorCalculado)}/boleto
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Splits Manuais */}
                    {(() => {
                      const manuaisItems = cobrancaSplits.filter((s: any) => s.origem === 'manual');
                      if (manuaisItems.length === 0) return null;
                      const getSplitValue = (s: any) => s.tipo_valor === 'fixedValue' ? (s.fixedValue || 0) : (s.percentualValue || 0);
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5" />
                            Splits Manuais
                          </h4>
                          {manuaisItems.map((split: any) => {
                            const isPercentual = split.tipo_valor === 'percentualValue';
                            const valor = getSplitValue(split);
                            const valorCalculado = isPercentual && contrato.valor_boleto
                              ? (valor / 100) * contrato.valor_boleto
                              : null;
                            return (
                              <div key={split.id} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-medium">{split.beneficiario?.nome || split.wallet_id}</p>
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {isPercentual ? `${valor}%` : formatCurrency(valor)}
                                  </Badge>
                                  {valorCalculado !== null && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      = {formatCurrency(valorCalculado)}/boleto
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Totalizador */}
                    {(() => {
                      const totalPerc = cobrancaSplits
                        .filter((s: any) => s.tipo_valor === 'percentualValue')
                        .reduce((acc: number, s: any) => acc + Number(s.percentualValue || 0), 0);
                      if (totalPerc === 0) return null;
                      const totalValor = contrato.valor_boleto ? (totalPerc / 100) * contrato.valor_boleto : null;
                      return (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Total de Splits Percentuais</span>
                            <div className="flex items-center gap-3">
                              <Badge variant={totalPerc > 100 ? "destructive" : "default"} className="text-sm">
                                {totalPerc.toFixed(1)}%
                              </Badge>
                              {totalValor !== null && (
                                <span className="text-sm font-medium">
                                  = {formatCurrency(totalValor)}/boleto
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Seção: Cobranças Vinculadas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cobranças Vinculadas
              </h3>

              {isLoadingCobrancas ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : cobrancas && cobrancas.length > 0 ? (
                <>
                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">{formatCurrency(totaisCobrancas.total)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-500/10">
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-green-600">Recebido</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totaisCobrancas.recebido)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-500/10">
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-yellow-600">Pendente</p>
                        <p className="text-lg font-bold text-yellow-600">{formatCurrency(totaisCobrancas.pendente)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[45%]">Descrição</TableHead>
                          <TableHead className="w-[13%]">Vencimento</TableHead>
                          <TableHead className="w-[13%]">Pagamento</TableHead>
                          <TableHead className="text-right w-[14%]">Valor</TableHead>
                          <TableHead className="w-[15%]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cobrancas.map((cobranca) => (
                          <TableRow 
                            key={cobranca.Identificador} 
                            className={`cursor-pointer hover:bg-muted/50 ${(cobranca as any).deleted ? 'opacity-60' : ''}`}
                            onClick={() => setSelectedCobranca(cobranca)}
                          >
                            <TableCell className="font-medium">
                              <span className="line-clamp-2">{cobranca.descricao || cobranca.nome || '-'}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(cobranca.vencimento)}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(cobranca.data_pagamento)}</TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(cobranca.valor)}</TableCell>
                            <TableCell>{getStatusBadge(cobranca.status, (cobranca as any).deleted)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Botão Cancelar Boletos */}
                  {contrato.cobranca_gerada && (
                    <div className="flex justify-end">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="gap-2"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        <Ban className="h-4 w-4" />
                        Cancelar Boletos
                      </Button>
                    </div>
                  )}
                </>
              ) : !contrato.cobranca_gerada ? (
                <Card className="bg-muted/30">
                  <CardContent className="py-8 text-center space-y-4">
                    <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
                    <div>
                      <p className="text-muted-foreground font-medium">Cobrança ainda não foi gerada</p>
                      <p className="text-xs text-muted-foreground mt-1">Gere a cobrança para visualizar os boletos vinculados</p>
                    </div>
                    <Button 
                      onClick={handleGerarCobranca} 
                      disabled={gerandoCobranca}
                      className="gap-2"
                    >
                      {gerandoCobranca ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Gerar Cobrança
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma cobrança encontrada</p>
                    <p className="text-xs mt-1">Identificador: {contrato.externalReference}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Seção: Status do Contrato ZapSign - Ocultar quando tipo_geracao é apenas boletos */}
            {contrato.tipo_geracao !== 'boleto' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Status do Contrato
              </h3>

              {!canShowStatusContrato ? (
                <Card className="bg-muted/30">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Contrato ainda não foi gerado no ZapSign</p>
                    <p className="text-xs mt-1 mb-4">Gere o contrato para visualizar o status</p>
                    <Button 
                      onClick={async () => {
                        if (!contrato) return;
                        setGerandoContrato(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('gerar-contrato-zapsign', {
                            body: { contrato_id: contrato.id }
                          });
                          if (error) throw error;
                          toast.success(data.message || 'Contrato gerado com sucesso!');
                          queryClient.invalidateQueries({ queryKey: ['contratos'] });
                          queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
                        } catch (error: any) {
                          console.error('Erro ao gerar contrato:', error);
                          toast.error('Erro ao gerar contrato', {
                            description: error.message || 'Erro na comunicação com o servidor'
                          });
                        } finally {
                          setGerandoContrato(false);
                        }
                      }}
                      disabled={gerandoContrato}
                      className="gap-2"
                    >
                      {gerandoContrato ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Gerar Contrato
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : loadingDocumento ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : documentError ? (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                  <p className="text-destructive mb-4">{documentError}</p>
                  <Button onClick={fetchDocumentData} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Tentar Novamente
                  </Button>
                </div>
              ) : documentData ? (
                <div className="space-y-6">
                  {/* Alerta de Documento Apagado */}
                  {documentData.deleted && (
                    <Alert variant="destructive" className="border-2 border-destructive bg-destructive/10">
                      <AlertTriangle className="h-5 w-5" />
                      <AlertTitle className="text-lg font-bold flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        DOCUMENTO APAGADO
                      </AlertTitle>
                      <AlertDescription className="mt-2 text-base">
                        Este documento foi excluído do ZapSign em{' '}
                        <strong>{documentData.deleted_at ? formatDateFull(documentData.deleted_at) : 'data desconhecida'}</strong>.
                        <br />
                        Os links de assinatura não estão mais disponíveis.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Informações do Documento */}
                  <Card className={documentData.deleted ? 'opacity-75 border-destructive' : ''}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Informações do Documento</span>
                        {getDocumentStatusBadge(documentData.status, documentData.deleted)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nome do Documento</p>
                          <p className="font-medium">{documentData.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pasta</p>
                          <p className="font-medium text-sm">{documentData.folder_path || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Criado em</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDateFull(documentData.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Última Atualização</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDateFull(documentData.last_update_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Criado por</p>
                          <p className="font-medium flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {documentData.created_by?.email || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Carimbo de Tempo</p>
                          <p className="font-medium">{documentData.use_timestamp ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex flex-wrap gap-2">
                        {documentData.original_file && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={documentData.original_file} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Original
                            </a>
                          </Button>
                        )}
                        {documentData.signed_file && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={documentData.signed_file} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Baixar Assinado
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Signatários */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Signatários ({documentData.signers?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {documentData.signers?.map((signer, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-lg">{signer.name}</p>
                                <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                                  {signer.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {signer.email}
                                    </span>
                                  )}
                                  {signer.phone_number && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {signer.phone_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {getSignerStatusBadge(signer.status)}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Visualizações</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {signer.times_viewed}x
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Última Visualização</p>
                                <p className="font-medium">{signer.last_view_at ? formatDateFull(signer.last_view_at) : '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Assinado em</p>
                                <p className="font-medium">{signer.signed_at ? formatDateFull(signer.signed_at) : '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">IP</p>
                                <p className="font-medium">{signer.ip || '-'}</p>
                              </div>
                            </div>

                            {(signer.geo_latitude && signer.geo_longitude) && (
                              <div className="text-sm">
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Localização
                                </p>
                                <p className="font-medium">
                                  {signer.geo_latitude}, {signer.geo_longitude}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {signer.sign_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={signer.sign_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Link de Assinatura
                                  </a>
                                </Button>
                              )}
                              {signer.signature_image && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={signer.signature_image} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Ver Assinatura
                                  </a>
                                </Button>
                              )}
                              {signer.selfie_photo_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={signer.selfie_photo_url} target="_blank" rel="noopener noreferrer">
                                    <Camera className="h-3 w-3 mr-1" />
                                    Ver Selfie
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Carregando informações do contrato...</p>
                    <Button onClick={fetchDocumentData} variant="outline" className="mt-4 gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Atualizar
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog Confirmar Cancelamento de Boletos */}
    <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
      if (!cancelingBoletos) {
        setCancelDialogOpen(open);
        if (!open) setCancelProgress({ current: 0, total: 0, results: [] });
      }
    }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Cancelamento de Boletos</AlertDialogTitle>
          <AlertDialogDescription>
            {cancelProgress.current > 0
              ? `Processando cancelamentos... ${cancelProgress.current}/${cancelProgress.total}`
              : 'Tem certeza que deseja cancelar os boletos deste contrato? Esta ação não pode ser desfeita.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Progresso */}
        {cancelProgress.total > 0 && (
          <div className="space-y-3">
            {/* Barra de progresso */}
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(cancelProgress.current / cancelProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {cancelProgress.current} de {cancelProgress.total} cobrança(s)
            </p>

            {/* Lista de resultados */}
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
              {cancelProgress.results.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                  <span className="truncate mr-2">{r.desc}</span>
                  {r.success ? (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] px-1.5">OK</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] px-1.5">Erro</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelingBoletos}>
            {cancelProgress.current === cancelProgress.total && cancelProgress.total > 0 ? 'Fechar' : 'Voltar'}
          </AlertDialogCancel>
          {cancelProgress.current === 0 && (
            <Button 
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleCancelarBoletos();
              }}
              disabled={cancelingBoletos}
            >
              {cancelingBoletos ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Cancelando...</>
              ) : (
                <><Ban className="h-4 w-4 mr-1" /> Confirmar Cancelamento</>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <DetalhesModal
      isOpen={!!selectedCobranca}
      onClose={() => setSelectedCobranca(null)}
      registro={selectedCobranca}
      canUpdate={true}
    />
    </>
  );
}
