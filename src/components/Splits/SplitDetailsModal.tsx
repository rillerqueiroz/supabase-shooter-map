import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SplitDetalhado } from "@/hooks/useSplits";
import { formatDateFromDatabase } from "@/lib/utils";

interface SplitDetailsModalProps {
  split: SplitDetalhado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SplitDetailsModal({ split, open, onOpenChange }: SplitDetailsModalProps) {
  if (!split) return null;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (date: string | null) => formatDateFromDatabase(date);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: string }> = {
      PENDING: { label: "Pendente", variant: "secondary" },
      CONFIRMED: { label: "Confirmado", variant: "default" },
      DONE: { label: "Pago", variant: "default" },
      CANCELLED: { label: "Cancelado", variant: "destructive" },
    };

    const config = statusMap[status] || { label: "Desconhecido", variant: "outline" };
    
    if (status === "DONE") {
      return <Badge className="bg-green-600 text-white border-transparent">{config.label}</Badge>;
    }
    
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}:</span>
      <span className="col-span-2 text-sm">{value || "N/A"}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Split</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pagador */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Pagador</h3>
            <div className="space-y-1">
              <DetailRow label="Nome" value={split.nomePagador} />
              <DetailRow label="Identificador" value={split.identificador} />
            </div>
          </div>

          {/* Cliente (Credor CEDRUS) */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Cliente (Credor CEDRUS)</h3>
            <div className="space-y-1">
              <DetailRow label="Nome" value={split.nomeCliente} />
              <DetailRow label="CPF/CNPJ" value={split.cpfCnpjCliente} />
              <DetailRow label="Email" value={split.emailCliente} />
              <DetailRow label="Wallet ID" value={split.walletId} />
            </div>
            {split.walletId === "Sem Split" && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  ℹ️ Este split não possui um wallet válido associado
                </p>
              </div>
            )}
          </div>

          {/* Dados do Split */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Informações do Split
              {getStatusBadge(split.status)}
            </h3>
            <div className="space-y-1">
              <DetailRow label="ID do Split" value={split.splitId} />
              <DetailRow label="Valor Fixo" value={formatCurrency(split.fixedValue)} />
              <DetailRow label="Percentual" value={split.percentualValue ? `${split.percentualValue}%` : "N/A"} />
              <DetailRow label="Valor do Split" value={formatCurrency(split.totalValue)} />
              <DetailRow label="Status" value={getStatusBadge(split.status)} />
              {split.cancellationReason && (
                <DetailRow label="Motivo do Cancelamento" value={split.cancellationReason} />
              )}
            </div>
          </div>

          {/* Dados da Cobrança Original */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Cobrança Original</h3>
            <div className="space-y-1">
              <DetailRow label="ID da Cobrança" value={split.cobrancaId} />
              <DetailRow label="Descrição" value={split.descricaoCobranca} />
              <DetailRow label="Unidade" value={split.unidade} />
              <DetailRow label="Data de Pagamento" value={formatDate(split.dataPagamento)} />
              <DetailRow label="Valor da Cobrança" value={formatCurrency(split.valorCobranca)} />
              <DetailRow label="Forma de Pagamento" value={split.formaPagamento} />
            </div>
          </div>

          {/* Cálculos */}
          {split.valorCobranca && split.totalValue && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Cálculos</h3>
              <div className="space-y-1">
                <DetailRow
                  label="Percentual Real"
                  value={`${((split.totalValue / split.valorCobranca) * 100).toFixed(2)}%`}
                />
                <DetailRow
                  label="Valor Restante"
                  value={formatCurrency(split.valorCobranca - split.totalValue)}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
