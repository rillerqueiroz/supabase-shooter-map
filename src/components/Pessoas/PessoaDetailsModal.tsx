import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePerson } from '@/hooks/usePersonDetail';
import { PessoaInfoTab } from './PessoaInfoTab';
import { PessoaInfoView } from './PessoaInfoView';
import { PessoaTelefonesSection } from './PessoaTelefonesSection';
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open, personId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-base">
              {isLoading
                ? 'Carregando...'
                : person
                ? `${person.name || 'Sem nome'} — ${formatDocument(person.cpf)}`
                : 'Pessoa não encontrada'}
            </DialogTitle>
            {person && (
              <Button
                size="sm"
                variant={isEditing ? 'outline' : 'default'}
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? (
                  <><X className="h-3.5 w-3.5 mr-1" /> Cancelar edição</>
                ) : (
                  <><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading || !person ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Dados da pessoa</h3>
              {isEditing ? (
                <PessoaInfoTab person={person} />
              ) : (
                <PessoaInfoView person={person} />
              )}
            </section>

            <PessoaTelefonesSection personId={person.id} />

            <Tabs defaultValue="titulos" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="titulos">Títulos</TabsTrigger>
                <TabsTrigger value="creditors">Credores &amp; IDs</TabsTrigger>
              </TabsList>
              <TabsContent value="titulos">
                <PessoaTitulosTab documentDigits={person.document_digits} personId={person.id} />
              </TabsContent>
              <TabsContent value="creditors">
                <PessoaCredoresExternosTab personId={person.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
