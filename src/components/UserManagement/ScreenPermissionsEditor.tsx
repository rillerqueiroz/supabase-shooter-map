import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { GestaoSplitsScreenPermission } from "@/types/gestaoSplitsPermissions";
import { useGestaoSplitsScreensList } from "@/hooks/useGestaoSplitsScreensList";
import { Skeleton } from "@/components/ui/skeleton";

type ScreenPermissionsEditorProps = {
  permissions: GestaoSplitsScreenPermission[];
  onChange: (permissions: GestaoSplitsScreenPermission[]) => void;
};

export function ScreenPermissionsEditor({ permissions, onChange }: ScreenPermissionsEditorProps) {
  const { data: screens, isLoading } = useGestaoSplitsScreensList();

  const handlePermissionChange = (
    screenId: string,
    screenSlug: string,
    screenName: string,
    field: keyof Omit<GestaoSplitsScreenPermission, 'screenId' | 'screenSlug' | 'screenName'>,
    value: boolean
  ) => {
    const existingPerm = permissions.find(p => p.screenId === screenId);
    
    if (existingPerm) {
      const updatedPerm = { ...existingPerm, [field]: value };
      
      if (!updatedPerm.canView && !updatedPerm.canCreate && !updatedPerm.canUpdate && !updatedPerm.canDelete) {
        onChange(permissions.filter(p => p.screenId !== screenId));
      } else {
        onChange(
          permissions.map(p =>
            p.screenId === screenId ? updatedPerm : p
          )
        );
      }
    } else {
      onChange([
        ...permissions,
        {
          screenId,
          screenSlug,
          screenName,
          canView: field === 'canView' ? value : false,
          canCreate: field === 'canCreate' ? value : false,
          canUpdate: field === 'canUpdate' ? value : false,
          canDelete: field === 'canDelete' ? value : false
        }
      ]);
    }
  };

  const getPermissionValue = (screenId: string, field: keyof Omit<GestaoSplitsScreenPermission, 'screenId' | 'screenSlug' | 'screenName'>) => {
    const perm = permissions.find(p => p.screenId === screenId);
    return perm ? perm[field] : false;
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-2">Permissões de Telas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure quais ações o usuário pode realizar em cada tela
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Tela</th>
                  <th className="text-center p-3 font-medium w-24">Ver</th>
                  <th className="text-center p-3 font-medium w-24">Criar</th>
                  <th className="text-center p-3 font-medium w-24">Editar</th>
                  <th className="text-center p-3 font-medium w-24">Excluir</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {screens?.map((screen) => (
                  <tr key={screen.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 font-medium">{screen.nome}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={getPermissionValue(screen.id, 'canView')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(
                              screen.id,
                              screen.slug,
                              screen.nome,
                              'canView',
                              checked as boolean
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={getPermissionValue(screen.id, 'canCreate')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(
                              screen.id,
                              screen.slug,
                              screen.nome,
                              'canCreate',
                              checked as boolean
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={getPermissionValue(screen.id, 'canUpdate')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(
                              screen.id,
                              screen.slug,
                              screen.nome,
                              'canUpdate',
                              checked as boolean
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={getPermissionValue(screen.id, 'canDelete')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(
                              screen.id,
                              screen.slug,
                              screen.nome,
                              'canDelete',
                              checked as boolean
                            )
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}