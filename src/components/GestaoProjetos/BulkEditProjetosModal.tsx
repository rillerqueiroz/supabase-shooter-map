import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBulkUpdateProjetos } from '@/hooks/useBulkUpdateProjetos';
import { useBeneficiariosAtivos, Beneficiario } from '@/hooks/useGestaoSplitsBeneficiarios';
import { ProjetoSplit } from '@/hooks/useGestaoSplitsProjetos';

interface Cliente {
  id: number;
  credor_cedrus: string;
  nome_credor?: string;
}

interface BulkEditProjetosModalProps {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  clientes: Cliente[];
  onSuccess?: () => void;
}

export function BulkEditProjetosModal({
  open,
  onClose,
  selectedIds,
  clientes,
  onSuccess
}: BulkEditProjetosModalProps) {
  const bulkUpdate = useBulkUpdateProjetos();
  const { data: beneficiarios } = useBeneficiariosAtivos();

  // Estados para controlar quais campos editar
  const [editNome, setEditNome] = useState(false);
  const [editDescricao, setEditDescricao] = useState(false);
  const [editCliente, setEditCliente] = useState(false);
  const [editCredorInadimplencia, setEditCredorInadimplencia] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [editSplits, setEditSplits] = useState(false);

  // Valores dos campos
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<number | undefined>(undefined);
  const [credorCedrus, setCredorCedrus] = useState('');
  const [credorInadimplencia, setCredorInadimplencia] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [splitsNormal, setSplitsNormal] = useState<ProjetoSplit[]>([]);
  const [splitsInadimplencia, setSplitsInadimplencia] = useState<ProjetoSplit[]>([]);
  const [appendSplits, setAppendSplits] = useState(false);

  // Calcula soma dos percentuais
  const somaPercentualNormal = useMemo(() => {
    return splitsNormal
      .filter(s => s.tipo_valor === 'percentualValue')
      .reduce((acc, s) => acc + (s.valor || 0), 0);
  }, [splitsNormal]);

  const somaPercentualInadimplencia = useMemo(() => {
    return splitsInadimplencia
      .filter(s => s.tipo_valor === 'percentualValue')
      .reduce((acc, s) => acc + (s.valor || 0), 0);
  }, [splitsInadimplencia]);

  // Validação de splits
  const splitsValidationErrors = useMemo(() => {
    const errors: string[] = [];
    if (editSplits) {
      if (somaPercentualNormal > 100) {
        errors.push(`Cobrança Normal: soma dos percentuais excede 100% (${somaPercentualNormal.toFixed(2)}%)`);
      }
      if (somaPercentualInadimplencia > 100) {
        errors.push(`Inadimplência: soma dos percentuais excede 100% (${somaPercentualInadimplencia.toFixed(2)}%)`);
      }
      const invalidNormal = splitsNormal.some(s => !s.wallet_id);
      const invalidInadimplencia = splitsInadimplencia.some(s => !s.wallet_id);
      if (invalidNormal && splitsNormal.length > 0) {
        errors.push('Selecione o beneficiário para todos os splits de Cobrança Normal');
      }
      if (invalidInadimplencia && splitsInadimplencia.length > 0) {
        errors.push('Selecione o beneficiário para todos os splits de Inadimplência');
      }
    }
    return errors;
  }, [editSplits, splitsNormal, splitsInadimplencia, somaPercentualNormal, somaPercentualInadimplencia]);

  const handleClose = () => {
    // Reset states
    setEditNome(false);
    setEditDescricao(false);
    setEditCliente(false);
    setEditCredorInadimplencia(false);
    setEditStatus(false);
    setEditSplits(false);
    setNome('');
    setDescricao('');
    setSelectedClienteId(undefined);
    setCredorCedrus('');
    setCredorInadimplencia('');
    setAtivo(true);
    setSplitsNormal([]);
    setSplitsInadimplencia([]);
    setAppendSplits(false);
    onClose();
  };

  const handleClienteChange = (clienteIdStr: string) => {
    const clienteId = parseInt(clienteIdStr, 10);
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setSelectedClienteId(clienteId);
      setCredorCedrus(cliente.credor_cedrus);
    }
  };

  const handleSubmit = async () => {
    if (splitsValidationErrors.length > 0) return;

    const updateData: any = {
      projetoIds: selectedIds
    };

    if (editNome && nome.trim()) {
      updateData.nome = nome.trim();
    }
    if (editDescricao) {
      updateData.descricao = descricao.trim();
    }
    if (editCliente && selectedClienteId && credorCedrus) {
      updateData.credor_cedrus = credorCedrus;
      updateData.cliente_id = selectedClienteId;
    }
    if (editCredorInadimplencia) {
      updateData.credor_inadimplencia = credorInadimplencia.trim();
    }
    if (editStatus) {
      updateData.ativo = ativo;
    }
    if (editSplits && (splitsNormal.length > 0 || splitsInadimplencia.length > 0)) {
      const allSplits = [
        ...splitsNormal.map(s => ({ ...s, tipo_cobranca: 'normal' as const })),
        ...splitsInadimplencia.map(s => ({ ...s, tipo_cobranca: 'inadimplencia' as const }))
      ];
      updateData.splits = allSplits;
      updateData.appendSplits = appendSplits;
    }

    await bulkUpdate.mutateAsync(updateData);
    onSuccess?.();
    handleClose();
  };

  // Funções para splits normais
  const addSplitNormal = () => {
    setSplitsNormal([...splitsNormal, { wallet_id: '', tipo_valor: 'percentualValue', valor: 0, description: '', tipo_cobranca: 'normal' }]);
  };

  const removeSplitNormal = (index: number) => {
    setSplitsNormal(splitsNormal.filter((_, i) => i !== index));
  };

  const updateSplitNormal = (index: number, field: keyof ProjetoSplit, value: any) => {
    const newSplits = [...splitsNormal];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplitsNormal(newSplits);
  };

  // Funções para splits inadimplência
  const addSplitInadimplencia = () => {
    setSplitsInadimplencia([...splitsInadimplencia, { wallet_id: '', tipo_valor: 'percentualValue', valor: 0, description: '', tipo_cobranca: 'inadimplencia' }]);
  };

  const removeSplitInadimplencia = (index: number) => {
    setSplitsInadimplencia(splitsInadimplencia.filter((_, i) => i !== index));
  };

  const updateSplitInadimplencia = (index: number, field: keyof ProjetoSplit, value: any) => {
    const newSplits = [...splitsInadimplencia];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplitsInadimplencia(newSplits);
  };

  const renderSplitCard = (
    split: ProjetoSplit,
    index: number,
    updateFn: (index: number, field: keyof ProjetoSplit, value: any) => void,
    removeFn: (index: number) => void
  ) => (
    <div key={index} className="flex gap-2 items-start p-3 border rounded-md bg-muted/20">
      <div className="flex-1 space-y-2">
        <Select
          value={split.wallet_id}
          onValueChange={(value) => updateFn(index, 'wallet_id', value)}
        >
          <SelectTrigger className={!split.wallet_id ? 'border-destructive' : ''}>
            <SelectValue placeholder="Selecione o beneficiário" />
          </SelectTrigger>
          <SelectContent>
            {beneficiarios?.map((b: Beneficiario) => (
              <SelectItem key={b.id} value={b.wallet_id}>
                <div className="flex flex-col">
                  <span>{b.nome}</span>
                  <span className="text-xs text-muted-foreground">{b.wallet_id}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Select
            value={split.tipo_valor}
            onValueChange={(val) => updateFn(index, 'tipo_valor', val as 'fixedValue' | 'percentualValue')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentualValue">Percentual (%)</SelectItem>
              <SelectItem value="fixedValue">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder={split.tipo_valor === 'percentualValue' ? '% do valor' : 'Valor fixo'}
            value={split.valor}
            onChange={(e) => updateFn(index, 'valor', parseFloat(e.target.value) || 0)}
            className="w-28"
          />
        </div>
        <Input
          placeholder="Descrição (opcional)"
          value={split.description || ''}
          onChange={(e) => updateFn(index, 'description', e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => removeFn(index)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const hasChanges = editNome || editDescricao || editCliente || editCredorInadimplencia || editStatus || (editSplits && (splitsNormal.length > 0 || splitsInadimplencia.length > 0));
  const canSubmit = hasChanges && splitsValidationErrors.length === 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edição em Lote de Projetos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Atualizando <Badge variant="secondary">{selectedIds.length}</Badge> projeto(s) selecionado(s)
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alterar Nome */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-nome"
                checked={editNome}
                onCheckedChange={(checked) => setEditNome(!!checked)}
              />
              <Label htmlFor="edit-nome" className="font-medium cursor-pointer">
                Alterar Nome
              </Label>
            </div>
            {editNome && (
              <Input
                placeholder="Novo nome para todos os projetos"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="ml-7"
              />
            )}
          </div>

          {/* Alterar Descrição */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-descricao"
                checked={editDescricao}
                onCheckedChange={(checked) => setEditDescricao(!!checked)}
              />
              <Label htmlFor="edit-descricao" className="font-medium cursor-pointer">
                Alterar Descrição
              </Label>
            </div>
            {editDescricao && (
              <Textarea
                placeholder="Nova descrição para todos os projetos"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                className="ml-7"
              />
            )}
          </div>

          {/* Alterar Cliente */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-cliente"
                checked={editCliente}
                onCheckedChange={(checked) => setEditCliente(!!checked)}
              />
              <Label htmlFor="edit-cliente" className="font-medium cursor-pointer">
                Alterar Cliente (credor_cedrus)
              </Label>
            </div>
            {editCliente && (
              <Select value={selectedClienteId?.toString() || ''} onValueChange={handleClienteChange}>
                <SelectTrigger className="ml-7">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nome_credor || cliente.credor_cedrus}
                      {cliente.nome_credor && (
                        <span className="text-muted-foreground ml-2">({cliente.credor_cedrus})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Alterar Credor Inadimplência */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-credor-inadimplencia"
                checked={editCredorInadimplencia}
                onCheckedChange={(checked) => setEditCredorInadimplencia(!!checked)}
              />
              <Label htmlFor="edit-credor-inadimplencia" className="font-medium cursor-pointer">
                Alterar Credor Inadimplência
              </Label>
            </div>
            {editCredorInadimplencia && (
              <Input
                placeholder="Novo credor inadimplência para todos os projetos"
                value={credorInadimplencia}
                onChange={(e) => setCredorInadimplencia(e.target.value)}
                className="ml-7"
              />
            )}
          </div>

          {/* Alterar Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-status"
                checked={editStatus}
                onCheckedChange={(checked) => setEditStatus(!!checked)}
              />
              <Label htmlFor="edit-status" className="font-medium cursor-pointer">
                Alterar Status
              </Label>
            </div>
            {editStatus && (
              <div className="flex items-center gap-4 ml-7">
                <RadioGroup
                  value={ativo ? 'ativo' : 'inativo'}
                  onValueChange={(val) => setAtivo(val === 'ativo')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ativo" id="status-ativo" />
                    <Label htmlFor="status-ativo" className="cursor-pointer">Ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="inativo" id="status-inativo" />
                    <Label htmlFor="status-inativo" className="cursor-pointer">Inativo</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Configurar Splits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-splits"
                checked={editSplits}
                onCheckedChange={(checked) => setEditSplits(!!checked)}
              />
              <Label htmlFor="edit-splits" className="font-medium cursor-pointer">
                Configurar Splits
              </Label>
            </div>
            {editSplits && (
              <div className="ml-7 space-y-4 border rounded-lg p-4">
                {/* Erros de validação */}
                {splitsValidationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {splitsValidationErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Modo de aplicação */}
                <div className="space-y-2">
                  <Label className="text-sm">Modo de aplicação:</Label>
                  <RadioGroup
                    value={appendSplits ? 'append' : 'replace'}
                    onValueChange={(val) => setAppendSplits(val === 'append')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="replace" id="mode-replace" />
                      <Label htmlFor="mode-replace" className="cursor-pointer text-sm">
                        Substituir splits existentes
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="append" id="mode-append" />
                      <Label htmlFor="mode-append" className="cursor-pointer text-sm">
                        Adicionar aos existentes
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Splits Cobrança Normal */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Cobrança Normal
                      {splitsNormal.length > 0 && <Badge variant="outline">{splitsNormal.length}</Badge>}
                      {somaPercentualNormal > 0 && (
                        <Badge variant={somaPercentualNormal > 100 ? "destructive" : "secondary"}>
                          {somaPercentualNormal.toFixed(1)}%
                        </Badge>
                      )}
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSplitNormal}>
                      <Plus className="h-3 w-3 mr-1" />Adicionar
                    </Button>
                  </div>
                  
                  {/* Barra de progresso */}
                  {somaPercentualNormal > 0 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${somaPercentualNormal > 100 ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${Math.min(somaPercentualNormal, 100)}%` }}
                      />
                    </div>
                  )}
                  
                  {splitsNormal.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2 border rounded-md bg-muted/30">
                      Nenhum split configurado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {splitsNormal.map((split, index) => 
                        renderSplitCard(split, index, updateSplitNormal, removeSplitNormal)
                      )}
                    </div>
                  )}
                </div>

                {/* Splits Inadimplência */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Inadimplência
                      {splitsInadimplencia.length > 0 && <Badge variant="outline">{splitsInadimplencia.length}</Badge>}
                      {somaPercentualInadimplencia > 0 && (
                        <Badge variant={somaPercentualInadimplencia > 100 ? "destructive" : "secondary"}>
                          {somaPercentualInadimplencia.toFixed(1)}%
                        </Badge>
                      )}
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSplitInadimplencia}>
                      <Plus className="h-3 w-3 mr-1" />Adicionar
                    </Button>
                  </div>
                  
                  {/* Barra de progresso */}
                  {somaPercentualInadimplencia > 0 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${somaPercentualInadimplencia > 100 ? 'bg-destructive' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min(somaPercentualInadimplencia, 100)}%` }}
                      />
                    </div>
                  )}
                  
                  {splitsInadimplencia.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2 border rounded-md bg-muted/30">
                      Nenhum split configurado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {splitsInadimplencia.map((split, index) => 
                        renderSplitCard(split, index, updateSplitInadimplencia, removeSplitInadimplencia)
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || bulkUpdate.isPending}
          >
            {bulkUpdate.isPending ? 'Atualizando...' : `Atualizar ${selectedIds.length} projeto(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
