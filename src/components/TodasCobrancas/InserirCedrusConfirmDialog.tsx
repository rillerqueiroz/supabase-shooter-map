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
import { Loader2, Upload } from "lucide-react";
import { formatDateFromDatabase } from "@/lib/utils";

interface InserirCedrusConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  descricao?: string | null;
  nome?: string | null;
  valor?: number | null;
  vencimento?: string | null;
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function InserirCedrusConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  descricao,
  nome,
  valor,
  vencimento,
}: InserirCedrusConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Inserir no Cedrus
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Deseja enviar esta cobrança para inserção no Cedrus?</p>
              {(descricao || nome || valor !== null) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  {nome && <p><strong>Cliente:</strong> {nome}</p>}
                  {descricao && <p><strong>Descrição:</strong> {descricao}</p>}
                  {valor !== null && valor !== undefined && <p><strong>Valor:</strong> {formatCurrency(valor)}</p>}
                  {vencimento && <p><strong>Vencimento:</strong> {formatDateFromDatabase(vencimento)}</p>}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
