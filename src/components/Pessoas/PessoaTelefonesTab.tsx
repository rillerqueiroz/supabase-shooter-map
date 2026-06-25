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
import { Plus, Check, X, Trash2, MessageCircle } from 'lucide-react';
import { usePersonPhones } from '@/hooks/usePersonDetail';
import {
  useAddPersonPhone,
  useDeletePersonPhone,
  useUpdatePersonPhone,
  useValidatePhone,
} from '@/hooks/usePeopleMutations';
import { formatPhone } from '@/utils/normalize-phone';

interface Props {
  personId: string;
}

export function PessoaTelefonesTab({ personId }: Props) {
  const { data: phones, isLoading } = usePersonPhones(personId);
  const addMut = useAddPersonPhone();
  const validateMut = useValidatePhone();
  const updateMut = useUpdatePersonPhone();
  const deleteMut = useDeletePersonPhone();

  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('');

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-end gap-2 p-3 border rounded-md bg-muted/30">
        <div className="flex-1 space-y-1">
          <Label>Novo telefone</Label>
          <Input
            placeholder="(11) 91234-5678"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
        </div>
        <div className="w-40 space-y-1">
          <Label>Tipo</Label>
          <Input placeholder="celular/fixo" value={newType} onChange={(e) => setNewType(e.target.value)} />
        </div>
        <Button
          disabled={!newPhone.trim() || addMut.isPending}
          onClick={() => {
            addMut.mutate(
              {
                personId,
                payload: { phone: newPhone.trim(), phone_type: newType.trim() || null },
              },
              {
                onSuccess: () => {
                  setNewPhone('');
                  setNewType('');
                },
              }
            );
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Telefone</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ) : (phones ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem telefones</TableCell></TableRow>
            ) : (
              (phones ?? []).map((ph) => (
                <TableRow key={ph.id}>
                  <TableCell className="font-mono">{formatPhone(ph.phone)}</TableCell>
                  <TableCell>{ph.phone_type || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ph.source || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {ph.is_whatsapp && <Badge variant="secondary"><MessageCircle className="h-3 w-3 mr-1" />WhatsApp</Badge>}
                      {ph.is_valid === true && <Badge className="bg-green-600">Válido</Badge>}
                      {ph.is_valid === false && <Badge variant="destructive">Inválido</Badge>}
                      {ph.is_valid == null && <Badge variant="outline">Não validado</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateMut.mutate({
                          id: ph.id,
                          personId,
                          patch: { is_whatsapp: !ph.is_whatsapp },
                        })
                      }
                      title="Alternar WhatsApp"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => validateMut.mutate({ id: ph.id, personId, valid: true })}
                      title="Marcar como válido"
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => validateMut.mutate({ id: ph.id, personId, valid: false })}
                      title="Marcar como inválido"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMut.mutate({ id: ph.id, personId })}
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
