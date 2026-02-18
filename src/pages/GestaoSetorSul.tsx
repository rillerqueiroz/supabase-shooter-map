import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import { ParcelasTab } from "@/components/SetorSul/ParcelasTab";
import { ClientesTab } from "@/components/SetorSul/ClientesTab";
import { mapSetorSulParcelasTable, mapSetorSulClientesTable } from "@/lib/supabase";

export default function GestaoSetorSul() {
  // Mapear estrutura das tabelas na inicialização
  useEffect(() => {
    console.log('🚀 Gestão Setor Sul carregada');
    mapSetorSulParcelasTable();
    mapSetorSulClientesTable();
  }, []);

  return (
    <div className="container mx-auto mobile-container py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="mobile-heading font-bold tracking-tight">Gestão Setor Sul</h1>
        <p className="mobile-text-sm text-muted-foreground">
          Gerencie parcelas futuras e clientes do empreendimento Setor Sul
        </p>
      </div>

      <Tabs defaultValue="parcelas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="parcelas" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Parcelas Futuras
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parcelas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Gestão de Parcelas Futuras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParcelasTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestão de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}