import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePerson } from '@/hooks/usePersonDetail';
import { PessoaInfoTab } from './PessoaInfoTab';
import { PessoaInfoView } from './PessoaInfoView';
import { PessoaTelefonesSection } from './PessoaTelefonesSection';
import { PessoaCredoresExternosTab } from './PessoaCredoresExternosTab';
import { PessoaTitulosTab } from './PessoaTitulosTab';
import ConversasWhatsAppTab from './ConversasWhatsAppTab';
import DiscadorTab from './DiscadorTab';
import { usePersonPhones } from '@/hooks/usePersonDetail';

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-base font-bold uppercase tracking-wide leading-snug pr-4">
              {isLoading
                ? 'Carregando...'
                : person
                ? person.name || 'Sem nome'
                : 'Pessoa não encontrada'}
            </DialogTitle>
            {person && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info('Exportação em PDF em breve')}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar PDF
                </Button>
                <Button
                  size="sm"
                  variant={isEditing ? 'secondary' : 'outline'}
                  onClick={() => setIsEditing((v) => !v)}
                >
                  {isEditing ? (
                    <>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Fechar edição
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Cadastro completo
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          {isLoading || !person ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {isEditing ? (
                <div className="rounded-lg border bg-card p-4">
                  <PessoaInfoTab person={person} />
                </div>
              ) : (
                <PessoaInfoView person={person} />
              )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
