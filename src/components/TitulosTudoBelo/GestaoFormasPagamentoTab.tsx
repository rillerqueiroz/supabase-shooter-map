import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  useTitulosFormasPagamento,
  useCreateFormaPagamento,
  useUpdateFormaPagamento,
  useDeleteFormaPagamento,
  FormaPagamento,
} from "@/hooks/useTitulosFormasPagamento";
import { Plus, Pencil, Trash2, Loader2, Save, X, Search, Filter } from "lucide-react";
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

  // Filtros
  const [searchForma, setSearchForma] = useState("");
  const [filterCredor, setFilterCredor] = useState<string>("todos");
  const [filterInsereNaBase, setFilterInsereNaBase] = useState<string>("todos");
  const [filterPrazoRecompra, setFilterPrazoRecompra] = useState<string>("todos");

  // Opções dinâmicas de credores
  const credorOptions = useMemo(() => {
    if (!formasPagamento) return [];
    const credores = [...new Set(formasPagamento.map(f => f.credor_cedrus).filter(Boolean))] as string[];
    return credores.sort();
  }, [formasPagamento]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    if (!formasPagamento) return [];
    return formasPagamento.filter(f => {
      if (searchForma && !f.forma_pagamento.toLowerCase().includes(searchForma.toLowerCase())) return false;
      if (filterCredor === "com_credor" && !f.credor_cedrus) return false;
      if (filterCredor === "sem_credor" && f.credor_cedrus) return false;
      if (filterCredor !== "todos" && filterCredor !== "com_credor" && filterCredor !== "sem_credor" && f.credor_cedrus !== filterCredor) return false;
      if (filterInsereNaBase === "sim" && f.insere_na_base !== true) return false;
      if (filterInsereNaBase === "nao" && f.insere_na_base !== false) return false;
      if (filterInsereNaBase === "null" && f.insere_na_base !== null) return false;
      if (filterPrazoRecompra === "com_prazo" && f.prazo_recompra == null) return false;
      if (filterPrazoRecompra === "sem_prazo" && f.prazo_recompra != null) return false;
      return true;
    });
  }, [formasPagamento, searchForma, filterCredor, filterInsereNaBase, filterPrazoRecompra]);

  const hasActiveFilters = searchForma || filterCredor !== "todos" || filterInsereNaBase !== "todos" || filterPrazoRecompra !== "todos";

  const clearFilters = () => {
    setSearchForma("");
    setFilterCredor("todos");
    setFilterInsereNaBase("todos");
    setFilterPrazoRecompra("todos");
  };

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

  const handleToggleInsereNaBase = async (forma: FormaPagamento) => {
    const newValue = forma.insere_na_base === true ? false : true;
    await updateMutation.mutateAsync({
      id: forma.id,
      insere_na_base: newValue,
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

  const getInsereNaBaseBadge = (value: boolean | null) => {
    if (value === true) return <Badge className="bg-green-100 text-green-700 border-green-200">Sim</Badge>;
    if (value === false) return <Badge variant="destructive">Não</Badge>;
    return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Null</Badge>;
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

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Forma de Pagamento</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchForma}
                  onChange={(e) => setSearchForma(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Credor Cedrus</label>
              <Select value={filterCredor} onValueChange={setFilterCredor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com_credor">Com credor</SelectItem>
                  <SelectItem value="sem_credor">Sem credor</SelectItem>
                  {credorOptions.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Insere na Base</label>
              <Select value={filterInsereNaBase} onValueChange={setFilterInsereNaBase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim (true)</SelectItem>
                  <SelectItem value="nao">Não (false)</SelectItem>
                  <SelectItem value="null">Não configurado (null)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Prazo Recompra</label>
              <Select value={filterPrazoRecompra} onValueChange={setFilterPrazoRecompra}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com_prazo">Com prazo</SelectItem>
                  <SelectItem value="sem_prazo">Sem prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground mt-3">
              Exibindo {filteredData.length} de {formasPagamento?.length ?? 0} registros
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
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
                  <TableHead className="w-[140px] text-center">Insere na Base</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((forma) => (
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
                        <span className="text-sm">{forma.credor_cedrus || <span className="text-muted-foreground">—</span>}</span>
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
                        </div>
                      ) : (
                        <span className="text-sm">
                          {forma.prazo_recompra != null ? `${forma.prazo_recompra} dias` : <span className="text-muted-foreground">—</span>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={forma.insere_na_base === true}
                          onCheckedChange={() => handleToggleInsereNaBase(forma)}
                          disabled={updateMutation.isPending}
                        />
                        {getInsereNaBaseBadge(forma.insere_na_base)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(forma.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === forma.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(forma)}>
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
