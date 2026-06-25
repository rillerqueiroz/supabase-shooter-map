import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Phone,
  ChevronDown,
  ChevronRight,
  Play,
  FileDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MultiSelectFilter } from '@/components/Dashboard/MultiSelectFilter';
import { useHistoricoDiscadorPorPessoa, type DiscadorLigacao } from '@/hooks/useHistoricoDiscadorPorPessoa';
import { formatPhone } from '@/utils/normalize-phone';

interface Props {
  personId: string;
  personName?: string | null;
  personCpf?: string | null;
}

function fmtDur(sec: number | null) {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function audioSrc(row: DiscadorLigacao) {
  if (row.audio_base64) {
    const mime = row.audio_mime || 'audio/mpeg';
    return `data:${mime};base64,${row.audio_base64}`;
  }
  return row.recording || null;
}

export default function DiscadorTab({ personId, personName, personCpf }: Props) {
  const [requested, setRequested] = useState(false);
  const [agentes, setAgentes] = useState<string[]>([]);
  const [quals, setQuals] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { ligacoes, loading, error, total } = useHistoricoDiscadorPorPessoa({
    personId,
    name: personName,
    cpf: personCpf,
    enabled: requested,
  });

  const optsAgentes = useMemo(
    () => Array.from(new Set(ligacoes.map((l) => l.agente).filter(Boolean) as string[])).sort(),
    [ligacoes],
  );
  const optsQuals = useMemo(
    () => Array.from(new Set(ligacoes.map((l) => l.qualificacao).filter(Boolean) as string[])).sort(),
    [ligacoes],
  );

  const filtered = useMemo(() => {
    return ligacoes.filter((l) => {
      if (agentes.length && !agentes.includes(l.agente || '')) return false;
      if (quals.length && !quals.includes(l.qualificacao || '')) return false;
      return true;
    });
  }, [ligacoes, agentes, quals]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportPdf = () => {
    if (filtered.length === 0) {
      toast.error('Sem ligações para exportar.');
      return;
    }
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(`Discador — ${personName || 'Pessoa'}`, 14, 14);
      doc.setFontSize(9);
      doc.text(
        `Total: ${filtered.length} ligações · Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        14,
        20,
      );
      autoTable(doc, {
        startY: 26,
        head: [['Data', 'Número', 'Agente', 'Qualificação', 'Motivo', 'Duração', 'Histórico']],
        body: filtered.map((l) => [
          l.call_date ? format(new Date(l.call_date), 'dd/MM/yyyy HH:mm') : '—',
          l.numero || '—',
          l.agente || '—',
          l.qualificacao || '—',
          l.motivo || '—',
          fmtDur(l.talk_time ?? l.duration ?? 0),
          (l.historico || '').slice(0, 240),
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      });
      const safe = (personName || personId).replace(/[^\w-]+/g, '_');
      doc.save(`discador-${safe}.pdf`);
      toast.success(`PDF gerado com ${filtered.length} ligações.`);
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + (e?.message || 'falha'));
    }
  };

  if (!requested) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <Phone className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground max-w-md">
          O histórico do discador é uma consulta pesada. Clique abaixo para carregar.
        </div>
        <Button onClick={() => setRequested(true)}>
          <Phone className="h-4 w-4 mr-2" /> Carregar histórico do discador
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando ligações...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive text-sm py-8">{error}</div>;
  }

  if (total === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        Nenhuma ligação encontrada para esta pessoa.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MultiSelectFilter
            title="Agente"
            options={optsAgentes}
            selectedValues={agentes}
            onSelectionChange={setAgentes}
          />
          <MultiSelectFilter
            title="Qualificação"
            options={optsQuals}
            selectedValues={quals}
            onSelectionChange={setQuals}
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {total}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={exportPdf}>
          <FileDown className="h-3.5 w-3.5 mr-1.5" /> Exportar PDF
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Data</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Qualificação</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => {
              const isOpen = expanded.has(l.id);
              const src = audioSrc(l);
              return (
                <Fragment key={l.id}>
                  <TableRow className="cursor-pointer" onClick={() => toggle(l.id)}>
                    <TableCell>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.call_date ? format(new Date(l.call_date), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatPhone(l.numero || '') || '—'}</TableCell>
                    <TableCell className="text-xs">{l.agente || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {l.qualificacao ? (
                        <Badge variant="outline" className="text-[10px]">{l.qualificacao}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDur(l.talk_time ?? l.duration ?? 0)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {l.matchReasons.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={l.id + '-x'} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell />
                      <TableCell colSpan={6} className="py-3">
                        <div className="space-y-2 text-xs">
                          {l.motivo && (
                            <div>
                              <span className="font-semibold">Motivo: </span>
                              <span>{l.motivo}</span>
                            </div>
                          )}
                          {l.devedor && (
                            <div>
                              <span className="font-semibold">Devedor: </span>
                              <span>{l.devedor}</span>
                            </div>
                          )}
                          {src && (
                            <div className="flex items-center gap-2">
                              <Play className="h-3 w-3 text-muted-foreground" />
                              <audio controls src={src} className="h-8 max-w-md" />
                            </div>
                          )}
                          {l.historico && (
                            <div>
                              <span className="font-semibold">Histórico: </span>
                              <span className="whitespace-pre-wrap">{l.historico}</span>
                            </div>
                          )}
                          {l.transcricao_audio && (
                            <div>
                              <span className="font-semibold">Transcrição: </span>
                              <span className="whitespace-pre-wrap">{l.transcricao_audio}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
