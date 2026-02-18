import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateFromDatabase } from "@/lib/utils";

type CedrusActionType = "inserir" | "cancelar" | "marcar_pago";

interface TituloInfo {
  documento?: string | null;
  nome_parceiro?: string | null;
  valor_parcela?: number | null;
  saldo_parcela?: number | null;
  data_vencimento?: string | null;
}

interface CedrusConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: CedrusActionType;
  documentoTitulo: string | null;
  tituloInfo?: TituloInfo | null;
  onConfirm: (valorPago?: number) => void;
  isLoading?: boolean;
}

const actionConfig: Record<CedrusActionType, { title: string; description: string; confirmText: string; variant: "default" | "destructive" }> = {
  inserir: {
    title: "Confirmar Inserção no Cedrus",
    description: "Deseja realmente inserir este título no Cedrus?",
    confirmText: "Inserir",
    variant: "default",
  },
  cancelar: {
    title: "Confirmar Cancelamento no Cedrus",
    description: "Deseja realmente cancelar este título no Cedrus? Esta ação removerá o título do sistema.",
    confirmText: "Cancelar Título",
    variant: "destructive",
  },
  marcar_pago: {
    title: "Confirmar Marcação como Pago",
    description: "Informe o valor pago para marcar este título como pago no Cedrus.",
    confirmText: "Marcar como Pago",
    variant: "default",
  },
};

// Format number to Brazilian currency display (without R$ prefix for input)
const formatCurrencyInput = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const numValue = parseInt(numbers, 10) / 100;
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Parse formatted string to number
const parseCurrencyToNumber = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// Format number to display currency
const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '-';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export function CedrusConfirmDialog({
  open,
  onOpenChange,
  actionType,
  documentoTitulo,
  tituloInfo,
  onConfirm,
  isLoading = false,
}: CedrusConfirmDialogProps) {
  const config = actionConfig[actionType];
  const [valorPago, setValorPago] = useState("");

  useEffect(() => {
    if (open && actionType === "marcar_pago") {
      setValorPago("");
    }
  }, [open, actionType]);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setValorPago(formatted);
  };

  const handleConfirm = () => {
    if (actionType === "marcar_pago") {
      const numericValue = parseCurrencyToNumber(valorPago);
      onConfirm(numericValue);
    } else {
      onConfirm();
    }
  };

  const isMarcarPago = actionType === "marcar_pago";
  const isConfirmDisabled = isLoading || (isMarcarPago && (!valorPago || parseCurrencyToNumber(valorPago) <= 0));

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>{config.description}</p>
              {documentoTitulo && (
                <span className="block mt-2 font-medium text-foreground">
                  Documento: {documentoTitulo}
                </span>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isMarcarPago && tituloInfo && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium text-right max-w-[200px] truncate" title={tituloInfo.nome_parceiro || '-'}>
                {tituloInfo.nome_parceiro || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium">
                {formatCurrency(tituloInfo.saldo_parcela ?? tituloInfo.valor_parcela)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimento:</span>
              <span className="font-medium">
                {formatDateFromDatabase(tituloInfo.data_vencimento)}
              </span>
            </div>
          </div>
        )}

        {isMarcarPago && (
          <div className="space-y-2 py-2">
            <Label htmlFor="valor-pago">Valor Pago *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="valor-pago"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={valorPago}
                onChange={handleValorChange}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Informe o valor exato que foi pago
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isConfirmDisabled}
            className={config.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {isLoading ? "Processando..." : config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
