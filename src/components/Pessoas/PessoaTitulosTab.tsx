import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, Unlink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTitulosByCpf } from '@/hooks/useTitulosByCpf';
import { setTituloPersonId } from '@/utils/supabase-people-mapper';
import { format } from 'date-fns';

interface Props {
  documentDigits: string | null;
  personId: string;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try {
    return format(new Date(d.split('T')[0]), 'dd/MM/yyyy');
  } catch {
    return d;
  }
}

function fmtMoney(v?: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PessoaTitulosTab({ documentDigits, personId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useTitulosByCpf(documentDigits);
  const rows = data ?? [];

  const linkMut = useMutation({
    mutationFn: ({ tituloId, link }: { tituloId: string; link: boolean }) =>
      setTituloPersonId(tituloId, link ? personId : null),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['titulos-by-cpf', documentDigits] });
      toast.success(vars.link ? 'Título vinculado à pessoa' : 'Vínculo removido');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  return (
    <div className="space-y-2 py-3">
      <div className="text-xs text-muted-foreground">
        {rows.length} título(s) encontrado(s) por CPF/CNPJ
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-8">ID</TableHead>
              <TableHead className="h-8">Documento</TableHead>
              <TableHead className="h-8">Vencimento</TableHead>
              <TableHead className="h-8">Valor</TableHead>
              <TableHead className="h-8">Status</TableHead>
              <TableHead className="h-8">Cedrus</TableHead>
              <TableHead className="h-8">Vínculo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-4">Sem títulos</TableCell></TableRow>
            ) : (
              rows.map((t: any) => {
                const linkedHere = t.person_id === personId;
                const linkedOther = t.person_id && t.person_id !== personId;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{String(t.id).slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{t.documento || '—'}</TableCell>
                    <TableCell className="text-xs">{fmtDate(t.data_vencimento)}</TableCell>
                    <TableCell className="text-xs">{fmtMoney(t.saldo_parcela ?? t.valor_parcela)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] py-0">{t.status_titulo || '—'}</Badge></TableCell>
                    <TableCell>
                      {t.inserido_cedrus
                        ? <Badge className="bg-green-600 text-[10px] py-0">Inserido</Badge>
                        : <Badge variant="outline" className="text-[10px] py-0">Não</Badge>}
                    </TableCell>
                    <TableCell>
                      {linkedHere ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => linkMut.mutate({ tituloId: t.id, link: false })}>
                          <Unlink className="h-3 w-3 mr-1" /> Desvincular
                        </Button>
                      ) : linkedOther ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => linkMut.mutate({ tituloId: t.id, link: true })}
                          title="Vinculado a outra pessoa — clique para mover">
                          <Link2 className="h-3 w-3 mr-1" /> Mover p/ esta
                        </Button>
                      ) : (
                        <Button size="sm" variant="default" className="h-7 text-xs"
                          onClick={() => linkMut.mutate({ tituloId: t.id, link: true })}>
                          <Check className="h-3 w-3 mr-1" /> Vincular
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
