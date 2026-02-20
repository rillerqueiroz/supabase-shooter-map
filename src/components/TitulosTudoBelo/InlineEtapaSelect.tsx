import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { useUpdateTituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { Loader2 } from "lucide-react";

interface InlineEtapaSelectProps {
  tituloId: string;
  currentEtapa: string | null;
  bloqueado?: boolean;
}

export function InlineEtapaSelect({ tituloId, currentEtapa, bloqueado }: InlineEtapaSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: etapas } = useTitulosEtapas();
  const updateMutation = useUpdateTituloTudoBelo();

  const handleChange = async (value: string) => {
    const newEtapa = value === "__none__" ? null : value;
    await updateMutation.mutateAsync({ 
      id: tituloId, 
      updates: { etapa: newEtapa, processado_internamente: true } 
    });
    setIsEditing(false);
  };

  if (updateMutation.isPending) {
    return (
      <Badge variant="outline" className="bg-muted">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        Salvando...
      </Badge>
    );
  }

  if (isEditing) {
    return (
      <Select
        value={currentEtapa || "__none__"}
        onValueChange={handleChange}
        onOpenChange={(open) => {
          if (!open) setIsEditing(false);
        }}
        open={true}
      >
        <SelectTrigger className="h-7 w-[180px] text-xs">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">Sem etapa</span>
          </SelectItem>
          {etapas?.map((etapa) => (
            <SelectItem key={etapa.id} value={etapa.etapa || ""}>
              {etapa.etapa}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`${bloqueado ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100'} transition-colors`}
      onClick={(e) => {
        e.stopPropagation();
        if (!bloqueado) setIsEditing(true);
      }}
    >
      {currentEtapa || "Sem etapa"}
    </Badge>
  );
}
