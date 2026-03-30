import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface LoadingProgressProps {
  loaded: number;
  estimatedTotal?: number;
  label?: string;
}

export function LoadingProgress({ loaded, estimatedTotal, label = "Carregando títulos" }: LoadingProgressProps) {
  const percentage = estimatedTotal && estimatedTotal > 0
    ? Math.min(Math.round((loaded / estimatedTotal) * 100), 99)
    : undefined;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}...</span>
          <span className="font-medium tabular-nums">
            {loaded.toLocaleString("pt-BR")} registros
            {percentage !== undefined && ` (${percentage}%)`}
          </span>
        </div>
        {percentage !== undefined ? (
          <Progress value={percentage} className="h-2" />
        ) : (
          <Progress className="h-2 animate-pulse" />
        )}
      </div>
    </div>
  );
}
