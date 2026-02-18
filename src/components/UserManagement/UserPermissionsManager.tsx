import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleSelector } from "@/components/UserManagement/RoleSelector";
import { ScreenPermissionsEditor } from "@/components/UserManagement/ScreenPermissionsEditor";
import { ClientPermissionsEditor } from "@/components/UserManagement/ClientPermissionsEditor";
import { 
  GestaoSplitsRole, 
  GestaoSplitsScreenPermission, 
  GestaoSplitsClientPermission, 
  GestaoSplitsCreateUserInput 
} from "@/types/gestaoSplitsPermissions";
import { Pencil, Trash2, UserPlus, Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useGestaoSplitsUserManagement } from "@/hooks/useGestaoSplitsUserManagement";

const ROLE_LABELS: Record<GestaoSplitsRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Visualizador',
  colaborador: 'Colaborador',
  cliente: 'Cliente',
  parceiro: 'Parceiro'
};

export function UserPermissionsManager() {
  const navigate = useNavigate();
  const { users, isLoading, createUser, deleteUser, isCreating } = useGestaoSplitsUserManagement();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form state para criar usuário
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formRoles, setFormRoles] = useState<GestaoSplitsRole[]>([]);
  const [formScreenPermissions, setFormScreenPermissions] = useState<GestaoSplitsScreenPermission[]>([]);
  const [formClientPermissions, setFormClientPermissions] = useState<GestaoSplitsClientPermission[]>([]);

  const filteredUsers = users?.filter(user =>
    user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.roles.some(role => ROLE_LABELS[role]?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const resetForm = () => {
    setFormEmail("");
    setFormPassword("");
    setFormNome("");
    setFormRoles([]);
    setFormScreenPermissions([]);
    setFormClientPermissions([]);
  };

  const handleCreate = () => {
    const input: GestaoSplitsCreateUserInput = {
      email: formEmail,
      password: formPassword,
      nome: formNome,
      roles: formRoles,
      screenPermissions: formScreenPermissions,
      clientPermissions: formClientPermissions
    };

    createUser(input, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      }
    });
  };

  const handleEdit = (userId: string) => {
    navigate(`/editar-usuario/${userId}`);
  };

  const handleDeleteConfirm = () => {
    if (!selectedUserId) return;
    
    deleteUser(selectedUserId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedUserId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Gestão de Usuários e Permissões</h2>
            <p className="text-muted-foreground mt-1">
              Gerencie usuários, papéis e permissões do sistema
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou papel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{user.nome}</h3>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        📊 {user.screenPermissions.length} telas configuradas
                      </span>
                      <span>
                        👥 {user.clientPermissions.length === 0 ? 'Todos os clientes' : `${user.clientPermissions.length} clientes`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(user.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Configure as informações básicas e permissões do novo usuário
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="roles">Papéis</TabsTrigger>
              <TabsTrigger value="screens">Telas</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="create-password">Senha</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <Label htmlFor="create-nome">Nome Completo</Label>
                <Input
                  id="create-nome"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>
            </TabsContent>

            <TabsContent value="roles">
              <RoleSelector selectedRoles={formRoles} onChange={setFormRoles} />
            </TabsContent>

            <TabsContent value="screens">
              <ScreenPermissionsEditor
                permissions={formScreenPermissions}
                onChange={setFormScreenPermissions}
              />
            </TabsContent>

            <TabsContent value="clients">
              <ClientPermissionsEditor
                permissions={formClientPermissions}
                onChange={setFormClientPermissions}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário e todas as suas permissões serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
