import { useState } from 'react';
import { Plus, Edit, Trash2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  useContratosEtapas, 
  useCreateEtapa, 
  useUpdateEtapa, 
  useDeleteEtapa,
  ContratoEtapa 
} from '@/hooks/useGestaoContratos';

const CORES_PREDEFINIDAS = [
  '#94a3b8', // Cinza
  '#3b82f6', // Azul
  '#8b5cf6', // Roxo
  '#f59e0b', // Amarelo
  '#22c55e', // Verde
  '#10b981', // Esmeralda
  '#059669', // Verde escuro
  '#ef4444', // Vermelho
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
];

export default function GestaoContratosEtapas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<ContratoEtapa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [etapaToDelete, setEtapaToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ordem: 0,
    cor: '#3b82f6'
  });

  const { data: etapas, isLoading } = useContratosEtapas();
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      ordem: (etapas?.length || 0) + 1,
      cor: '#3b82f6'
    });
    setEditingEtapa(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (etapa: ContratoEtapa) => {
    setEditingEtapa(etapa);
    setFormData({
      nome: etapa.nome,
      descricao: etapa.descricao || '',
      ordem: etapa.ordem,
      cor: etapa.cor
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingEtapa) {
      await updateEtapa.mutateAsync({
        id: editingEtapa.id,
        ...formData
      });
    } else {
      await createEtapa.mutateAsync(formData);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (etapaToDelete) {
      await deleteEtapa.mutateAsync(etapaToDelete);
      setDeleteDialogOpen(false);
      setEtapaToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Etapas</h1>
          <p className="text-muted-foreground">Configure as etapas do fluxo de contratos</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      {/* Lista de Etapas */}
      <div className="grid gap-3">
        {etapas?.map((etapa) => (
          <Card key={etapa.id} className="overflow-hidden">
            <div className="flex items-center">
              <div 
                className="w-2 h-full min-h-[80px]" 
                style={{ backgroundColor: etapa.cor }}
              />
              <CardContent className="flex items-center justify-between flex-1 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-medium text-sm">
                    {etapa.ordem}
                  </div>
                  <div>
                    <h3 className="font-medium">{etapa.nome}</h3>
                    {etapa.descricao && (
                      <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(etapa)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setEtapaToDelete(etapa.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}

        {etapas?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma etapa cadastrada. Clique em "Nova Etapa" para começar.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>
              Configure os detalhes da etapa do fluxo de contratos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Etapa *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Aguardando Assinatura"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da etapa..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                min={1}
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.cor === cor ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setFormData({ ...formData, cor })}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-muted-foreground">Ou escolha uma cor:</Label>
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-12 h-8 p-0 border-0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome}>
              {editingEtapa ? 'Salvar Alterações' : 'Criar Etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar esta etapa? Contratos existentes manterão a etapa, mas novos contratos não poderão usar esta etapa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
