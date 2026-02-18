import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useTitulosFormasPagamento,
  useCreateFormaPagamento,
  useUpdateFormaPagamento,
  useDeleteFormaPagamento,
  FormaPagamento,
} from "@/hooks/useTitulosFormasPagamento";
import { Plus, Pencil, Trash2, Loader2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GestaoFormasPagamentoTab() {
  const { data: formasPagamento, isLoading } = useTitulosFormasPagamento();
  const createMutation = useCreateFormaPagamento();
  const updateMutation = useUpdateFormaPagamento();
  const deleteMutation = useDeleteFormaPagamento();

  const [novaForma, setNovaForma] = useState("");
  const [novoCredor, setNovoCredor] = useState("");
  const [novoPrazoRecompra, setNovoPrazoRecompra] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForma, setEditingForma] = useState("");
  const [editingCredor, setEditingCredor] = useState("");
  const [editingPrazoRecompra, setEditingPrazoRecompra] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<FormaPagamento | null>(null);

  const handleCreate = async () => {
    if (!novaForma.trim()) return;
    await createMutation.mutateAsync(novaForma.trim());
    setNovaForma("");
    setNovoCredor("");
    setNovoPrazoRecompra("");
  };

  const handleStartEdit = (forma: FormaPagamento) => {
    setEditingId(forma.id);
    setEditingForma(forma.forma_pagamento || "");
    setEditingCredor(forma.credor_cedrus || "");
    setEditingPrazoRecompra(forma.prazo_recompra?.toString() || "");
  };

  const handleSaveEdit = async () => {
    if (editingId === null || !editingForma.trim()) return;
    await updateMutation.mutateAsync({ 
      id: editingId, 
      forma_pagamento: editingForma.trim(),
      credor_cedrus: editingCredor.trim() || null,
      prazo_recompra: editingPrazoRecompra ? parseInt(editingPrazoRecompra) : null
    });
    setEditingId(null);
    setEditingForma("");
    setEditingCredor("");
    setEditingPrazoRecompra("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingForma("");
    setEditingCredor("");
    setEditingPrazoRecompra("");
  };

  const handleUpdateCredor = async (forma: FormaPagamento, credor: string) => {
    await updateMutation.mutateAsync({
      id: forma.id,
      credor_cedrus: credor.trim() || null
    });
  };

  const handleUpdatePrazoRecompra = async (forma: FormaPagamento, prazo: string) => {
    await updateMutation.mutateAsync({
      id: forma.id,
      prazo_recompra: prazo ? parseInt(prazo) : null
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de criação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Criar Nova Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Forma de pagamento..."
              value={novaForma}
              onChange={(e) => setNovaForma(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Input
              placeholder="Credor Cedrus (opcional)..."
              value={novoCredor}
              onChange={(e) => setNovoCredor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Input
              placeholder="Prazo recompra (dias)"
              type="number"
              value={novoPrazoRecompra}
              onChange={(e) => setNovoPrazoRecompra(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-40"
            />
            <Button onClick={handleCreate} disabled={createMutation.isPending || !novaForma.trim()}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de formas de pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Formas de Pagamento Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Credor Cedrus</TableHead>
                  <TableHead className="w-[140px]">Prazo Recompra</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formasPagamento?.map((forma) => (
                  <TableRow key={forma.id}>
                    <TableCell>
                      {editingId === forma.id ? (
                        <Input
                          value={editingForma}
                          onChange={(e) => setEditingForma(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{forma.forma_pagamento || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === forma.id ? (
                        <Input
                          value={editingCredor}
                          onChange={(e) => setEditingCredor(e.target.value)}
                          className="h-8"
                          placeholder="Credor Cedrus..."
                        />
                      ) : (
                        <Input
                          value={forma.credor_cedrus || ""}
                          onChange={(e) => handleUpdateCredor(forma, e.target.value)}
                          onBlur={(e) => handleUpdateCredor(forma, e.target.value)}
                          className="h-8 border-dashed"
                          placeholder="Vincular credor..."
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === forma.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingPrazoRecompra}
                            onChange={(e) => setEditingPrazoRecompra(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="h-8 w-20"
                            placeholder="Dias"
                          />
                          <span className="text-sm text-muted-foreground">dias</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={forma.prazo_recompra ?? ""}
                            onChange={(e) => handleUpdatePrazoRecompra(forma, e.target.value)}
                            onBlur={(e) => handleUpdatePrazoRecompra(forma, e.target.value)}
                            className="h-8 w-20 border-dashed"
                            placeholder="Dias"
                          />
                          {forma.prazo_recompra && (
                            <span className="text-sm text-muted-foreground">dias</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(forma.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId !== forma.id && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(forma)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(forma)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!formasPagamento || formasPagamento.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma forma de pagamento cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Forma de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a forma de pagamento "{deleteConfirm?.forma_pagamento}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}