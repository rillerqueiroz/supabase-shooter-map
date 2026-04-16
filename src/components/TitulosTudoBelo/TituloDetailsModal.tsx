import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TituloTudoBelo, useUpdateTituloTudoBelo, STATUS_TITULO_OPTIONS, STATUS_CEDRUS_OPTIONS } from "@/hooks/useTitulosTudoBelo";
import { useInserirCedrusWebhook } from "@/hooks/useInserirCedrusWebhook";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { useTitulosVinculados } from "@/hooks/useTitulosVinculados";
import { useCreateLogAlteracao } from "@/hooks/useTitulosLogAlteracoes";
import { useNegativarTitulo, useRemoverNegativacao } from "@/hooks/useNegativacoes";
import { TituloHistoricoSection } from "./TituloHistoricoSection";
import { CedrusConfirmDialog } from "./CedrusConfirmDialog";
import { useState, useEffect, useRef } from "react";
import { format, differenceInDays, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Save, X, FileText, Users, DollarSign, Database, History, Tag, Link2, Loader2, Upload, Copy, Clock, Send, Mail, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Calcula dias restantes para recompra e retorna cor gradiente
const calcularDiasRecompra = (dataVencimento: string | null, prazoRecompra: number | null) => {
  if (!dataVencimento || prazoRecompra === null || prazoRecompra === undefined) return null;
  
  try {
    const datePart = dataVencimento.split('T')[0];
    if (!datePart || datePart.split('-').length !== 3) return null;
    
    const [year, month, day] = datePart.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    const vencimento = new Date(year, month - 1, day);
    if (isNaN(vencimento.getTime())) return null;
    
    const limiteRecompra = addDays(vencimento, prazoRecompra);
    if (isNaN(limiteRecompra.getTime())) return null;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diasRestantes = differenceInDays(limiteRecompra, hoje);
    
    return {
      diasRestantes,
      prazoTotal: prazoRecompra,
      dataLimite: limiteRecompra
    };
  } catch {
    return null;
  }
};

// Retorna classes de cor baseado na porcentagem de tempo restante
const getRecompraColorClasses = (diasRestantes: number, prazoTotal: number) => {
  if (diasRestantes <= 0) {
    return { bg: "bg-red-600", text: "text-white", border: "border-red-700" };
  }
  
  const porcentagemRestante = (diasRestantes / prazoTotal) * 100;
  
  if (porcentagemRestante > 66) {
    return { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" };
  } else if (porcentagemRestante > 33) {
    return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" };
  } else if (porcentagemRestante > 10) {
    return { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" };
  } else {
    return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
  }
};

interface TituloDetailsModalProps {
  titulo: TituloTudoBelo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTituloUpdated?: (titulo: TituloTudoBelo) => void;
  initialTab?: string;
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const getStatusTituloStyle = (status: string | null) => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'A vencer': { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-500/30' },
    'Cancelado': { bg: 'bg-red-500/10', text: 'text-red-700', border: 'border-red-500/30' },
    'Vencido': { bg: 'bg-red-500/10', text: 'text-red-700', border: 'border-red-500/30' },
    'Negociado': { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-500/30' },
    'Pago em dia': { bg: 'bg-green-500/10', text: 'text-green-700', border: 'border-green-500/30' },
    'Pago via renegociação': { bg: 'bg-green-500/10', text: 'text-green-700', border: 'border-green-500/30' },
    'Suspenso': { bg: 'bg-gray-500/10', text: 'text-gray-700', border: 'border-gray-500/30' },
    'Não se aplica': { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
  };
  return styles[status || ''] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
};

const getStatusCedrusStyle = (status: string | null) => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'pendente': { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-500/30' },
    'em_cobranca': { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-500/30' },
    'pago': { bg: 'bg-green-500/10', text: 'text-green-700', border: 'border-green-500/30' },
    'cancelado': { bg: 'bg-red-500/10', text: 'text-red-700', border: 'border-red-500/30' },
    'suspenso': { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
  };
  return styles[status || ''] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
};

// Helper components defined outside to prevent focus loss on re-render
const InfoRow = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex justify-between py-2 border-b border-border/50">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="font-medium text-sm">{value || "-"}</span>
  </div>
);

const InfoRowWithCopy = ({ label, value }: { label: string; value: string | null }) => {
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success("Linha digitável copiada!");
    }
  };

  return (
    <div className="flex justify-between items-center py-2.5 px-3 bg-muted/30 rounded-md border border-border/30">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm font-mono tracking-wide">{value || "-"}</span>
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 hover:bg-primary/10 rounded transition-colors"
            title="Copiar linha digitável"
          >
            <Copy className="h-4 w-4 text-primary/70 hover:text-primary" />
          </button>
        )}
      </div>
    </div>
  );
};

interface EditFieldProps {
  label: string;
  field: keyof TituloTudoBelo;
  type?: string;
  value: string | number | null | undefined;
  onChange: (field: keyof TituloTudoBelo, value: string | number | null) => void;
}

const EditField = ({ label, field, type = "text", value, onChange }: EditFieldProps) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(field, type === "number" ? parseFloat(e.target.value) || null : e.target.value)}
      className="h-8 text-sm"
    />
  </div>
);

