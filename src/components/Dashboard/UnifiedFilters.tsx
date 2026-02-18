import React, { useState } from "react";
import { CalendarIcon, Filter, Download, FileSpreadsheet, Calendar, Clock, CalendarRange, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FilterState {
  dateRange: {
    from?: Date
    to?: Date
  }
  clientes?: string[]
  tiposDisparo?: string[]
  plataformasEnvio?: string[]
  devedor?: string
  searchTerm?: string
}

interface UnifiedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onExportPDF: () => void;
  onExportExcel?: () => void;
  availableClientes: string[];
  availableTiposDisparo: string[];
  availablePlataformas?: string[];
  selectedClientes: string[];
  selectedTiposDisparo: string[];
  selectedPlataformas?: string[];
  onClientesChange: (clientes: string[]) => void;
  onTiposDisparoChange: (tipos: string[]) => void;
  onPlataformasChange?: (plataformas: string[]) => void;
  apenasErros?: boolean;
  onApenasErrosChange?: (value: boolean) => void;
}

export function UnifiedFilters({
  filters,
  onFiltersChange,
  onExportPDF,
  onExportExcel,
  availableClientes,
  availableTiposDisparo,
  availablePlataformas = [],
  selectedClientes,
  selectedTiposDisparo,
  selectedPlataformas = [],
  onClientesChange,
  onTiposDisparoChange,
  onPlataformasChange,
  apenasErros = false,
  onApenasErrosChange,
}: UnifiedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  // Preset filters
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);
  
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const isPresetActive = (range: { from?: Date; to?: Date }) => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) return false;
    const currentStart = filters.dateRange.from.toDateString();
    const currentEnd = filters.dateRange.to.toDateString();
    const rangeStart = range.from?.toDateString();
    const rangeEnd = range.to?.toDateString();
    return currentStart === rangeStart && currentEnd === rangeEnd;
  };

  const presets = [
    {
      label: "Hoje",
      icon: Calendar,
      range: { from: startOfToday, to: today },
      onClick: () => updateFilters({ dateRange: { from: startOfToday, to: today } })
    },
    {
      label: "Ontem",
      icon: Calendar,
      range: { from: yesterday, to: yesterday },
      onClick: () => updateFilters({ dateRange: { from: yesterday, to: yesterday } })
    },
    {
      label: "Esta Semana",
      icon: Clock,
      range: { from: thisWeekStart, to: today },
      onClick: () => updateFilters({ dateRange: { from: thisWeekStart, to: today } })
    },
    {
      label: "Semana Passada",
      icon: Clock,
      range: { from: lastWeekStart, to: lastWeekEnd },
      onClick: () => updateFilters({ dateRange: { from: lastWeekStart, to: lastWeekEnd } })
    },
    {
      label: "Este Mês",
      icon: CalendarRange,
      range: { from: thisMonthStart, to: today },
      onClick: () => updateFilters({ dateRange: { from: thisMonthStart, to: today } })
    }
  ];

  const clearAllFilters = () => {
    updateFilters({
      dateRange: {},
      clientes: [],
      tiposDisparo: [],
      plataformasEnvio: [],
      devedor: undefined,
      searchTerm: undefined
    });
    onClientesChange([]);
    onTiposDisparoChange([]);
    onPlataformasChange?.([]);
    onApenasErrosChange?.(false);
  };

  const hasActiveFilters = 
    filters.searchTerm ||
    filters.dateRange?.from ||
    filters.dateRange?.to ||
    filters.devedor ||
    selectedClientes.length > 0 ||
    selectedTiposDisparo.length > 0 ||
    selectedPlataformas.length > 0 ||
    apenasErros;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                Ativo
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Menos Filtros' : 'Mais Filtros'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            {onExportExcel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExcel}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros Rápidos de Data */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Filtros Rápidos</Label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <Button
                  key={preset.label}
                  variant={isPresetActive(preset.range) ? "default" : "outline"}
                  size="sm"
                  onClick={preset.onClick}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <Icon className="h-3 w-3" />
                  {preset.label}
                </Button>
              );
            })}
            {onApenasErrosChange && (
              <Button
                variant={apenasErros ? "destructive" : "outline"}
                size="sm"
                onClick={() => onApenasErrosChange(!apenasErros)}
                className="flex items-center gap-2 animate-fade-in"
              >
                <XCircle className="h-3 w-3" />
                Apenas Erros
              </Button>
            )}
          </div>
        </div>

        {/* Primeira linha - sempre visível */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Cliente, devedor..."
              value={filters.searchTerm || ''}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label>Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecionar"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) => updateFilters({ 
                    dateRange: { ...filters.dateRange, from: date } 
                  })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Data Final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !filters.dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.to ? (
                    format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecionar"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) => updateFilters({ 
                    dateRange: { ...filters.dateRange, to: date } 
                  })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Devedor</Label>
            <Input
              placeholder="Filtrar por devedor"
              value={filters.devedor || ''}
              onChange={(e) => updateFilters({ devedor: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Disparo</Label>
            <MultiSelectFilter
              title=""
              options={availableTiposDisparo}
              selectedValues={selectedTiposDisparo}
              onSelectionChange={onTiposDisparoChange}
              placeholder="Selecionar tipos..."
            />
          </div>
        </div>

        {/* Filtros expandidos */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelectFilter
                title="Cliente"
                options={availableClientes}
                selectedValues={selectedClientes}
                onSelectionChange={onClientesChange}
                placeholder="Selecionar clientes..."
              />
              {availablePlataformas.length > 0 && onPlataformasChange && (
                <MultiSelectFilter
                  title="Plataforma de Envio"
                  options={availablePlataformas}
                  selectedValues={selectedPlataformas}
                  onSelectionChange={onPlataformasChange}
                  placeholder="Selecionar plataformas..."
                />
              )}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-2"
            >
              <X className="h-3 w-3" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}