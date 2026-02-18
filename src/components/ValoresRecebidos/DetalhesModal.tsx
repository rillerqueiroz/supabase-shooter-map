import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ValorRecebido } from "@/hooks/useValoresRecebidosAsaas";
import { supabase } from "@/lib/supabase";
import { useCobrancaSplitsByIdentificador } from "@/hooks/useCobrancaSplits";
import { exportDetalhesPDF } from "@/utils/exportDetalhesPDF";
import { toast } from "@/hooks/use-toast";
import { FileText, User, Calendar, DollarSign, Info, Pencil, ChevronDown, ExternalLink, Copy, Download, List, Upload, Percent, Users, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateFromDatabase } from "@/lib/utils";
import { EditarCobrancaModal } from "./EditarCobrancaModal";
import { getStatusConfig } from "@/utils/statusMapping";
import { useContratoByIdentificadorExterno } from "@/hooks/useGestaoContratos";
import { ContratoDetailsModal } from "@/components/GestaoContratos/ContratoDetailsModal";
import { InserirCedrusConfirmDialog } from "@/components/TodasCobrancas/InserirCedrusConfirmDialog";

const CEDRUS_WEBHOOK_URL = "https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/8f4f34b8-d7ff-47fd-8f08-affa2258a9da";

interface DetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  registro: ValorRecebido | null;
  canUpdate?: boolean;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString: string | null) => formatDateFromDatabase(dateString);

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return format(date, "dd/MM/yyyy - HH:mm:ss", { locale: ptBR });
  } catch {
    return null;
  }
};

const isBlank = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

