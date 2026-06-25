import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useMergePeople } from '@/hooks/usePeopleDuplicates';
import { formatDocument } from '@/utils/normalize-phone';
import type { Person } from '@/types/people';

interface Props {
  group: { doc: string; ids: string[] } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchPeopleByIds(ids: string[]): Promise<Person[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('people').select('*').in('id', ids);
  if (error) throw error;
  return (data as Person[]) || [];
}

export function MergePeopleDialog({ group, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['merge-people-detail', group?.ids],
    queryFn: () => fetchPeopleByIds(group?.ids ?? []),
    enabled: !!group?.ids?.length,
  });

  const [canonical, setCanonical] = useState<string | null>(null);
  const merge = useMergePeople();

  useEffect(() => {
    if (data && data.length > 0) {
      const sorted = [...data].sort(
        (a, b) => (a.created_at || '').localeCompare(b.created_at || '')
      );
      setCanonical(sorted[0].id);
    }
  }, [data]);

  const handleMerge = () => {
    if (!canonical || !group) return;
    const duplicates = group.ids.filter((id) => id !== canonical);
    merge.mutate(
      { canonical, duplicates },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Mesclar pessoas — {group ? formatDocument(group.doc) : ''}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <RadioGroup value={canonical ?? ''} onValueChange={setCanonical} className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              Selecione o registro canônico. Os outros serão mesclados nele (campos vazios preservados via COALESCE, telefones/credores/IDs movidos).
            </div>
            {(data ?? []).map((p) => (
              <Label
                key={p.id}
                className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/40"
              >
                <RadioGroupItem value={p.id} className="mt-1" />
                <div className="flex-1">
                  <div className="font-medium">{p.name || '— sem nome —'}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{p.id.slice(0, 8)}</span> ·{' '}
                    {p.email || 'sem email'} · criado{' '}
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleMerge} disabled={!canonical || merge.isPending}>
            {merge.isPending ? 'Mesclando...' : 'Confirmar merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
