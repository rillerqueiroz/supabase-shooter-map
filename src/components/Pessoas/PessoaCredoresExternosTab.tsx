import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { usePersonCreditors, usePersonExternalIds } from '@/hooks/usePersonDetail';
import { useAddPersonCreditor, useAddExternalId } from '@/hooks/usePeopleMutations';
import { TUDOBELO_CREDITORS } from '@/types/people';

interface Props {
  personId: string;
}

export function PessoaCredoresExternosTab({ personId }: Props) {
  const { data: creditors, isLoading: loadingC } = usePersonCreditors(personId);
  const { data: externals, isLoading: loadingE } = usePersonExternalIds(personId);
  const addCred = useAddPersonCreditor();
  const addExt = useAddExternalId();

  const [newCredCode, setNewCredCode] = useState('');
  const [newCredDebtor, setNewCredDebtor] = useState('');

  const [newExtSys, setNewExtSys] = useState('');
  const [newExtId, setNewExtId] = useState('');

  return (
    <div className="space-y-6 py-4">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Credores vinculados</h3>
        <div className="flex items-end gap-2 p-3 border rounded-md bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label>Código do credor</Label>
            <Input value={newCredCode} onChange={(e) => setNewCredCode(e.target.value)} placeholder="TUDOBELO" />
          </div>
          <div className="flex-1 space-y-1">
            <Label>Código do devedor no credor</Label>
            <Input value={newCredDebtor} onChange={(e) => setNewCredDebtor(e.target.value)} />
          </div>
          <Button
            disabled={!newCredCode.trim() || addCred.isPending}
            onClick={() =>
              addCred.mutate(
                {
                  person_id: personId,
                  creditor_code: newCredCode,
                  debtor_code_at_creditor: newCredDebtor || null,
                  status: 'ativo',
                  source: 'manual',
                },
                {
                  onSuccess: () => {
                    setNewCredCode('');
                    setNewCredDebtor('');
                  },
                }
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credor</TableHead>
                <TableHead>Devedor no credor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingC ? (
                <TableRow><TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ) : (creditors ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sem credores</TableCell></TableRow>
              ) : (
                (creditors ?? []).map((c) => {
                  const isTb = TUDOBELO_CREDITORS.includes(c.creditor_code as any);
                  return (
                    <TableRow key={c.id ?? `${c.person_id}-${c.creditor_code}`}>
                      <TableCell>
                        <Badge variant={isTb ? 'default' : 'outline'}>{c.creditor_code}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.debtor_code_at_creditor || '—'}</TableCell>
                      <TableCell>{c.status || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.source || '—'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">IDs em sistemas externos</h3>
        <div className="flex items-end gap-2 p-3 border rounded-md bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label>Sistema</Label>
            <Input value={newExtSys} onChange={(e) => setNewExtSys(e.target.value)} placeholder="cedrus / asaas / ..." />
          </div>
          <div className="flex-1 space-y-1">
            <Label>ID externo</Label>
            <Input value={newExtId} onChange={(e) => setNewExtId(e.target.value)} />
          </div>
          <Button
            disabled={!newExtSys.trim() || !newExtId.trim() || addExt.isPending}
            onClick={() =>
              addExt.mutate(
                {
                  personId,
                  system: newExtSys.trim(),
                  externalId: newExtId.trim(),
                },
                {
                  onSuccess: () => {
                    setNewExtSys('');
                    setNewExtId('');
                  },
                }
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Salvar
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sistema</TableHead>
                <TableHead>ID externo</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingE ? (
                <TableRow><TableCell colSpan={3}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ) : (externals ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem IDs externos</TableCell></TableRow>
              ) : (
                (externals ?? []).map((e) => (
                  <TableRow key={e.id ?? `${e.system}-${e.external_id}`}>
                    <TableCell><Badge variant="outline">{e.system}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{e.external_id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.metadata ? JSON.stringify(e.metadata) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
