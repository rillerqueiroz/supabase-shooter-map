import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Copy, Check, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';
import { useProjetosByCredor } from '@/hooks/useGestaoSplitsProjetos';
import { useModelosContratoByCredor } from '@/hooks/useGestaoSplitsModelosContrato';
import { useCreateCobranca, CreateCobrancaInput } from '@/hooks/useGestaoSplitsCobrancas';
import { cn } from '@/lib/utils';
import { validarCPF, formatarCPF } from '@/utils/validators';
import { buscarCEP } from '@/utils/cepService';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const contratanteSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido').refine((val) => {
    const clean = val.replace(/\D/g, '');
    return clean.length !== 11 || validarCPF(clean);
  }, 'CPF inválido'),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
});

const formSchema = z.object({
  // Contratante principal
  nome_contratante: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf_contratante: z.string().min(11, 'CPF inválido').refine((val) => {
    const clean = val.replace(/\D/g, '');
    return clean.length !== 11 || validarCPF(clean);
  }, 'CPF inválido'),
  telefone_contratante: z.string().optional(),
  email_contratante: z.string().email('E-mail inválido').optional().or(z.literal('')),
  
  // Endereço
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  cep: z.string().optional(),
  estado: z.string().optional(),
  
  // Múltiplos contratantes
  tem_contratante_adicional: z.boolean().default(false),
  contratantes_adicionais: z.array(contratanteSchema).optional(),
  
  // Projeto
  credor_cedrus: z.string().min(1, 'Selecione um cliente'),
  projeto_id: z.string().min(1, 'Selecione um projeto'),
  
  // Boletos
  quantidade_boletos: z.coerce.number().min(1, 'Mínimo 1 boleto').max(60, 'Máximo 60 boletos'),
  valor_sem_desconto: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  data_primeiro_boleto: z.date({ required_error: 'Selecione a data do primeiro boleto' }),
  
  // Desconto
  tipo_desconto: z.enum(['fixo', 'percentual']).optional(),
  valor_desconto: z.coerce.number().min(0).optional(),
  
  // Descrição
  descricao_boleto: z.string().optional(),
  
  // Contrato
  gerar_contrato: z.boolean().default(false),
  modelo_contrato_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CriarCobranca() {
  const [selectedCredor, setSelectedCredor] = useState<string>('');
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [generatedPayload, setGeneratedPayload] = useState<object | null>(null);
  const [copied, setCopied] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const { data: clientes, isLoading: loadingClientes } = useClientesGerenciamentoRecebiveis();
  const { data: projetos, isLoading: loadingProjetos } = useProjetosByCredor(selectedCredor);
  const { data: modelos, isLoading: loadingModelos } = useModelosContratoByCredor(selectedCredor);
  const createCobranca = useCreateCobranca();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_contratante: '',
      cpf_contratante: '',
      telefone_contratante: '',
      email_contratante: '',
      endereco: '',
      bairro: '',
      cidade: '',
      cep: '',
      estado: '',
      tem_contratante_adicional: false,
      contratantes_adicionais: [],
      credor_cedrus: '',
      projeto_id: '',
      quantidade_boletos: 1,
      valor_sem_desconto: 0,
      tipo_desconto: undefined,
      valor_desconto: 0,
      descricao_boleto: '',
      gerar_contrato: false,
      modelo_contrato_id: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contratantes_adicionais',
  });

  const temContratanteAdicional = form.watch('tem_contratante_adicional');
  const tipoDesconto = form.watch('tipo_desconto');

  const handleCredorChange = (value: string) => {
    setSelectedCredor(value);
    form.setValue('credor_cedrus', value);
    form.setValue('projeto_id', '');
    form.setValue('modelo_contrato_id', '');
  };

  const onSubmit = async (data: FormValues) => {
    const input: CreateCobrancaInput = {
      projeto_id: data.projeto_id,
      nome_contratante: data.nome_contratante,
      cpf_contratante: data.cpf_contratante,
      telefone_contratante: data.telefone_contratante,
      email_contratante: data.email_contratante,
      endereco: data.endereco,
      bairro: data.bairro,
      cidade: data.cidade,
      cep: data.cep,
      estado: data.estado,
      tem_contratante_adicional: data.tem_contratante_adicional,
      contratantes_adicionais: data.contratantes_adicionais as any,
      quantidade_boletos: data.quantidade_boletos,
      valor_sem_desconto: data.valor_sem_desconto,
      data_primeiro_boleto: data.data_primeiro_boleto,
      tipo_desconto: data.tipo_desconto,
      valor_desconto: data.valor_desconto,
      descricao_boleto: data.descricao_boleto,
      gerar_contrato: data.gerar_contrato,
      modelo_contrato_id: data.modelo_contrato_id,
    };

    const result = await createCobranca.mutateAsync(input);
    setGeneratedPayload(result.payload);
    setPayloadDialogOpen(true);
  };

  const copyPayload = () => {
    if (generatedPayload) {
      navigator.clipboard.writeText(JSON.stringify(generatedPayload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Cobrança</h1>
          <p className="text-muted-foreground">
            Preencha os dados para gerar o payload de cobrança
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Cliente e Projeto */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente e Projeto</CardTitle>
              <CardDescription>Selecione o cliente e o projeto para a cobrança</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="credor_cedrus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleCredorChange}
                      disabled={loadingClientes}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes?.map((cliente) => (
                          <SelectItem key={cliente.credor_cedrus} value={cliente.credor_cedrus}>
                            {cliente.nome_credor || cliente.credor_cedrus}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projeto_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedCredor || loadingProjetos}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um projeto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projetos?.map((projeto) => (
                          <SelectItem key={projeto.id} value={projeto.id}>
                            {projeto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      O projeto define a configuração de splits
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dados do Contratante */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Contratante</CardTitle>
              <CardDescription>Informações do contratante principal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome_contratante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome completo do contratante" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf_contratante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="000.000.000-00"
                          onChange={(e) => field.onChange(formatarCPF(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone_contratante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone/WhatsApp</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(00) 00000-0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_contratante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@exemplo.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, nº, Quadra/Lote" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bairro" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cidade" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="00000-000"
                            onChange={async (e) => {
                              const formatted = e.target.value.replace(/\D/g, '').slice(0, 8);
                              const cepFormatted = formatted.length > 5 ? `${formatted.slice(0,5)}-${formatted.slice(5)}` : formatted;
                              field.onChange(cepFormatted);
                              
                              if (formatted.length === 8) {
                                setBuscandoCep(true);
                                const result = await buscarCEP(formatted);
                                setBuscandoCep(false);
                                if (result) {
                                  form.setValue('endereco', result.logradouro || form.getValues('endereco'));
                                  form.setValue('bairro', result.bairro || form.getValues('bairro'));
                                  form.setValue('cidade', result.localidade || form.getValues('cidade'));
                                  form.setValue('estado', result.uf || form.getValues('estado'));
                                }
                              }
                            }}
                          />
                        </FormControl>
                        {buscandoCep && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Múltiplos contratantes */}
              <FormField
                control={form.control}
                name="tem_contratante_adicional"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mais de um contratante?</FormLabel>
                      <FormDescription>
                        Ative para adicionar contratantes adicionais
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {temContratanteAdicional && (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <Label className="text-sm font-medium">
                            Contratante Adicional {index + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`contratantes_adicionais.${index}.nome`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Nome completo" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`contratantes_adicionais.${index}.cpf`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="000.000.000-00"
                                    onChange={(e) => field.onChange(formatarCPF(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`contratantes_adicionais.${index}.telefone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="(00) 00000-0000" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`contratantes_adicionais.${index}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-mail</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" placeholder="email@exemplo.com" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ nome: '', cpf: '', telefone: '', email: '' })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Contratante
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração dos Boletos */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração dos Boletos</CardTitle>
              <CardDescription>Defina a quantidade, valores e datas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantidade_boletos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade de Boletos *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={1} max={60} />
                      </FormControl>
                      <FormDescription>
                        Número de boletos que serão gerados
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_sem_desconto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor sem Desconto *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min={0.01} />
                      </FormControl>
                      <FormDescription>
                        Valor de cada boleto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_primeiro_boleto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Primeiro Boleto *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                              ) : (
                                <span>Selecione a data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Desconto de Pontualidade */}
              <div>
                <Label className="text-base font-medium">Desconto de Pontualidade</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormField
                    control={form.control}
                    name="tipo_desconto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Desconto</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                            <SelectItem value="percentual">Percentual (%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor_desconto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Valor do Desconto {tipoDesconto === 'percentual' ? '(%)' : '(R$)'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step={tipoDesconto === 'percentual' ? '0.1' : '0.01'}
                            min={0}
                            disabled={!tipoDesconto}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="descricao_boleto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição no Boleto</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descrição que aparecerá no boleto"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contrato */}
          <Card>
            <CardHeader>
              <CardTitle>Contrato</CardTitle>
              <CardDescription>Configuração de geração de contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="gerar_contrato"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Gerar Contrato?</FormLabel>
                      <FormDescription>
                        Ative para gerar um contrato junto com a cobrança
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('gerar_contrato') && (
                <FormField
                  control={form.control}
                  name="modelo_contrato_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo de Contrato</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedCredor || loadingModelos}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um modelo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modelos?.map((modelo) => (
                            <SelectItem key={modelo.id} value={modelo.id}>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {modelo.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Botão de Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={createCobranca.isPending}
            >
              {createCobranca.isPending ? 'Gerando...' : 'Gerar Cobrança'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Dialog com Payload Gerado */}
      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payload Gerado com Sucesso!</DialogTitle>
            <DialogDescription>
              Copie o payload abaixo para enviar ao sistema externo
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(generatedPayload, null, 2)}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={copyPayload}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayloadDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              form.reset();
              setPayloadDialogOpen(false);
              setSelectedCredor('');
            }}>
              Nova Cobrança
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
