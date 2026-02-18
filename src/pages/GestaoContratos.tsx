import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, DollarSign, CheckCircle, Clock, ArrowRight, Eye, Edit, Trash2, History, Loader2, Send, FileSignature, RefreshCw, XCircle, Ban } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  useContratos, 
  useContratosEtapas, 
  useUpdateContrato, 
  useDeleteContrato,
  useContratoHistorico,
  Contrato, 
} from '@/hooks/useGestaoContratos';
import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';
import { ContratoDetailsModal } from '@/components/GestaoContratos/ContratoDetailsModal';
import { StatusIntegracaoBadge } from '@/components/GestaoContratos/StatusIntegracaoBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function GestaoContratos() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCredor, setFiltroCredor] = useState<string>('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contratoToDelete, setContratoToDelete] = useState<string | null>(null);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  
  // Estados para cancelamento de boletos
  const [selectedForCancel, setSelectedForCancel] = useState<Set<string>>(new Set());
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingBoletos, setCancelingBoletos] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<'single' | 'bulk'>('bulk');
  const [singleCancelId, setSingleCancelId] = useState<string | null>(null);

  const { data: contratos, isLoading: isLoadingContratos } = useContratos({
    credor_cedrus: filtroCredor || undefined,
    etapa_id: filtroEtapa || undefined
  });
  const { data: etapas, isLoading: isLoadingEtapas } = useContratosEtapas();
  const { data: clientes } = useClientesGerenciamentoRecebiveis();
  const { data: historico } = useContratoHistorico(selectedContratoId || undefined);
  
  const updateContrato = useUpdateContrato();
  const deleteContrato = useDeleteContrato();
  const queryClient = useQueryClient();
  const [gerandoCobranca, setGerandoCobranca] = useState<string | null>(null);
  const [gerandoContrato, setGerandoContrato] = useState<string | null>(null);

  // Filtrar contratos pela busca
  const contratosFiltrados = useMemo(() => {
    if (!contratos) return [];
    if (!searchTerm) return contratos;
    
    const termo = searchTerm.toLowerCase();
    return contratos.filter(c => 
      c.nome.toLowerCase().includes(termo) ||
      c.contratante_nome.toLowerCase().includes(termo) ||
      c.externalReference.toLowerCase().includes(termo) ||
      c.credor_cedrus.toLowerCase().includes(termo)
    );
  }, [contratos, searchTerm]);

  // Métricas
  const metricas = useMemo(() => {
    if (!contratos) return { total: 0, cobrancasGeradas: 0, contratosAssinados: 0, valorTotal: 0 };
    
    return {
      total: contratos.length,
      cobrancasGeradas: contratos.filter(c => c.cobranca_gerada).length,
      contratosAssinados: contratos.filter(c => c.contrato_assinado).length,
      valorTotal: contratos.reduce((sum, c) => sum + (c.valor_total || 0), 0)
    };
  }, [contratos]);

  const openEdit = (contrato: Contrato) => {
    navigate(`/novo-contrato/${contrato.id}`);
  };

  const openHistorico = (contratoId: string) => {
    setSelectedContratoId(contratoId);
    setHistoricoDialogOpen(true);
  };

  const handleChangeEtapa = async (contratoId: string, novaEtapaId: string) => {
    await updateContrato.mutateAsync({
      id: contratoId,
      etapa_atual_id: novaEtapaId
    });
  };

  const handleDelete = async () => {
    if (contratoToDelete) {
      await deleteContrato.mutateAsync(contratoToDelete);
      setDeleteDialogOpen(false);
      setContratoToDelete(null);
    }
  };

  const handleGerarCobranca = async (contrato: Contrato) => {
    setGerandoCobranca(contrato.id);
    try {
      const payload = {
        contrato_id: contrato.id,
        "externalReference": contrato.externalReference,
        contratante_nome: contrato.contratante_nome,
        contratante_cpf_cnpj: contrato.contratante_cpf_cnpj,
        contratante_email: contrato.contratante_email,
        contratante_telefone: contrato.contratante_telefone,
        credor_cedrus: contrato.credor_cedrus,
        projeto_id: contrato.projeto_id,
        valor_boleto: contrato.valor_boleto,
        valor_total: contrato.valor_total,
        numero_boletos: contrato.numero_boletos,
        data_primeiro_boleto: contrato.data_primeiro_boleto,
        objeto_contrato: contrato.objeto_contrato,
        tipo_geracao: contrato.tipo_geracao,
        tem_desconto_pontualidade: contrato.tem_desconto_pontualidade,
        tipo_desconto: contrato.tipo_desconto,
        valor_desconto: contrato.valor_desconto,
        dias_antecedencia_desconto: contrato.dias_antecedencia_desconto,
      };

      const response = await fetch('https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/cria-cobranca-geral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.retorno === 'erro') {
        toast.error(data?.descricao || 'Erro ao gerar cobrança');
        return;
      }
      
      toast.success(data?.message || data?.descricao || 'Cobrança gerada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
    } catch (error) {
      console.error('Erro ao gerar cobrança:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar cobrança');
    } finally {
      setGerandoCobranca(null);
    }
  };

  const handleGerarContrato = async (contrato: Contrato) => {
    setGerandoContrato(contrato.id);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-contrato-zapsign', {
        body: { contrato_id: contrato.id }
      });
      
      if (error) throw error;
      
      toast.success(data.message || 'Contrato gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
    } catch (error) {
      console.error('Erro ao gerar contrato:', error);
      toast.error('Erro ao gerar contrato');
    } finally {
      setGerandoContrato(null);
    }
  };

  // Funções de seleção para cancelamento
  const toggleSelectForCancel = (id: string) => {
    setSelectedForCancel(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const contratosComCobranca = useMemo(() => 
    contratosFiltrados.filter(c => c.cobranca_gerada), 
    [contratosFiltrados]
  );

  const toggleSelectAll = () => {
    if (selectedForCancel.size === contratosComCobranca.length) {
      setSelectedForCancel(new Set());
    } else {
      setSelectedForCancel(new Set(contratosComCobranca.map(c => c.id)));
    }
  };

  const handleCancelarBoletos = async () => {
    const ids = cancelTarget === 'single' && singleCancelId 
      ? [singleCancelId] 
      : Array.from(selectedForCancel);
    
    if (ids.length === 0) return;

    setCancelingBoletos(true);
    try {
      const contratosParaCancelar = contratosFiltrados.filter(c => ids.includes(c.id));
      
      const payload = contratosParaCancelar.map(c => ({
        contrato_id: c.id,
        "externalReference": c.externalReference,
        cobranca_id_externo: c.cobranca_id_externo,
        credor_cedrus: c.credor_cedrus,
        contratante_nome: c.contratante_nome,
        contratante_cpf_cnpj: c.contratante_cpf_cnpj,
      }));

      const response = await fetch('https://n8n.superavit.app.br/webhook-test/cancela-boletos-asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contratos: payload }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.retorno === 'erro') {
        toast.error(data?.descricao || 'Erro ao cancelar boletos');
        return;
      }

      toast.success(data?.message || `${ids.length} boleto(s) cancelado(s) com sucesso!`);
      setSelectedForCancel(new Set());
      queryClient.invalidateQueries({ queryKey: ['gestao-splits-contratos'] });
    } catch (error) {
      console.error('Erro ao cancelar boletos:', error);
      toast.error('Erro ao cancelar boletos');
    } finally {
      setCancelingBoletos(false);
      setCancelDialogOpen(false);
      setSingleCancelId(null);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoadingContratos || isLoadingEtapas) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Gestão de Contratos</h1>
        <Button onClick={() => navigate('/novo-contrato')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobranças Geradas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.cobrancasGeradas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Assinados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.contratosAssinados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metricas.valorTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, contratante, identificador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroCredor || "all"} onValueChange={(v) => setFiltroCredor(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por Credor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Credores</SelectItem>
                {clientes?.map((cliente) => (
                  <SelectItem key={cliente.credor_cedrus} value={cliente.credor_cedrus}>
                    {cliente.credor_cedrus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroEtapa || "all"} onValueChange={(v) => setFiltroEtapa(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Etapas</SelectItem>
                {etapas?.map((etapa) => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Botão Cancelar em Massa */}
      {selectedForCancel.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <Ban className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium">{selectedForCancel.size} contrato(s) selecionado(s)</span>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => {
              setCancelTarget('bulk');
              setCancelDialogOpen(true);
            }}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancelar Boletos Selecionados
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedForCancel(new Set())}>
            Limpar Seleção
          </Button>
        </div>
      )}

      {/* Tabela de Contratos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={contratosComCobranca.length > 0 && selectedForCancel.size === contratosComCobranca.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contratante</TableHead>
                <TableHead>Credor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratosFiltrados.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum contrato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                contratosFiltrados.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell>
                      {contrato.cobranca_gerada && (
                        <Checkbox 
                          checked={selectedForCancel.has(contrato.id)}
                          onCheckedChange={() => toggleSelectForCancel(contrato.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell 
                      className="font-mono text-xs cursor-pointer hover:text-primary hover:underline"
                      onClick={() => {
                        setSelectedContrato(contrato);
                        setDetailsModalOpen(true);
                      }}
                    >
                      {contrato.externalReference}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {contrato.tipo_geracao === 'contrato' && 'Apenas Contrato'}
                        {contrato.tipo_geracao === 'contrato_boleto' && 'Contrato e Boletos'}
                        {contrato.tipo_geracao === 'boleto' && 'Apenas Boletos'}
                        {!contrato.tipo_geracao && 'Contrato e Boletos'}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer hover:text-primary hover:underline"
                      onClick={() => {
                        setSelectedContrato(contrato);
                        setDetailsModalOpen(true);
                      }}
                    >
                      {contrato.contratante_nome}
                    </TableCell>
                    <TableCell>{contrato.credor_cedrus}</TableCell>
                    <TableCell>
                      {contrato.valor_total 
                        ? formatCurrency(contrato.valor_total) 
                        : contrato.valor_boleto && contrato.numero_boletos 
                          ? formatCurrency(contrato.valor_boleto * contrato.numero_boletos)
                          : '-'}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={contrato.etapa_atual_id || ''} 
                        onValueChange={(value) => handleChangeEtapa(contrato.id, value)}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue>
                            {contrato.etapa_atual && (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: contrato.etapa_atual.cor }}
                                />
                                <span className="text-xs">{contrato.etapa_atual.nome}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {etapas?.map((etapa) => (
                            <SelectItem key={etapa.id} value={etapa.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: etapa.cor }}
                                />
                                {etapa.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={contrato.cobranca_gerada ? 'default' : 'secondary'}
                          className={`text-xs ${contrato.cobranca_gerada ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}
                        >
                          {contrato.cobranca_gerada ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Cobrança Gerada</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Cobrança Pendente</>
                          )}
                        </Badge>
                        {contrato.contrato_assinado && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Assinado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!contrato.cobranca_gerada && (contrato.cobranca_status === 'pendente' || contrato.cobranca_status === 'erro' || contrato.cobranca_status === 'reprocessar') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => handleGerarCobranca(contrato)}
                            disabled={gerandoCobranca === contrato.id}
                          >
                            {gerandoCobranca === contrato.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : contrato.cobranca_status === 'erro' ? (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            ) : (
                              <DollarSign className="h-3 w-3 mr-1" />
                            )}
                            {contrato.cobranca_status === 'erro' ? 'Retentar' : 'Gerar Cobrança'}
                          </Button>
                        )}
                        {(contrato.contrato_status === 'pendente' || contrato.contrato_status === 'erro' || contrato.contrato_status === 'reprocessar') && contrato.modelo_contrato_id && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => handleGerarContrato(contrato)}
                            disabled={gerandoContrato === contrato.id}
                          >
                            {gerandoContrato === contrato.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : contrato.contrato_status === 'erro' ? (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            ) : (
                              <FileSignature className="h-3 w-3 mr-1" />
                            )}
                            {contrato.contrato_status === 'erro' ? 'Retentar' : 'Gerar Contrato'}
                          </Button>
                        )}
                        {contrato.cobranca_gerada && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Cancelar Boletos"
                            onClick={() => {
                              setSingleCancelId(contrato.id);
                              setCancelTarget('single');
                              setCancelDialogOpen(true);
                            }}
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openHistorico(contrato.id)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(contrato)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setContratoToDelete(contrato.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog removed - editing now uses /novo-contrato/:id */}

      {/* Dialog Histórico */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Etapas</DialogTitle>
            <DialogDescription>
              Acompanhe as mudanças de etapa deste contrato
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {historico?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma mudança de etapa registrada
              </p>
            ) : (
              historico?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    {item.etapa_anterior && (
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: item.etapa_anterior.cor, color: item.etapa_anterior.cor }}
                      >
                        {item.etapa_anterior.nome}
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    {item.etapa_nova && (
                      <Badge 
                        style={{ backgroundColor: item.etapa_nova.cor }}
                      >
                        {item.etapa_nova.nome}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Confirmar Cancelamento de Boletos */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) setSingleCancelId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento de Boletos</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget === 'single' 
                ? 'Tem certeza que deseja cancelar os boletos deste contrato? Esta ação não pode ser desfeita.'
                : `Tem certeza que deseja cancelar os boletos de ${selectedForCancel.size} contrato(s)? Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelingBoletos}>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelarBoletos} 
              className="bg-destructive text-destructive-foreground"
              disabled={cancelingBoletos}
            >
              {cancelingBoletos ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Cancelando...</>
              ) : (
                <><Ban className="h-4 w-4 mr-1" /> Confirmar Cancelamento</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Detalhes do Contrato */}
      <ContratoDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        contrato={selectedContrato}
        etapas={etapas}
        onEdit={(contrato) => openEdit(contrato)}
      />
    </div>
  );
}
