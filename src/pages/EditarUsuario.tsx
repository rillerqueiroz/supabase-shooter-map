import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGestaoSplitsUserManagement } from "@/hooks/useGestaoSplitsUserManagement";
import { RoleSelector } from "@/components/UserManagement/RoleSelector";
import { ScreenPermissionsEditor } from "@/components/UserManagement/ScreenPermissionsEditor";
import { ClientPermissionsEditor } from "@/components/UserManagement/ClientPermissionsEditor";
import { 
  GestaoSplitsRole, 
  GestaoSplitsScreenPermission, 
  GestaoSplitsClientPermission, 
  GestaoSplitsUpdateUserInput 
} from "@/types/gestaoSplitsPermissions";
import { ArrowLeft, Loader2, Save, ChevronDown, ChevronUp, User, Shield, Monitor, Building2, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditarUsuario() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, isLoading, updateUser, isUpdating, changePassword, isChangingPassword } = useGestaoSplitsUserManagement();

  const [formNome, setFormNome] = useState("");
  const [formRoles, setFormRoles] = useState<GestaoSplitsRole[]>([]);
  const [formScreenPermissions, setFormScreenPermissions] = useState<GestaoSplitsScreenPermission[]>([]);
  const [formClientPermissions, setFormClientPermissions] = useState<GestaoSplitsClientPermission[]>([]);
  const [newPassword, setNewPassword] = useState("");

  // States for collapsible sections
  const [openBasic, setOpenBasic] = useState(true);
  const [openRoles, setOpenRoles] = useState(true);
  const [openScreens, setOpenScreens] = useState(false);
  const [openClients, setOpenClients] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);

  const currentUser = users?.find(u => u.id === userId);

  useEffect(() => {
    if (currentUser) {
      setFormNome(currentUser.nome);
      setFormRoles(currentUser.roles);
      setFormScreenPermissions(currentUser.screenPermissions);
      setFormClientPermissions(currentUser.clientPermissions);
    }
  }, [currentUser]);

  const handleUpdate = () => {
    if (!userId) return;

    const input: GestaoSplitsUpdateUserInput = {
      nome: formNome,
      roles: formRoles,
      screenPermissions: formScreenPermissions,
      clientPermissions: formClientPermissions
    };

    updateUser({ userId, input }, {
      onSuccess: () => {
        navigate('/configuracoes');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Usuário não encontrado</p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    onToggle,
    count
  }: { 
    title: string; 
    icon: React.ElementType; 
    isOpen: boolean; 
    onToggle: () => void;
    count?: number;
  }) => (
    <CollapsibleTrigger asChild onClick={onToggle}>
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </CollapsibleTrigger>
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/configuracoes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Usuário</h1>
          <p className="text-muted-foreground">
            {currentUser.email}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Dados Básicos */}
        <Card>
          <Collapsible open={openBasic} onOpenChange={setOpenBasic}>
            <SectionHeader 
              title="Dados Básicos" 
              icon={User} 
              isOpen={openBasic} 
              onToggle={() => setOpenBasic(!openBasic)} 
            />
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                <div>
                  <Label htmlFor="edit-nome">Nome Completo</Label>
                  <Input
                    id="edit-nome"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email (não editável)</Label>
                  <Input value={currentUser.email} disabled />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Papéis */}
        <Card>
          <Collapsible open={openRoles} onOpenChange={setOpenRoles}>
            <SectionHeader 
              title="Papéis" 
              icon={Shield} 
              isOpen={openRoles} 
              onToggle={() => setOpenRoles(!openRoles)}
              count={formRoles.length}
            />
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <RoleSelector selectedRoles={formRoles} onChange={setFormRoles} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Telas */}
        <Card>
          <Collapsible open={openScreens} onOpenChange={setOpenScreens}>
            <SectionHeader 
              title="Permissões de Telas" 
              icon={Monitor} 
              isOpen={openScreens} 
              onToggle={() => setOpenScreens(!openScreens)}
              count={formScreenPermissions.length}
            />
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <ScreenPermissionsEditor
                  permissions={formScreenPermissions}
                  onChange={setFormScreenPermissions}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Clientes */}
        <Card>
          <Collapsible open={openClients} onOpenChange={setOpenClients}>
            <SectionHeader 
              title="Permissões de Clientes" 
              icon={Building2} 
              isOpen={openClients} 
              onToggle={() => setOpenClients(!openClients)}
              count={formClientPermissions.length}
            />
            <CollapsibleContent>
              <div className="p-4 pt-0">
                <ClientPermissionsEditor
                  permissions={formClientPermissions}
                  onChange={setFormClientPermissions}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <Collapsible open={openPassword} onOpenChange={setOpenPassword}>
            <SectionHeader 
              title="Alterar Senha" 
              icon={KeyRound} 
              isOpen={openPassword} 
              onToggle={() => setOpenPassword(!openPassword)}
            />
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                <div>
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                  />
                </div>
                <Button 
                  onClick={() => {
                    if (!userId || !newPassword) return;
                    changePassword({ userId, newPassword }, {
                      onSuccess: () => setNewPassword("")
                    });
                  }}
                  disabled={isChangingPassword || !newPassword}
                  variant="outline"
                >
                  {isChangingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <KeyRound className="h-4 w-4 mr-2" />
                  Alterar Senha
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate('/configuracoes')}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}