import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, FolderOpen, X, FileText, Filter, Edit, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjetos, useDeleteProjeto, Projeto } from '@/hooks/useGestaoSplitsProjetos';
import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';
import { useBeneficiariosAtivos } from '@/hooks/useGestaoSplitsBeneficiarios';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BulkEditProjetosModal } from '@/components/GestaoProjetos/BulkEditProjetosModal';
import { MultiSelectFilterPopover } from '@/components/GestaoProjetos/MultiSelectFilterPopover';

export default function GestaoProjetos() {
  const navigate = useNavigate();
  const { data: projetos, isLoading } = useProjetos();
  const { data: clientes } = useClientesGerenciamentoRecebiveis();
  const { data: beneficiariosAtivos = [] } = useBeneficiariosAtivos();
  const deleteProjeto = useDeleteProjeto();

  // Seleção para edição em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  // Filtros multi-select
  const [filterProjetos, setFilterProjetos] = useState<string[]>([]);
  const [filterClientes, setFilterClientes] = useState<string[]>([]);
  const [filterBeneficiarios, setFilterBeneficiarios] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Busca contagem de cobranças por projeto
  const { data: cobrancasPorProjeto } = useQuery({
    queryKey: ['cobrancas-por-projeto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valores_totais_recebidos_asaas')
        .select('projeto');
      
      if (error) throw error;
      
      const contagem: Record<string, number> = {};
      data?.forEach(item => {
        const projeto = item.projeto || 'Sem Projeto';
        contagem[projeto] = (contagem[projeto] || 0) + 1;
      });
      
      return contagem;
    }
  });

  const getCobrancasCount = (projetoNome: string) => {
    return cobrancasPorProjeto?.[projetoNome] || 0;
  };

  // Opções de filtros
  const filterOptions = useMemo(() => {
    if (!projetos) return { projetos: [], clientes: [], beneficiarios: [] };
    
    const projetosUnicos = [...new Set(projetos.map(p => p.nome))].sort()
      .map(p => ({ value: p, label: p }));
    const clientesUnicos = [...new Set(projetos.map(p => p.cliente?.nome_credor).filter(Boolean) as string[])].sort()
      .map(c => ({ value: c, label: c }));
    
    const walletIds = new Set<string>();
    projetos.forEach(p => (p.splits || []).forEach(s => walletIds.add(s.wallet_id)));
    const beneficiariosUnicos = beneficiariosAtivos
      .filter(b => walletIds.has(b.wallet_id))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(b => ({ value: b.id, label: b.nome }));
    
    return { projetos: projetosUnicos, clientes: clientesUnicos, beneficiarios: beneficiariosUnicos };
  }, [projetos, beneficiariosAtivos]);

  // Projetos filtrados
  const filteredProjetos = useMemo(() => {
    if (!projetos) return [];
    
    return projetos.filter(projeto => {
      if (filterProjetos.length > 0 && !filterProjetos.includes(projeto.nome)) return false;
      if (filterClientes.length > 0 && !filterClientes.includes(projeto.cliente?.nome_credor || '')) return false;
      if (filterStatus !== 'all') {
        if (projeto.ativo !== (filterStatus === 'ativo')) return false;
      }
      if (filterBeneficiarios.length > 0) {
        const walletIds = beneficiariosAtivos
          .filter(b => filterBeneficiarios.includes(b.id))
          .map(b => b.wallet_id);
        const hasMatch = (projeto.splits || []).some(s => walletIds.includes(s.wallet_id));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [projetos, filterProjetos, filterClientes, filterStatus, filterBeneficiarios, beneficiariosAtivos]);

  const clearFilters = () => {
    setFilterProjetos([]);
    setFilterClientes([]);
    setFilterStatus('all');
    setFilterBeneficiarios([]);
  };

  const hasActiveFilters = filterProjetos.length > 0 || filterClientes.length > 0 || filterStatus !== 'all' || filterBeneficiarios.length > 0;

  // Funções de seleção
  const handleSelectAll = () => {
    if (selectedIds.length === filteredProjetos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjetos.map(p => p.id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => setSelectedIds([]);

  const isAllSelected = filteredProjetos.length > 0 && selectedIds.length === filteredProjetos.length;
  const hasSelection = selectedIds.length > 0;

  const openNew = () => navigate('/gestao-projetos/novo');
  const openEdit = (projeto: Projeto) => navigate(`/gestao-projetos/${projeto.id}`);

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este projeto?')) {
      await deleteProjeto.mutateAsync(id);
    }
  };

  const getSplitCounts = (projeto: Projeto) => {
    const normal = (projeto.splits || []).filter(s => s.tipo_cobranca === 'normal' || !s.tipo_cobranca).length;
    const inadimplencia = (projeto.splits || []).filter(s => s.tipo_cobranca === 'inadimplencia').length;
    return { normal, inadimplencia };
  };

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Projetos</h1>
          <p className="text-muted-foreground">Configure projetos e splits para cobrança</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Projeto</Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <MultiSelectFilterPopover
              label="Projeto"
              options={filterOptions.projetos}
              selected={filterProjetos}
              onChange={setFilterProjetos}
              className="w-[180px]"
            />

            <MultiSelectFilterPopover
              label="Cliente"
              options={filterOptions.clientes}
              selected={filterClientes}
              onChange={setFilterClientes}
              className="w-[200px]"
            />

            <MultiSelectFilterPopover
              label="Beneficiário"
              options={filterOptions.beneficiarios}
              selected={filterBeneficiarios}
              onChange={setFilterBeneficiarios}
              className="w-[220px]"
            />

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />Limpar Filtros
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {hasSelection && (
                <>
                  <Badge variant="secondary">{selectedIds.length} selecionado(s)</Badge>
                  <Button variant="outline" size="sm" onClick={() => setIsBulkEditOpen(true)}>
                    <Edit className="h-4 w-4 mr-1" />Editar em Lote
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                    <X className="h-4 w-4 mr-1" />Limpar Seleção
                  </Button>
                </>
              )}
              <Badge variant="outline">
                {filteredProjetos.length} projeto(s)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente / Credor Inadimplência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cobranças</TableHead>
                <TableHead>Splits Normal</TableHead>
                <TableHead>Splits Inadimplência</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center">Carregando...</TableCell></TableRow>
              ) : filteredProjetos.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum projeto encontrado</TableCell></TableRow>
              ) : filteredProjetos.map((projeto) => {
                const splitCounts = getSplitCounts(projeto);
                return (
                  <TableRow key={projeto.id} className={`group ${selectedIds.includes(projeto.id) ? 'bg-muted/50' : ''}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(projeto.id)}
                        onCheckedChange={() => handleSelectItem(projeto.id)}
                        aria-label={`Selecionar ${projeto.nome}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <FolderOpen className="h-4 w-4 inline mr-2" />
                      {projeto.nome}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{projeto.cliente?.nome_credor || '-'}</p>
                        {projeto.credor_inadimplencia && (
                          <p className="text-xs text-muted-foreground">
                            Inadimpl.: {projeto.credor_inadimplencia}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={projeto.ativo ? 'default' : 'secondary'}>
                        {projeto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {getCobrancasCount(projeto.nome)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={splitCounts.normal > 0 ? 'default' : 'destructive'} className="gap-1">
                        {splitCounts.normal}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={splitCounts.inadimplencia > 0 ? 'default' : 'destructive'} className="gap-1">
                        {splitCounts.inadimplencia}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{projeto.descricao || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(projeto)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/gestao-projetos/novo?duplicar=${projeto.id}`)} title="Duplicar">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(projeto.id)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkEditProjetosModal
        open={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
        clientes={clientes || []}
        onSuccess={handleClearSelection}
      />
    </div>
  );
}
