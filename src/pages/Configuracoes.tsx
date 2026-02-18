import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Layers, CreditCard, Users, Wrench, ArrowLeft } from "lucide-react";
import { UserPermissionsManager } from "@/components/UserManagement/UserPermissionsManager";
import { GestaoEtapasTab } from "@/components/TitulosTudoBelo/GestaoEtapasTab";
import { GestaoFormasPagamentoTab } from "@/components/TitulosTudoBelo/GestaoFormasPagamentoTab";

type ConfigSection = "menu" | "usuarios" | "etapas" | "formas-pagamento" | "acoes";

const sections = [
  {
    id: "usuarios" as ConfigSection,
    title: "Usuários e Permissões",
    description: "Gerenciar usuários, perfis e permissões de acesso ao sistema",
    icon: Users,
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-600",
  },
  {
    id: "etapas" as ConfigSection,
    title: "Gestão de Etapas",
    description: "Criar, editar e excluir etapas do fluxo de títulos",
    icon: Layers,
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    iconColor: "text-amber-600",
  },
  {
    id: "formas-pagamento" as ConfigSection,
    title: "Formas de Pagamento",
    description: "Configurar formas de pagamento, credores e prazos de recompra",
    icon: CreditCard,
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    iconColor: "text-emerald-600",
  },
  {
    id: "acoes" as ConfigSection,
    title: "Ações do Sistema",
    description: "Backup, exportação e manutenção do sistema",
    icon: Wrench,
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    iconColor: "text-purple-600",
  },
];

const Configuracoes = () => {
  const [activeSection, setActiveSection] = useState<ConfigSection>("menu");

  const renderContent = () => {
    switch (activeSection) {
      case "usuarios":
        return <UserPermissionsManager />;
      case "etapas":
        return <GestaoEtapasTab />;
      case "formas-pagamento":
        return <GestaoFormasPagamentoTab />;
      case "acoes":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Ações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">Backup dos Dados</Button>
                <Button variant="outline">Exportar Configurações</Button>
                <Button variant="outline">Limpar Cache</Button>
                <Button variant="destructive">Reiniciar Sistema</Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  if (activeSection !== "menu") {
    const current = sections.find((s) => s.id === activeSection);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveSection("menu")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">{current?.title}</h1>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br ${section.color}`}
              onClick={() => setActiveSection(section.id)}
            >
              <CardContent className="flex items-start gap-4 p-6">
                <div className={`p-3 rounded-xl bg-background/80 ${section.iconColor}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{section.title}</CardTitle>
                  <CardDescription className="text-sm">{section.description}</CardDescription>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Configuracoes;
