import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Copy, Phone, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
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

export function PessoaTelefonesSection({ personId }: Props) {
  const { data: phones, isLoading } = usePersonPhones(personId);
  const addMut = useAddPersonPhone();
  const validateMut = useValidatePhone();
  const updateMut = useUpdatePersonPhone();
  const deleteMut = useDeletePersonPhone();

  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleCopy = (phone: string) => {
    const formatted = formatPhone(phone);
    navigator.clipboard.writeText(formatted);
    toast.success(`Telefone ${formatted} copiado`);
  };

  const count = phones?.length ?? 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Telefones ({count})</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
          <Input
            placeholder="(11) 91234-5678"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <Input
            placeholder="celular/fixo"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="h-8 text-sm w-32"
          />
          <Button
            size="sm"
            disabled={!newPhone.trim() || addMut.isPending}
            onClick={() =>
              addMut.mutate(
                { personId, payload: { phone: newPhone.trim(), phone_type: newType.trim() || null } },
                {
                  onSuccess: () => {
                    setNewPhone('');
                    setNewType('');
                    setShowAdd(false);
                  },
                }
              )
            }
          >
            Salvar
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wider">Telefone</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider">Tipo</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider">Origem</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider">Validade</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider">WhatsApp</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          ) : count === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-6">
                Sem telefones cadastrados
              </TableCell>
            </TableRow>
          ) : (
            (phones ?? []).map((ph) => (
              <TableRow key={ph.id} className="[&>td]:py-3 [&>td]:align-middle">
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-1.5">
                    {formatPhone(ph.phone)}
                    <button
                      type="button"
                      onClick={() => handleCopy(ph.phone)}
                      className="p-1 hover:bg-primary/10 rounded transition-colors"
                      title="Copiar telefone"
                    >
                      <Copy className="h-3 w-3 text-primary/70" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{ph.phone_type || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{ph.source || '—'}</TableCell>
                <TableCell>
                  {ph.is_valid === true ? (
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] py-0 gap-1">
                      <ShieldCheck className="h-3 w-3" /> Válido
                    </Badge>
                  ) : ph.is_valid === false ? (
                    <Badge variant="destructive" className="text-[10px] py-0">Inválido</Badge>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Não verificado
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!ph.is_whatsapp}
                      onCheckedChange={(v) =>
                        updateMut.mutate({ id: ph.id, personId, patch: { is_whatsapp: v } })
                      }
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {ph.is_whatsapp ? 'Possui WhatsApp' : 'Sem WhatsApp'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant={ph.is_valid === true ? 'default' : 'outline'}
                      className="h-7 w-7"
                      onClick={() => validateMut.mutate({ id: ph.id, personId, valid: true })}
                      title="Marcar como válido"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant={ph.is_valid === false ? 'destructive' : 'outline'}
                      className="h-7 w-7"
                      onClick={() => validateMut.mutate({ id: ph.id, personId, valid: false })}
                      title="Marcar como inválido"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMut.mutate({ id: ph.id, personId })}
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
