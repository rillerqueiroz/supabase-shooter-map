import { useState, useMemo } from 'react';
import { 
  useBeneficiarios, 
  useCreateBeneficiario, 
  useUpdateBeneficiario, 
  useDeleteBeneficiario,
  Beneficiario,
  CreateBeneficiarioInput
} from '@/hooks/useGestaoSplitsBeneficiarios';
import { useProjetos } from '@/hooks/useGestaoSplitsProjetos';
import { useClientesSuperavit } from '@/hooks/useClientesSuperavit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Pencil, Trash2, Users, Building2, Wallet, Loader2, FolderOpen, ChevronDown, X } from 'lucide-react';

interface FormData extends CreateBeneficiarioInput {
  projeto_ids: string[];
}

const emptyForm: FormData = {
  nome: '',
  tipo: 'pessoa_juridica',
  documento: '',
  wallet_id: '',
  email: '',
  telefone: '',
  banco: '',
  agencia: '',
  conta: '',
  observacoes: '',
  ativo: true,
  is_vendedor: false,
  cliente_id: null,
  projeto_ids: []
};

export default function BeneficiariosSplits() {
  const { data: beneficiarios = [], isLoading } = useBeneficiarios();
  const { data: projetos = [] } = useProjetos();
  const { data: clientes = [] } = useClientesSuperavit();
  const createBeneficiario = useCreateBeneficiario();
  const updateBeneficiario = useUpdateBeneficiario();
  const deleteBeneficiario = useDeleteBeneficiario();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBeneficiario, setEditingBeneficiario] = useState<Beneficiario | null>(null);
  const [deletingBeneficiario, setDeletingBeneficiario] = useState<Beneficiario | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  // Filtrar beneficiários
  const filteredBeneficiarios = useMemo(() => {
    return beneficiarios.filter(b => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!b.nome.toLowerCase().includes(search) && 
            !b.wallet_id.toLowerCase().includes(search) &&
            !(b.documento?.toLowerCase().includes(search))) {
          return false;
        }
      }
      if (filterTipo !== 'all' && b.tipo !== filterTipo) return false;
      if (filterAtivo === 'ativo' && !b.ativo) return false;
      if (filterAtivo === 'inativo' && b.ativo) return false;
      return true;
    });
  }, [beneficiarios, searchTerm, filterTipo, filterAtivo]);

  // Métricas
  const metrics = useMemo(() => ({
    total: beneficiarios.length,
    ativos: beneficiarios.filter(b => b.ativo).length,
    pessoaFisica: beneficiarios.filter(b => b.tipo === 'pessoa_fisica').length,
    pessoaJuridica: beneficiarios.filter(b => b.tipo === 'pessoa_juridica').length
  }), [beneficiarios]);

  const openNewDialog = () => {
    setEditingBeneficiario(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (beneficiario: Beneficiario) => {
    setEditingBeneficiario(beneficiario);
    setFormData({
      nome: beneficiario.nome,
      tipo: beneficiario.tipo,
      documento: beneficiario.documento || '',
      wallet_id: beneficiario.wallet_id,
      email: beneficiario.email || '',
      telefone: beneficiario.telefone || '',
      banco: beneficiario.banco || '',
      agencia: beneficiario.agencia || '',
      conta: beneficiario.conta || '',
      observacoes: beneficiario.observacoes || '',
      ativo: beneficiario.ativo,
      is_vendedor: beneficiario.is_vendedor || false,
      cliente_id: beneficiario.cliente_id || null,
      projeto_ids: (beneficiario.projetos || []).map(p => p.id)
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (beneficiario: Beneficiario) => {
    setDeletingBeneficiario(beneficiario);
    setDeleteDialogOpen(true);
  };

  const toggleProjetoId = (projetoId: string) => {
    setFormData(prev => ({
      ...prev,
      projeto_ids: prev.projeto_ids.includes(projetoId)
        ? prev.projeto_ids.filter(id => id !== projetoId)
        : [...prev.projeto_ids, projetoId]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim() || !formData.wallet_id.trim()) {
      return;
    }

    try {
      if (editingBeneficiario) {
        await updateBeneficiario.mutateAsync({
          id: editingBeneficiario.id,
          ...formData
        });
      } else {
        await createBeneficiario.mutateAsync(formData);
      }
      setDialogOpen(false);
      setFormData(emptyForm);
      setEditingBeneficiario(null);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleDelete = async () => {
    if (!deletingBeneficiario) return;
    
    try {
      await deleteBeneficiario.mutateAsync(deletingBeneficiario.id);
      setDeleteDialogOpen(false);
      setDeletingBeneficiario(null);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Beneficiários de Splits</h1>
          <p className="text-muted-foreground">
            Gerencie os beneficiários cadastrados para receber splits
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Beneficiário
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{metrics.ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pessoa Física
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.pessoaFisica}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Pessoa Jurídica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.pessoaJuridica}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, wallet ID ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
            <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAtivo} onValueChange={setFilterAtivo}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Credor</TableHead>
                <TableHead>Wallet ID</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeneficiarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum beneficiário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredBeneficiarios.map((beneficiario) => (
                  <TableRow key={beneficiario.id}>
                    <TableCell className="font-medium">{beneficiario.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {beneficiario.cliente?.nome_credor || beneficiario.cliente?.credor_cedrus || '-'}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {beneficiario.wallet_id.substring(0, 20)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(beneficiario.projetos || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        ) : (
                          (beneficiario.projetos || []).map(p => (
                            <Badge key={p.id} variant="secondary" className="text-xs">
                              {p.nome}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={beneficiario.is_vendedor ? 'default' : 'outline'} className={beneficiario.is_vendedor ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                        {beneficiario.is_vendedor ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={beneficiario.ativo ? 'default' : 'secondary'}>
                        {beneficiario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(beneficiario)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(beneficiario)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBeneficiario ? 'Editar Beneficiário' : 'Novo Beneficiário'}
            </DialogTitle>
            <DialogDescription>
              {editingBeneficiario 
                ? 'Atualize os dados do beneficiário' 
                : 'Preencha os dados do novo beneficiário de split'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do beneficiário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(v: 'pessoa_fisica' | 'pessoa_juridica') => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                    <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documento">
                  {formData.tipo === 'pessoa_fisica' ? 'CPF' : 'CNPJ'}
                </Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  placeholder={formData.tipo === 'pessoa_fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet_id">Wallet ID *</Label>
                <Input
                  id="wallet_id"
                  value={formData.wallet_id}
                  onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
                  placeholder="ID da carteira no Asaas"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Credor Vinculado */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_id" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Credor Vinculado
                </Label>
                <p className="text-xs text-muted-foreground">
                  Selecione o credor ao qual este beneficiário pertence. Os projetos serão filtrados por este credor.
                </p>
                <Select
                  value={formData.cliente_id ? String(formData.cliente_id) : 'none'}
                  onValueChange={(v) => {
                    const clienteId = v === 'none' ? null : Number(v);
                    setFormData(prev => ({ ...prev, cliente_id: clienteId, projeto_ids: [] }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar credor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientes
                      .sort((a, b) => (a.nome_credor || a.credor_cedrus || '').localeCompare(b.nome_credor || b.credor_cedrus || ''))
                      .map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome_credor ? `${c.nome_credor} (${c.credor_cedrus})` : c.credor_cedrus}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Projetos Vinculados */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Projetos Vinculados
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.cliente_id
                    ? 'Projetos filtrados pelo credor selecionado'
                    : 'Selecione um credor para filtrar os projetos disponíveis'}
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" disabled={!formData.cliente_id}>
                      <span className="text-sm">
                        {formData.projeto_ids.length === 0
                          ? 'Selecionar projetos...'
                          : `${formData.projeto_ids.length} projeto(s) selecionado(s)`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                      {projetos.filter(p => p.ativo && p.cliente_id === formData.cliente_id).map(projeto => (
                        <label
                          key={projeto.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.projeto_ids.includes(projeto.id)}
                            onCheckedChange={() => toggleProjetoId(projeto.id)}
                          />
                          <span className="text-sm">{projeto.nome}</span>
                        </label>
                      ))}
                      {projetos.filter(p => p.ativo && p.cliente_id === formData.cliente_id).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum projeto encontrado para este credor
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {formData.projeto_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.projeto_ids.map(id => {
                      const projeto = projetos.find(p => p.id === id);
                      return projeto ? (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {projeto.nome}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => toggleProjetoId(id)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Label htmlFor="is_vendedor">É vendedor</Label>
              <Switch
                id="is_vendedor"
                checked={formData.is_vendedor}
                onCheckedChange={(checked) => setFormData({ ...formData, is_vendedor: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Beneficiário ativo</Label>
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.nome.trim() || !formData.wallet_id.trim() || createBeneficiario.isPending || updateBeneficiario.isPending}
            >
              {(createBeneficiario.isPending || updateBeneficiario.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingBeneficiario ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o beneficiário "{deletingBeneficiario?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBeneficiario.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