export function DetalhesModal({ isOpen, onClose, registro: registroProp, canUpdate = false }: DetalhesModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showSplits, setShowSplits] = useState(false);
  const [showParcelas, setShowParcelas] = useState(false);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [isLoadingParcelas, setIsLoadingParcelas] = useState(false);
  const [currentRegistro, setCurrentRegistro] = useState<ValorRecebido | null>(null);
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isCedrusConfirmOpen, setIsCedrusConfirmOpen] = useState(false);
  const [isSendingCedrus, setIsSendingCedrus] = useState(false);
  const [beneficiariosMap, setBeneficiariosMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentRegistro(registroProp);
    setShowParcelas(false);
    setParcelas([]);
  }, [registroProp]);

  const registro = currentRegistro;

  const { data: splitsLocais } = useCobrancaSplitsByIdentificador(registro?.Identificador);
  const { data: contratoVinculado } = useContratoByIdentificadorExterno(registro?.externalReference || undefined);

  // Fetch beneficiary names by wallet_id for all splits
  useEffect(() => {
    if (!isOpen) return;
    const walletIds: string[] = [];

    // Collect wallet_ids from splitsLocais
    if (splitsLocais) {
      splitsLocais.forEach(s => {
        if (s.wallet_id && !s.beneficiario?.nome) walletIds.push(s.wallet_id);
      });
    }

    // Collect wallet_ids from raw JSON splits
    if (registro) {
      const rawSplit = (registro as any).split;
      let jsonSplits: any[] = [];
      if (Array.isArray(rawSplit)) jsonSplits = rawSplit;
      else if (typeof rawSplit === 'string') {
        try { const p = JSON.parse(rawSplit); jsonSplits = Array.isArray(p) ? p : [p]; } catch {}
      } else if (rawSplit && typeof rawSplit === 'object') jsonSplits = [rawSplit];

      jsonSplits.forEach(s => {
        if (s.walletId) walletIds.push(s.walletId);
      });
    }

    const uniqueIds = [...new Set(walletIds)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    supabase
      .from('gestao_splits_beneficiarios')
      .select('wallet_id, nome')
      .in('wallet_id', uniqueIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(b => { map[b.wallet_id] = b.nome; });
          setBeneficiariosMap(prev => ({ ...prev, ...map }));
        }
      });
  }, [splitsLocais, registro, isOpen]);

  useEffect(() => {
    if (!registro || !isOpen) return;
    const installment = (registro as any).installment;
    if (!installment) {
      setParcelas([]);
      return;
    }
    setIsLoadingParcelas(true);
    supabase
      .from('valores_totais_recebidos_asaas')
      .select('*')
      .eq('installment', installment)
      .order('vencimento', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setParcelas(data);
        else setParcelas([]);
        setIsLoadingParcelas(false);
      });
  }, [registro?.Identificador, isOpen]);

  const resolveName = (beneficiarioNome: string | undefined, walletId: string | undefined) => {
    if (beneficiarioNome) return beneficiarioNome;
    if (walletId && beneficiariosMap[walletId]) return beneficiariosMap[walletId];
    return walletId || 'Sem identificação';
  };

  const splitItems: any[] = useMemo(() => {
    if (!registro) return [];
    if (splitsLocais && splitsLocais.length > 0) {
      return splitsLocais.map(s => ({
        walletId: s.wallet_id,
        tipo_valor: s.tipo_valor,
        fixedValue: s.tipo_valor === 'fixedValue' ? (s.fixedValue || 0) : undefined,
        percentualValue: s.tipo_valor === 'percentualValue' ? s.percentualValue : undefined,
        description: s.description,
        beneficiarioNome: s.beneficiario?.nome || beneficiariosMap[s.wallet_id] || undefined,
        origem: s.origem
      }));
    }

    const rawSplit = (registro as any).split;
    if (!rawSplit) return [];
    let parsed: any[] = [];
    if (Array.isArray(rawSplit)) parsed = rawSplit;
    else if (typeof rawSplit === "string") {
      try { const p = JSON.parse(rawSplit); parsed = Array.isArray(p) ? p : [p]; } catch { return []; }
    } else if (typeof rawSplit === "object") parsed = [rawSplit];

    return parsed.map(s => ({
      ...s,
      beneficiarioNome: s.beneficiarioNome || beneficiariosMap[s.walletId] || undefined
    }));
  }, [splitsLocais, registro, beneficiariosMap]);

  if (!registro) return null;

  const handleExportPDF = async () => {
    toast({ title: "Gerando PDF", description: "Aguarde um momento..." });
    const result = await exportDetalhesPDF(registro, splitItems);
    if (result.success) {
      toast({ title: "Sucesso", description: "PDF exportado com sucesso" });
    } else {
      toast({ title: "Erro", description: "Falha ao exportar PDF", variant: "destructive" });
    }
  };

  const handleCopyInvoiceUrl = () => {
    if (registro.invoiceUrl) {
      navigator.clipboard.writeText(registro.invoiceUrl);
      toast({ title: "URL copiada!", description: "URL da fatura copiada para a área de transferência" });
    }
  };

  const handleOpenBankSlip = () => {
    if (registro.bankSlipUrl) {
      window.open(registro.bankSlipUrl, '_blank');
    }
  };

  const statusConfig = getStatusConfig(registro.status);

  const InfoRow = ({ label, value, className = "" }: { label: string; value: string | number | React.ReactNode; className?: string }) => {
    if (typeof value === 'string' && isBlank(value)) return null;
    if (typeof value === 'number' && (value === 0 || isNaN(value))) return null;
    if (value === "Informação indisponível") return null;
    return (
      <div className={`flex justify-between items-start ${className}`}>
        <span className="text-sm text-muted-foreground">{label}</span>
        {typeof value === 'string' || typeof value === 'number' ? (
          <span className="text-sm font-medium text-right">{value}</span>
        ) : (
          <div className="text-right">{value}</div>
        )}
      </div>
    );
  };

  const getSplitValue = (s: any) => s.tipo_valor === 'fixedValue' ? (s.fixedValue || 0) : (s.percentualValue || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes da Cobrança
          </DialogTitle>
          <DialogDescription className="sr-only">
            Informações completas da cobrança, splits e parcelas vinculadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Identificador e Status */}
            <div className="flex flex-wrap items-center gap-3">
              <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{registro.Identificador}</code>
              <Badge className={`${statusConfig.color} text-white`}>{statusConfig.label}</Badge>
              {registro.externalReference && contratoVinculado && (
                <button
                  onClick={() => setIsContratoModalOpen(true)}
                  className="text-primary hover:underline text-sm font-medium flex items-center gap-1 cursor-pointer"
                >
                  {registro.externalReference}
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCedrusConfirmOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" />
                  Cedrus
                </Button>
                {canUpdate && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                <Button size="sm" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>

            <Separator />

            {/* Cards lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados do Cliente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Nome" value={registro.nome || ""} />
                  <InfoRow label="CPF/CNPJ" value={registro.cpf_cnpj ? <span className="font-mono">{registro.cpf_cnpj}</span> : ""} />
                  <InfoRow label="Email" value={registro.email || ""} />
                  <InfoRow label="Celular" value={registro.celular || ""} />
                  <InfoRow label="Telefone" value={registro.fone || ""} />
                  <InfoRow label="Cliente" value={registro.unidade || ""} />
                </CardContent>
              </Card>

              {/* Dados da Cobrança */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dados da Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Projeto" value={registro.projeto || ""} />
                  <InfoRow label="Tipo" value={registro.tipo_cobranca || ""} />
                  <InfoRow label="Descrição" value={registro.descricao || ""} />
                  {registro.externalReference && (
                    <InfoRow label="Contrato" value={
                      <button
                        onClick={() => setIsContratoModalOpen(true)}
                        className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer text-sm"
                        disabled={!contratoVinculado}
                      >
                        {registro.externalReference}
                        {contratoVinculado && <ExternalLink className="h-3 w-3" />}
                      </button>
                    } />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Valores e Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Valor" value={registro.valor ? <span className="text-green-600 font-semibold">{formatCurrency(registro.valor)}</span> : ""} />
                  <InfoRow label="Valor Original" value={registro.valor_original ? formatCurrency(registro.valor_original) : ""} />
                  <InfoRow label="Valor Líquido" value={registro.valor_liquido ? formatCurrency(registro.valor_liquido) : ""} />
                  <InfoRow label="Desconto Pontualidade" value={(() => {
                    if (!registro.desconto_pontualidade) return "";
                    try {
                      const desconto = JSON.parse(registro.desconto_pontualidade);
                      const tipoLabel = desconto.type === 'FIXED' ? 'R$' : '%';
                      const diasLabel = desconto.dueDateLimitDays ? ` (${desconto.dueDateLimitDays} dias)` : '';
                      return `${tipoLabel} ${desconto.value}${diasLabel}`;
                    } catch {
                      return formatCurrency(Number(registro.desconto_pontualidade));
                    }
                  })()} />
                  <InfoRow label="Valor c/ Desconto" value={(() => {
                    if (!registro.valor || !registro.desconto_pontualidade) return "";
                    try {
                      const desconto = JSON.parse(registro.desconto_pontualidade);
                      const valorBase = Number(registro.valor);
                      let valorComDesconto = valorBase;
                      if (desconto.type === 'FIXED') {
                        valorComDesconto = valorBase - Number(desconto.value);
                      } else if (desconto.type === 'PERCENTAGE') {
                        valorComDesconto = valorBase * (1 - Number(desconto.value) / 100);
                      }
                      return formatCurrency(Math.max(0, valorComDesconto));
                    } catch { return ""; }
                  })()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Vencimento" value={formatDate(registro.vencimento) || ""} />
                  <InfoRow label="Vencimento Original" value={formatDate(registro.vencimento_original) || ""} />
                  <InfoRow label="Pagamento" value={formatDate(registro.data_pagamento) || ""} />
                  <InfoRow label="Criação" value={formatDate(registro.data_criacao) || ""} />
                  <InfoRow label="Confirmação" value={formatDate(registro.data_confirmacao) || ""} />
                  <InfoRow label="Crédito" value={formatDate(registro.data_credito) || ""} />
                  <InfoRow label="Estimada" value={formatDate(registro.data_estimada) || ""} />
                </CardContent>
              </Card>
            </div>

            {/* Links */}
            {(registro.bankSlipUrl || registro.invoiceUrl) && (
              <Card>
                <CardContent className="py-3 flex flex-wrap items-center gap-3">
                  {registro.bankSlipUrl && (
                    <Button variant="outline" size="sm" onClick={handleOpenBankSlip}>
                      <Download className="mr-2 h-4 w-4" />
                      Acessar Boleto
                    </Button>
                  )}
                  {registro.invoiceUrl && (
                    <>
                      <a
                        href={registro.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate max-w-sm"
                      >
                        {registro.invoiceUrl}
                      </a>
                      <Button variant="ghost" size="sm" onClick={handleCopyInvoiceUrl} className="h-7 px-2">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* === SPLITS E COMISSÕES (estilo do ContratoDetailsModal) === */}
            {splitItems.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Splits e Comissões
                    <Badge variant="secondary" className="ml-1">{splitItems.length}</Badge>
                  </h3>

                  <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                    {/* Splits do Projeto */}
                    {(() => {
                      const projetoItems = splitItems.filter((s: any) => s.origem === 'projeto');
                      if (projetoItems.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Percent className="h-3.5 w-3.5" />
                            Splits do Projeto
                          </h4>
                          {projetoItems.map((split: any, i: number) => {
                            const isPercentual = split.tipo_valor === 'percentualValue';
                            const valor = getSplitValue(split);
                            const valorCalculado = isPercentual && registro.valor
                              ? (valor / 100) * registro.valor
                              : null;
                            return (
                              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-semibold">{resolveName(split.beneficiarioNome, split.walletId)}</p>
                                  {split.walletId && <p className="text-[11px] text-muted-foreground font-mono">{split.walletId}</p>}
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {isPercentual ? `${valor}%` : formatCurrency(valor)}
                                  </Badge>
                                  {valorCalculado !== null && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      = {formatCurrency(valorCalculado)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Splits Adicionais */}
                    {(() => {
                      const adicionaisItems = splitItems.filter((s: any) => s.origem === 'adicional');
                      if (adicionaisItems.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Splits Adicionais / Comissões
                          </h4>
                          {adicionaisItems.map((split: any, i: number) => {
                            const isPercentual = split.tipo_valor === 'percentualValue';
                            const valor = getSplitValue(split);
                            const valorCalculado = isPercentual && registro.valor
                              ? (valor / 100) * registro.valor
                              : null;
                            return (
                              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-semibold">{resolveName(split.beneficiarioNome, split.walletId)}</p>
                                  {split.walletId && <p className="text-[11px] text-muted-foreground font-mono">{split.walletId}</p>}
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {isPercentual ? `${valor}%` : formatCurrency(valor)}
                                  </Badge>
                                  {valorCalculado !== null && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      = {formatCurrency(valorCalculado)}
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
                      const manuaisItems = splitItems.filter((s: any) => s.origem === 'manual');
                      if (manuaisItems.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Wallet className="h-3.5 w-3.5" />
                            Splits Manuais
                          </h4>
                          {manuaisItems.map((split: any, i: number) => {
                            const isPercentual = split.tipo_valor === 'percentualValue';
                            const valor = getSplitValue(split);
                            const valorCalculado = isPercentual && registro.valor
                              ? (valor / 100) * registro.valor
                              : null;
                            return (
                              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-semibold">{resolveName(split.beneficiarioNome, split.walletId)}</p>
                                  {split.walletId && <p className="text-[11px] text-muted-foreground font-mono">{split.walletId}</p>}
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {isPercentual ? `${valor}%` : formatCurrency(valor)}
                                  </Badge>
                                  {valorCalculado !== null && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      = {formatCurrency(valorCalculado)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Splits sem origem (vindos do JSON) */}
                    {(() => {
                      const semOrigem = splitItems.filter((s: any) => !s.origem);
                      if (semOrigem.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          {semOrigem.map((split: any, i: number) => {
                            const isSemSplit = split.walletId === "Sem Split" || split.id === "sem-split";
                            return (
                              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-background/60">
                                <div>
                                  <p className="text-sm font-semibold">{resolveName(split.beneficiarioNome, split.walletId)}</p>
                                  {split.walletId && <p className="text-[11px] text-muted-foreground font-mono">{split.walletId}</p>}
                                  {split.description && <p className="text-xs text-muted-foreground">{split.description}</p>}
                                  {isSemSplit && <Badge variant="outline" className="text-[10px] mt-1">Sem Split</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {split.fixedValue && <Badge variant="secondary">{formatCurrency(split.fixedValue)}</Badge>}
                                  {split.percentualValue && <Badge variant="secondary">{split.percentualValue}%</Badge>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Totalizador */}
                    {(() => {
                      const totalPerc = splitItems
                        .filter((s: any) => s.tipo_valor === 'percentualValue' || s.percentualValue)
                        .reduce((acc: number, s: any) => acc + Number(s.percentualValue || 0), 0);
                      if (totalPerc === 0) return null;
                      const totalValor = registro.valor ? (totalPerc / 100) * registro.valor : null;
                      return (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Total Percentual</span>
                            <div className="flex items-center gap-3">
                              <Badge variant={totalPerc > 100 ? "destructive" : "default"} className="text-sm">
                                {totalPerc.toFixed(1)}%
                              </Badge>
                              {totalValor !== null && (
                                <span className="text-sm font-medium">
                                  = {formatCurrency(totalValor)}
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

            {/* Parcelas do Parcelamento */}
            {(registro as any).installment && (
              <>
                <Separator />
                <Collapsible open={showParcelas} onOpenChange={setShowParcelas}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0">
                      <span className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        <span className="font-semibold text-base">Parcelas do Parcelamento</span>
                        {parcelas.length > 0 && (
                          <Badge variant="secondary" className="ml-1">{parcelas.length}</Badge>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showParcelas ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    {isLoadingParcelas ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Carregando parcelas...</p>
                    ) : parcelas.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma parcela encontrada.</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs font-bold">Descrição</TableHead>
                              <TableHead className="text-xs font-bold">Vencimento</TableHead>
                              <TableHead className="text-xs font-bold text-right">Valor</TableHead>
                              <TableHead className="text-xs font-bold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parcelas.map((p: any) => {
                              const isCurrentRow = p.Identificador === registro.Identificador;
                              const pStatus = getStatusConfig(p.status);
                              return (
                                <TableRow
                                  key={p.Identificador}
                                  className={`cursor-pointer hover:bg-muted/60 ${isCurrentRow ? 'bg-primary/10 font-semibold' : ''}`}
                                  onClick={() => {
                                    if (!isCurrentRow) setCurrentRegistro(p as ValorRecebido);
                                  }}
                                >
                                  <TableCell className="text-xs">{(p.descricao || '-').substring(0, 40)}</TableCell>
                                  <TableCell className="text-xs whitespace-nowrap">{formatDate(p.vencimento)}</TableCell>
                                  <TableCell className="text-xs text-right whitespace-nowrap">{formatCurrency(Number(p.valor) || 0)}</TableCell>
                                  <TableCell>
                                    <Badge className={`${pStatus.color} text-white text-[10px]`}>{pStatus.label}</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Mais Detalhes */}
            <Separator />
            <Collapsible open={showMoreDetails} onOpenChange={setShowMoreDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0">
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span className="font-semibold text-base">Mais Detalhes</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <InfoRow label="Email Adicional" value={registro.email_adicional || ""} />
                    <InfoRow label="Usuário" value={registro.usuario || ""} />
                    <InfoRow label="Forma de Inserção" value={registro.forma_insercao || ""} />
                    <InfoRow label="Credor Cedrus" value={registro.credor_cedrus || ""} />
                    <InfoRow label="Hora de Envio" value={formatDateTime(registro.hora_envio) || ""} />
                    <InfoRow label="Msg Enviada" value={
                      registro.msg_enviada === null || registro.msg_enviada === undefined || registro.msg_enviada === '' ? "" : (
                        <Badge className={
                          String(registro.msg_enviada).toLowerCase() === 'true' || String(registro.msg_enviada) === '1'
                            ? "bg-green-500 hover:bg-green-600 w-fit"
                            : "bg-yellow-500 hover:bg-yellow-600 text-black w-fit"
                        }>
                          {String(registro.msg_enviada).toLowerCase() === 'true' || String(registro.msg_enviada) === '1' ? 'Sim' : 'Não'}
                        </Badge>
                      )
                    } />
                    {registro.Identificador && <Separator className="my-2" />}
                    <InfoRow label="Customer ID" value={registro.customer || ""} />
                    <InfoRow label="Identificador" value={<span className="font-mono text-xs">{registro.Identificador}</span>} />
                    <InfoRow label="Identificador Externo" value={
                      registro.externalReference ? (
                        <button
                          onClick={() => setIsContratoModalOpen(true)}
                          className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer text-sm"
                          disabled={!contratoVinculado}
                        >
                          {registro.externalReference}
                          {contratoVinculado && <ExternalLink className="h-3 w-3" />}
                        </button>
                      ) : ""
                    } />
                    <InfoRow label="Nº Boleto" value={registro.numero_boleto || ""} />
                    <InfoRow label="Nº Fatura" value={registro.invoice_number || ""} />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </DialogContent>

      {/* Modal de Edição */}
      <EditarCobrancaModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        registro={registro}
      />

      {/* Modal de Contrato Vinculado */}
      {contratoVinculado && (
        <ContratoDetailsModal
          open={isContratoModalOpen}
          onOpenChange={setIsContratoModalOpen}
          contrato={contratoVinculado}
        />
      )}

      {/* Confirmação Inserir no Cedrus */}
      <InserirCedrusConfirmDialog
        open={isCedrusConfirmOpen}
        onOpenChange={setIsCedrusConfirmOpen}
        isLoading={isSendingCedrus}
        descricao={registro.descricao}
        nome={registro.nome}
        valor={registro.valor}
        vencimento={registro.vencimento}
        onConfirm={async () => {
          setIsSendingCedrus(true);
          try {
            const response = await fetch(CEDRUS_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(registro),
            });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            toast({ title: "Sucesso", description: "Cobrança enviada para o Cedrus!" });
            setIsCedrusConfirmOpen(false);
          } catch (error: any) {
            toast({ title: "Erro", description: `Falha ao enviar: ${error.message}`, variant: "destructive" });
          } finally {
            setIsSendingCedrus(false);
          }
        }}
      />
    </Dialog>
  );
}
