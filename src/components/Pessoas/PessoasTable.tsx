import { useState } from 'react';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { usePeople } from '@/hooks/usePeople';
import { formatDocument } from '@/utils/normalize-phone';
import { PessoaDetailsModal } from './PessoaDetailsModal';

export function PessoasTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyWithoutDocument, setOnlyWithoutDocument] = useState(false);

  const { data, isLoading } = usePeople({ search, page, pageSize, onlyWithoutDocument });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ ou telefone"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="only-without-doc"
            checked={onlyWithoutDocument}
            onCheckedChange={(v) => {
              setPage(0);
              setOnlyWithoutDocument(!!v);
            }}
          />
          <Label htmlFor="only-without-doc" className="text-sm cursor-pointer">
            Apenas sem CPF/CNPJ
          </Label>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {total} pessoa(s){onlyWithoutDocument ? ' sem CPF/CNPJ' : ''} vinculada(s) a TUDOBELO / TUDOBELO-FUNDOS
        </div>
      </div>


      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Email</TableHead>
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
                  Nenhuma pessoa encontrada
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedId(p.id)}
                >
                  <TableCell className="font-medium">{p.name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{formatDocument(p.cpf)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.person_type === 'J' ? 'PJ' : p.person_type === 'F' ? 'PF' : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {[p.address_city, p.address_state].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.email || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        pageIndex={page}
        pageSize={pageSize}
        pageCount={pageCount}
        canPreviousPage={page > 0}
        canNextPage={page + 1 < pageCount}
        gotoPage={(u) => setPage(typeof u === 'function' ? u(page) : u)}
        previousPage={() => setPage((p) => Math.max(0, p - 1))}
        nextPage={() => setPage((p) => p + 1)}
        setPageSize={(s) => {
          setPageSize(s);
          setPage(0);
        }}
        totalItems={total}
      />

      <PessoaDetailsModal
        personId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </Card>
  );
}
