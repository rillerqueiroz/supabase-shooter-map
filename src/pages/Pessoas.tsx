import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PessoasTable } from '@/components/Pessoas/PessoasTable';
import { DuplicadosTab } from '@/components/Pessoas/DuplicadosTab';
import { SemCredorTab } from '@/components/Pessoas/SemCredorTab';
import { Users } from 'lucide-react';

export default function Pessoas() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pessoas</h1>
          <p className="text-sm text-muted-foreground">
            Data Lake de pessoas vinculadas a TUDOBELO e TUDOBELO-FUNDOS
          </p>
        </div>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Pessoas</TabsTrigger>
          <TabsTrigger value="sem-credor">Sem Credor</TabsTrigger>
          <TabsTrigger value="duplicados">Duplicados</TabsTrigger>
        </TabsList>
        <TabsContent value="lista">
          <PessoasTable />
        </TabsContent>
        <TabsContent value="sem-credor">
          <SemCredorTab />
        </TabsContent>
        <TabsContent value="duplicados">
          <DuplicadosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
