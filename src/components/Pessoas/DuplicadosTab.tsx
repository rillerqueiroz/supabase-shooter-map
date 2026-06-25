import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GitMerge } from 'lucide-react';
import { useDuplicateGroups } from '@/hooks/usePeopleDuplicates';
import { formatDocument } from '@/utils/normalize-phone';
import { MergePeopleDialog } from './MergePeopleDialog';

export function DuplicadosTab() {
  const { data: groups, isLoading } = useDuplicateGroups(100);
  const [active, setActive] = useState<{ doc: string; ids: string[] } | null>(null);

  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm text-muted-foreground">
        {isLoading
          ? 'Carregando duplicados...'
          : `${groups?.length ?? 0} grupo(s) de duplicados por CPF/CNPJ`}
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (groups ?? []).length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Nenhum duplicado encontrado 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {(groups ?? []).map((g) => (
            <div
              key={g.document_digits}
              className="flex items-center justify-between p-3 border rounded-md"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{formatDocument(g.document_digits)}</Badge>
                <span className="text-sm text-muted-foreground">{g.count} registros</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {g.ids.slice(0, 3).map((id) => id.slice(0, 8)).join(', ')}
                  {g.ids.length > 3 ? '…' : ''}
                </span>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={() => setActive({ doc: g.document_digits, ids: g.ids })}
              >
                <GitMerge className="mr-2 h-4 w-4" /> Mesclar
              </Button>
            </div>
          ))}
        </div>
      )}

      <MergePeopleDialog
        group={active}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
      />
    </Card>
  );
}
