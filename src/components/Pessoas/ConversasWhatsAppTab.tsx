import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileDown,
  Phone,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PersonPhone } from '@/types/people';
import { formatPhone } from '@/utils/normalize-phone';

interface Summary {
  phone: string;
  matchedE164: string | null;
  total: number;
  firstAt: string | null;
  lastAt: string | null;
}

interface Mensagem {
  id: string;
  message_text: string | null;
  from_me: boolean | null;
  original_at: string | null;
  created_at_message: string | null;
  queue_name: string | null;
  phone_e164: string | null;
}

const PAGE = 200;

function lastDigits(p: string, n = 8) {
  return (p || '').replace(/\D/g, '').slice(-n);
}

interface Props {
  phones: PersonPhone[];
  personName?: string | null;
}

export default function ConversasWhatsAppTab({ phones, personName }: Props) {
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Mensagem[]>>({});
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const uniquePhones = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of phones) {
      const d = lastDigits(p.phone || '', 8);
      if (!d || seen.has(d)) continue;
      seen.add(d);
      out.push(p.phone);
    }
    return out;
  }, [phones]);

  const loadSummaries = useCallback(async () => {
    if (uniquePhones.length === 0) {
      setSummaries([]);
      return;
    }
    setLoading(true);
    try {
      const results: Summary[] = [];
      for (const phone of uniquePhones) {
        const tail = lastDigits(phone, 8);
        if (!tail) {
          results.push({ phone, matchedE164: null, total: 0, firstAt: null, lastAt: null });
          continue;
        }
        const { data, count } = await supabase
          .from('whatsapp_webhook_messages' as any)
          .select('phone_e164, original_at', { count: 'exact' })
          .ilike('phone_e164', `%${tail}`)
          .order('original_at', { ascending: false, nullsFirst: false })
          .limit(1);
        const first = (data as any[])?.[0];
        let firstAt: string | null = null;
        if ((count || 0) > 0) {
          const { data: oldest } = await supabase
            .from('whatsapp_webhook_messages' as any)
            .select('original_at')
            .ilike('phone_e164', `%${tail}`)
            .order('original_at', { ascending: true, nullsFirst: false })
            .limit(1);
          firstAt = (oldest as any[])?.[0]?.original_at || null;
        }
        results.push({
          phone,
          matchedE164: first?.phone_e164 || null,
          total: count || 0,
          firstAt,
          lastAt: first?.original_at || null,
        });
      }
      setSummaries(results);
    } catch (e: any) {
      toast.error('Erro ao buscar conversas: ' + (e?.message || 'falha'));
    } finally {
      setLoading(false);
    }
  }, [uniquePhones]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  const loadMessages = useCallback(async (phone: string): Promise<Mensagem[]> => {
    const tail = lastDigits(phone, 8);
    if (!tail) return [];
    setLoadingMsg(phone);
    try {
      const all: Mensagem[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('whatsapp_webhook_messages' as any)
          .select('id, message_text, from_me, original_at, created_at_message, queue_name, phone_e164')
          .ilike('phone_e164', `%${tail}`)
          .order('original_at', { ascending: true, nullsFirst: false })
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        const chunk = (data as Mensagem[]) || [];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        offset += PAGE;
      }
      setMessages((prev) => ({ ...prev, [phone]: all }));
      return all;
    } catch (e: any) {
      toast.error('Erro ao carregar mensagens: ' + (e?.message || 'falha'));
      return [];
    } finally {
      setLoadingMsg(null);
    }
  }, []);

  const toggle = (phone: string) => {
    const isOpen = expanded === phone;
    setExpanded(isOpen ? null : phone);
    if (!isOpen && !messages[phone]) loadMessages(phone);
  };

  const exportPdf = async (phone: string) => {
    setExporting(phone);
    try {
      const list = messages[phone] ?? (await loadMessages(phone));
      if (!list || list.length === 0) {
        toast.error('Sem mensagens para exportar.');
        return;
      }
      const doc = new jsPDF({ orientation: 'portrait' });
      doc.setFontSize(14);
      doc.text(`Conversa — ${personName || 'Pessoa'}`, 14, 14);
      doc.setFontSize(9);
      doc.text(`Telefone: ${formatPhone(phone)}`, 14, 20);
      doc.text(
        `Total: ${list.length} mensagens · Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        14,
        25,
      );
      autoTable(doc, {
        startY: 30,
        head: [['Data/Hora', 'Origem', 'Responsável', 'Mensagem']],
        body: list.map((m) => [
          m.original_at ? format(new Date(m.original_at), 'dd/MM/yyyy HH:mm') : '—',
          m.from_me ? 'Empresa' : 'Contato',
          m.queue_name || '—',
          m.message_text || '',
        ]),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 18 }, 2: { cellWidth: 28 }, 3: { cellWidth: 'auto' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const isEmpresa = data.cell.raw === 'Empresa';
            data.cell.styles.fillColor = isEmpresa ? [220, 240, 255] : [240, 240, 240];
          }
        },
      });
      const safe = (personName || phone).replace(/[^\w-]+/g, '_');
      doc.save(`conversa-${safe}-${lastDigits(phone, 11)}.pdf`);
      toast.success(`PDF gerado com ${list.length} mensagens.`);
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + (e?.message || 'falha'));
    } finally {
      setExporting(null);
    }
  };

  if (uniquePhones.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        Nenhum telefone cadastrado para buscar conversas.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando conversas...
      </div>
    );
  }

  const totalGeral = summaries.reduce((s, x) => s + x.total, 0);
  if (totalGeral === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        Nenhuma conversa de WhatsApp encontrada para os telefones desta pessoa.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {summaries.map((s) => {
        const isOpen = expanded === s.phone;
        const msgs = messages[s.phone];
        return (
          <div key={s.phone} className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm">{formatPhone(s.phone)}</span>
                <Badge variant="secondary" className="text-[10px]">{s.total} msgs</Badge>
                {s.firstAt && s.lastAt && (
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(s.firstAt), 'dd/MM/yy', { locale: ptBR })} →{' '}
                    {format(new Date(s.lastAt), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                )}
              </div>
              {s.total > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => exportPdf(s.phone)}
                    disabled={exporting === s.phone}
                  >
                    {exporting === s.phone ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                    )}
                    PDF
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle(s.phone)}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="border-t bg-background">
                {loadingMsg === s.phone ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
                  </div>
                ) : !msgs || msgs.length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs py-4">Sem mensagens.</div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="p-3 space-y-2">
                      {msgs.map((m) => {
                        const out = !!m.from_me;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${out ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                out
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {out && m.queue_name && (
                                <div className="text-[10px] opacity-80 mb-0.5 font-semibold">
                                  {m.queue_name}
                                </div>
                              )}
                              <div className="whitespace-pre-wrap break-words">
                                {m.message_text || ''}
                              </div>
                              <div className={`text-[10px] mt-1 ${out ? 'opacity-80' : 'text-muted-foreground'}`}>
                                {m.original_at
                                  ? format(new Date(m.original_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                                  : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
        <MessageSquare className="h-3 w-3" /> Total: {totalGeral} mensagens em{' '}
        {summaries.filter((s) => s.total > 0).length} número(s).
      </div>
    </div>
  );
}
