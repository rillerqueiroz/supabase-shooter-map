import React, { useEffect, useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useGestaoDisparos, useTestConnection } from "@/hooks/useGestaoDisparos";
import { testConnection, getTableStructure } from "@/lib/supabase";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { FilterBar, FilterState } from "@/components/Dashboard/FilterBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { MultiSelectFilter } from "@/components/Dashboard/MultiSelectFilter";

import { PresetFilters } from "@/components/Dashboard/PresetFilters";
import { UnifiedFilters } from "@/components/Dashboard/UnifiedFilters";
import { Link } from "react-router-dom";
import { formatDateFromDatabase, parseDateFromDatabase } from "@/lib/utils";
import { DevedorDisparosModal } from "@/components/SetorSul/DevedorDisparosModal";
import jsPDF from 'jspdf';
import { exportToExcel } from "@/utils/exportToExcel";
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Ban,
  Eye,
  RefreshCw,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface ParsedResult {
  status?: number;
  direction?: number;
  channel?: string;
  type?: string;
  is_paid?: boolean;
  reject_reason?: string | null;
  price_cbp?: {
    price?: number;
    currency?: string;
    origin_type?: string;
    is_free_conversation?: boolean;
    country_code?: string;
  };
  created_at?: string;
  id?: string;
  data?: {
    type?: string;
    template?: {
      name?: string;
      namespace?: string;
      language?: { code?: string };
      components?: any[];
    };
    message_id?: string;
  };
  success?: boolean;
  errors?: Record<string, string[]>;
  error_code?: number;
}

function parseJsonResultado(json_resultado: any): ParsedResult | null {
  if (!json_resultado) return null;
  try {
    if (typeof json_resultado === "string") {
      const parsed = JSON.parse(json_resultado);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    }
    return Array.isArray(json_resultado) ? json_resultado[0] : json_resultado;
  } catch {
    return null;
  }
}

function getStatusInfo(parsed: ParsedResult | null) {
  if (!parsed) return { label: "Sem dados", variant: "outline" as const, icon: AlertTriangle };
  if (parsed.success === false || parsed.error_code) {
    const errorMessages = parsed.errors
      ? Object.entries(parsed.errors).flatMap(([k, v]) => v.map(msg => `${k}: ${msg}`))
      : [];
    return {
      label: "Erro API",
      variant: "destructive" as const,
      icon: Ban,
      detail: errorMessages.join("; ") || `Erro ${parsed.error_code}`,
    };
  }
  if (parsed.status === 1) return { label: "Enviado", variant: "default" as const, icon: CheckCircle };
  if (parsed.status === 2) return { label: "Entregue", variant: "default" as const, icon: CheckCircle };
  if (parsed.status === 3) return { label: "Lido", variant: "secondary" as const, icon: Eye };
  if (parsed.status === 4) return { label: "Falha", variant: "destructive" as const, icon: XCircle };
  return { label: `Status ${parsed.status ?? "?"}`, variant: "outline" as const, icon: AlertTriangle };
}

const ANALYTICS_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
];

