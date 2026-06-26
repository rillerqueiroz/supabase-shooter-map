import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { formatDocument } from '@/utils/normalize-phone';
import { PessoaDetailsModal } from './PessoaDetailsModal';
import type { Person } from '@/types/people';

interface Row {
  id: string;
  person_id: string;
  creditor_code: string | null;
  debtor_code_at_creditor: string | null;
  status: string | null;
  source: string | null;
  person?: Person | null;
}

const CHUNK = 1000;

async function fetchSemCredor(): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('people_creditors')
      .select('id, person_id, creditor_code, debtor_code_at_creditor, status, source')
      .not('debtor_code_at_creditor', 'is', null)
      .neq('debtor_code_at_creditor', '')
      .or('creditor_code.is.null,creditor_code.eq.')
      .range(from, from + CHUNK - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < CHUNK) break;
    from += CHUNK;
  }

  // Hidrata pessoas
  const ids = Array.from(new Set(rows.map((r) => r.person_id).filter(Boolean)));
  const peopleMap = new Map<string, Person>();
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .in('id', slice)
      .is('merged_into_id', null);
    if (error) throw error;
    for (const p of (data as Person[]) || []) peopleMap.set(p.id, p);
  }
  for (const r of rows) r.person = peopleMap.get(r.person_id) ?? null;
  rows.sort((a, b) => (a.person?.name || '').localeCompare(b.person?.name || ''));
  return rows;
}

export function SemCredorTab() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['people-sem-credor'],
    queryFn: fetchSemCredor,
    staleTime: 60_000,
  });

  const q = search.trim().toLowerCase();
  const rows = (data ?? []).filter((r) => {
    if (!q) return true;
    return (
      (r.person?.name || '').toLowerCase().includes(q) ||
      (r.person?.cpf || '').toLowerCase().includes(q) ||
      (r.debtor_code_at_creditor || '').toLowerCase().includes(q)
    );
  });

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ ou código do parceiro"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {rows.length} vínculo(s) com código de parceiro e sem credor
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Código Parceiro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum vínculo encontrado
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => r.person_id && setSelectedId(r.person_id)}
                >
                  <TableCell className="font-medium">{r.person?.name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatDocument(r.person?.cpf)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.debtor_code_at_creditor || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status || '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.source || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PessoaDetailsModal
        personId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </Card>
  );
}
