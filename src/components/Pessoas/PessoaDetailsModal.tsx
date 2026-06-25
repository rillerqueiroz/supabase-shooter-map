import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerson } from '@/hooks/usePersonDetail';
import { PessoaInfoTab } from './PessoaInfoTab';
import { PessoaTelefonesTab } from './PessoaTelefonesTab';
import { PessoaCredoresExternosTab } from './PessoaCredoresExternosTab';
import { PessoaTitulosTab } from './PessoaTitulosTab';
import { formatDocument } from '@/utils/normalize-phone';

interface Props {
  personId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PessoaDetailsModal({ personId, open, onOpenChange }: Props) {
  const { data: person, isLoading } = usePerson(personId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoading
              ? 'Carregando...'
              : person
              ? `${person.name || 'Sem nome'} — ${formatDocument(person.cpf)}`
              : 'Pessoa não encontrada'}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !person ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Dados</TabsTrigger>
              <TabsTrigger value="phones">Telefones</TabsTrigger>
              <TabsTrigger value="creditors">Credores &amp; IDs</TabsTrigger>
              <TabsTrigger value="titulos">Títulos</TabsTrigger>
            </TabsList>
            <TabsContent value="info">
              <PessoaInfoTab person={person} />
            </TabsContent>
            <TabsContent value="phones">
              <PessoaTelefonesTab personId={person.id} />
            </TabsContent>
            <TabsContent value="creditors">
              <PessoaCredoresExternosTab personId={person.id} />
            </TabsContent>
            <TabsContent value="titulos">
              <PessoaTitulosTab documentDigits={person.document_digits} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
