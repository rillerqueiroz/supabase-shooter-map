import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { MultiSelectFilter } from '@/components/Dashboard/MultiSelectFilter';
import { usePagination } from '@/hooks/usePagination';
import {
  useTitulosSemPessoa,
  useVincularTituloPessoa,
  useVincularTitulosBulk,
  useDesvincularTitulo,
  type MatchCandidate,
  type TituloComMatches,
  type LinkFilter,
} from '@/hooks/useTitulosSemPessoa';

import { formatDocument } from '@/utils/normalize-phone';
import { Search, Link2, Loader2, X, Users, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoSuperavit from '@/assets/logo-superavit.png';

type MatchFilter = 'todos' | 'codigo_parceiro' | 'cpf_cnpj' | 'ambos' | 'multiplos' | 'sem_match';

const formatCurrency = (v: number | null) =>
  v == null
    ? 'R$ 0,00'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (s: string | null) => {
  if (!s) return '-';
  try {
    const [y, m, d] = s.split('T')[0].split('-').map(Number);
    return format(new Date(y, m - 1, d), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return s;
  }
};

function classifyMatch(t: TituloComMatches): MatchFilter {
  if (t.candidates.length === 0) return 'sem_match';
  if (t.candidates.length > 1) return 'multiplos';
  const r = t.candidates[0].reasons;
  if (r.includes('codigo_parceiro') && r.includes('cpf_cnpj')) return 'ambos';
  if (r.includes('codigo_parceiro')) return 'codigo_parceiro';
  return 'cpf_cnpj';
}

function CandidateBadge({ reason }: { reason: 'codigo_parceiro' | 'cpf_cnpj' }) {
  return reason === 'codigo_parceiro' ? (
    <Badge variant="secondary" className="text-[10px]">Cód. Parceiro</Badge>
  ) : (
    <Badge variant="outline" className="text-[10px]">CPF/CNPJ</Badge>
  );
}

function CandidatePicker({
  candidates,
  onPick,
  pending,
  selectedPersonId,
}: {
  candidates: MatchCandidate[];
  onPick: (personId: string) => void;
  pending: boolean;
  selectedPersonId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (candidates.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  if (candidates.length === 1) {
    const c = candidates[0];
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <div className="min-w-0">
          <div className="text-xs font-medium truncate" title={c.name || ''}>
            {c.name || '(sem nome)'}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {formatDocument(c.cpf) || '—'}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {c.reasons.map((r) => (
            <CandidateBadge key={r} reason={r} />
          ))}
        </div>
      </div>
    );
  }

  const chosen = candidates.find((c) => c.person_id === selectedPersonId) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={chosen ? 'secondary' : 'outline'}
          size="sm"
          className="h-auto min-h-8 w-full justify-between py-1.5"
        >
          {chosen ? (
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="text-xs font-medium truncate max-w-[200px]" title={chosen.name || ''}>
                {chosen.name || '(sem nome)'}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatDocument(chosen.cpf) || '—'}
              </span>
            </div>
          ) : (
            <span className="text-xs">{candidates.length} candidatos — escolher</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-1" align="end">
        <div className="max-h-72 overflow-auto">
          {candidates.map((c) => {
            const isSel = c.person_id === selectedPersonId;
            return (
              <button
                key={c.person_id}
                type="button"
                disabled={pending}
                onClick={() => {
                  onPick(c.person_id);
                  setOpen(false);
                }}
                className={`w-full text-left px-2 py-2 rounded text-xs flex items-start gap-2 ${
                  isSel ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{c.name || '(sem nome)'}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {formatDocument(c.cpf) || '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 items-end">
                  {c.reasons.map((r) => (
                    <CandidateBadge key={r} reason={r} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function VincularTitulosPessoas() {
  const [externalSystem, setExternalSystem] = useState<string>('__any__');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('unlinked');
  const { data: titulos, isLoading, error } = useTitulosSemPessoa(
    externalSystem === '__any__' ? null : externalSystem,
    linkFilter,
  );
  const vincularMut = useVincularTituloPessoa();
  const bulkMut = useVincularTitulosBulk();
  const desvincularMut = useDesvincularTitulo();


  const [search, setSearch] = useState('');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('todos');
  const [parceiros, setParceiros] = useState<string[]>([]);
  const [filiais, setFiliais] = useState<string[]>([]);
  const [ufs, setUfs] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, string>>(new Map());

  const options = useMemo(() => {
    if (!titulos) return { parceiros: [] as string[], filiais: [] as string[], ufs: [] as string[] };
    const u = (arr: (string | null)[]) =>
      Array.from(new Set(arr.filter((x): x is string => !!x))).sort();
    return {
      parceiros: u(titulos.map((t) => t.nome_parceiro)),
      filiais: u(titulos.map((t) => t.filial)),
      ufs: u(titulos.map((t) => t.uf_cobranca)),
    };
  }, [titulos]);

  const filtered = useMemo(() => {
    if (!titulos) return [];
    const q = search.trim().toLowerCase();
    return titulos.filter((t) => {
      if (matchFilter !== 'todos' && classifyMatch(t) !== matchFilter) return false;
      if (parceiros.length && !parceiros.includes(t.nome_parceiro || '')) return false;
      if (filiais.length && !filiais.includes(t.filial || '')) return false;
      if (ufs.length && !ufs.includes(t.uf_cobranca || '')) return false;
      if (q) {
        const hay = [t.documento, t.nome_parceiro, t.cnpj_cpf, t.codigo_parceiro]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [titulos, search, matchFilter, parceiros, filiais, ufs]);

  const {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    totalItems,
  } = usePagination<TituloComMatches>({ data: filtered, initialPageSize: 50 });

  const metrics = useMemo(() => {
    const all = titulos || [];
    return {
      total: all.length,
      semMatch: all.filter((t) => t.candidates.length === 0).length,
      um: all.filter((t) => t.candidates.length === 1).length,
      multi: all.filter((t) => t.candidates.length > 1).length,
    };
  }, [titulos]);

  const selectableInPage = paginatedData.filter((t) => t.candidates.length === 1);
  const allPageSelected =
    selectableInPage.length > 0 && selectableInPage.every((t) => selectedIds.has(t.id));

  const togglePage = (checked: boolean) => {
    const next = new Set(selectedIds);
    for (const t of selectableInPage) {
      if (checked) next.add(t.id);
      else next.delete(t.id);
    }
    setSelectedIds(next);
  };

  const handleBulk = () => {
    const pairs: Array<{ tituloId: string; personId: string }> = [];
    for (const t of filtered) {
      if (!selectedIds.has(t.id)) continue;
      if (t.candidates.length === 1) {
        pairs.push({ tituloId: t.id, personId: t.candidates[0].person_id });
      }
    }
    if (!pairs.length) return;
    bulkMut.mutate(pairs, {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const clearFilters = () => {
    setSearch('');
    setMatchFilter('todos');
    setParceiros([]);
    setFiliais([]);
    setUfs([]);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <img src={logoSuperavit} alt="Superávit" className="h-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Vincular Títulos com Pessoas</h1>
            <p className="text-muted-foreground text-xs">
              Cruza títulos sem <code className="text-[10px]">person_id</code> com a base de pessoas
              por código do parceiro e CPF/CNPJ.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v as LinkFilter)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unlinked">Não vinculados</SelectItem>
              <SelectItem value="linked">Vinculados</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={externalSystem} onValueChange={setExternalSystem}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Sistema externo (codigo_parceiro)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Qualquer sistema</SelectItem>
              <SelectItem value="tudobelo">tudobelo</SelectItem>
              <SelectItem value="tudobelo-fundos">tudobelo-fundos</SelectItem>
              <SelectItem value="cedrus">cedrus</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>


      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Títulos sem pessoa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total.toLocaleString('pt-BR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Match único
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.um.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Múltiplos candidatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.multi.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem match</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {metrics.semMatch.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento, nome, CPF/CNPJ ou código do parceiro"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={matchFilter} onValueChange={(v) => setMatchFilter(v as MatchFilter)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os matches</SelectItem>
                <SelectItem value="codigo_parceiro">Só por Cód. Parceiro</SelectItem>
                <SelectItem value="cpf_cnpj">Só por CPF/CNPJ</SelectItem>
                <SelectItem value="ambos">Ambas as regras</SelectItem>
                <SelectItem value="multiplos">Múltiplos candidatos</SelectItem>
                <SelectItem value="sem_match">Sem match</SelectItem>
              </SelectContent>
            </Select>
            <MultiSelectFilter
              title="Parceiro"
              options={options.parceiros}
              selectedValues={parceiros}
              onSelectionChange={setParceiros}
            />
            <MultiSelectFilter
              title="Filial"
              options={options.filiais}
              selectedValues={filiais}
              onSelectionChange={setFiliais}
            />
            <MultiSelectFilter
              title="UF"
              options={options.ufs}
              selectedValues={ufs}
              onSelectionChange={setUfs}
            />
            {(search || matchFilter !== 'todos' || parceiros.length || filiais.length || ufs.length) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Exibindo {filtered.length.toLocaleString('pt-BR')} de{' '}
              {(titulos?.length ?? 0).toLocaleString('pt-BR')} títulos
            </span>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleBulk}
                disabled={bulkMut.isPending}
                className="gap-1"
              >
                {bulkMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                Vincular {selectedIds.size} selecionado(s)
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={(c) => togglePage(!!c)}
                      aria-label="Selecionar página"
                    />
                  </TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Cód. Parceiro</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="min-w-[280px]">Pessoa candidata</TableHead>
                  <TableHead className="w-[110px] text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Carregando títulos e candidatos...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      Nenhum título encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((t) => {
                    const cls = classifyMatch(t);
                    const isLinked = !!t.person_id;
                    const isSelectable = !isLinked && t.candidates.length === 1;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            disabled={!isSelectable}
                            checked={selectedIds.has(t.id)}
                            onCheckedChange={(c) => {
                              const next = new Set(selectedIds);
                              if (c) next.add(t.id);
                              else next.delete(t.id);
                              setSelectedIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.documento || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={t.nome_parceiro || ''}>
                          {t.nome_parceiro || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatDocument(t.cnpj_cpf) || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.codigo_parceiro || '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(t.data_vencimento)}</TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(t.saldo_parcela)}
                        </TableCell>
                        <TableCell>
                          {isLinked ? (
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="text-xs font-medium truncate" title={t.linked_person?.name || ''}>
                                {t.linked_person?.name || '(pessoa)'}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono truncate">
                                {formatDocument(t.linked_person?.cpf || null) || '—'}
                              </div>
                            </div>
                          ) : (
                            <CandidatePicker
                              candidates={t.candidates}
                              pending={vincularMut.isPending}
                              onPick={(personId) =>
                                vincularMut.mutate({ tituloId: t.id, personId })
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLinked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              disabled={desvincularMut.isPending}
                              onClick={() => desvincularMut.mutate(t.id)}
                            >
                              <X className="h-3 w-3 mr-1" /> Desvincular
                            </Button>
                          ) : cls === 'sem_match' ? (
                            <Badge variant="outline" className="text-[10px]">—</Badge>
                          ) : t.candidates.length === 1 ? (
                            <Button
                              size="sm"
                              className="h-7"
                              disabled={vincularMut.isPending}
                              onClick={() =>
                                vincularMut.mutate({
                                  tituloId: t.id,
                                  personId: t.candidates[0].person_id,
                                })
                              }
                            >
                              <Link2 className="h-3 w-3 mr-1" /> Vincular
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              {t.candidates.length} opções
                            </Badge>

                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            pageCount={pageCount}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            gotoPage={gotoPage}
            nextPage={nextPage}
            previousPage={previousPage}
            setPageSize={setPageSize}
            totalItems={totalItems}
          />
        </CardContent>
      </Card>
    </div>
  );
}
