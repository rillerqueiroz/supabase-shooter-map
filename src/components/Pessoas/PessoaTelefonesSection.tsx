import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Check, X, Trash2, MessageCircle, Copy } from 'lucide-react';
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

  const handleCopy = (phone: string) => {
    const formatted = formatPhone(phone);
    navigator.clipboard.writeText(formatted);
    toast.success(`Telefone ${formatted} copiado`);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Telefones</h3>
        <span className="text-xs text-muted-foreground">{phones?.length ?? 0} cadastrado(s)</span>
      </div>

      <div className="flex items-center gap-2">
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
              { onSuccess: () => { setNewPhone(''); setNewType(''); } }
            )
          }
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="rounded-md border divide-y">
        {isLoading ? (
          <div className="p-2"><Skeleton className="h-6 w-full" /></div>
        ) : (phones ?? []).length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-4">Sem telefones</div>
        ) : (
          (phones ?? []).map((ph) => (
            <div key={ph.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30">
              <span className="font-mono text-sm">{formatPhone(ph.phone)}</span>
              <button
                type="button"
                onClick={() => handleCopy(ph.phone)}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
                title="Copiar telefone"
              >
                <Copy className="h-3.5 w-3.5 text-primary/70 hover:text-primary" />
              </button>
              {ph.phone_type && (
                <Badge variant="outline" className="text-[10px] py-0">{ph.phone_type}</Badge>
              )}
              {ph.source && (
                <span className="text-[10px] text-muted-foreground">{ph.source}</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {ph.is_whatsapp && (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                  </Badge>
                )}
                {ph.is_valid === true && <Badge className="bg-green-600 text-[10px] py-0">Válido</Badge>}
                {ph.is_valid === false && <Badge variant="destructive" className="text-[10px] py-0">Inválido</Badge>}
                {ph.is_valid == null && <Badge variant="outline" className="text-[10px] py-0">Não validado</Badge>}
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => updateMut.mutate({ id: ph.id, personId, patch: { is_whatsapp: !ph.is_whatsapp } })}
                  title="Alternar WhatsApp">
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => validateMut.mutate({ id: ph.id, personId, valid: true })}
                  title="Marcar como válido">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => validateMut.mutate({ id: ph.id, personId, valid: false })}
                  title="Marcar como inválido">
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => deleteMut.mutate({ id: ph.id, personId })}
                  title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