export function TituloDetailsModal({ titulo, open, onOpenChange, onTituloUpdated, initialTab }: TituloDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TituloTudoBelo>>({});
  const [activeTab, setActiveTab] = useState("detalhes");
  const [motivoAlteracao, setMotivoAlteracao] = useState("");
  const updateMutation = useUpdateTituloTudoBelo();
  const createLog = useCreateLogAlteracao();
  const negativarMutation = useNegativarTitulo();
  const removerNegativacaoMutation = useRemoverNegativacao();
  const inserirCedrusMutation = useInserirCedrusWebhook();
  const [isEnviandoEmail, setIsEnviandoEmail] = useState(false);
  const [marcarPagoOpen, setMarcarPagoOpen] = useState(false);
  const [cancelarCedrusOpen, setCancelarCedrusOpen] = useState(false);
  const [isMarcandoPago, setIsMarcandoPago] = useState(false);
  const [isCancelandoCedrus, setIsCancelandoCedrus] = useState(false);

  const handleMarcarPagoCedrus = async (valorPagoApurado?: number, dataPagamento?: string) => {
    if (!titulo) return;
    setIsMarcandoPago(true);
    try {
      const payload = {
        ...titulo,
        valor_pago_apurado: valorPagoApurado,
        data_pagamento_manual: dataPagamento,
      };
      const response = await fetch(
        'https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/marcar-titulo-como-pago-tudobelo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error('Falha ao marcar como pago');
      toast.success(`Título ${titulo.documento ?? ''} marcado como pago no Cedrus.`);
      setMarcarPagoOpen(false);
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast.error('Erro ao marcar título como pago no Cedrus.');
    } finally {
      setIsMarcandoPago(false);
    }
  };

  const handleCancelarCedrus = async () => {
    if (!titulo) return;
    setIsCancelandoCedrus(true);
    try {
      const response = await fetch(
        'https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cancelar-titulo-cedrus-tudobelo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(titulo),
        }
      );
      if (!response.ok) throw new Error('Falha ao cancelar no Cedrus');
      toast.success(`Título ${titulo.documento ?? ''} cancelado no Cedrus.`);
      setCancelarCedrusOpen(false);
    } catch (error) {
      console.error('Erro ao cancelar no Cedrus:', error);
      toast.error('Erro ao cancelar título no Cedrus.');
    } finally {
      setIsCancelandoCedrus(false);
    }
  };

  const handleEnviarEmail = async () => {
    if (!titulo) return;
    setIsEnviandoEmail(true);
    try {
      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/enviar-email-titulo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(titulo),
      });
      if (!response.ok) throw new Error('Erro ao enviar email');
      toast.success('Email enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar email');
    } finally {
      setIsEnviandoEmail(false);
    }
  };
  const { data: etapasDisponiveis } = useTitulosEtapas();
  const { data: titulosVinculados, isLoading: isLoadingVinculados } = useTitulosVinculados(
    titulo?.codigo_parceiro || null,
    titulo?.id || ''
  );

  // Track the previous titulo ID to detect when a different title is selected
  const prevTituloIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (titulo) {
      // Only reset editing state when a DIFFERENT title is selected, not when the same title is updated
      if (prevTituloIdRef.current !== titulo.id) {
        setIsEditing(false);
        setActiveTab(initialTab || "detalhes");
        setMotivoAlteracao("");
      }
      setEditData(titulo);
      prevTituloIdRef.current = titulo.id;
    }
  }, [titulo, initialTab]);

  if (!titulo) return null;

  // Status que indicam pagamento e exigem data_pagamento
  const STATUS_PAGO = ['Pago'];
  const isStatusPago = editData.status_titulo && STATUS_PAGO.includes(editData.status_titulo);
  const wasStatusPago = titulo.status_titulo && STATUS_PAGO.includes(titulo.status_titulo);

  // Auto-preencher data_pagamento quando muda para status "Pago"
  const handleStatusChange = (value: string | null) => {
    const newEditData = { ...editData, status_titulo: value };
    
    // Se mudou para status de pagamento e não tinha data_pagamento
    if (value && STATUS_PAGO.includes(value) && !editData.data_pagamento) {
      // Data de ontem no Brasil (UTC-3)
      const hoje = new Date();
      const brasilOffset = -3 * 60;
      const localOffset = hoje.getTimezoneOffset();
      hoje.setMinutes(hoje.getMinutes() + localOffset + brasilOffset);
      const ontem = subDays(hoje, 1);
      newEditData.data_pagamento = format(ontem, 'yyyy-MM-dd');
    }
    
    setEditData(newEditData);
  };

  const handleFieldChange = (field: keyof TituloTudoBelo, value: string | number | null) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validar data_pagamento se status é de pagamento
    if (isStatusPago && !editData.data_pagamento) {
      toast.error("Informe a data de pagamento para títulos com status 'Pago'");
      return;
    }

    // Identificar campos alterados e registrar logs
    const changedFields: { campo: string; anterior: string | null; novo: string | null }[] = [];
    
    const fieldsToTrack: (keyof TituloTudoBelo)[] = [
      'status_titulo', 'status_cedrus', 'inserido_cedrus', 'id_titulo_cedrus', 
      'credor_cedrus', 'processado_internamente', 'observacoes', 'etapa', 'data_pagamento', 'negativado', 'tipo_titulo', 'bloqueado'
    ];

    fieldsToTrack.forEach((field) => {
      const valorAnterior = titulo[field];
      const valorNovo = editData[field];
      
      if (valorAnterior !== valorNovo) {
        changedFields.push({
          campo: field,
          anterior: valorAnterior !== null && valorAnterior !== undefined ? String(valorAnterior) : null,
          novo: valorNovo !== null && valorNovo !== undefined ? String(valorNovo) : null,
        });
      }
    });

    // Se etapa foi alterada, também setar processado_internamente para true
    let finalEditData = { ...editData };
    if (titulo.etapa !== editData.etapa) {
      finalEditData.processado_internamente = true;
    }

    const updated = await updateMutation.mutateAsync({ id: titulo.id, updates: finalEditData });
    setEditData(updated);
    onTituloUpdated?.(updated as TituloTudoBelo);

    // Se negativado mudou, criar registro na tabela de negativações
    const negativadoChanged = titulo.negativado !== editData.negativado;
    if (negativadoChanged) {
      const descNeg = motivoAlteracao.trim() || undefined;
      if (editData.negativado) {
        // Negativando
        await negativarMutation.mutateAsync({
          tituloId: titulo.id,
          documento: titulo.documento,
          nomeParceiro: titulo.nome_parceiro,
          motivo: descNeg,
        });
      } else {
        // Removendo negativação
        await removerNegativacaoMutation.mutateAsync({
          tituloId: titulo.id,
          documento: titulo.documento,
          nomeParceiro: titulo.nome_parceiro,
          motivo: descNeg || 'Removido via edição do título',
        });
      }
    }

    // Registrar logs para cada campo alterado
    const descricao = motivoAlteracao.trim() 
      ? motivoAlteracao 
      : `Campo alterado manualmente`;
    
    for (const change of changedFields) {
      await createLog.mutateAsync({
        titulo_id: titulo.id,
        campo_alterado: change.campo,
        valor_anterior: change.anterior,
        valor_novo: change.novo,
        origem: 'usuario',
        descricao: descricao,
      });
    }
    
    setIsEditing(false);
    setMotivoAlteracao("");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Detalhes do Título - Tudo Belo", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);

    const sections = [
      {
        title: "Dados do Documento",
        data: [
          ["Documento", titulo.documento || "-"],
          ["Tipo", titulo.tipo_documento || "-"],
          ["Série", titulo.serie_documento || "-"],
          ["Status Título", titulo.status_titulo || "-"],
        ],
      },
      {
        title: "Dados do Parceiro",
        data: [
          ["Código", titulo.codigo_parceiro || "-"],
          ["Nome", titulo.nome_parceiro || "-"],
          ["Nome Fantasia", titulo.nome_fantasia || "-"],
          ["CNPJ/CPF", titulo.cnpj_cpf || "-"],
          ["Telefone 1", titulo.fone1 || "-"],
          ["Telefone 2", titulo.fone2 || "-"],
          ["Email", titulo.email || "-"],
          ["Tipo Negócio", titulo.tipo_negocio || "-"],
        ],
      },
      {
        title: "Endereço do Parceiro",
        data: [
          ["Endereço", titulo.endereco || "-"],
          ["Número", titulo.numero_endereco || "-"],
          ["Complemento", titulo.complemento || "-"],
          ["Bairro", titulo.bairro || "-"],
          ["Cidade", titulo.cidade || "-"],
          ["UF", titulo.uf || "-"],
        ],
      },
      {
        title: "Valores",
        data: [
          ["Valor Parcela", formatCurrency(titulo.valor_parcela)],
          ["Saldo Parcela", formatCurrency(titulo.saldo_parcela)],
          ["Valor Pago", formatCurrency(titulo.valor_pago)],
          ["Data Pagamento", formatDate(titulo.data_pagamento)],
        ],
      },
      {
        title: "Datas",
        data: [
          ["Data Documento", formatDate(titulo.data_documento)],
          ["Data Vencimento", formatDate(titulo.data_vencimento)],
          ["Dias Atraso", titulo.dias_atraso || "-"],
        ],
      },
      {
        title: "Cedrus",
        data: [
          ["Inserido no Cedrus", titulo.inserido_cedrus ? "Sim" : "Não"],
          ["ID Título Cedrus", titulo.id_titulo_cedrus || "-"],
          ["Credor Cedrus", titulo.credor_cedrus || "-"],
          ["Status Cedrus", titulo.status_cedrus || "-"],
        ],
      },
    ];

    let yPos = 40;
    sections.forEach((section) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(section.title, 14, yPos);
      yPos += 2;

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: section.data,
        theme: "plain",
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    });

    // Seção: Outros Títulos Vinculados
    if (titulosVinculados?.groups && titulosVinculados.groups.length > 0) {
      // Verificar se precisa de nova página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Outros Títulos Vinculados", 14, yPos);
      yPos += 6;

      titulosVinculados.groups.forEach((group) => {
        // Verificar se precisa de nova página
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Documento: ${group.documento} - Saldo Total: ${formatCurrency(group.saldoTotal)}`, 14, yPos);
        yPos += 2;

        const vinculadosData = group.titulos.map((t) => [
          t.id === titulo.id ? `${t.numero_parcela || "-"} (Este título)` : (t.numero_parcela || "-"),
          formatDate(t.data_vencimento),
          formatCurrency(t.saldo_parcela),
          t.status_titulo || "-",
          t.inserido_cedrus ? "Sim" : "Não",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Parcela", "Vencimento", "Saldo", "Status", "No Cedrus"]],
          body: vinculadosData,
          theme: "striped",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [100, 100, 100] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });
    }

    doc.save(`titulo-${titulo.documento || titulo.id}.pdf`);
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-10">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>
              Título: {titulo.id}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEnviarEmail} disabled={isEnviandoEmail}>
                {isEnviandoEmail ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-1" />
                )}
                Enviar por email
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              {!isEditing && !titulo.bloqueado && (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              )}
              {titulo.bloqueado && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Bloqueado - Desbloqueie para editar
                </Badge>
              )}
              {isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="detalhes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-6 mt-4">
            {/* Seção: Status - PRIMEIRA */}
            <section className="bg-card rounded-lg border p-4">
              <SectionHeader icon={Tag} title="Status" />
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Status Título</Label>
                      <Select
                        value={editData.status_titulo || ""}
                        onValueChange={(value) => handleStatusChange(value || null)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_TITULO_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status Cedrus</Label>
                      <Select
                        value={editData.status_cedrus || ""}
                        onValueChange={(value) => setEditData({ ...editData, status_cedrus: value || null })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_CEDRUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Etapa</Label>
                      <Select
                        value={editData.etapa || ""}
                        onValueChange={(value) => setEditData({ ...editData, etapa: value || null })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {etapasDisponiveis?.map((etapaItem) => (
                            <SelectItem key={etapaItem.id} value={etapaItem.etapa || ""}>
                              {etapaItem.etapa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Negativado</Label>
                      <Select
                        value={editData.negativado ? "sim" : "nao"}
                        onValueChange={(value) => setEditData({ ...editData, negativado: value === "sim" })}
                      >
                        <SelectTrigger className={`h-8 ${editData.negativado ? 'border-red-300 text-red-700' : 'border-blue-300 text-blue-700'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo Título</Label>
                      <Select
                        value={editData.tipo_titulo || "Original"}
                        onValueChange={(value) => setEditData({ ...editData, tipo_titulo: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Original">Original</SelectItem>
                          <SelectItem value="Negociação">Negociação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bloqueado</Label>
                      <Select
                        value={editData.bloqueado ? "sim" : "nao"}
                        onValueChange={(value) => setEditData({ ...editData, bloqueado: value === "sim" })}
                      >
                        <SelectTrigger className={`h-8 ${editData.bloqueado ? 'border-amber-300 text-amber-700' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim (Bloqueado)</SelectItem>
                          <SelectItem value="nao">Não (Desbloqueado)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Campo obrigatório de Data Pagamento quando status é "Pago" */}
                  {isStatusPago && (
                    <div className="p-3 bg-green-50/50 rounded-lg border border-green-200">
                      <Label className="text-xs font-medium text-green-700">
                        Data de Pagamento *
                      </Label>
                      <Input
                        type="date"
                        value={editData.data_pagamento || ""}
                        onChange={(e) => handleFieldChange('data_pagamento', e.target.value)}
                        className="h-8 mt-1 border-green-300 focus:border-green-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Obrigatório para títulos com status de pagamento
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Negativado badge em destaque */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm ${
                    titulo.negativado 
                      ? 'bg-red-500/10 text-red-700 border-red-500/30' 
                      : 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                  }`}>
                    <span>{titulo.negativado ? '⚠ Negativado' : '✓ Não Negativado'}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Status Título</span>
                      {titulo.status_titulo ? (
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${getStatusTituloStyle(titulo.status_titulo).bg} ${getStatusTituloStyle(titulo.status_titulo).text} ${getStatusTituloStyle(titulo.status_titulo).border}`}>
                          {titulo.status_titulo}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Status Cedrus</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {titulo.status_cedrus ? (
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${getStatusCedrusStyle(titulo.status_cedrus).bg} ${getStatusCedrusStyle(titulo.status_cedrus).text} ${getStatusCedrusStyle(titulo.status_cedrus).border}`}>
                            {STATUS_CEDRUS_OPTIONS.find(o => o.value === titulo.status_cedrus)?.label || titulo.status_cedrus}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {titulo.inserido_cedrus && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 h-8"
                              disabled={isMarcandoPago}
                              onClick={() => setMarcarPagoOpen(true)}
                            >
                              {isMarcandoPago ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Marcar como Pago no Cedrus
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 h-8 border-destructive text-destructive hover:bg-destructive/10"
                              disabled={isCancelandoCedrus}
                              onClick={() => setCancelarCedrusOpen(true)}
                            >
                              {isCancelandoCedrus ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                              Cancelar no Cedrus
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Etapa</span>
                      {titulo.etapa ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium bg-purple-500/10 text-purple-700 border-purple-500/30">
                          {titulo.etapa}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Tipo Título</span>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${
                        titulo.tipo_titulo === 'Negociação'
                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                      }`}>
                        {titulo.tipo_titulo || 'Original'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Seção: Dados do Parceiro - SEGUNDA */}
            <section className="bg-card rounded-lg border p-4">
              <SectionHeader icon={Users} title="Dados do Parceiro" />
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EditField label="Código Parceiro" field="codigo_parceiro" value={editData.codigo_parceiro} onChange={handleFieldChange} />
                    <EditField label="Nome Parceiro" field="nome_parceiro" value={editData.nome_parceiro} onChange={handleFieldChange} />
                    <EditField label="Nome Fantasia" field="nome_fantasia" value={editData.nome_fantasia} onChange={handleFieldChange} />
                    <EditField label="CNPJ/CPF" field="cnpj_cpf" value={editData.cnpj_cpf} onChange={handleFieldChange} />
                    <EditField label="Telefone 1" field="fone1" value={editData.fone1} onChange={handleFieldChange} />
                    <EditField label="Telefone 2" field="fone2" value={editData.fone2} onChange={handleFieldChange} />
                    <EditField label="Email" field="email" value={editData.email} onChange={handleFieldChange} />
                    <EditField label="Tipo Negócio" field="tipo_negocio" value={editData.tipo_negocio} onChange={handleFieldChange} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
                    <EditField label="Endereço" field="endereco" value={editData.endereco} onChange={handleFieldChange} />
                    <EditField label="Número" field="numero_endereco" value={editData.numero_endereco} onChange={handleFieldChange} />
                    <EditField label="Complemento" field="complemento" value={editData.complemento} onChange={handleFieldChange} />
                    <EditField label="Bairro" field="bairro" value={editData.bairro} onChange={handleFieldChange} />
                    <EditField label="Cidade" field="cidade" value={editData.cidade} onChange={handleFieldChange} />
                    <EditField label="UF" field="uf" value={editData.uf} onChange={handleFieldChange} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Código</span>
                      <p className="font-medium">{titulo.codigo_parceiro || "-"}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-xs text-muted-foreground">Nome</span>
                      <p className="font-semibold text-lg">{titulo.nome_parceiro || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">CNPJ/CPF</span>
                      <p className="font-medium">{titulo.cnpj_cpf || "-"}</p>
                    </div>
                  </div>
                  {titulo.nome_fantasia && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Nome Fantasia</span>
                      <p className="font-medium">{titulo.nome_fantasia}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Telefone 1</span>
                      <p className="font-medium">{titulo.fone1 || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Telefone 2</span>
                      <p className="font-medium">{titulo.fone2 || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <p className="font-medium">{titulo.email || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Tipo Negócio</span>
                      <p className="font-medium">{titulo.tipo_negocio || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                    <div className="space-y-1 col-span-2">
                      <span className="text-xs text-muted-foreground">Endereço</span>
                      <p className="font-medium">
                        {titulo.endereco ? `${titulo.endereco}${titulo.numero_endereco ? `, ${titulo.numero_endereco}` : ''}` : "-"}
                        {titulo.complemento && <span className="text-muted-foreground"> ({titulo.complemento})</span>}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Bairro</span>
                      <p className="font-medium">{titulo.bairro || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Cidade/UF</span>
                      <p className="font-medium">{titulo.cidade ? `${titulo.cidade}/${titulo.uf || '-'}` : "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Seção: Valores - TERCEIRA */}
            <section className="bg-card rounded-lg border p-4">
              <SectionHeader icon={DollarSign} title="Valores" />
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EditField label="Saldo Parcela" field="saldo_parcela" type="number" value={editData.saldo_parcela} onChange={handleFieldChange} />
                    <EditField label="Data Vencimento" field="data_vencimento" type="date" value={editData.data_vencimento?.split('T')[0] || ''} onChange={handleFieldChange} />
                    <EditField label="Valor Parcela" field="valor_parcela" type="number" value={editData.valor_parcela} onChange={handleFieldChange} />
                    <EditField label="Valor Pago" field="valor_pago" type="number" value={editData.valor_pago} onChange={handleFieldChange} />
                    <EditField label="Data Pagamento" field="data_pagamento" type="date" value={editData.data_pagamento?.split('T')[0] || ''} onChange={handleFieldChange} />
                    <EditField label="Dias Atraso" field="dias_atraso" type="number" value={editData.dias_atraso} onChange={handleFieldChange} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Saldo em destaque */}
                  <div className="flex flex-wrap items-stretch gap-4">
                    <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <span className="text-sm text-muted-foreground font-medium">Saldo Parcela</span>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(titulo.saldo_parcela)}</p>
                    </div>
                    <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-muted/50 border text-right">
                      <span className="text-sm text-muted-foreground font-medium">Data Vencimento</span>
                      <p className="text-lg font-semibold">{formatDate(titulo.data_vencimento)}</p>
                      {titulo.dias_atraso && Number(titulo.dias_atraso) > 0 && (
                        <Badge variant="destructive" className="mt-1">{titulo.dias_atraso} dias em atraso</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                    <InfoRow label="Valor Parcela" value={formatCurrency(titulo.valor_parcela)} />
                    <InfoRow label="Valor Pago" value={formatCurrency(titulo.valor_pago)} />
                    <InfoRow label="Data Pagamento" value={formatDate(titulo.data_pagamento)} />
                    <InfoRow label="Dias Atraso" value={titulo.dias_atraso} />
                  </div>
                  <div className="mt-4">
                    <InfoRowWithCopy label="Linha Digitável" value={titulo.linha_digitavel} />
                  </div>
                </div>
              )}
            </section>


            {/* Seções colapsáveis: Informações do Documento e Integração Cedrus */}
            {isEditing ? (
              <>
                {/* Seção: Informações do Documento - modo edição */}
                <section className="bg-card rounded-lg border p-4">
                  <SectionHeader icon={FileText} title="Informações do Documento" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EditField label="Documento" field="documento" value={editData.documento} onChange={handleFieldChange} />
                    <EditField label="Tipo Documento" field="tipo_documento" value={editData.tipo_documento} onChange={handleFieldChange} />
                    <EditField label="Série" field="serie_documento" value={editData.serie_documento} onChange={handleFieldChange} />
                    <EditField label="Número Parcela" field="numero_parcela" value={editData.numero_parcela} onChange={handleFieldChange} />
                    <EditField label="Forma Pagamento" field="forma_pagamento" value={editData.forma_pagamento} onChange={handleFieldChange} />
                    <EditField label="Status Boleto" field="status_boleto" value={editData.status_boleto} onChange={handleFieldChange} />
                    <EditField label="Filial" field="filial" value={editData.filial} onChange={handleFieldChange} />
                    <EditField label="Vendedor" field="vendedor" value={editData.vendedor} onChange={handleFieldChange} />
                    <EditField label="UF Cobrança" field="uf_cobranca" value={editData.uf_cobranca} onChange={handleFieldChange} />
                    <EditField label="Município Cobrança" field="municipio_cobranca" value={editData.municipio_cobranca} onChange={handleFieldChange} />
                  </div>
                  <div className="mt-4">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      value={editData.observacoes || ""}
                      onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </section>

                {/* Seção: Cedrus - modo edição */}
                <section className="bg-card rounded-lg border p-4">
                  <SectionHeader icon={Database} title="Integração Cedrus" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Inserido no Cedrus</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {editData.inserido_cedrus 
                            ? "Título marcado como inserido no sistema Cedrus" 
                            : "Marcar como inserido requer informar o ID do título"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (editData.inserido_cedrus) {
                            setEditData({ ...editData, inserido_cedrus: false, id_titulo_cedrus: null });
                          } else if (editData.id_titulo_cedrus && editData.id_titulo_cedrus.trim() !== "") {
                            setEditData({ ...editData, inserido_cedrus: true });
                          }
                        }}
                        disabled={!editData.inserido_cedrus && (!editData.id_titulo_cedrus || editData.id_titulo_cedrus.trim() === "")}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          editData.inserido_cedrus 
                            ? "bg-green-500" 
                            : "bg-muted-foreground/30"
                        } ${!editData.inserido_cedrus && (!editData.id_titulo_cedrus || editData.id_titulo_cedrus.trim() === "") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                            editData.inserido_cedrus ? "translate-x-8" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">ID Título Cedrus *</Label>
                        <Input
                          value={editData.id_titulo_cedrus || ""}
                          onChange={(e) => setEditData({ ...editData, id_titulo_cedrus: e.target.value })}
                          placeholder="Informe o ID para ativar"
                          className={`h-8 text-sm ${!editData.inserido_cedrus && (!editData.id_titulo_cedrus || editData.id_titulo_cedrus.trim() === "") ? "border-orange-300 focus:border-orange-500" : ""}`}
                        />
                        {!editData.inserido_cedrus && (!editData.id_titulo_cedrus || editData.id_titulo_cedrus.trim() === "") && (
                          <p className="text-xs text-orange-600">Preencha para habilitar o toggle</p>
                        )}
                      </div>
                      <EditField label="Credor Cedrus" field="credor_cedrus" value={editData.credor_cedrus} onChange={handleFieldChange} />
                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          checked={editData.processado_internamente || false}
                          onChange={(e) => setEditData({ ...editData, processado_internamente: e.target.checked })}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label>Processado Internamente</Label>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {/* Seção: Informações do Documento - colapsável */}
                <AccordionItem value="info-documento" className="bg-card rounded-lg border">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-semibold text-base">Informações do Documento</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                      <InfoRow label="Documento" value={titulo.documento} />
                      <InfoRow label="Tipo" value={titulo.tipo_documento} />
                      <InfoRow label="Série" value={titulo.serie_documento} />
                      <InfoRow label="Nº Parcela" value={titulo.numero_parcela} />
                      <InfoRow label="Forma Pagamento" value={titulo.forma_pagamento} />
                      <InfoRow label="Status Boleto" value={titulo.status_boleto} />
                      <InfoRow label="Filial" value={titulo.filial} />
                      <InfoRow label="Vendedor" value={titulo.vendedor} />
                      <InfoRow label="UF Cobrança" value={titulo.uf_cobranca} />
                      <InfoRow label="Município Cobrança" value={titulo.municipio_cobranca} />
                      <InfoRow label="Data Documento" value={formatDate(titulo.data_documento)} />
                    </div>
                    {titulo.observacoes && (
                      <div className="mt-4">
                        <span className="text-muted-foreground text-sm">Observações:</span>
                        <p className="text-sm bg-muted p-3 rounded-md mt-1">{titulo.observacoes}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Seção: Cedrus - colapsável */}
                <AccordionItem value="integracao-cedrus" className="bg-card rounded-lg border">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-semibold text-base">Integração Cedrus</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                      <InfoRow 
                        label="Inserido no Cedrus" 
                        value={titulo.inserido_cedrus ? "✓ Sim" : "✗ Não"} 
                      />
                      <InfoRow label="ID Título Cedrus" value={titulo.id_titulo_cedrus} />
                      <InfoRow label="Credor Cedrus" value={titulo.credor_cedrus} />
                      <InfoRow 
                        label="Processado Internamente" 
                        value={titulo.processado_internamente ? "✓ Sim" : "✗ Não"} 
                      />
                    </div>
                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                      {!titulo.inserido_cedrus && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={inserirCedrusMutation.isPending}
                          onClick={() => inserirCedrusMutation.mutate(titulo)}
                        >
                          {inserirCedrusMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Inserir no Cedrus
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Seção: Outros Títulos Vinculados */}
            <section className="bg-card rounded-lg border p-4">
              <SectionHeader icon={Link2} title="Outros Títulos desta pessoa" />
              {isLoadingVinculados ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !titulosVinculados?.groups || titulosVinculados.groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum título encontrado para este parceiro.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Títulos do mesmo parceiro (código: {titulo.codigo_parceiro}), agrupados por documento.
                  </p>
                  <Accordion type="multiple" className="space-y-2">
                    {titulosVinculados.groups.map((group) => (
                      <AccordionItem key={group.documento} value={group.documento} className="border rounded-lg">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium">{group.documento}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{group.titulos.length} parcela(s)</span>
                              <Badge variant="secondary" className="font-semibold">
                                {formatCurrency(group.saldoTotal)}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20">Parcela</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead>Status / Etapa</TableHead>
                                <TableHead className="text-center">No Cedrus</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.titulos.map((t) => {
                                const isCurrentTitulo = t.id === titulo.id;
                                return (
                                  <TableRow 
                                    key={t.id} 
                                    className={isCurrentTitulo ? "bg-primary/5 border-l-2 border-l-primary" : ""}
                                  >
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        {t.numero_parcela || "-"}
                                        {isCurrentTitulo && (
                                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                            Este título
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>{formatDate(t.data_vencimento)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(t.saldo_parcela)}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        {t.status_titulo ? (
                                          <Badge variant="outline" className="text-xs">
                                            {t.status_titulo}
                                          </Badge>
                                        ) : <span className="text-xs text-muted-foreground">-</span>}
                                        {t.etapa ? (
                                          <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/30">
                                            {t.etapa}
                                          </Badge>
                                        ) : <span className="text-xs text-muted-foreground">Sem etapa</span>}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        {t.inserido_cedrus ? (
                                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                                            Sim
                                          </Badge>
                                        ) : (
                                          <>
                                            <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-500/30">
                                              Não
                                            </Badge>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-6 text-[10px] px-2"
                                              disabled={inserirCedrusMutation.isPending}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                inserirCedrusMutation.mutate(t);
                                              }}
                                            >
                                              {inserirCedrusMutation.isPending ? (
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                              ) : (
                                                <Upload className="h-3 w-3 mr-1" />
                                              )}
                                              Inserir
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </section>

            {/* Campo de motivo/comentários e botão Salvar - só aparece em modo de edição */}
            {isEditing && (
              <>
                <section className="bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Motivo da Alteração (opcional)
                    </Label>
                    <Textarea
                      value={motivoAlteracao}
                      onChange={(e) => setMotivoAlteracao(e.target.value)}
                      placeholder="Descreva o motivo ou contexto desta alteração..."
                      className="min-h-[80px] bg-white dark:bg-background"
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Este comentário será registrado no histórico de alterações do título.
                    </p>
                  </div>
                </section>

                {/* Botão Salvar no final */}
                <div className="flex justify-end pt-4 border-t">
                  <Button size="lg" onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <section className="bg-card rounded-lg border p-4">
              <SectionHeader icon={History} title="Histórico de Alterações" />
              <TituloHistoricoSection tituloId={titulo.id} dataCriacao={titulo.data_criacao} />
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <CedrusConfirmDialog
        open={marcarPagoOpen}
        onOpenChange={setMarcarPagoOpen}
        actionType="marcar_pago"
        documentoTitulo={titulo.documento ?? null}
        tituloInfo={{
          documento: titulo.documento,
          nome_parceiro: titulo.nome_parceiro,
          valor_parcela: titulo.valor_parcela,
          saldo_parcela: titulo.saldo_parcela,
          data_vencimento: titulo.data_vencimento,
        }}
        onConfirm={handleMarcarPagoCedrus}
        isLoading={isMarcandoPago}
      />
      <CedrusConfirmDialog
        open={cancelarCedrusOpen}
        onOpenChange={setCancelarCedrusOpen}
        actionType="cancelar"
        documentoTitulo={titulo.documento ?? null}
        tituloInfo={{
          documento: titulo.documento,
          nome_parceiro: titulo.nome_parceiro,
          valor_parcela: titulo.valor_parcela,
          saldo_parcela: titulo.saldo_parcela,
          data_vencimento: titulo.data_vencimento,
        }}
        onConfirm={handleCancelarCedrus}
        isLoading={isCancelandoCedrus}
      />
    </Dialog>
  );
}
