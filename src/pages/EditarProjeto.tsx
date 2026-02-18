import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Check, X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProjeto, useCreateProjeto, useUpdateProjeto, ProjetoSplit } from '@/hooks/useGestaoSplitsProjetos';
import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';
import { useTodosCredoresDoCliente } from '@/hooks/useClienteCredores';
import { useBeneficiariosAtivos, Beneficiario } from '@/hooks/useGestaoSplitsBeneficiarios';
import { toast } from 'sonner';

export default function EditarProjeto() {
  const { projetoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !projetoId || projetoId === 'novo';
  const duplicarId = searchParams.get('duplicar');
  
  const { data: projeto, isLoading: loadingProjeto } = useProjeto(isNew && !duplicarId ? undefined : (duplicarId || projetoId));
  const { data: clientes, isLoading: loadingClientes } = useClientesGerenciamentoRecebiveis();
  const { data: beneficiarios } = useBeneficiariosAtivos();
  const createProjeto = useCreateProjeto();
  const updateProjeto = useUpdateProjeto();

  const [formData, setFormData] = useState({ 
    nome: '', 
    descricao: '', 
    credor_cedrus: '', 
    credor_inadimplencia: '', 
    cliente_id: undefined as number | undefined, 
    ativo: true 
  });
  const [selectedClientes, setSelectedClientes] = useState<{id: number, credor_cedrus: string}[]>([]);
  const [splitsNormal, setSplitsNormal] = useState<ProjetoSplit[]>([]);
  const [splitsInadimplencia, setSplitsInadimplencia] = useState<ProjetoSplit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Busca credores vinculados ao cliente selecionado
  const selectedClienteId = selectedClientes.length === 1 ? selectedClientes[0].id : undefined;
  const { data: credoresVinculados } = useTodosCredoresDoCliente(selectedClienteId);

  // Carrega dados do projeto existente ou para duplicação
  useEffect(() => {
    if (projeto && !hasLoadedData) {
      const clienteData = clientes?.find(c => c.credor_cedrus === projeto.credor_cedrus);
      setFormData({
        nome: duplicarId ? `${projeto.nome} (Cópia)` : projeto.nome,
        descricao: projeto.descricao || '',
        credor_cedrus: projeto.credor_cedrus,
        credor_inadimplencia: projeto.credor_inadimplencia || '',
        cliente_id: projeto.cliente_id || clienteData?.id,
        ativo: projeto.ativo
      });
      setSelectedClientes(clienteData ? [{ id: clienteData.id, credor_cedrus: clienteData.credor_cedrus }] : []);
      
      // Separa splits por tipo
      const normal = (projeto.splits || []).filter(s => s.tipo_cobranca === 'normal' || !s.tipo_cobranca);
      const inadimplencia = (projeto.splits || []).filter(s => s.tipo_cobranca === 'inadimplencia');
      setSplitsNormal(normal.map(s => ({ ...s, tipo_cobranca: 'normal' })));
      setSplitsInadimplencia(inadimplencia);
      setHasLoadedData(true);
    }
  }, [projeto, clientes, hasLoadedData, duplicarId]);

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

  // Validação
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!formData.nome.trim()) errors.push('Nome do projeto é obrigatório');
    if (selectedClientes.length === 0) errors.push('Selecione pelo menos um cliente');
    if (splitsNormal.length === 0) errors.push('Configure pelo menos um split para Cobrança Normal');
    if (splitsInadimplencia.length === 0) errors.push('Configure pelo menos um split para Inadimplência');
    
    // Valida se todos os splits têm wallet_id
    const invalidNormal = splitsNormal.some(s => !s.wallet_id);
    const invalidInadimplencia = splitsInadimplencia.some(s => !s.wallet_id);
    if (invalidNormal) errors.push('Selecione o beneficiário para todos os splits de Cobrança Normal');
    if (invalidInadimplencia) errors.push('Selecione o beneficiário para todos os splits de Inadimplência');
    
    // Valida soma dos percentuais
    if (somaPercentualNormal > 100) errors.push(`Soma dos percentuais de Cobrança Normal excede 100% (${somaPercentualNormal.toFixed(2)}%)`);
    if (somaPercentualInadimplencia > 100) errors.push(`Soma dos percentuais de Inadimplência excede 100% (${somaPercentualInadimplencia.toFixed(2)}%)`);
    
    return errors;
  }, [formData.nome, selectedClientes, splitsNormal, splitsInadimplencia, somaPercentualNormal, somaPercentualInadimplencia]);

  const canSave = validationErrors.length === 0;

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }

    const allSplits = [
      ...splitsNormal.map(s => ({ ...s, tipo_cobranca: 'normal' as const })),
      ...splitsInadimplencia.map(s => ({ ...s, tipo_cobranca: 'inadimplencia' as const }))
    ];

    try {
      if (!isNew && projetoId) {
        await updateProjeto.mutateAsync({
          id: projetoId,
          ...formData,
          credor_cedrus: selectedClientes[0].credor_cedrus,
          cliente_id: selectedClientes[0].id,
          splits: allSplits
        });
      } else {
        for (const cliente of selectedClientes) {
          await createProjeto.mutateAsync({
            ...formData,
            credor_cedrus: cliente.credor_cedrus,
            cliente_id: cliente.id,
            splits: allSplits
          });
        }
      }
      navigate('/gestao-projetos');
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
    }
  };

  const toggleCliente = (cliente: { id: number, credor_cedrus: string }) => {
    if (!isNew) {
      setSelectedClientes([cliente]);
    } else {
      setSelectedClientes(prev =>
        prev.some(c => c.id === cliente.id)
          ? prev.filter(c => c.id !== cliente.id)
          : [...prev, cliente]
      );
    }
  };

  const selectAllClientes = () => {
    if (!clientes) return;
    const filtered = clientes.filter(c =>
      c.credor_cedrus.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nome_credor?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
    setSelectedClientes(filtered.map(c => ({ id: c.id, credor_cedrus: c.credor_cedrus })));
  };

  const clearClienteSelection = () => {
    setSelectedClientes([]);
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

  const filteredClientes = clientes?.filter(c =>
    c.credor_cedrus.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nome_credor?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  ) || [];

  const renderSplitCard = (
    split: ProjetoSplit, 
    index: number, 
    updateFn: (index: number, field: keyof ProjetoSplit, value: any) => void,
    removeFn: (index: number) => void
  ) => (
    <div key={index} className="flex gap-2 items-start p-3 border rounded-md bg-card">
      <div className="flex-1 space-y-2">
        <Select
          value={split.wallet_id}
          onValueChange={(value) => updateFn(index, 'wallet_id', value)}
        >
          <SelectTrigger>
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
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={split.tipo_valor}
            onChange={(e) => updateFn(index, 'tipo_valor', e.target.value)}
          >
            <option value="percentualValue">Percentual (%)</option>
            <option value="fixedValue">Valor Fixo (R$)</option>
          </select>
          <Input
            type="number"
            placeholder={split.tipo_valor === 'percentualValue' ? '% do valor' : 'Valor fixo'}
            value={split.valor}
            onChange={(e) => updateFn(index, 'valor', parseFloat(e.target.value) || 0)}
            className="w-32"
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
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );

  if ((!isNew && !duplicarId) && loadingProjeto) {
    return (
      <div className="w-full px-4 py-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestao-projetos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? (duplicarId ? 'Duplicar Projeto' : 'Novo Projeto') : 'Editar Projeto'}
            </h1>
            <p className="text-muted-foreground">
              Configure o projeto e os splits para cobrança normal e inadimplência
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/gestao-projetos')}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || createProjeto.isPending || updateProjeto.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {!isNew ? 'Salvar' : selectedClientes.length > 1 ? `Criar ${selectedClientes.length} projetos` : 'Criar Projeto'}
          </Button>
        </div>
      </div>

      {/* Erros de validação */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do Projeto */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Projeto</CardTitle>
            <CardDescription>Informações básicas do projeto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Projeto *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do projeto"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do projeto (opcional)"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Projeto Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isNew ? 'Clientes' : 'Cliente'} *
            </CardTitle>
            <CardDescription>
              Apenas clientes com gerenciamento de recebíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNew && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllClientes}>
                  <Check className="h-3 w-3 mr-1" />Selecionar Todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearClienteSelection}>
                  <X className="h-3 w-3 mr-1" />Limpar
                </Button>
                {selectedClientes.length > 0 && (
                  <Badge variant="secondary">{selectedClientes.length} selecionado(s)</Badge>
                )}
              </div>
            )}

            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <ScrollArea className="h-[200px] border rounded-md p-2">
              {loadingClientes ? (
                <p className="text-center text-muted-foreground py-4">Carregando clientes...</p>
              ) : filteredClientes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum cliente encontrado</p>
              ) : (
                <div className="space-y-1">
                  {filteredClientes.map((cliente) => (
                    <label
                      key={cliente.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedClientes.some(c => c.id === cliente.id)}
                        onCheckedChange={() => toggleCliente({ id: cliente.id, credor_cedrus: cliente.credor_cedrus })}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{cliente.credor_cedrus}</p>
                        {cliente.nome_credor && (
                          <p className="text-xs text-muted-foreground truncate">{cliente.nome_credor}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Credor Inadimplência */}
            {selectedClientes.length === 1 && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Credor Inadimplência</Label>
                <Input
                  value={formData.credor_inadimplencia || ''}
                  onChange={(e) => setFormData({ ...formData, credor_inadimplencia: e.target.value })}
                  placeholder="Digite o credor para inadimplência (opcional)"
                />
                <p className="text-xs text-muted-foreground">
                  Credor utilizado para cobranças de inadimplência neste projeto
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Splits Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Splits Cobrança Normal */}
        <Card className={splitsNormal.length === 0 ? 'border-destructive/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Cobrança Normal
                  <Badge variant="outline">{splitsNormal.length} split(s)</Badge>
                  {somaPercentualNormal > 0 && (
                    <Badge variant={somaPercentualNormal > 100 ? "destructive" : "secondary"}>
                      {somaPercentualNormal.toFixed(2)}%
                    </Badge>
                  )}
                </CardTitle>
              <CardDescription>
                  Splits aplicados em cobranças normais. Mínimo: 1 split. {somaPercentualNormal > 100 && <span className="text-destructive font-medium">Percentual excede 100%!</span>}
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSplitNormal}>
                <Plus className="h-3 w-3 mr-1" />Adicionar Split
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de progresso visual dos percentuais */}
            {splitsNormal.some(s => s.tipo_valor === 'percentualValue') && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Distribuição Percentual</span>
                  <span className={somaPercentualNormal > 100 ? 'text-destructive font-medium' : ''}>
                    {somaPercentualNormal.toFixed(1)}% / 100%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                  {splitsNormal
                    .filter(s => s.tipo_valor === 'percentualValue' && s.valor > 0)
                    .map((split, idx) => {
                      const beneficiario = beneficiarios?.find(b => b.wallet_id === split.wallet_id);
                      const colors = ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
                      return (
                        <div
                          key={idx}
                          className={`${colors[idx % colors.length]} transition-all duration-300`}
                          style={{ width: `${Math.min(split.valor, 100 - splitsNormal.slice(0, idx).filter(s => s.tipo_valor === 'percentualValue').reduce((a, s) => a + s.valor, 0))}%` }}
                          title={`${beneficiario?.nome || 'N/A'}: ${split.valor}%`}
                        />
                      );
                    })}
                  {somaPercentualNormal < 100 && (
                    <div 
                      className="bg-muted-foreground/20" 
                      style={{ width: `${100 - somaPercentualNormal}%` }}
                      title={`Não alocado: ${(100 - somaPercentualNormal).toFixed(1)}%`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {splitsNormal
                    .filter(s => s.tipo_valor === 'percentualValue' && s.valor > 0)
                    .map((split, idx) => {
                      const beneficiario = beneficiarios?.find(b => b.wallet_id === split.wallet_id);
                      const colors = ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                          <span>{beneficiario?.nome || 'N/A'}: {split.valor}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {splitsNormal.length === 0 ? (
              <div className="text-center py-8 border rounded-md border-dashed border-destructive/50">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive/70" />
                <p className="text-sm text-destructive">Obrigatório: Configure pelo menos um split</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addSplitNormal}>
                  <Plus className="h-3 w-3 mr-1" />Adicionar Split
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {splitsNormal.map((split, index) => 
                  renderSplitCard(split, index, updateSplitNormal, removeSplitNormal)
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Splits Inadimplência */}
        <Card className={splitsInadimplencia.length === 0 ? 'border-destructive/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Inadimplência
                  <Badge variant="outline">{splitsInadimplencia.length} split(s)</Badge>
                  {somaPercentualInadimplencia > 0 && (
                    <Badge variant={somaPercentualInadimplencia > 100 ? "destructive" : "secondary"}>
                      {somaPercentualInadimplencia.toFixed(2)}%
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Splits aplicados em cobranças de inadimplência. Mínimo: 1 split. {somaPercentualInadimplencia > 100 && <span className="text-destructive font-medium">Percentual excede 100%!</span>}
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSplitInadimplencia}>
                <Plus className="h-3 w-3 mr-1" />Adicionar Split
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de progresso visual dos percentuais */}
            {splitsInadimplencia.some(s => s.tipo_valor === 'percentualValue') && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Distribuição Percentual</span>
                  <span className={somaPercentualInadimplencia > 100 ? 'text-destructive font-medium' : ''}>
                    {somaPercentualInadimplencia.toFixed(1)}% / 100%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                  {splitsInadimplencia
                    .filter(s => s.tipo_valor === 'percentualValue' && s.valor > 0)
                    .map((split, idx) => {
                      const beneficiario = beneficiarios?.find(b => b.wallet_id === split.wallet_id);
                      const colors = ['bg-orange-500', 'bg-red-500', 'bg-amber-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-violet-500'];
                      return (
                        <div
                          key={idx}
                          className={`${colors[idx % colors.length]} transition-all duration-300`}
                          style={{ width: `${Math.min(split.valor, 100 - splitsInadimplencia.slice(0, idx).filter(s => s.tipo_valor === 'percentualValue').reduce((a, s) => a + s.valor, 0))}%` }}
                          title={`${beneficiario?.nome || 'N/A'}: ${split.valor}%`}
                        />
                      );
                    })}
                  {somaPercentualInadimplencia < 100 && (
                    <div 
                      className="bg-muted-foreground/20" 
                      style={{ width: `${100 - somaPercentualInadimplencia}%` }}
                      title={`Não alocado: ${(100 - somaPercentualInadimplencia).toFixed(1)}%`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {splitsInadimplencia
                    .filter(s => s.tipo_valor === 'percentualValue' && s.valor > 0)
                    .map((split, idx) => {
                      const beneficiario = beneficiarios?.find(b => b.wallet_id === split.wallet_id);
                      const colors = ['bg-orange-500', 'bg-red-500', 'bg-amber-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-violet-500'];
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                          <span>{beneficiario?.nome || 'N/A'}: {split.valor}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {splitsInadimplencia.length === 0 ? (
              <div className="text-center py-8 border rounded-md border-dashed border-destructive/50">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive/70" />
                <p className="text-sm text-destructive">Obrigatório: Configure pelo menos um split</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addSplitInadimplencia}>
                  <Plus className="h-3 w-3 mr-1" />Adicionar Split
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {splitsInadimplencia.map((split, index) => 
                  renderSplitCard(split, index, updateSplitInadimplencia, removeSplitInadimplencia)
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
