import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Edit, Trash2, Users } from "lucide-react";

interface User {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  clientes: string[];
}

interface UserManagerProps {
  availableClientes: string[];
}

export const UserManager = ({ availableClientes }: UserManagerProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<User>({
    nome: '',
    email: '',
    senha: '',
    clientes: []
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Primeiro vamos descobrir a estrutura da tabela
      const { data, error } = await supabase
        .from('usuarios_sistemas_internos')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Erro ao acessar tabela:', error);
        toast({
          title: "Erro ao acessar tabela",
          description: `Erro: ${error.message}`,
          variant: "destructive"
        });
        setUsers([]);
        return;
      }

      console.log('Estrutura da tabela:', data);
      
      // Agora buscar todos os usuários sem ordenação específica por enquanto
      const { data: allUsers, error: loadError } = await supabase
        .from('usuarios_sistemas_internos')
        .select('*');

      if (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários",
          variant: "destructive"
        });
        setUsers([]);
        return;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Erro na função loadUsers:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários",
        variant: "destructive"
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSaveUser = async () => {
    if (!formData.nome || !formData.email || !formData.senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingUser?.id) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from('usuarios_sistemas_internos')
          .update({
            nome: formData.nome,
            email: formData.email,
            senha: formData.senha,
            clientes: formData.clientes
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        
        toast({
          title: "Usuário atualizado!",
          description: "As informações do usuário foram atualizadas com sucesso"
        });
      } else {
        // Criar novo usuário
        const { error } = await supabase
          .from('usuarios_sistemas_internos')
          .insert({
            nome: formData.nome,
            email: formData.email,
            senha: formData.senha,
            clientes: formData.clientes
          });

        if (error) throw error;
        
        toast({
          title: "Usuário criado!",
          description: "Novo usuário foi adicionado com sucesso"
        });
      }

      setIsDialogOpen(false);
      setEditingUser(null);
      setFormData({ nome: '', email: '', senha: '', clientes: [] });
      loadUsers();
    } catch (error) {
      toast({
        title: "Erro ao salvar usuário",
        description: "Não foi possível salvar as informações do usuário",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('usuarios_sistemas_internos')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast({
        title: "Usuário excluído!",
        description: "O usuário foi removido com sucesso"
      });
      
      loadUsers();
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: "Não foi possível excluir o usuário",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: user.senha,
      clientes: user.clientes || []
    });
    setIsDialogOpen(true);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({ nome: '', email: '', senha: '', clientes: [] });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                    placeholder="Digite a senha"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Clientes Permitidos</Label>
                  <MultiSelectFilter
                    title=""
                    options={availableClientes}
                    selectedValues={formData.clientes}
                    onSelectionChange={(clientes) => setFormData(prev => ({ ...prev, clientes }))}
                    placeholder="Selecionar clientes..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para permitir acesso a todos os clientes
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveUser} disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && users.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clientes Permitidos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.clientes && user.clientes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.clientes.slice(0, 3).map((cliente, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {cliente}
                            </Badge>
                          ))}
                          {user.clientes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.clientes.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Todos os clientes
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => user.id && handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {users.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};