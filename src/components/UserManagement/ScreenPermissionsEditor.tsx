import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GestaoSplitsScreenPermission } from "@/types/gestaoSplitsPermissions";
import { useGestaoSplitsScreensList } from "@/hooks/useGestaoSplitsScreensList";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Square } from "lucide-react";

type PermField = 'canView' | 'canCreate' | 'canUpdate' | 'canDelete';

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
    field: PermField,
    value: boolean
  ) => {
    const existingPerm = permissions.find(p => p.screenId === screenId);
    
    if (existingPerm) {
      const updatedPerm = { ...existingPerm, [field]: value };
      
      if (!updatedPerm.canView && !updatedPerm.canCreate && !updatedPerm.canUpdate && !updatedPerm.canDelete) {
        onChange(permissions.filter(p => p.screenId !== screenId));
      } else {
        onChange(permissions.map(p => p.screenId === screenId ? updatedPerm : p));
      }
    } else {
      onChange([
        ...permissions,
        {
          screenId, screenSlug, screenName,
          canView: field === 'canView' ? value : false,
          canCreate: field === 'canCreate' ? value : false,
          canUpdate: field === 'canUpdate' ? value : false,
          canDelete: field === 'canDelete' ? value : false
        }
      ]);
    }
  };

  const getPermissionValue = (screenId: string, field: PermField) => {
    const perm = permissions.find(p => p.screenId === screenId);
    return perm ? perm[field] : false;
  };

  const isAllCheckedForField = (field: PermField) => {
    if (!screens?.length) return false;
    return screens.every(s => getPermissionValue(s.id, field));
  };

  const handleToggleAllForField = (field: PermField, value: boolean) => {
    if (!screens) return;
    let updated = [...permissions];
    for (const screen of screens) {
      const existing = updated.find(p => p.screenId === screen.id);
      if (existing) {
        const newPerm = { ...existing, [field]: value };
        if (!newPerm.canView && !newPerm.canCreate && !newPerm.canUpdate && !newPerm.canDelete) {
          updated = updated.filter(p => p.screenId !== screen.id);
        } else {
          updated = updated.map(p => p.screenId === screen.id ? newPerm : p);
        }
      } else if (value) {
        updated.push({
          screenId: screen.id, screenSlug: screen.slug, screenName: screen.nome,
          canView: field === 'canView', canCreate: field === 'canCreate',
          canUpdate: field === 'canUpdate', canDelete: field === 'canDelete'
        });
      }
    }
    onChange(updated);
  };

  const handleToggleAll = (value: boolean) => {
    if (!screens) return;
    if (!value) {
      onChange([]);
    } else {
      onChange(screens.map(s => ({
        screenId: s.id, screenSlug: s.slug, screenName: s.nome,
        canView: true, canCreate: true, canUpdate: true, canDelete: true
      })));
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm mb-1">Permissões de Telas</h3>
            <p className="text-sm text-muted-foreground">
              Configure quais ações o usuário pode realizar em cada tela
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleToggleAll(true)}>
              <CheckSquare className="h-4 w-4 mr-1" /> Marcar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleToggleAll(false)}>
              <Square className="h-4 w-4 mr-1" /> Desmarcar Todas
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Tela</th>
                  {(['canView', 'canCreate', 'canUpdate', 'canDelete'] as PermField[]).map((field) => (
                    <th key={field} className="text-center p-3 font-medium w-24">
                      <div className="flex flex-col items-center gap-1">
                        <span>{{ canView: 'Ver', canCreate: 'Criar', canUpdate: 'Editar', canDelete: 'Excluir' }[field]}</span>
                        <Checkbox
                          checked={isAllCheckedForField(field)}
                          onCheckedChange={(checked) => handleToggleAllForField(field, checked as boolean)}
                        />
                      </div>
                    </th>
                  ))}
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