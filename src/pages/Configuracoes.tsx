import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, BookOpen } from "lucide-react";
import { UserPermissionsManager } from "@/components/UserManagement/UserPermissionsManager";
import { ManualSistema } from "@/components/Manual/ManualSistema";

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários e Permissões</TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            Manual do Sistema
          </TabsTrigger>
          <TabsTrigger value="acoes">Ações do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UserPermissionsManager />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <ManualSistema />
        </TabsContent>

        <TabsContent value="acoes" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;