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
import { useTitulosByCpf } from '@/hooks/useTitulosByCpf';
import { format } from 'date-fns';

interface Props {
  documentDigits: string | null;
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

export function PessoaTitulosTab({ documentDigits }: Props) {
  const { data, isLoading } = useTitulosByCpf(documentDigits);
  const rows = data ?? [];

  return (
    <div className="space-y-3 py-4">
      <div className="text-sm text-muted-foreground">
        {rows.length} título(s) encontrado(s) em base_tudobelo_intermediaria
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cedrus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem títulos</TableCell></TableRow>
            ) : (
              rows.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{String(t.id).slice(0, 8)}</TableCell>
                  <TableCell>{t.documento || '—'}</TableCell>
                  <TableCell>{fmtDate(t.data_vencimento)}</TableCell>
                  <TableCell>{fmtMoney(t.saldo_parcela ?? t.valor_parcela)}</TableCell>
                  <TableCell><Badge variant="outline">{t.status_titulo || '—'}</Badge></TableCell>
                  <TableCell>
                    {t.inserido_cedrus ? <Badge className="bg-green-600">Inserido</Badge> : <Badge variant="outline">Não</Badge>}
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
