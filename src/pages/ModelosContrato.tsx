import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, FileText, Check, X, GripVertical, Settings, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useModelosContrato, 
  useCreateModeloContrato, 
  useUpdateModeloContrato, 
  useDeleteModeloContrato, 
  useCamposModelo,
  useBulkSaveCamposModelo,
  useDuplicateModeloContrato,
  ModeloContrato,
  CampoModelo
} from '@/hooks/useGestaoSplitsModelosContrato';
import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';

type TipoCampo = CampoModelo['tipo'];

interface CampoFormulario {
  id?: string;
  nome: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  ordem: number;
  placeholder: string;
  opcoes: string;
}

const TIPOS_CAMPO: { value: TipoCampo; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'data', label: 'Data' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { value: 'moeda', label: 'Moeda (R$)' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'multipla_escolha', label: 'Múltipla Escolha' },
  { value: 'radio', label: 'Opção Única (Radio)' },
];

export default function ModelosContrato() {
  const { data: modelos, isLoading } = useModelosContrato();
  const { data: clientes, isLoading: loadingClientes } = useClientesGerenciamentoRecebiveis();
  const createModelo = useCreateModeloContrato();
  const updateModelo = useUpdateModeloContrato();
  const deleteModelo = useDeleteModeloContrato();
  const bulkSaveCampos = useBulkSaveCamposModelo();
  const duplicateModelo = useDuplicateModeloContrato();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);
  const [formData, setFormData] = useState({ nome: '', google_docs_id: '', credor_cedrus: '', ativo: true });
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dados');

  // Estado para gerenciamento de campos (usado tanto no dialog de edição quanto no de novo modelo)
  const [camposDialogOpen, setCamposDialogOpen] = useState(false);
  const [selectedModeloId, setSelectedModeloId] = useState<string | null>(null);
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [camposNovoModelo, setCamposNovoModelo] = useState<CampoFormulario[]>([]);

  const { data: camposExistentes } = useCamposModelo(selectedModeloId || undefined);

  // Quando abre o dialog de campos, carrega os campos existentes
  useEffect(() => {
    if (camposExistentes && camposDialogOpen) {
      setCampos(camposExistentes.map(c => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        obrigatorio: c.obrigatorio,
        ordem: c.ordem,
        placeholder: c.placeholder || '',
        opcoes: c.opcoes || ''
      })));
    }
  }, [camposExistentes, camposDialogOpen]);

  const openNew = () => {
    setEditingModelo(null);
    setFormData({ nome: '', google_docs_id: '', credor_cedrus: '', ativo: true });
    setSelectedClientes([]);
    setSearchTerm('');
    setCamposNovoModelo([]);
    setActiveTab('dados');
    setDialogOpen(true);
  };

  const openEdit = (modelo: ModeloContrato) => {
    setEditingModelo(modelo);
    setFormData({ nome: modelo.nome, google_docs_id: modelo.google_docs_id, credor_cedrus: modelo.credor_cedrus, ativo: modelo.ativo });
    setSelectedClientes([modelo.credor_cedrus]);
    setSearchTerm('');
    setDialogOpen(true);
  };

  const openCampos = (modelo: ModeloContrato) => {
    setSelectedModeloId(modelo.id);
    setCampos([]);
    setCamposDialogOpen(true);
  };

  const handleSave = async () => {
    if (selectedClientes.length === 0) return;

    if (editingModelo) {
      await updateModelo.mutateAsync({ id: editingModelo.id, ...formData, credor_cedrus: selectedClientes[0] });
    } else {
      // Para novo modelo, criar o modelo e depois os campos
      for (const credor of selectedClientes) {
        const novoModelo = await createModelo.mutateAsync({ ...formData, credor_cedrus: credor });
        
        // Se há campos definidos, salvar
        if (camposNovoModelo.length > 0 && novoModelo) {
          await bulkSaveCampos.mutateAsync({
            modelo_id: novoModelo.id,
            campos: camposNovoModelo.map((c, index) => ({
              nome: c.nome,
              tipo: c.tipo,
              obrigatorio: c.obrigatorio,
              ordem: index,
              placeholder: c.placeholder || undefined,
              opcoes: c.opcoes || undefined
            }))
          });
        }
      }
    }
    setDialogOpen(false);
  };

  const handleDuplicate = async (modeloId: string) => {
    if (confirm('Deseja duplicar este modelo com todos os seus campos?')) {
      await duplicateModelo.mutateAsync(modeloId);
    }
  };

  const handleSaveCampos = async () => {
    if (!selectedModeloId) return;

    await bulkSaveCampos.mutateAsync({
      modelo_id: selectedModeloId,
      campos: campos.map((c, index) => ({
        nome: c.nome,
        tipo: c.tipo,
        obrigatorio: c.obrigatorio,
        ordem: index,
        placeholder: c.placeholder || undefined,
        opcoes: c.opcoes || undefined
      }))
    });
    setCamposDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este modelo?')) {
      await deleteModelo.mutateAsync(id);
    }
  };

  const toggleCliente = (credor: string) => {
    if (editingModelo) {
      setSelectedClientes([credor]);
    } else {
      setSelectedClientes(prev => 
        prev.includes(credor) 
          ? prev.filter(c => c !== credor)
          : [...prev, credor]
      );
    }
  };

  const selectAll = () => {
    if (!clientes) return;
    const filtered = clientes.filter(c => 
      c.credor_cedrus.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nome_credor?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
    setSelectedClientes(filtered.map(c => c.credor_cedrus));
  };

  const clearSelection = () => {
    setSelectedClientes([]);
  };

  const filteredClientes = clientes?.filter(c => 
    c.credor_cedrus.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nome_credor?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  ) || [];

  // Funções para gerenciar campos (modal de configuração separado)
  const addCampo = () => {
    setCampos(prev => [...prev, {
      nome: '',
      tipo: 'texto',
      obrigatorio: false,
      ordem: prev.length,
      placeholder: '',
      opcoes: ''
    }]);
  };

  const removeCampo = (index: number) => {
    setCampos(prev => prev.filter((_, i) => i !== index));
  };

  const updateCampo = (index: number, field: keyof CampoFormulario, value: any) => {
    setCampos(prev => prev.map((c, i) => 
      i === index ? { ...c, [field]: value } : c
    ));
  };

  const moveCampo = (from: number, to: number) => {
    if (to < 0 || to >= campos.length) return;
    const newCampos = [...campos];
    const [removed] = newCampos.splice(from, 1);
    newCampos.splice(to, 0, removed);
    setCampos(newCampos);
  };

  // Funções para gerenciar campos do novo modelo (dentro do dialog de criação)
  const addCampoNovoModelo = () => {
    setCamposNovoModelo(prev => [...prev, {
      nome: '',
      tipo: 'texto',
      obrigatorio: false,
      ordem: prev.length,
      placeholder: '',
      opcoes: ''
    }]);
  };

  const removeCampoNovoModelo = (index: number) => {
    setCamposNovoModelo(prev => prev.filter((_, i) => i !== index));
  };

  const updateCampoNovoModelo = (index: number, field: keyof CampoFormulario, value: any) => {
    setCamposNovoModelo(prev => prev.map((c, i) => 
      i === index ? { ...c, [field]: value } : c
    ));
  };

  const moveCampoNovoModelo = (from: number, to: number) => {
    if (to < 0 || to >= camposNovoModelo.length) return;
    const newCampos = [...camposNovoModelo];
    const [removed] = newCampos.splice(from, 1);
    newCampos.splice(to, 0, removed);
    setCamposNovoModelo(newCampos);
  };

  const selectedModelo = modelos?.find(m => m.id === selectedModeloId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modelos de Contrato</h1>
          <p className="text-muted-foreground">Gerencie os modelos de contrato do Google Docs</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Modelo</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>ID Google Docs</TableHead>
                <TableHead>Campos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
              ) : modelos?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum modelo cadastrado</TableCell></TableRow>
              ) : modelos?.map((modelo) => (
                <TableRow key={modelo.id}>
                  <TableCell className="font-medium"><FileText className="h-4 w-4 inline mr-2" />{modelo.nome}</TableCell>
                  <TableCell>{modelo.credor_cedrus}</TableCell>
                  <TableCell className="font-mono text-sm">{modelo.google_docs_id}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openCampos(modelo)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar
                    </Button>
                  </TableCell>
                  <TableCell><Badge variant={modelo.ativo ? 'default' : 'secondary'}>{modelo.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(modelo)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(modelo.id)} title="Duplicar" disabled={duplicateModelo.isPending}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(modelo.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar Modelo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingModelo ? 'Editar Modelo' : 'Novo Modelo de Contrato'}</DialogTitle>
          </DialogHeader>
          
          {!editingModelo ? (
            // Novo modelo com abas
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados do Modelo</TabsTrigger>
                <TabsTrigger value="campos">Campos Personalizados</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dados" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Modelo</Label>
                    <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome do modelo" />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Clientes 
                      <span className="text-muted-foreground text-sm ml-2">
                        (apenas com gerenciamento de recebíveis)
                      </span>
                    </Label>
                    
                    <div className="flex gap-2 mb-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                        <Check className="h-3 w-3 mr-1" />Selecionar Todos
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                        <X className="h-3 w-3 mr-1" />Limpar
                      </Button>
                      {selectedClientes.length > 0 && (
                        <Badge variant="secondary">{selectedClientes.length} selecionado(s)</Badge>
                      )}
                    </div>

                    <Input 
                      placeholder="Buscar cliente..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                    />

                    <ScrollArea className="h-[180px] border rounded-md p-2">
                      {loadingClientes ? (
                        <p className="text-center text-muted-foreground py-4">Carregando clientes...</p>
                      ) : filteredClientes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nenhum cliente encontrado</p>
                      ) : (
                        <div className="space-y-1">
                          {filteredClientes.map((cliente) => (
                            <label
                              key={cliente.credor_cedrus}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedClientes.includes(cliente.credor_cedrus)}
                                onCheckedChange={() => toggleCliente(cliente.credor_cedrus)}
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
                  </div>

                  <div className="space-y-2">
                    <Label>ID do Google Docs</Label>
                    <Input value={formData.google_docs_id} onChange={(e) => setFormData({ ...formData, google_docs_id: e.target.value })} placeholder="ID do documento" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Ativo</Label>
                    <Switch checked={formData.ativo} onCheckedChange={(v) => setFormData({ ...formData, ativo: v })} />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="campos" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-3">
                  {camposNovoModelo.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p>Nenhum campo configurado</p>
                      <p className="text-sm">Clique em "Adicionar Campo" para começar</p>
                    </div>
                  ) : (
                    camposNovoModelo.map((campo, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                      >
                        <div className="flex flex-col gap-1 pt-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => moveCampoNovoModelo(index, index - 1)}
                            disabled={index === 0}
                          >
                            <span className="text-xs">▲</span>
                          </Button>
                          <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => moveCampoNovoModelo(index, index + 1)}
                            disabled={index === camposNovoModelo.length - 1}
                          >
                            <span className="text-xs">▼</span>
                          </Button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs">Nome do Campo</Label>
                            <Input
                              value={campo.nome}
                              onChange={(e) => updateCampoNovoModelo(index, 'nome', e.target.value)}
                              placeholder="Ex: Endereço Completo"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select 
                              value={campo.tipo} 
                              onValueChange={(v) => updateCampoNovoModelo(index, 'tipo', v as TipoCampo)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIPOS_CAMPO.map(tipo => (
                                  <SelectItem key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {(campo.tipo === 'multipla_escolha' || campo.tipo === 'radio') && (
                            <div className="md:col-span-4 space-y-1">
                              <Label className="text-xs">Opções (separadas por vírgula)</Label>
                              <Input
                                value={campo.opcoes}
                                onChange={(e) => updateCampoNovoModelo(index, 'opcoes', e.target.value)}
                                placeholder="Ex: Opção 1, Opção 2, Opção 3"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="text-xs">Placeholder</Label>
                            <Input
                              value={campo.placeholder}
                              onChange={(e) => updateCampoNovoModelo(index, 'placeholder', e.target.value)}
                              placeholder="Texto de ajuda"
                            />
                          </div>

                          <div className="md:col-span-4 flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={campo.obrigatorio}
                                onCheckedChange={(v) => updateCampoNovoModelo(index, 'obrigatorio', v)}
                              />
                              <span className="text-sm">Campo obrigatório</span>
                            </label>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeCampoNovoModelo(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={addCampoNovoModelo}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            // Edição de modelo existente (sem abas - campos são gerenciados separadamente)
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Modelo</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome do modelo" />
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                
                <Input 
                  placeholder="Buscar cliente..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
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
                          key={cliente.credor_cedrus}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedClientes.includes(cliente.credor_cedrus)}
                            onCheckedChange={() => toggleCliente(cliente.credor_cedrus)}
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
              </div>

              <div className="space-y-2">
                <Label>ID do Google Docs</Label>
                <Input value={formData.google_docs_id} onChange={(e) => setFormData({ ...formData, google_docs_id: e.target.value })} placeholder="ID do documento" />
              </div>

              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={formData.ativo} onCheckedChange={(v) => setFormData({ ...formData, ativo: v })} />
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSave} 
              disabled={createModelo.isPending || updateModelo.isPending || bulkSaveCampos.isPending || selectedClientes.length === 0}
            >
              {!editingModelo && selectedClientes.length > 1 
                ? `Criar ${selectedClientes.length} modelos` 
                : 'Salvar'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configurar Campos */}
      <Dialog open={camposDialogOpen} onOpenChange={setCamposDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar Campos do Contrato</DialogTitle>
            <DialogDescription>
              {selectedModelo?.nome} - Defina os campos que aparecerão no formulário de criação de contrato
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-3">
              {campos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>Nenhum campo configurado</p>
                  <p className="text-sm">Clique em "Adicionar Campo" para começar</p>
                </div>
              ) : (
                campos.map((campo, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex flex-col gap-1 pt-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => moveCampo(index, index - 1)}
                        disabled={index === 0}
                      >
                        <span className="text-xs">▲</span>
                      </Button>
                      <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => moveCampo(index, index + 1)}
                        disabled={index === campos.length - 1}
                      >
                        <span className="text-xs">▼</span>
                      </Button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Nome do Campo</Label>
                        <Input
                          value={campo.nome}
                          onChange={(e) => updateCampo(index, 'nome', e.target.value)}
                          placeholder="Ex: Endereço Completo"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select 
                          value={campo.tipo} 
                          onValueChange={(v) => updateCampo(index, 'tipo', v as TipoCampo)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CAMPO.map(tipo => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(campo.tipo === 'multipla_escolha' || campo.tipo === 'radio') && (
                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-xs">Opções (separadas por vírgula)</Label>
                          <Input
                            value={campo.opcoes}
                            onChange={(e) => updateCampo(index, 'opcoes', e.target.value)}
                            placeholder="Ex: Opção 1, Opção 2, Opção 3"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={campo.placeholder}
                          onChange={(e) => updateCampo(index, 'placeholder', e.target.value)}
                          placeholder="Texto de ajuda"
                        />
                      </div>

                      <div className="md:col-span-4 flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={campo.obrigatorio}
                            onCheckedChange={(v) => updateCampo(index, 'obrigatorio', v)}
                          />
                          <span className="text-sm">Campo obrigatório</span>
                        </label>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeCampo(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={addCampo}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Campo
            </Button>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setCamposDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCampos}
              disabled={bulkSaveCampos.isPending}
            >
              Salvar Campos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}