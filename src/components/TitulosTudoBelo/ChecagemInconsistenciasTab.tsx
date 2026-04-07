import { useMemo, useState } from "react";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { TituloDetailsModal } from "./TituloDetailsModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

interface InconsistenciaRule {
  id: string;
  label: string;
  description: string;
  items: TituloTudoBelo[];
}

interface ChecagemInconsistenciasTabProps {
  titulos: TituloTudoBelo[];
}

export function ChecagemInconsistenciasTab({ titulos }: ChecagemInconsistenciasTabProps) {
  const [selectedTitulo, setSelectedTitulo] = useState<TituloTudoBelo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const rules = useMemo<InconsistenciaRule[]>(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return [
      {
        id: "etapa-vencer-status-pago",
        label: 'Etapa "Títulos a vencer" + Status "Pago"',
        description: "Título marcado como pago mas ainda na etapa de títulos a vencer",
        items: titulos.filter(
          (t) =>
            t.etapa?.trim() === "Títulos a vencer" &&
            t.status_titulo?.trim().toLowerCase() === "pago"
        ),
      },
      {
        id: "pago-sem-data-pagamento",
        label: 'Status "Pago" sem data de pagamento',
        description: "Título com status pago mas sem data de pagamento preenchida",
        items: titulos.filter(
          (t) =>
            t.status_titulo?.trim().toLowerCase() === "pago" && !t.data_pagamento
        ),
      },
      {
        id: "pago-sem-valor-pago",
        label: 'Status "Pago" sem valor pago',
        description: "Título com status pago mas sem valor pago preenchido",
        items: titulos.filter(
          (t) =>
            t.status_titulo?.trim().toLowerCase() === "pago" &&
            (t.valor_pago === null || t.valor_pago === undefined || t.valor_pago === 0)
        ),
      },
      {
        id: "cedrus-sem-id",
        label: "Inserido no Cedrus = true sem ID Cedrus",
        description: "Marcado como inserido no Cedrus mas sem ID de título Cedrus",
        items: titulos.filter(
          (t) => t.inserido_cedrus === true && !t.id_titulo_cedrus
        ),
      },
      {
        id: "negativado-pago",
        label: 'Negativado = true + Status "Pago"',
        description: "Título pago que continua com negativação ativa",
        items: titulos.filter(
          (t) =>
            t.negativado === true &&
            t.status_titulo?.trim().toLowerCase() === "pago"
        ),
      },
      {
        id: "superavit-nao-processado",
        label: 'Etapa "Cobrança Superavit" + processado_internamente = false',
        description: "Título na etapa de cobrança Superávit que não foi processado internamente",
        items: titulos.filter(
          (t) =>
            t.etapa?.trim() === "Cobrança Superavit" &&
            t.processado_internamente === false
        ),
      },
      {
        id: "vencimento-futuro-status-vencido",
        label: 'Data de vencimento futura + Status "Vencido"',
        description: "Status marcado como vencido mas a data de vencimento ainda não passou",
        items: titulos.filter((t) => {
          if (t.status_titulo?.trim().toLowerCase() !== "vencido" || !t.data_vencimento)
            return false;
          try {
            const [y, m, d] = t.data_vencimento.split("T")[0].split("-").map(Number);
            const venc = new Date(y, m - 1, d);
            return venc > hoje;
          } catch {
            return false;
          }
        }),
      },
      {
        id: "pago-cedrus-aberto",
        label: 'Status "Pago" + Status Cedrus iniciando com "A"',
        description: "Título com status pago mas ainda aberto no Cedrus",
        items: titulos.filter(
          (t) =>
            t.status_titulo?.trim().toLowerCase() === "pago" &&
            t.status_cedrus?.trim().toUpperCase().startsWith("A")
        ),
      },
      {
        id: "cedrus-pago-status-diferente",
        label: 'Status Cedrus iniciando com "P" + Status título diferente de "Pago"',
        description: "Título pago no Cedrus mas com status diferente de pago no sistema",
        items: titulos.filter(
          (t) =>
            t.status_cedrus?.trim().toUpperCase().startsWith("P") &&
            t.status_titulo?.trim().toLowerCase() !== "pago"
        ),
      },
    ];
  }, [titulos]);

  const totalInconsistencias = useMemo(
    () => rules.reduce((sum, r) => sum + r.items.length, 0),
    [rules]
  );

  const handleTituloClick = (titulo: TituloTudoBelo) => {
    setSelectedTitulo(titulo);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {totalInconsistencias > 0 ? (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {totalInconsistencias} inconsistência{totalInconsistencias !== 1 ? "s" : ""} encontrada{totalInconsistencias !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Nenhuma inconsistência encontrada
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {rules.map((rule) => (
              <AccordionItem key={rule.id} value={rule.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={rule.items.length > 0 ? "destructive" : "secondary"}
                      className="min-w-[32px] justify-center"
                    >
                      {rule.items.length}
                    </Badge>
                    <div className="text-left">
                      <span className="font-medium">{rule.label}</span>
                      <p className="text-xs text-muted-foreground font-normal">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {rule.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Nenhum título com essa inconsistência.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Parceiro</TableHead>
                            <TableHead>CNPJ/CPF</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Etapa</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rule.items.map((t) => (
                            <TableRow
                              key={t.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleTituloClick(t)}
                            >
                              <TableCell className="font-mono text-xs">
                                {t.id.substring(0, 8)}
                              </TableCell>
                              <TableCell>{t.nome_parceiro || "-"}</TableCell>
                              <TableCell className="text-xs">{t.cnpj_cpf || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {t.status_titulo || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{t.etapa || "-"}</TableCell>
                              <TableCell className="text-xs">
                                {formatDate(t.data_vencimento)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {formatCurrency(t.saldo_parcela)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <TituloDetailsModal
        titulo={selectedTitulo}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
