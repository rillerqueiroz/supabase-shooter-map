import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TituloTudoBelo, useBulkUpdateTitulosTudoBelo, useTitulosTudoBeloOptions, STATUS_TITULO_OPTIONS, STATUS_CEDRUS_OPTIONS } from "@/hooks/useTitulosTudoBelo";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { useCreateLogAlteracao } from "@/hooks/useTitulosLogAlteracoes";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

// Status que indicam pagamento e exigem data_pagamento
const STATUS_PAGO = ['Pago'];

interface TitulosBulkEditModalProps {
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TitulosBulkEditModal({ selectedIds, open, onOpenChange, onSuccess }: TitulosBulkEditModalProps) {
  const { data: options } = useTitulosTudoBeloOptions();
  const { data: etapasDisponiveis } = useTitulosEtapas();
  const bulkUpdateMutation = useBulkUpdateTitulosTudoBelo();
  const createLog = useCreateLogAlteracao();
  
  const [updates, setUpdates] = useState<Partial<TituloTudoBelo>>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
  const [motivoAlteracao, setMotivoAlteracao] = useState("");

  // Verifica se o status selecionado é de pagamento
  const isStatusPago = updates.status_titulo && STATUS_PAGO.includes(updates.status_titulo);

  // Auto-preenche data_pagamento quando status é "Pago" e campo ainda não preenchido
  useEffect(() => {
    if (isStatusPago && enabledFields['status_titulo'] && !updates.data_pagamento) {
      // Data de ontem no Brasil (UTC-3)
      const hoje = new Date();
      const brasilOffset = -3 * 60;
      const localOffset = hoje.getTimezoneOffset();
      hoje.setMinutes(hoje.getMinutes() + localOffset + brasilOffset);
      const ontem = subDays(hoje, 1);
      const dataOntem = format(ontem, 'yyyy-MM-dd');
      
      setUpdates(prev => ({ ...prev, data_pagamento: dataOntem }));
      setEnabledFields(prev => ({ ...prev, data_pagamento: true }));
    }
  }, [isStatusPago, enabledFields['status_titulo']]);

  const toggleField = (field: string) => {
    setEnabledFields((prev) => ({ ...prev, [field]: !prev[field] }));
    if (enabledFields[field]) {
      const newUpdates = { ...updates };
      delete newUpdates[field as keyof TituloTudoBelo];
      setUpdates(newUpdates);
    }
  };

  const handleSave = async () => {
    // Validar data_pagamento se status é de pagamento
    if (isStatusPago && !updates.data_pagamento) {
      toast.error("Informe a data de pagamento para títulos com status 'Pago'");
      return;
    }

    const finalUpdates: Partial<TituloTudoBelo> = {};
    const changedFields: string[] = [];
    
    Object.keys(enabledFields).forEach((field) => {
      if (enabledFields[field] && updates[field as keyof TituloTudoBelo] !== undefined) {
        (finalUpdates as any)[field] = updates[field as keyof TituloTudoBelo];
        changedFields.push(field);
      }
    });

    if (Object.keys(finalUpdates).length === 0) {
      return;
    }

    // Se etapa está sendo alterada, também setar processado_internamente para true
    if (enabledFields['etapa'] && updates.etapa !== undefined) {
      finalUpdates.processado_internamente = true;
    }

    await bulkUpdateMutation.mutateAsync({ ids: selectedIds, updates: finalUpdates });

    // Fechar modal imediatamente após salvar
    onOpenChange(false);
    setUpdates({});
    setEnabledFields({});
    const motivoFinal = motivoAlteracao.trim();
    setMotivoAlteracao("");
    onSuccess?.();

    // Registrar logs em background (não bloqueia o modal)
    const descricao = motivoFinal 
      ? `Edição em massa: ${motivoFinal}` 
      : `Edição em massa de ${changedFields.length} campo(s)`;
    
    for (const tituloId of selectedIds) {
      for (const campo of changedFields) {
        createLog.mutate({
          titulo_id: tituloId,
          campo_alterado: campo,
          valor_anterior: null,
          valor_novo: String(updates[campo as keyof TituloTudoBelo] ?? ''),
          origem: 'usuario',
          descricao: descricao,
        });
      }
    }
  };

  const FieldRow = ({ 
    field, 
    label, 
    children 
  }: { 
    field: string; 
    label: string; 
    children: React.ReactNode;
  }) => (
    <div className="flex items-center gap-4 py-2 border-b border-border/50">
      <Switch
        checked={enabledFields[field] || false}
        onCheckedChange={() => toggleField(field)}
      />
      <Label className="w-40 text-sm">{label}</Label>
      <div className="flex-1">
        {enabledFields[field] ? children : (
          <span className="text-muted-foreground text-sm">Não alterar</span>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar {selectedIds.length} títulos em massa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Ative os campos que deseja alterar. Apenas os campos ativados serão atualizados.
          </p>

          <FieldRow field="status_titulo" label="Status Título">
            <Select
              value={updates.status_titulo || ""}
              onValueChange={(value) => setUpdates({ ...updates, status_titulo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_TITULO_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Campo obrigatório quando status é "Pago" */}
          {isStatusPago && (
            <div className="flex items-center gap-4 py-2 border-b border-border/50 bg-green-50/50 px-2 rounded">
              <Switch
                checked={enabledFields['data_pagamento'] || false}
                onCheckedChange={() => toggleField('data_pagamento')}
                disabled={isStatusPago}
              />
              <Label className="w-40 text-sm font-medium text-green-700">
                Data Pagamento *
              </Label>
              <div className="flex-1">
                <Input
                  type="date"
                  value={updates.data_pagamento || ""}
                  onChange={(e) => setUpdates({ ...updates, data_pagamento: e.target.value })}
                  className="border-green-300 focus:border-green-500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obrigatório para status de pagamento
                </p>
              </div>
            </div>
          )}

          <FieldRow field="etapa" label="Etapa">
            <Select
              value={updates.etapa || ""}
              onValueChange={(value) => setUpdates({ ...updates, etapa: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {etapasDisponiveis?.map((etapaItem) => (
                  <SelectItem key={etapaItem.id} value={etapaItem.etapa || ""}>{etapaItem.etapa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow field="status_cedrus" label="Status Cedrus">
            <Select
              value={updates.status_cedrus || ""}
              onValueChange={(value) => setUpdates({ ...updates, status_cedrus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CEDRUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow field="inserido_cedrus" label="Inserido Cedrus">
            <Select
              value={updates.inserido_cedrus === true ? "true" : updates.inserido_cedrus === false ? "false" : ""}
              onValueChange={(value) => setUpdates({ ...updates, inserido_cedrus: value === "true" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow field="processado_internamente" label="Processado Internamente">
            <Select
              value={updates.processado_internamente === true ? "true" : updates.processado_internamente === false ? "false" : ""}
              onValueChange={(value) => setUpdates({ ...updates, processado_internamente: value === "true" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow field="credor_cedrus" label="Credor Cedrus">
            <Input
              value={updates.credor_cedrus || ""}
              onChange={(e) => setUpdates({ ...updates, credor_cedrus: e.target.value })}
              placeholder="Digite o credor..."
            />
          </FieldRow>

          <FieldRow field="tipo_titulo" label="Tipo Título">
            <Select
              value={updates.tipo_titulo || ""}
              onValueChange={(value) => setUpdates({ ...updates, tipo_titulo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Original">Original</SelectItem>
                <SelectItem value="Negociação">Negociação</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow field="observacoes" label="Observações">
            <Input
              value={updates.observacoes || ""}
              onChange={(e) => setUpdates({ ...updates, observacoes: e.target.value })}
              placeholder="Digite as observações..."
            />
          </FieldRow>

          <FieldRow field="bloqueado" label="Bloqueado">
            <Select
              value={updates.bloqueado === true ? "true" : updates.bloqueado === false ? "false" : ""}
              onValueChange={(value) => setUpdates({ ...updates, bloqueado: value === "true" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim (Bloquear)</SelectItem>
                <SelectItem value="false">Não (Desbloquear)</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Campo de motivo/comentários da alteração */}
          <div className="mt-6 pt-4 border-t border-border">
            <Label className="text-sm font-medium">Motivo da Alteração (opcional)</Label>
            <Textarea
              value={motivoAlteracao}
              onChange={(e) => setMotivoAlteracao(e.target.value)}
              placeholder="Descreva o motivo ou contexto desta alteração..."
              className="mt-2 min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este comentário será registrado no histórico de alterações.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={bulkUpdateMutation.isPending || Object.keys(enabledFields).filter(k => enabledFields[k]).length === 0}
          >
            {bulkUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar {selectedIds.length} títulos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
