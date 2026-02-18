import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateSetorSulParcela, useUpdateSetorSulParcela, SetorSulParcela } from "@/hooks/useSetorSulParcelas";

const parcelaSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  lote: z.string().optional(),
  quadra: z.string().optional(),
  valor_parcela: z.string().optional(),
  data_vencimento: z.string().optional(),
  status: z.string().optional(),
  documento: z.string().optional(),
  parc: z.string().optional(),
});

type ParcelaFormData = z.infer<typeof parcelaSchema>;

interface ParcelasEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcela: SetorSulParcela | null;
}

export function ParcelasEditModal({ isOpen, onClose, parcela }: ParcelasEditModalProps) {
  const createMutation = useCreateSetorSulParcela();
  const updateMutation = useUpdateSetorSulParcela();
  // Use id_titulo_unico as primary identifier since id is null in database
  const isEditing = !!(parcela?.id_titulo_unico);

  console.log('📝 ParcelasEditModal - Parcela recebida:', {
    id: parcela?.id,
    id_titulo_unico: parcela?.id_titulo_unico,
    isEditing,
    cliente: parcela?.cliente,
    documento: parcela?.documento
  });

  // Extract lote and quadra from unid_princ if needed
  const extractLoteQuadra = (unid_princ: string | undefined) => {
    if (!unid_princ) return { lote: '', quadra: '' };
    // Common patterns: "L01Q02", "01-02", "L1Q2", etc.
    const match = unid_princ.match(/(?:L|LOTE)?(\d+)(?:Q|QUADRA)?(\d+)/i);
    if (match) {
      return { lote: match[1], quadra: match[2] };
    }
    return { lote: unid_princ, quadra: '' };
  };

  const { lote: initialLote, quadra: initialQuadra } = extractLoteQuadra(parcela?.unid_princ);

  const form = useForm<ParcelaFormData>({
    resolver: zodResolver(parcelaSchema),
    defaultValues: {
      cliente: parcela?.cliente || '',
      lote: parcela?.lote || initialLote || '',
      quadra: parcela?.quadra || initialQuadra || '',
      valor_parcela: (parcela?.valor_parcela || parcela?.total || parcela?.valor_original)?.toString() || '',
      data_vencimento: parcela?.data_vencimento || parcela?.data_vecto || '',
      status: parcela?.status || '',
      documento: parcela?.documento || '',
      parc: parcela?.parc || '',
    },
  });

  React.useEffect(() => {
    if (parcela) {
      const { lote: extractedLote, quadra: extractedQuadra } = extractLoteQuadra(parcela.unid_princ);
      
      form.reset({
        cliente: parcela.cliente || '',
        lote: parcela.lote || extractedLote || '',
        quadra: parcela.quadra || extractedQuadra || '',
        valor_parcela: (parcela.valor_parcela || parcela.total || parcela.valor_original)?.toString() || '',
        data_vencimento: parcela.data_vencimento || parcela.data_vecto || '',
        status: parcela.status || '',
        documento: parcela.documento || '',
        parc: parcela.parc || '',
      });
    } else {
      form.reset({
        cliente: '',
        lote: '',
        quadra: '',
        valor_parcela: '',
        data_vencimento: '',
        status: 'Pendente',
        documento: '',
        parc: '',
      });
    }
  }, [parcela, form]);

  const onSubmit = async (data: ParcelaFormData) => {
    try {
      // Map form fields to database fields
      const unid_princ = data.lote && data.quadra ? `L${data.lote}Q${data.quadra}` : data.lote || '';
      
      const submitData = {
        cliente: data.cliente,
        data_vecto: data.data_vencimento, // Map to correct database field
        total: data.valor_parcela ? Number(data.valor_parcela) : undefined,
        valor_original: data.valor_parcela ? Number(data.valor_parcela) : undefined,
        unid_princ,
        status: data.status,
        documento: data.documento,
        parc: data.parc,
      };

      if (isEditing) {
        // Use id if available, otherwise use id_titulo_unico
        if (parcela.id) {
          await updateMutation.mutateAsync({ id: parcela.id, ...submitData });
        } else if (parcela.id_titulo_unico) {
          await updateMutation.mutateAsync({ id_titulo_unico: parcela.id_titulo_unico, ...submitData });
        } else {
          console.error('Cannot update parcel without valid ID or id_titulo_unico');
          throw new Error('Não é possível atualizar parcela sem identificador válido');
        }
      } else {
        await createMutation.mutateAsync(submitData);
      }
      
      onClose();
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar parcela:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Parcela' : 'Nova Parcela'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Número do documento" {...field} readOnly={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcela</FormLabel>
                    <FormControl>
                      <Input placeholder="Número da parcela" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote</FormLabel>
                    <FormControl>
                      <Input placeholder="Número do lote" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quadra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quadra</FormLabel>
                    <FormControl>
                      <Input placeholder="Número da quadra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_parcela"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Parcela</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Atrasado">Atrasado</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                        <SelectItem value="A vencer">A vencer</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}