const Index = () => {
  const { toast } = useToast();
  const { data: disparos, isLoading, error } = useGestaoDisparos();
  const { data: connectionTest, isError: connectionError } = useTestConnection();
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {}
  });
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedTiposDisparo, setSelectedTiposDisparo] = useState<string[]>([]);
  const [selectedPlataformas, setSelectedPlataformas] = useState<string[]>([]);
  const [apenasErros, setApenasErros] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedDevedor, setSelectedDevedor] = useState<string>('');
  const [isDevedorModalOpen, setIsDevedorModalOpen] = useState(false);
  const [isUpdatingErros, setIsUpdatingErros] = useState(false);

  // Dados filtrados
  const filteredDisparos = useMemo(() => {
    if (!disparos) return []
    
    return disparos.filter(disparo => {
      // Filtro de busca
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const searchableFields = Object.values(disparo).join(' ').toLowerCase()
        if (!searchableFields.includes(searchLower)) return false
      }
      
      // Filtro de data - usando apenas data_disparo do Supabase
      if (filters.dateRange?.from || filters.dateRange?.to) {
        // Usar apenas a coluna data_disparo do Supabase
        if (!disparo.data_disparo) {
          return false; // Excluir registros sem data_disparo
        }
        
        // Converter data_disparo para Date usando função utilitária
        const disparoDate = parseDateFromDatabase(disparo.data_disparo);
        
        // Validar se a data é válida
        if (!disparoDate) {
          console.warn('⚠️ Data inválida encontrada na data_disparo:', disparo.data_disparo);
          return false;
        }
        
        const disparoDateOnly = new Date(disparoDate.getFullYear(), disparoDate.getMonth(), disparoDate.getDate());
        
        if (filters.dateRange.from) {
          const fromDate = new Date(filters.dateRange.from.getFullYear(), filters.dateRange.from.getMonth(), filters.dateRange.from.getDate());
          if (disparoDateOnly < fromDate) {
            return false;
          }
        }
        
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to.getFullYear(), filters.dateRange.to.getMonth(), filters.dateRange.to.getDate());
          if (disparoDateOnly > toDate) {
            return false;
          }
        }
      }
      
      // Filtro de clientes (seleção múltipla)
      if (selectedClientes.length > 0 && !selectedClientes.includes(disparo.cliente || '')) {
        return false
      }
      
      // Filtro de tipos de disparo (seleção múltipla)
      if (selectedTiposDisparo.length > 0 && !selectedTiposDisparo.includes(disparo.tipo_disparo || '')) {
        return false
      }
      
      // Filtro de plataforma de envio
      if (selectedPlataformas.length > 0 && !selectedPlataformas.includes(disparo.plataforma_envio || '')) {
        return false
      }
      
      // Filtro de devedor
      if (filters.devedor && !String(disparo.devedor || '').toLowerCase().includes(filters.devedor.toLowerCase())) {
        return false
      }

      // Filtro apenas erros
      if (apenasErros && disparo.sucesso !== false) {
        return false
      }
      
      return true
    })
  }, [disparos, filters, selectedClientes, selectedTiposDisparo, selectedPlataformas, apenasErros])

  // Ordenação
  const sortedDisparos = useMemo(() => {
    if (!sortField) return filteredDisparos;

    return [...filteredDisparos].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDisparos, sortField, sortDirection]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    if (!sortedDisparos.length) {
      return {
        total: 0,
        clientes: 0,
        tiposDisparo: 0
      }
    }
    
    const total = sortedDisparos.length
    const clientesUnicos = new Set(sortedDisparos.map(d => d.cliente).filter(Boolean)).size
    const tiposDisparoUnicos = new Set(sortedDisparos.map(d => d.tipo_disparo).filter(Boolean)).size
    
    return { total, clientes: clientesUnicos, tiposDisparo: tiposDisparoUnicos }
  }, [sortedDisparos])

  // Analytics de envios (baseado nos dados filtrados)
  const enviosAnalytics = useMemo(() => {
    const disparosComResultado = sortedDisparos.filter(d => d.json_resultado != null);
    const statusCounts: Record<string, number> = {};
    let totalCost = 0;
    let paidCount = 0;
    let freeCount = 0;
    const templateCounts: Record<string, number> = {};
    const errorCounts: Record<string, number> = {};

    disparosComResultado.forEach((d) => {
      const parsed = parseJsonResultado(d.json_resultado);
      if (!parsed) return;
      const info = getStatusInfo(parsed);
      statusCounts[info.label] = (statusCounts[info.label] || 0) + 1;
      if (parsed.price_cbp?.price) totalCost += parsed.price_cbp.price;
      if (parsed.is_paid === true) paidCount++;
      if (parsed.is_paid === false) freeCount++;
      const tplName = parsed.data?.template?.name;
      if (tplName) templateCounts[tplName] = (templateCounts[tplName] || 0) + 1;
      if (parsed.errors) {
        Object.entries(parsed.errors).forEach(([key, msgs]) => {
          msgs.forEach((msg) => {
            const errorKey = `${key}: ${msg}`;
            errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
          });
        });
      }
      if (info.detail) errorCounts[info.detail] = (errorCounts[info.detail] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const templateData = Object.entries(templateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
    const errorData = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return { statusData, totalCost, paidCount, freeCount, templateData, errorData, totalAnalisados: disparosComResultado.length };
  }, [sortedDisparos]);


  // Paginação para disparos recentes
  const {
    paginatedData: paginatedDisparos,
    pagination: paginationDisparos,
    pageCount: pageCountDisparos,
    canPreviousPage: canPreviousPageDisparos,
    canNextPage: canNextPageDisparos,
    gotoPage: gotoPageDisparos,
    nextPage: nextPageDisparos,
    previousPage: previousPageDisparos,
    setPageSize: setPageSizeDisparos,
    totalItems: totalItemsDisparos,
  } = usePagination({ data: sortedDisparos, initialPageSize: 50 });

  // Listas para filtros
  const availableData = useMemo(() => {
    if (!disparos) return { clientes: [], tiposDisparo: [] }
    
    const clientes = Array.from(new Set(disparos.map(d => d.cliente).filter(Boolean))).sort()
    const tiposDisparo = Array.from(new Set(disparos.map(d => d.tipo_disparo).filter(Boolean))).sort()
    const plataformas = Array.from(new Set(disparos.map(d => d.plataforma_envio).filter(Boolean))).sort()
    
    return { clientes, tiposDisparo, plataformas }
  }, [disparos])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const removeEmojis = (text: string) => {
    if (!text) return '';
    return text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    const clean = removeEmojis(text || '');
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength) + '...';
  };
  useEffect(() => {
    testConnection().then((result) => {
      if (result.success) {
        toast({
          title: "Conexão estabelecida!",
          description: "Conectado ao Supabase self-hosted com sucesso",
        });
      } else {
        toast({
          title: "Erro de conexão",
          description: result.error?.message || "Não foi possível conectar ao Supabase",
          variant: "destructive",
        });
      }
    });

    getTableStructure().then((result) => {
      if (result.success) {
        console.log("Estrutura da tabela gestao_disparos_whatsapp:", result.data);
      }
    });
  }, [toast]);

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Gestão de Disparos WhatsApp', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;

      // Resumo Estatístico
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Estatístico', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Disparos: ${stats.total}`, 25, yPos);
      yPos += 7;
      doc.text(`Clientes Únicos: ${stats.clientes}`, 25, yPos);
      yPos += 7;
      doc.text(`Devedores Atingidos: ${new Set(sortedDisparos.map(d => d.devedor).filter(Boolean)).size}`, 25, yPos);
      yPos += 12;

      // Linha divisória
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;

      // Tabela de Disparos Realizados
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Disparos Realizados', 20, yPos);
      yPos += 8;

      // Cabeçalho da tabela
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 15, yPos);
      doc.text('Cliente', 40, yPos);
      doc.text('Devedor', 75, yPos);
      doc.text('Número', 110, yPos);
      doc.text('Tipo', 140, yPos);
      yPos += 5;

      // Linha divisória
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 3;

      // Dados (primeiros 50 registros)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const maxRecords = Math.min(sortedDisparos.length, 50);
      sortedDisparos.slice(0, maxRecords).forEach((disparo) => {
        const dataHora = formatDateFromDatabase(disparo.data_disparo);
        const cliente = (disparo.cliente || '').substring(0, 18);
        const devedor = (disparo.devedor || '').substring(0, 18);
        const numero = (disparo.numero_enviado || '').substring(0, 15);
        const tipo = (disparo.tipo_disparo || '').substring(0, 12);
        const mensagemCompleta = removeEmojis(disparo.mensagem || '');
        
        // Quebrar mensagem em linhas de 85 caracteres
        const mensagemLines = [];
        for (let i = 0; i < mensagemCompleta.length; i += 85) {
          mensagemLines.push(mensagemCompleta.substring(i, i + 85));
        }
        
        // Verificar se há espaço para o registro (considerando altura da mensagem)
        const recordHeight = 4 + (mensagemLines.length > 0 ? (mensagemLines.length - 1) * 3 : 0);
        if (yPos + recordHeight > 270) {
          doc.addPage();
          yPos = 20;
          
          // Repetir cabeçalho
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('Data', 15, yPos);
          doc.text('Cliente', 40, yPos);
          doc.text('Devedor', 75, yPos);
          doc.text('Número', 110, yPos);
          doc.text('Tipo', 140, yPos);
          yPos += 5;
          doc.line(15, yPos, pageWidth - 15, yPos);
          yPos += 3;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }

        // Dados da primeira linha
        doc.text(dataHora, 15, yPos);
        doc.text(cliente, 40, yPos);
        doc.text(devedor, 75, yPos);
        doc.text(numero, 110, yPos);
        doc.text(tipo, 140, yPos);
        yPos += 4;
        
        // Mensagem completa (com quebras de linha)
        if (mensagemLines.length > 0) {
          doc.setFont('helvetica', 'italic');
          mensagemLines.forEach((line, idx) => {
            doc.text(`Msg: ${line}`, 15, yPos);
            if (idx < mensagemLines.length - 1) yPos += 3;
          });
          doc.setFont('helvetica', 'normal');
          yPos += 4;
        } else {
          yPos += 2;
        }
        
        // Linha divisória leve
        doc.setDrawColor(230, 230, 230);
        doc.line(15, yPos - 1, pageWidth - 15, yPos - 1);
      });

      // Nota de rodapé se houver mais de 50 registros
      if (sortedDisparos.length > 50) {
        yPos += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Mostrando 50 de ${sortedDisparos.length} registros. Use os filtros para visualizar registros específicos.`, 20, yPos);
      }

      doc.save('gestao-disparos-whatsapp.pdf');
      
      toast({
        title: "PDF exportado com sucesso!",
        description: "O arquivo foi baixado para seu computador"
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o arquivo PDF",
        variant: "destructive"
      });
    }
  }

  const handleAtualizarErros = async () => {
    setIsUpdatingErros(true);
    try {
      const response = await fetch('https://n8n.superavit.app.br/webhook/5d566f1e-b099-4655-b298-38cac70161fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'atualizar_erros' }),
      });
      if (!response.ok) throw new Error(`Erro: ${response.status}`);
      await response.json().catch(() => ({ success: true }));
      toast({
        title: "Envios atualizados!",
        description: "Os envios com erros foram atualizados com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar os envios com erros.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingErros(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const formattedData = sortedDisparos.map(disparo => ({
        'Data': formatDateFromDatabase(disparo.data_disparo),
        'Cliente': disparo.cliente || '',
        'Devedor': disparo.devedor || '',
        'Número Enviado': disparo.numero_enviado || '',
        'Tipo de Disparo': disparo.tipo_disparo || '',
        'Plataforma de Envio': disparo.plataforma_envio || '',
        'Status': disparo.sucesso === true ? 'Sucesso' : disparo.sucesso === false ? 'Erro' : '',
        'Nº Interno que Enviou': disparo.numero_interno_que_enviou || '',
        'Mensagem': removeEmojis(disparo.mensagem || '')
      }));

      exportToExcel({
        filename: `gestao-disparos-whatsapp-${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Disparos',
        data: formattedData
      });

      toast({
        title: "Excel exportado com sucesso!",
        description: "O arquivo foi baixado para seu computador"
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar Excel",
        description: "Não foi possível gerar o arquivo Excel",
        variant: "destructive"
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-content" className="space-y-6">
      {/* Filtros Unificados */}
      <UnifiedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        availableClientes={availableData.clientes}
        availableTiposDisparo={availableData.tiposDisparo}
        availablePlataformas={availableData.plataformas}
        selectedClientes={selectedClientes}
        selectedTiposDisparo={selectedTiposDisparo}
        selectedPlataformas={selectedPlataformas}
        onClientesChange={setSelectedClientes}
        onTiposDisparoChange={setSelectedTiposDisparo}
        onPlataformasChange={setSelectedPlataformas}
        apenasErros={apenasErros}
        onApenasErrosChange={setApenasErros}
      />

      {/* Botão Atualizar Envios com Erros */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleAtualizarErros}
          disabled={isUpdatingErros}
          variant="default"
          className="gap-2 bg-primary/90 hover:bg-primary text-primary-foreground shadow-md font-semibold"
        >
          <RefreshCw className={`h-4 w-4 ${isUpdatingErros ? 'animate-spin' : ''}`} />
          Atualizar Envios com Erros
        </Button>
        {isUpdatingErros && (
          <div className="flex-1 max-w-xs flex items-center gap-3">
            <Progress value={undefined} className="flex-1 h-2 [&>div]:animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">Aguardando...</span>
          </div>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Erro desconhecido"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div data-card-stat>
          <StatsCard
            title="Devedores Atingidos"
            value={(() => {
              const devedoresUnicos = new Set(sortedDisparos.map(d => d.devedor).filter(Boolean)).size;
              return devedoresUnicos.toLocaleString();
            })()}
            icon={Users}
            description="Devedores únicos no período"
          />
        </div>
      </div>

      {/* Analytics dos Envios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Analisados</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enviosAnalytics.totalAnalisados}</div>
            <p className="text-xs text-muted-foreground">envios com resultado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(enviosAnalytics.totalCost / 100).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">{enviosAnalytics.paidCount} pagos / {enviosAnalytics.freeCount} gratuitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Erros Detectados</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{sortedDisparos.filter(d => d.sucesso === false).length}</div>
            <p className="text-xs text-muted-foreground">envios com falha</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enviosAnalytics.totalAnalisados > 0
                ? ((1 - enviosAnalytics.errorData.reduce((s, e) => s + e.value, 0) / enviosAnalytics.totalAnalisados) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">dos envios bem sucedidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {enviosAnalytics.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={enviosAnalytics.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {enviosAnalytics.statusData.map((_, i) => (
                      <Cell key={i} fill={ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Templates Mais Usados</CardTitle>
          </CardHeader>
          <CardContent>
            {enviosAnalytics.templateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={enviosAnalytics.templateData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados de templates</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Erros */}
      {enviosAnalytics.errorData.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Resumo de Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enviosAnalytics.errorData.map((err, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-destructive/5">
                  <span className="text-sm">{err.name}</span>
                  <Badge variant="destructive">{err.value}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Disparos Realizados</CardTitle>
          <CardDescription>
            Mostrando {paginatedDisparos.length} de {stats.total} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedDisparos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[12%]">
                       <Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort('Cliente')}>
                         Cliente <ArrowUpDown className="ml-1 h-3 w-3" />
                       </Button>
                     </TableHead>
                     <TableHead className="w-[12%]">
                       <Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort('Devedor')}>
                         Devedor <ArrowUpDown className="ml-1 h-3 w-3" />
                       </Button>
                     </TableHead>
                     <TableHead className="w-[10%]">
                       <Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort('Número enviado')}>
                         Número <ArrowUpDown className="ml-1 h-3 w-3" />
                       </Button>
                     </TableHead>
                     <TableHead className="w-[8%]">
                       <Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort('data_disparo')}>
                         Data <ArrowUpDown className="ml-1 h-3 w-3" />
                       </Button>
                     </TableHead>
                     <TableHead className="w-[10%]">
                       <Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort('tipo_disparo')}>
                         Tipo <ArrowUpDown className="ml-1 h-3 w-3" />
                       </Button>
                     </TableHead>
                     <TableHead className="w-[13%] text-xs">Status / Plataforma</TableHead>
                     <TableHead className="w-[15%] text-xs">Motivo Erro</TableHead>
                     <TableHead className="w-[20%] text-xs">Mensagem</TableHead>
                    </TableRow>
                   </TableHeader>
                    <TableBody>
                      {paginatedDisparos.map((disparo, index) => (
                     <TableRow key={disparo.id || index}>
                           <TableCell className="font-medium text-xs truncate">
                             <Link 
                               to={`/cliente-detalhes/${encodeURIComponent(disparo.cliente || '')}`}
                               className="text-primary hover:underline"
                             >
                               {disparo.cliente || '-'}
                             </Link>
                           </TableCell>
                           <TableCell className="text-xs truncate">
                              <Button
                                variant="link"
                                className="p-0 h-auto text-xs text-primary hover:underline truncate max-w-full"
                                onClick={() => {
                                  setSelectedDevedor(disparo.devedor || '');
                                  setIsDevedorModalOpen(true);
                                }}
                              >
                                {disparo.devedor || '-'}
                              </Button>
                           </TableCell>
                           <TableCell className="text-xs truncate">{disparo.numero_enviado || '-'}</TableCell>
                           <TableCell className="text-xs whitespace-nowrap">
                             {formatDateFromDatabase(disparo.data_disparo)}
                           </TableCell>
                           <TableCell>
                            {(() => {
                              const tipo = disparo.tipo_disparo || '-';
                              let badgeColor = "bg-muted text-muted-foreground";
                              if (tipo.toLowerCase().includes('manual')) {
                                badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                              } else if (tipo.toLowerCase().includes('automático') || tipo.toLowerCase().includes('automatico')) {
                                badgeColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                              } else if (tipo.toLowerCase().includes('urgente')) {
                                badgeColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                              }
                              return <Badge className={`text-xs ${badgeColor}`}>{tipo}</Badge>;
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {disparo.sucesso === true ? (
                                <Badge variant="default" className="text-xs w-fit">Sucesso</Badge>
                              ) : disparo.sucesso === false ? (
                                <Badge variant="destructive" className="text-xs w-fit">Erro</Badge>
                              ) : null}
                              <span className="text-xs text-muted-foreground truncate">
                                {[disparo.plataforma_envio, disparo.numero_interno_que_enviou].filter(Boolean).join(" / ") || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs truncate" title={disparo.motivo_erro || ""}>
                            {disparo.motivo_erro || '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {disparo.mensagem ? (
                              <div>
                                <div className="whitespace-pre-wrap break-words">
                                  {expandedRows.has(index) 
                                    ? removeEmojis(disparo.mensagem || "") 
                                    : truncateText(disparo.mensagem || "", 60)
                                  }
                                </div>
                                {disparo.mensagem.length > 60 && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-primary"
                                    onClick={() => toggleRowExpansion(index)}
                                  >
                                    {expandedRows.has(index) ? (
                                      <><ChevronUp className="h-3 w-3 mr-1" />Menos</>
                                    ) : (
                                      <><ChevronDown className="h-3 w-3 mr-1" />Mais</>
                                    )}
                                  </Button>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                </Table>
                
                <DataTablePagination
                  pageIndex={paginationDisparos.pageIndex}
                  pageSize={paginationDisparos.pageSize}
                  pageCount={pageCountDisparos}
                  canPreviousPage={canPreviousPageDisparos}
                  canNextPage={canNextPageDisparos}
                  gotoPage={gotoPageDisparos}
                  nextPage={nextPageDisparos}
                  previousPage={previousPageDisparos}
                  setPageSize={setPageSizeDisparos}
                  totalItems={totalItemsDisparos}
                />
              </div>
            ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum registro encontrado com os filtros aplicados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status da Conexão */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={connectionError ? "destructive" : "default"}>
                {connectionError ? "Desconectado" : "Conectado"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {connectionError ? "Erro na conexão" : "Supabase self-hosted ativo"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de Histórico do Devedor */}
      <DevedorDisparosModal
        isOpen={isDevedorModalOpen}
        onClose={() => setIsDevedorModalOpen(false)}
        devedorNome={selectedDevedor}
      />
    </div>
  );
};

export default Index;
