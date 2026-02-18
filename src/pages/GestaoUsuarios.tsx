import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Edit, Trash2, Users, ArrowLeft, Search, Filter, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useGestaoDisparos } from "@/hooks/useGestaoDisparos";

interface User {
  id?: number;
  usuario?: string;
  nome?: string;
  email: string;
  senha: string;
  papel: string;
  clientes_acesso: string[];
  sistemas_acesso: string[];
  ativo: boolean;
  ultimo_acesso?: string;
}

// Sistemas disponíveis
const SISTEMAS_DISPONVEIS = [
  "Dashboard WhatsApp",
  "Sistema de Cobrança",
  "Relatórios Gerenciais", 
  "Configurações",
  "Gestão de Usuários"
];

// Papéis disponíveis
const PAPEIS_DISPONIVEIS = [
  { value: "administrador", label: "Administrador" },
  { value: "operador", label: "Operador" },
  { value: "visualizador", label: "Visualizador" },
  { value: "gestor", label: "Gestor" }
];

const GestaoUsuarios = () => {
  const { toast } = useToast();
  const { data: disparos } = useGestaoDisparos();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableClientes, setAvailableClientes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPapel, setFilterPapel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [formData, setFormData] = useState<User>({
    email: "",
    senha: "",
    papel: "",
    clientes_acesso: [],
    sistemas_acesso: [],
    ativo: true
  });

  // Preparar lista de clientes disponíveis
  useEffect(() => {
    if (disparos) {
      const clientes = Array.from(new Set(disparos.map(d => d.cliente).filter(Boolean))).sort();
      setAvailableClientes(clientes);
    }
  }, [disparos]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.nome || user.usuario || user.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPapel && filterPapel !== "todos") {
      filtered = filtered.filter(user => user.papel === filterPapel);
    }

    if (filterStatus && filterStatus !== "todos") {
      const isActive = filterStatus === "ativo";
      filtered = filtered.filter(user => user.ativo === isActive);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterPapel, filterStatus]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data: allUsers, error } = await supabase
        .from('usuarios_sistemas_internos')
        .select('*');

      if (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          title: "Erro ao carregar usuários",
          description: `Erro: ${error.message}`,
          variant: "destructive"
        });
        setUsers([]);
        return;
      }
      
      // Processar usuários para garantir que tenham a estrutura esperada
      const processedUsers = (allUsers || []).map(user => ({
        ...user,
        clientes_acesso: Array.isArray(user.clientes_acesso) ? user.clientes_acesso : 
                        typeof user.clientes_acesso === 'string' && user.clientes_acesso ? 
                        user.clientes_acesso.split(',').map(c => c.trim()) : [],
        sistemas_acesso: Array.isArray(user.sistemas_acesso) ? user.sistemas_acesso :
                        typeof user.sistemas_acesso === 'string' && user.sistemas_acesso ?
                        user.sistemas_acesso.split(',').map(s => s.trim()) : [],
        ativo: user.ativo !== false, // Default true se não definido
        papel: user.papel || 'visualizador'
      }));

      setUsers(processedUsers);
      console.log('Usuários carregados:', processedUsers);
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
    // Validar campos obrigatórios
    if (!formData.email || !formData.senha || !formData.papel) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email, senha e papel",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Preparar dados para salvar (remover created_at e outros campos indesejados)
      const dataToSave = {
        usuario: formData.nome || formData.usuario,
        nome: formData.nome || formData.usuario,
        email: formData.email,
        senha: formData.senha,
        papel: formData.papel,
        clientes_acesso: formData.clientes_acesso,
        sistemas_acesso: formData.sistemas_acesso,
        ativo: formData.ativo
      };

      if (editingUser?.id) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from('usuarios_sistemas_internos')
          .update(dataToSave)
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
          .insert(dataToSave);

        if (error) throw error;
        
        toast({
          title: "Usuário criado!",
          description: "Novo usuário foi adicionado com sucesso"
        });
      }

      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro ao salvar usuário",
        description: error.message || "Não foi possível salvar as informações do usuário",
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
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Não foi possível excluir o usuário",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      ...user,
      clientes_acesso: user.clientes_acesso || [],
      sistemas_acesso: user.sistemas_acesso || [],
      ativo: user.ativo !== false
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      senha: "",
      papel: "",
      clientes_acesso: [],
      sistemas_acesso: [],
      ativo: true
    });
  };

  const handleNewUser = () => {
    setEditingUser(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPapel("todos");
    setFilterStatus("todos");
  };

  const getStatusBadge = (ativo: boolean) => {
    return ativo ? (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
        Inativo
      </Badge>
    );
  };

  const getPapelBadge = (papel: string) => {
    const cores = {
      administrador: "bg-purple-100 text-purple-800 border-purple-200",
      gestor: "bg-blue-100 text-blue-800 border-blue-200",
      operador: "bg-orange-100 text-orange-800 border-orange-200",
      visualizador: "bg-gray-100 text-gray-800 border-gray-200"
    };
    
    return (
      <Badge variant="outline" className={cores[papel as keyof typeof cores] || cores.visualizador}>
        <Shield className="h-3 w-3 mr-1" />
        {PAPEIS_DISPONIVEIS.find(p => p.value === papel)?.label || papel}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Deprecation Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800">Sistema Legado - Não Recomendado</h3>
          <p className="text-sm text-amber-700 mt-1">
            Esta página utiliza um sistema de autenticação legado que armazena senhas de forma insegura.
            Recomendamos migrar para o novo sistema de gestão de usuários em Configurações → Gestão de Usuários (Novo).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Link to="/configuracoes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Gestão de Usuários (Legado)</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <Label htmlFor="search">Buscar usuários</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, usuário ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="min-w-40">
              <Label>Papel</Label>
              <Select value={filterPapel} onValueChange={setFilterPapel}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os papéis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os papéis</SelectItem>
                  {PAPEIS_DISPONIVEIS.map(papel => (
                    <SelectItem key={papel.value} value={papel.value}>
                      {papel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-32">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários do Sistema ({filteredUsers.length})
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome/Usuário *</Label>
                      <Input
                        id="nome"
                        value={formData.nome || formData.usuario || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          nome: e.target.value,
                          usuario: e.target.value 
                        }))}
                        placeholder="Digite o nome do usuário"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Digite o email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha *</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={formData.senha || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                        placeholder="Digite a senha"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Papel *</Label>
                      <Select 
                        value={formData.papel} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, papel: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar papel" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPEIS_DISPONIVEIS.map(papel => (
                            <SelectItem key={papel.value} value={papel.value}>
                              {papel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Clientes com Acesso</Label>
                    <MultiSelectFilter
                      title=""
                      options={availableClientes}
                      selectedValues={formData.clientes_acesso || []}
                      onSelectionChange={(values) => setFormData(prev => ({ ...prev, clientes_acesso: values }))}
                      placeholder="Selecionar clientes (vazio = todos)..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sistemas com Acesso</Label>
                    <MultiSelectFilter
                      title=""
                      options={SISTEMAS_DISPONVEIS}
                      selectedValues={formData.sistemas_acesso || []}
                      onSelectionChange={(values) => setFormData(prev => ({ ...prev, sistemas_acesso: values }))}
                      placeholder="Selecionar sistemas (vazio = todos)..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                    />
                    <Label htmlFor="ativo">Usuário ativo</Label>
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
                    <TableHead>Nome/Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Sistemas</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.nome || user.usuario || '-'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getPapelBadge(user.papel)}</TableCell>
                      <TableCell>{getStatusBadge(user.ativo)}</TableCell>
                      <TableCell>
                        {user.clientes_acesso && user.clientes_acesso.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.clientes_acesso.slice(0, 2).map((cliente, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {cliente}
                              </Badge>
                            ))}
                            {user.clientes_acesso.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.clientes_acesso.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="default" className="text-xs">Todos</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.sistemas_acesso && user.sistemas_acesso.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.sistemas_acesso.slice(0, 2).map((sistema, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {sistema}
                              </Badge>
                            ))}
                            {user.sistemas_acesso.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.sistemas_acesso.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="default" className="text-xs">Todos</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.ultimo_acesso ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(user.ultimo_acesso).toLocaleDateString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
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
              
              {filteredUsers.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm || filterPapel || filterStatus ? 
                      'Nenhum usuário encontrado com os filtros aplicados' : 
                      'Nenhum usuário encontrado'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoUsuarios;