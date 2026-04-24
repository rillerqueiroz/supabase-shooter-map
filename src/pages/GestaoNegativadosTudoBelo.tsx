import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTitulosTudoBelo } from "@/hooks/useTitulosTudoBelo";
import type { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { useLoadingProgress } from "@/hooks/useLoadingProgress";
import { LoadingProgress } from "@/components/ui/loading-progress";
import { NegativarTab } from "@/components/NegativadosTudoBelo/NegativarTab";
import { RemoverNegativacaoTab } from "@/components/NegativadosTudoBelo/RemoverNegativacaoTab";
import { HistoricoNegativacoesTab } from "@/components/NegativadosTudoBelo/HistoricoNegativacoesTab";
import { TitulosNegativadosTab } from "@/components/NegativadosTudoBelo/TitulosNegativadosTab";
import { exportTitulosToExcel, exportTitulosToPDF } from "@/utils/exportTitulosTudoBelo";
import { FileSpreadsheet, FileText, ShieldAlert, ShieldCheck, History, ShieldX, ShieldOff } from "lucide-react";
import logoSuperavit from "@/assets/logo-superavit.png";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export default function GestaoNegativadosTudoBelo() {
  const [activeTab, setActiveTab] = useState("negativar");
  const { progress, onProgress } = useLoadingProgress();
  const { data: titulos, isLoading } = useTitulosTudoBelo(undefined, 'base_tudobelo_intermediaria', onProgress);

  // Filtros reativos da aba Negativar para refletir nos cards
  const [negativarFiltered, setNegativarFiltered] = useState<TituloTudoBelo[] | null>(null);

  const negativarData = useMemo(() =>
    (titulos || []).filter(t =>
      t.status_titulo === 'Vencido' &&
      !t.negativado &&
      !t.impedido_negativacao
    ),
    [titulos]
  );

  const impedidosData = useMemo(() =>
    (titulos || []).filter(t =>
      t.status_titulo === 'Vencido' &&
      !t.negativado &&
      t.impedido_negativacao === true
    ),
    [titulos]
  );

  const removerData = useMemo(() =>
    (titulos || []).filter(t =>
      t.negativado === true && (
        t.status_titulo?.toLowerCase().includes('pago') ||
        t.status_titulo?.toLowerCase().includes('negociado') ||
        ['N', 'P'].includes(t.status_cedrus || '')
      )
    ),
    [titulos]
  );

  const negativadosData = useMemo(() =>
    (titulos || []).filter(t => t.negativado === true),
    [titulos]
  );

  const metrics = useMemo(() => {
    // Quando a aba Negativar está ativa e há filtros aplicados, usar a base filtrada
    const useFiltered = activeTab === 'negativar' && negativarFiltered !== null;
    const base = useFiltered ? negativarFiltered! : (titulos || []);

    const negativados = base.filter(t => t.negativado);
    const pendentesNegativar = useFiltered
      ? base.filter(t => t.status_titulo === 'Vencido' && !t.negativado && !t.impedido_negativacao)
      : negativarData;
    const impedidos = useFiltered
      ? base.filter(t => t.status_titulo === 'Vencido' && !t.negativado && t.impedido_negativacao === true)
      : impedidosData;
    const remover = useFiltered
      ? base.filter(t => t.negativado === true && (
          t.status_titulo?.toLowerCase().includes('pago') ||
          t.status_titulo?.toLowerCase().includes('negociado') ||
          ['N', 'P'].includes(t.status_cedrus || '')
        ))
      : removerData;

    return {
      totalNegativados: negativados.length,
      saldoNegativados: negativados.reduce((s, t) => s + (t.saldo_parcela || 0), 0),
      pendentesNegativacao: pendentesNegativar.length,
      pendentesRemocao: remover.length,
      impedidos: impedidos.length,
      saldoImpedidos: impedidos.reduce((s, t) => s + (t.saldo_parcela || 0), 0),
    };
  }, [titulos, negativarData, removerData, impedidosData, activeTab, negativarFiltered]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoSuperavit} alt="Superávit" className="h-10" />
          <div>
            <h1 className="text-2xl font-bold">Gestão de Negativados Tudo Belo</h1>
            <p className="text-muted-foreground text-sm">
              Gerenciamento de negativações e remoções
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportTitulosToExcel(titulos || [])}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTitulosToPDF(titulos || [])}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Loading Progress */}
      {isLoading && (
        <LoadingProgress loaded={progress.loaded} label="Carregando títulos" />
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Negativados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.totalNegativados.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Negativados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.saldoNegativados)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes p/ Negativar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.pendentesNegativacao.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ShieldOff className="h-3.5 w-3.5" />
              Impedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{metrics.impedidos.toLocaleString("pt-BR")}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatCurrency(metrics.saldoImpedidos)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes p/ Remoção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.pendentesRemocao.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="negativar" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Negativar
          </TabsTrigger>
          <TabsTrigger value="negativados" className="flex items-center gap-2">
            <ShieldX className="h-4 w-4" />
            Títulos Negativados
          </TabsTrigger>
          <TabsTrigger value="remover" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Remover Negativação
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="negativar">
          <NegativarTab
            titulos={negativarData}
            impedidos={impedidosData}
            isLoading={isLoading}
            onFilteredChange={setNegativarFiltered}
          />
        </TabsContent>

        <TabsContent value="negativados">
          <TitulosNegativadosTab titulos={negativadosData} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="remover">
          <RemoverNegativacaoTab titulos={removerData} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoNegativacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
