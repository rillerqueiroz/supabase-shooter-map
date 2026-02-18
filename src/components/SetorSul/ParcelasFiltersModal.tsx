import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export interface ParcelasFilters {
  documento?: string;
  status?: string;
  dataVencimentoInicio?: Date;
  dataVencimentoFim?: Date;
  valorMinimo?: number;
  valorMaximo?: number;
}

interface ParcelasFiltersModalProps {
  filters: ParcelasFilters;
  onFiltersChange: (filters: ParcelasFilters) => void;
}

export function ParcelasFiltersModal({ filters, onFiltersChange }: ParcelasFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<ParcelasFilters>(filters);

  const handleFilterChange = (key: keyof ParcelasFilters, value: any) => {
    const newFilters = { 
      ...localFilters, 
      [key]: value === 'all' ? undefined : value 
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: ParcelasFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros de Parcelas</CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Documento */}
          <div className="space-y-2">
            <Label htmlFor="documento">Documento</Label>
            <Input
              id="documento"
              placeholder="Filtrar por documento..."
              value={localFilters.documento || ''}
              onChange={(e) => handleFilterChange('documento', e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={localFilters.status || 'all'} 
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de Vencimento - Início */}
          <div className="space-y-2">
            <Label>Data Vencimento (De)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dataVencimentoInicio ? 
                    format(localFilters.dataVencimentoInicio, "dd/MM/yyyy", { locale: pt }) : 
                    "Selecionar data"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.dataVencimentoInicio}
                  onSelect={(date) => handleFilterChange('dataVencimentoInicio', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data de Vencimento - Fim */}
          <div className="space-y-2">
            <Label>Data Vencimento (Até)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dataVencimentoFim ? 
                    format(localFilters.dataVencimentoFim, "dd/MM/yyyy", { locale: pt }) : 
                    "Selecionar data"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.dataVencimentoFim}
                  onSelect={(date) => handleFilterChange('dataVencimentoFim', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Valor Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="valorMinimo">Valor Mínimo</Label>
            <Input
              id="valorMinimo"
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={localFilters.valorMinimo || ''}
              onChange={(e) => handleFilterChange('valorMinimo', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>

          {/* Valor Máximo */}
          <div className="space-y-2">
            <Label htmlFor="valorMaximo">Valor Máximo</Label>
            <Input
              id="valorMaximo"
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={localFilters.valorMaximo || ''}
              onChange={(e) => handleFilterChange('valorMaximo', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Filtros Ativos */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Filtros Ativos:</Label>
            <div className="flex flex-wrap gap-2">
              {localFilters.documento && (
                <Badge variant="secondary">
                  Documento: {localFilters.documento}
                </Badge>
              )}
              {localFilters.status && (
                <Badge variant="secondary">
                  Status: {localFilters.status}
                </Badge>
              )}
              {localFilters.dataVencimentoInicio && (
                <Badge variant="secondary">
                  De: {format(localFilters.dataVencimentoInicio, "dd/MM/yyyy", { locale: pt })}
                </Badge>
              )}
              {localFilters.dataVencimentoFim && (
                <Badge variant="secondary">
                  Até: {format(localFilters.dataVencimentoFim, "dd/MM/yyyy", { locale: pt })}
                </Badge>
              )}
              {localFilters.valorMinimo && (
                <Badge variant="secondary">
                  Min: R$ {localFilters.valorMinimo.toFixed(2)}
                </Badge>
              )}
              {localFilters.valorMaximo && (
                <Badge variant="secondary">
                  Max: R$ {localFilters.valorMaximo.toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}