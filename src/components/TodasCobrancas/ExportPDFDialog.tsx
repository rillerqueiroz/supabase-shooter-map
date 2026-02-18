import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText } from "lucide-react";
import { ExportPDFOptions, GroupingType } from "@/utils/exportCobrancasPDF";

interface ExportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: ExportPDFOptions) => void;
}

export function ExportPDFDialog({ open, onOpenChange, onConfirm }: ExportPDFDialogProps) {
  const [showEmpresa, setShowEmpresa] = useState(true);
  const [showDesconto, setShowDesconto] = useState(true);
  const [showProjeto, setShowProjeto] = useState(false);
  const [grouping, setGrouping] = useState<GroupingType>('none');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Opções de Exportação PDF
          </DialogTitle>
          <DialogDescription>
            Selecione as colunas e o agrupamento do relatório.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Colunas</p>
            <div className="flex items-center space-x-3">
              <Checkbox id="showEmpresa" checked={showEmpresa} onCheckedChange={(v) => setShowEmpresa(!!v)} />
              <Label htmlFor="showEmpresa" className="cursor-pointer">Incluir coluna <strong>Empresa</strong></Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="showProjeto" checked={showProjeto} onCheckedChange={(v) => setShowProjeto(!!v)} />
              <Label htmlFor="showProjeto" className="cursor-pointer">Incluir coluna <strong>Projeto</strong></Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="showDesconto" checked={showDesconto} onCheckedChange={(v) => setShowDesconto(!!v)} />
              <Label htmlFor="showDesconto" className="cursor-pointer">Incluir coluna <strong>Valor com Desconto de Pontualidade</strong></Label>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Agrupamento</p>
            <RadioGroup value={grouping} onValueChange={(v) => setGrouping(v as GroupingType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="grp-none" />
                <Label htmlFor="grp-none" className="cursor-pointer">Sem agrupamento</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="projeto" id="grp-projeto" />
                <Label htmlFor="grp-projeto" className="cursor-pointer">Agrupar por Projeto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="status" id="grp-status" />
                <Label htmlFor="grp-status" className="cursor-pointer">Agrupar por Vencidos e A Vencer</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            onConfirm({ showEmpresa, showDesconto, showProjeto, grouping });
            onOpenChange(false);
          }}>Exportar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
