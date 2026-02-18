import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportManualPDF } from "@/utils/exportManualPDF";
import {
  BookOpen, ClipboardList, FileText, Receipt, FileSignature,
  XCircle, Edit, BarChart3, Landmark, DollarSign, Wallet, Database,
  FileDown, Server, Shield, Zap, Code,
} from "lucide-react";
import { SECOES_OPERACIONAL } from "./manualOperacionalData";
import { SECOES_TECNICO } from "./manualTecnicoData";
import { ManualOperacionalContent } from "./ManualOperacionalContent";
import { ManualTecnicoContent } from "./ManualTecnicoContent";

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, ClipboardList, FileText, Receipt, FileSignature,
  XCircle, Edit, BarChart3, Landmark, DollarSign, Wallet, Database,
  Server, Shield, Zap, Code,
};

export function ManualSistema() {
  const [tabAtiva, setTabAtiva] = useState("operacional");
  const [secaoOperacional, setSecaoOperacional] = useState("visao-geral");
  const [secaoTecnico, setSecaoTecnico] = useState("arquitetura");

  return (
    <div className="space-y-4">
      <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="operacional">📋 Manual Operacional</TabsTrigger>
          <TabsTrigger value="tecnico">⚙️ Manual Técnico (TI)</TabsTrigger>
        </TabsList>

        <TabsContent value="operacional">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <Sidebar
              sections={SECOES_OPERACIONAL}
              activeSection={secaoOperacional}
              onSelect={setSecaoOperacional}
              title="Manual Operacional"
              onExportPDF={() => exportManualPDF("operacional")}
            />
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="pr-4">
                <ManualOperacionalContent secaoAtiva={secaoOperacional} />
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="tecnico">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <Sidebar
              sections={SECOES_TECNICO}
              activeSection={secaoTecnico}
              onSelect={setSecaoTecnico}
              title="Manual Técnico (TI)"
              onExportPDF={() => exportManualPDF("tecnico")}
            />
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="pr-4">
                <ManualTecnicoContent secaoAtiva={secaoTecnico} />
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Sidebar({
  sections, activeSection, onSelect, title, onExportPDF,
}: {
  sections: { id: string; label: string; icon: string }[];
  activeSection: string;
  onSelect: (id: string) => void;
  title: string;
  onExportPDF: () => void;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <nav className="space-y-1">
          {sections.map((secao) => {
            const Icon = ICON_MAP[secao.icon] || BookOpen;
            return (
              <button
                key={secao.id}
                onClick={() => onSelect(secao.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  activeSection === secao.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {secao.label}
              </button>
            );
          })}
        </nav>
        <Separator className="my-3" />
        <Button variant="outline" size="sm" className="w-full" onClick={onExportPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </CardContent>
    </Card>
  );
}
