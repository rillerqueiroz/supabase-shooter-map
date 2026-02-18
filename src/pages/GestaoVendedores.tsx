import { useState, useMemo } from 'react';
import { Users, DollarSign, TrendingUp, Trophy, Download, FileText, Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVendedoresContratos, VendedorContrato } from '@/hooks/useVendedoresContratos';
import { useBeneficiariosAtivos } from '@/hooks/useGestaoSplitsBeneficiarios';
import { useProjetos } from '@/hooks/useGestaoSplitsProjetos';
import { useClientesGerenciamentoRecebiveis } from '@/hooks/useClientesGerenciamentoRecebiveis';
import { MultiSelectFilterPopover } from '@/components/GestaoProjetos/MultiSelectFilterPopover';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function GestaoVendedores() {
  const { data: vendedoresContratos = [], isLoading } = useVendedoresContratos();
  const { data: beneficiariosAtivos = [] } = useBeneficiariosAtivos();
  const { data: projetos = [] } = useProjetos();
  const { data: clientes = [] } = useClientesGerenciamentoRecebiveis();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedores, setFilterVendedores] = useState<string[]>([]);
  const [filterProjetos, setFilterProjetos] = useState<string[]>([]);
  const [filterClientes, setFilterClientes] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Opções de filtros
  const filterOptions = useMemo(() => {
    const vendedoresUnicos = [...new Map(
      vendedoresContratos.map(v => [v.beneficiario_id, { value: v.beneficiario_id, label: v.beneficiario?.nome || v.beneficiario_id }])
    ).values()];

    const projetosUnicos = [...new Map(
      vendedoresContratos
        .filter(v => v.contrato?.projeto)
        .map(v => [v.contrato!.projeto!.id, { value: v.contrato!.projeto!.id, label: v.contrato!.projeto!.nome }])
    ).values()];

    const clientesUnicos = [...new Map(
      vendedoresContratos
        .filter(v => v.contrato?.credor_cedrus)
        .map(v => [v.contrato!.credor_cedrus, { value: v.contrato!.credor_cedrus, label: v.contrato!.credor_cedrus }])
    ).values()];

    return { vendedores: vendedoresUnicos, projetos: projetosUnicos, clientes: clientesUnicos };
  }, [vendedoresContratos]);

  // Dados filtrados
  const filtered = useMemo(() => {
    return vendedoresContratos.filter(v => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches = (v.beneficiario?.nome || '').toLowerCase().includes(s) ||
          (v.contrato?.contratante_nome || '').toLowerCase().includes(s) ||
          (v.description || '').toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filterVendedores.length > 0 && !filterVendedores.includes(v.beneficiario_id)) return false;
      if (filterProjetos.length > 0 && !filterProjetos.includes(v.contrato?.projeto?.id || '')) return false;
      if (filterClientes.length > 0 && !filterClientes.includes(v.contrato?.credor_cedrus || '')) return false;
      if (filterDateFrom && v.contrato?.created_at && v.contrato.created_at < filterDateFrom) return false;
      if (filterDateTo && v.contrato?.created_at && v.contrato.created_at > filterDateTo + 'T23:59:59') return false;
      return true;
    });
  }, [vendedoresContratos, searchTerm, filterVendedores, filterProjetos, filterClientes, filterDateFrom, filterDateTo]);

  const hasActiveFilters = searchTerm || filterVendedores.length > 0 || filterProjetos.length > 0 || filterClientes.length > 0 || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterVendedores([]);
    setFilterProjetos([]);
    setFilterClientes([]);
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Analytics
  const analytics = useMemo(() => {
    const vendedorMap = new Map<string, {
      nome: string;
      totalComissao: number;
      totalContratos: number;
      totalValorContratos: number;
    }>();

    filtered.forEach(v => {
      const id = v.beneficiario_id;
      const nome = v.beneficiario?.nome || 'Desconhecido';
      const valorBoleto = v.contrato?.valor_boleto || 0;
      const numBoletos = v.contrato?.numero_boletos || 1;
      const comissao = (v.percentual / 100) * valorBoleto * numBoletos;

      const existing = vendedorMap.get(id) || { nome, totalComissao: 0, totalContratos: 0, totalValorContratos: 0 };
      existing.totalComissao += comissao;
      existing.totalContratos += 1;
      existing.totalValorContratos += valorBoleto * numBoletos;
      vendedorMap.set(id, existing);
    });

    const ranking = [...vendedorMap.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalComissao - a.totalComissao);

    const totalComissaoGeral = ranking.reduce((sum, v) => sum + v.totalComissao, 0);
    const totalContratosGeral = filtered.length;

    return { ranking, totalComissaoGeral, totalContratosGeral, vendedorMap };
  }, [filtered]);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatório de Vendedores - Comissões', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    // Summary
    autoTable(doc, {
      startY: 35,
      head: [['Vendedor', 'Contratos', 'Valor Total Contratos', 'Comissão Total']],
      body: analytics.ranking.map(v => [
        v.nome,
        v.totalContratos.toString(),
        formatCurrency(v.totalValorContratos),
        formatCurrency(v.totalComissao)
      ]),
      foot: [['TOTAL', analytics.totalContratosGeral.toString(), '', formatCurrency(analytics.totalComissaoGeral)]],
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81] },
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Detail table
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(14);
    doc.text('Detalhamento por Contrato', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Vendedor', 'Contratante', 'Projeto', 'Cliente', 'Valor Boleto', '%', 'Comissão', 'Data']],
      body: filtered.map(v => {
        const valorBoleto = v.contrato?.valor_boleto || 0;
        const numBoletos = v.contrato?.numero_boletos || 1;
        return [
          v.beneficiario?.nome || '-',
          v.contrato?.contratante_nome || '-',
          v.contrato?.projeto?.nome || '-',
          v.contrato?.credor_cedrus || '-',
          formatCurrency(valorBoleto),
          `${v.percentual}%`,
          formatCurrency((v.percentual / 100) * valorBoleto * numBoletos),
          v.contrato?.created_at ? new Date(v.contrato.created_at).toLocaleDateString('pt-BR') : '-'
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81] },
      styles: { fontSize: 8 }
    });

    doc.save('relatorio-vendedores.pdf');
  };

  // Export Excel
  const exportExcel = () => {
    const resumo = analytics.ranking.map(v => ({
      Vendedor: v.nome,
      Contratos: v.totalContratos,
      'Valor Total Contratos': v.totalValorContratos,
      'Comissão Total': v.totalComissao
    }));

    const detalhes = filtered.map(v => {
      const valorBoleto = v.contrato?.valor_boleto || 0;
      const numBoletos = v.contrato?.numero_boletos || 1;
      return {
        Vendedor: v.beneficiario?.nome || '-',
        Contratante: v.contrato?.contratante_nome || '-',
        Projeto: v.contrato?.projeto?.nome || '-',
        Cliente: v.contrato?.credor_cedrus || '-',
        'Valor Boleto': valorBoleto,
        '%': v.percentual,
        'Nº Boletos': numBoletos,
        Comissão: (v.percentual / 100) * valorBoleto * numBoletos,
        Descrição: v.description || '-',
        Data: v.contrato?.created_at ? new Date(v.contrato.created_at).toLocaleDateString('pt-BR') : '-'
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalhes), 'Detalhes');
    XLSX.writeFile(wb, 'relatorio-vendedores.xlsx');
  };

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Vendedores</h1>
          <p className="text-muted-foreground">Comissões, relatórios e acompanhamento de vendedores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.ranking.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.totalContratosGeral}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />Comissão Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(analytics.totalComissaoGeral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />Top Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold truncate">{analytics.ranking[0]?.nome || '-'}</p>
            {analytics.ranking[0] && (
              <p className="text-xs text-muted-foreground">{formatCurrency(analytics.ranking[0].totalComissao)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <MultiSelectFilterPopover
              label="Vendedor"
              options={filterOptions.vendedores}
              selected={filterVendedores}
              onChange={setFilterVendedores}
              className="w-[200px]"
            />

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
              className="w-[180px]"
            />

            <Input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="w-[150px] h-9"
              placeholder="Data início"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="w-[150px] h-9"
              placeholder="Data fim"
            />

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />Limpar
              </Button>
            )}

            <Badge variant="outline" className="ml-auto">
              {filtered.length} registro(s)
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">
            <Trophy className="h-4 w-4 mr-2" />Ranking
          </TabsTrigger>
          <TabsTrigger value="detalhes">
            <FileText className="h-4 w-4 mr-2" />Detalhes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Ranking */}
        <TabsContent value="ranking">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Contratos</TableHead>
                    <TableHead>Valor Total Contratos</TableHead>
                    <TableHead>Comissão Total</TableHead>
                    <TableHead>Participação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.ranking.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum vendedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : analytics.ranking.map((v, idx) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant={idx < 3 ? 'default' : 'outline'} className={idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-amber-700' : ''}>
                          {idx + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{v.nome}</TableCell>
                      <TableCell>{v.totalContratos}</TableCell>
                      <TableCell>{formatCurrency(v.totalValorContratos)}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{formatCurrency(v.totalComissao)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${analytics.totalComissaoGeral > 0 ? (v.totalComissao / analytics.totalComissaoGeral * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {analytics.totalComissaoGeral > 0 ? (v.totalComissao / analytics.totalComissaoGeral * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Detalhes */}
        <TabsContent value="detalhes">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Contratante</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Boleto</TableHead>
                    <TableHead>Nº Boletos</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(v => {
                    const valorBoleto = v.contrato?.valor_boleto || 0;
                    const numBoletos = v.contrato?.numero_boletos || 1;
                    const comissao = (v.percentual / 100) * valorBoleto * numBoletos;
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.beneficiario?.nome || '-'}</TableCell>
                        <TableCell>{v.contrato?.contratante_nome || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.contrato?.projeto?.nome || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{v.contrato?.credor_cedrus || '-'}</TableCell>
                        <TableCell>{formatCurrency(valorBoleto)}</TableCell>
                        <TableCell>{numBoletos}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{v.percentual}%</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">{formatCurrency(comissao)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {v.contrato?.created_at ? new Date(v.contrato.created_at).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
