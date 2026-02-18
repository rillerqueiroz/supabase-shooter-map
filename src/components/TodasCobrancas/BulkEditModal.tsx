import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useProjetos } from "@/hooks/useGestaoSplitsProjetos";
import { useBulkUpdateCobrancas } from "@/hooks/useBulkUpdateCobrancas";
import { Loader2 } from "lucide-react";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  empresas: string[];
  onSuccess?: () => void;
}

const STATUS_CEDRUS_OPTIONS = [
  { value: 'A', label: 'Aberto' },
  { value: 'C', label: 'Cancelado' },
  { value: 'N', label: 'Negociado' },
];

export function BulkEditModal({
  isOpen,
  onClose,
  selectedIds,
  empresas,
  onSuccess
}: BulkEditModalProps) {
  const { data: projetos } = useProjetos();
  const bulkUpdate = useBulkUpdateCobrancas();

  // Campos para edição
  const [editProjeto, setEditProjeto] = useState(false);
  const [projeto, setProjeto] = useState<string>("");
  
  const [editEmpresa, setEditEmpresa] = useState(false);
  const [empresa, setEmpresa] = useState<string>("");
  
  const [editStatusCedrus, setEditStatusCedrus] = useState(false);
  const [statusCedrus, setStatusCedrus] = useState<string>("");

  const handleSubmit = async () => {
    const updateData: Record<string, string | null> = {};

    if (editProjeto) {
      updateData.projeto = projeto === "__clear__" ? null : projeto || null;
    }
    if (editEmpresa) {
      updateData.credor_cedrus = empresa === "__clear__" ? null : empresa || null;
    }
    if (editStatusCedrus) {
      updateData.status_cedrus = statusCedrus || null;
    }

    await bulkUpdate.mutateAsync({
      identificadores: selectedIds,
      ...updateData
    });

    handleClose();
    onSuccess?.();
  };

  const handleClose = () => {
    setEditProjeto(false);
    setProjeto("");
    setEditEmpresa(false);
    setEmpresa("");
    setEditStatusCedrus(false);
    setStatusCedrus("");
    onClose();
  };

  const hasChanges = editProjeto || editEmpresa || editStatusCedrus;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edição em Lote</DialogTitle>
          <DialogDescription>
            Atualizando {selectedIds.length} cobrança(s) selecionada(s).
            Marque os campos que deseja alterar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Campo Projeto */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-projeto"
                checked={editProjeto}
                onCheckedChange={(checked) => setEditProjeto(checked === true)}
              />
              <Label htmlFor="edit-projeto" className="font-medium cursor-pointer">
                Alterar Projeto
              </Label>
            </div>
            {editProjeto && (
              <Select value={projeto} onValueChange={setProjeto}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent className="bg-background border">
                  <SelectItem value="__clear__">
                    <span className="text-muted-foreground italic">Remover projeto</span>
                  </SelectItem>
                  {projetos?.map((p) => (
                    <SelectItem key={p.id} value={p.nome}>
                      {p.nome} ({p.credor_cedrus})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Campo Empresa */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-empresa"
                checked={editEmpresa}
                onCheckedChange={(checked) => setEditEmpresa(checked === true)}
              />
              <Label htmlFor="edit-empresa" className="font-medium cursor-pointer">
                Alterar Empresa (credor_cedrus)
              </Label>
            </div>
            {editEmpresa && (
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="bg-background border">
                  <SelectItem value="__clear__">
                    <span className="text-muted-foreground italic">Remover empresa</span>
                  </SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Campo Status Cedrus */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-status"
                checked={editStatusCedrus}
                onCheckedChange={(checked) => setEditStatusCedrus(checked === true)}
              />
              <Label htmlFor="edit-status" className="font-medium cursor-pointer">
                Alterar Status Cedrus
              </Label>
            </div>
            {editStatusCedrus && (
              <Select value={statusCedrus} onValueChange={setStatusCedrus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-background border">
                  {STATUS_CEDRUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!hasChanges || bulkUpdate.isPending}
          >
            {bulkUpdate.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Atualizar {selectedIds.length} registro(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
