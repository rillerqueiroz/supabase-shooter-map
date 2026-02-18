import { useState } from "react";
import { useTitulosTudoBelo, useTitulosTudoBeloOptions, TitulosFilters } from "@/hooks/useTitulosTudoBelo";
import { useTitulosEtapas } from "@/hooks/useTitulosEtapas";
import { TitulosAnalytics } from "@/components/TitulosTudoBelo/TitulosAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import logoSuperavit from "@/assets/logo-superavit.png";

export default function AnalyticsTitulosTudoBelo() {
  const [filters, setFilters] = useState<TitulosFilters>({});
  const { data: titulos, isLoading } = useTitulosTudoBelo(filters);
  const { data: options } = useTitulosTudoBeloOptions();
  const { data: etapasDisponiveis } = useTitulosEtapas();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <img src={logoSuperavit} alt="Superávit" className="h-10" />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics - Títulos Tudo Belo
          </h1>
          <p className="text-muted-foreground text-sm">Análises e gráficos dos títulos</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : titulos && titulos.length > 0 ? (
        <TitulosAnalytics
          data={titulos}
          filters={filters}
          onFiltersChange={setFilters}
          options={options}
          etapas={etapasDisponiveis?.map(e => e.etapa).filter(Boolean) as string[] || []}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum dado disponível para análise.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
