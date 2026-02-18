import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GestaoSplitsRole } from "@/types/gestaoSplitsPermissions";
import { Card } from "@/components/ui/card";

const AVAILABLE_ROLES: { value: GestaoSplitsRole; label: string; description: string }[] = [
  { 
    value: 'admin', 
    label: 'Administrador', 
    description: 'Acesso total ao sistema'
  },
  { 
    value: 'editor', 
    label: 'Editor', 
    description: 'Pode editar conteúdo e dados'
  },
  { 
    value: 'viewer', 
    label: 'Visualizador', 
    description: 'Apenas visualização de dados'
  },
  { 
    value: 'colaborador', 
    label: 'Colaborador', 
    description: 'Acesso operacional básico'
  },
  { 
    value: 'cliente', 
    label: 'Cliente', 
    description: 'Acesso limitado aos seus dados'
  },
  { 
    value: 'parceiro', 
    label: 'Parceiro', 
    description: 'Acesso de parceiro comercial'
  }
];

type RoleSelectorProps = {
  selectedRoles: GestaoSplitsRole[];
  onChange: (roles: GestaoSplitsRole[]) => void;
};

export function RoleSelector({ selectedRoles, onChange }: RoleSelectorProps) {
  const handleRoleToggle = (role: GestaoSplitsRole) => {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter(r => r !== role));
    } else {
      onChange([...selectedRoles, role]);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-2">Papéis do Usuário</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione os papéis que o usuário terá no sistema
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_ROLES.map((role) => (
            <div
              key={role.value}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={`role-${role.value}`}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={() => handleRoleToggle(role.value)}
              />
              <div className="flex-1">
                <Label
                  htmlFor={`role-${role.value}`}
                  className="font-medium cursor-pointer"
                >
                  {role.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
