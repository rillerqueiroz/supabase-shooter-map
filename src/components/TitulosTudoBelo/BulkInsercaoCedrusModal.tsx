import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { CheckCircle2, XCircle, Loader2, Upload, AlertCircle } from "lucide-react";

const WEBHOOK_URL = "https://n8n.superavit.app.br/webhook/inserir-titulo-tudobelo";
const REQUEST_INTERVAL_MS = 2000;

interface InsercaoStatus {
  id: string;
  documento: string | null;
  nomeParceiro: string | null;
  status: "pending" | "sending" | "success" | "error";
  errorMessage?: string;
}

interface BulkInsercaoCedrusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulos: TituloTudoBelo[];
  onComplete?: () => void;
}

export function BulkInsercaoCedrusModal({
  open,
  onOpenChange,
  titulos,
  onComplete,
}: BulkInsercaoCedrusModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statuses, setStatuses] = useState<InsercaoStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);

  // Inicializa statuses quando o modal abre
  useEffect(() => {
    if (open && titulos.length > 0) {
      setStatuses(
        titulos.map((t) => ({
          id: t.id,
          documento: t.documento,
          nomeParceiro: t.nome_parceiro,
          status: "pending",
        }))
      );
      setCurrentIndex(0);
      setIsProcessing(false);
      abortRef.current = false;
    }
  }, [open, titulos]);

  const sendRequest = async (titulo: TituloTudoBelo): Promise<boolean> => {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(titulo),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);
    
    for (let i = 0; i < titulos.length; i++) {
      if (abortRef.current) break;
      
      const titulo = titulos[i];
      setCurrentIndex(i);
      
      // Marca como "sending"
      setStatuses((prev) =>
        prev.map((s) =>
          s.id === titulo.id ? { ...s, status: "sending" } : s
        )
      );
      
      const success = await sendRequest(titulo);
      
      // Atualiza status
      setStatuses((prev) =>
        prev.map((s) =>
          s.id === titulo.id
            ? { ...s, status: success ? "success" : "error", errorMessage: success ? undefined : "Falha no envio" }
            : s
        )
      );
      
      // Aguarda intervalo antes do próximo (exceto no último)
      if (i < titulos.length - 1 && !abortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
      }
    }
    
    setIsProcessing(false);
    onComplete?.();
  };

  const handleStart = () => {
    abortRef.current = false;
    processQueue();
  };

  const handleAbort = () => {
    abortRef.current = true;
  };

  const handleClose = () => {
    if (isProcessing) {
      abortRef.current = true;
    }
    onOpenChange(false);
  };

  const completedCount = statuses.filter((s) => s.status === "success" || s.status === "error").length;
  const successCount = statuses.filter((s) => s.status === "success").length;
  const errorCount = statuses.filter((s) => s.status === "error").length;
  const progressPercent = titulos.length > 0 ? (completedCount / titulos.length) * 100 : 0;
  const isComplete = completedCount === titulos.length && titulos.length > 0;

  const getStatusIcon = (status: InsercaoStatus["status"]) => {
    switch (status) {
      case "pending":
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
      case "sending":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Acompanhamento de inserções
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{titulos.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Processados</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-muted-foreground">Sucesso</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{completedCount} / {titulos.length}</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Status List */}
          <ScrollArea className="flex-1 border rounded-lg max-h-[300px]">
            <div className="p-2 space-y-1">
              {statuses.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${
                    item.status === "sending" ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="text-muted-foreground w-8 text-right">{index + 1}.</span>
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {item.documento || "Sem documento"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.nomeParceiro || "Parceiro não informado"}
                    </div>
                  </div>
                  {item.status === "success" && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Enviado
                    </Badge>
                  )}
                  {item.status === "error" && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Erro
                    </Badge>
                  )}
                  {item.status === "sending" && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Enviando...
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Complete Message */}
          {isComplete && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              errorCount > 0 ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"
            }`}>
              {errorCount > 0 ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <span className="font-medium">
                {errorCount > 0
                  ? `Processamento concluído com ${errorCount} erro(s).`
                  : "Todos os títulos foram enviados com sucesso!"}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!isProcessing && !isComplete && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleStart}>
                <Upload className="h-4 w-4 mr-2" />
                Iniciar Inserção em Massa
              </Button>
            </>
          )}
          {isProcessing && (
            <Button variant="destructive" onClick={handleAbort}>
              Interromper
            </Button>
          )}
          {isComplete && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
