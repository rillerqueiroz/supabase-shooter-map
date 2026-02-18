import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { GestaoSplitsClientPermission, ClienteSuperavitBasico } from "@/types/gestaoSplitsPermissions";
import { useClientesParaSelecao } from "@/hooks/useClienteCredores";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ClientPermissionsEditorProps = {
  permissions: GestaoSplitsClientPermission[];
  onChange: (permissions: GestaoSplitsClientPermission[]) => void;
};

export function ClientPermissionsEditor({ permissions, onChange }: ClientPermissionsEditorProps) {
  const { data: clientes, isLoading } = useClientesParaSelecao();
  const [open, setOpen] = useState(false);

  const selectedIds = new Set(permissions.map(p => p.clienteId));

  const handleToggleClient = (cliente: ClienteSuperavitBasico) => {
    if (selectedIds.has(cliente.id)) {
      onChange(permissions.filter(p => p.clienteId !== cliente.id));
    } else {
      onChange([
        ...permissions,
        { 
          clienteId: cliente.id,
          clienteNome: cliente.nome_credor || cliente.credor_cedrus,
          credorCedrus: cliente.credor_cedrus,
          canView: true, 
          canTransact: false 
        }
      ]);
    }
  };

  const handleSelectAll = () => {
    if (!clientes) return;
    const allPermissions = clientes.map(c => ({
      clienteId: c.id,
      clienteNome: c.nome_credor || c.credor_cedrus,
      credorCedrus: c.credor_cedrus,
      canView: true,
      canTransact: false,
      ...permissions.find(p => p.clienteId === c.id)
    }));
    onChange(allPermissions);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleRemoveClient = (clienteId: number) => {
    onChange(permissions.filter(p => p.clienteId !== clienteId));
  };

  const handlePermissionChange = (
    clienteId: number,
    field: 'canView' | 'canTransact',
    value: boolean
  ) => {
    onChange(
      permissions.map(p =>
        p.clienteId === clienteId ? { ...p, [field]: value } : p
      )
    );
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  const totalClientes = clientes?.length || 0;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-2">Permissões de Clientes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure quais clientes o usuário pode visualizar e transacionar.
            Ao dar permissão a um cliente, o usuário terá acesso a todos os credores vinculados.
          </p>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" type="button" className="w-full justify-between">
              <span>
                {permissions.length === 0 
                  ? "+ Adicionar Clientes" 
                  : `${permissions.length} cliente${permissions.length > 1 ? 's' : ''} selecionado${permissions.length > 1 ? 's' : ''}`
                }
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-50 w-[450px] p-0 bg-popover text-popover-foreground border shadow-md" align="start">
            <Command>
              <CommandInput placeholder="Buscar cliente..." />
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs text-muted-foreground">
                  {permissions.length} de {totalClientes} selecionados
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleSelectAll}
                  >
                    Selecionar todos
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleClearAll}
                    disabled={permissions.length === 0}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {(clientes || []).map((cliente) => {
                    const isSelected = selectedIds.has(cliente.id);
                    return (
                      <CommandItem
                        key={cliente.id}
                        value={`${cliente.nome_credor || ''} ${cliente.credor_cedrus}`}
                        onSelect={() => handleToggleClient(cliente)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span className="font-medium">{cliente.nome_credor || cliente.credor_cedrus}</span>
                          {cliente.nome_credor && (
                            <span className="text-xs text-muted-foreground font-mono">{cliente.credor_cedrus}</span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {permissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum cliente selecionado</p>
            <p className="text-xs mt-1">
              Sem restrições = acesso a todos os clientes
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {permissions.map((perm) => (
              <div
                key={perm.clienteId}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{perm.clienteNome}</span>
                    <Badge variant="outline" className="font-mono text-xs w-fit">
                      {perm.credorCedrus}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 ml-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={perm.canView}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.clienteId, 'canView', checked as boolean)
                        }
                      />
                      Visualizar
                    </label>
                    
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={perm.canTransact}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(perm.clienteId, 'canTransact', checked as boolean)
                        }
                      />
                      Transacionar
                    </label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveClient(perm.clienteId)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
