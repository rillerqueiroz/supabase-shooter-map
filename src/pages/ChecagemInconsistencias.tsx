import { useMemo } from "react";
import { useTitulosTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { ChecagemInconsistenciasTab } from "@/components/TitulosTudoBelo/ChecagemInconsistenciasTab";
import logoSuperavit from "@/assets/logo-superavit.png";
import { Card, CardContent } from "@/components/ui/card";

export default function ChecagemInconsistencias() {
  const { data: titulos, isLoading, error } = useTitulosTudoBelo({});

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <img src={logoSuperavit} alt="Superávit" className="h-10" />
        <div>
          <h1 className="text-2xl font-bold">Checagem de Inconsistências</h1>
          <p className="text-muted-foreground text-sm">
            Verificação de dados inconsistentes nos títulos
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Carregando títulos...</span>
        </div>
      ) : (
        <ChecagemInconsistenciasTab titulos={titulos || []} />
      )}
    </div>
  );
}
