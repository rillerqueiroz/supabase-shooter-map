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
import { useCreateSetorSulCliente, useUpdateSetorSulCliente, SetorSulCliente } from "@/hooks/useSetorSulClientes";
import { validarCPF, formatarCPF } from '@/utils/validators';

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().optional().refine((val) => {
    if (!val) return true;
    const clean = val.replace(/\D/g, '');
    return clean.length !== 11 || validarCPF(clean);
  }, 'CPF inválido'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  lote: z.string().optional(),
  quadra: z.string().optional(),
  situacao: z.string().optional(),
  observacoes: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClientesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: SetorSulCliente | null;
}

export function ClientesEditModal({ isOpen, onClose, cliente }: ClientesEditModalProps) {
  const createMutation = useCreateSetorSulCliente();
  const updateMutation = useUpdateSetorSulCliente();
  const isEditing = !!cliente?.id;

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: cliente?.nome || '',
      cpf: cliente?.cpf || '',
      telefone: cliente?.telefone || '',
      email: cliente?.email || '',
      endereco: cliente?.endereco || '',
      lote: cliente?.lote || '',
      quadra: cliente?.quadra || '',
      situacao: cliente?.situacao || '',
      observacoes: cliente?.observacoes || '',
    },
  });

  React.useEffect(() => {
    if (cliente) {
      form.reset({
        nome: cliente.nome || '',
        cpf: cliente.cpf || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        endereco: cliente.endereco || '',
        lote: cliente.lote || '',
        quadra: cliente.quadra || '',
        situacao: cliente.situacao || '',
        observacoes: cliente.observacoes || '',
      });
    } else {
      form.reset({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        endereco: '',
        lote: '',
        quadra: '',
        situacao: 'Ativo',
        observacoes: '',
      });
    }
  }, [cliente, form]);

  const onSubmit = async (data: ClienteFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: cliente.id!, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      
      onClose();
      form.reset();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field} 
                        onChange={(e) => field.onChange(formatarCPF(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(xx) xxxxx-xxxx, (xx) xxxxx-xxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@email.com" {...field} />
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
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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