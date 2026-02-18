import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, X } from "lucide-react";
import { SetorSulParcela } from "@/hooks/useSetorSulParcelas";
import { ParcelasFieldMap, inferParcelasFieldMap } from "@/utils/fieldMapping";

interface ParcelasFiltersProps {
  onFiltersChange: (filters: any) => void;
  data: SetorSulParcela[];
  fieldMap?: ParcelasFieldMap;
}

export function ParcelasFilters({ onFiltersChange, data, fieldMap }: ParcelasFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});

  const map = fieldMap || inferParcelasFieldMap(data as any[]);
  const { clienteKey, statusKey, loteKey, quadraKey, vencimentoKey, valorKey } = map as any;

  // Extrair valores únicos dos dados para os filtros
  const uniqueClientes = clienteKey ? [...new Set((data as any[]).map(item => (item as any)[clienteKey]).filter(Boolean))].sort() : [];
  const uniqueStatus = statusKey ? [...new Set((data as any[]).map(item => (item as any)[statusKey]).filter(Boolean))].sort() : [];
  const uniqueLotes = loteKey ? [...new Set((data as any[]).map(item => (item as any)[loteKey]).filter(Boolean))].sort() : [];
  const uniqueQuadras = quadraKey ? [...new Set((data as any[]).map(item => (item as any)[quadraKey]).filter(Boolean))].sort() : [];

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters };
    
    if (value === '' || value === 'all') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {Object.keys(filters).length}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clienteKey && (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select onValueChange={(value) => handleFilterChange('cliente', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {uniqueClientes.map(cliente => (
                        <SelectItem key={String(cliente)} value={String(cliente)}>{String(cliente)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {statusKey && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {uniqueStatus.map(status => (
                        <SelectItem key={String(status)} value={String(status)}>{String(status)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loteKey && (
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Select onValueChange={(value) => handleFilterChange('lote', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os lotes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os lotes</SelectItem>
                      {uniqueLotes.map(lote => (
                        <SelectItem key={String(lote)} value={String(lote)}>{String(lote)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {quadraKey && (
                <div className="space-y-2">
                  <Label>Quadra</Label>
                  <Select onValueChange={(value) => handleFilterChange('quadra', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as quadras" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as quadras</SelectItem>
                      {uniqueQuadras.map(quadra => (
                        <SelectItem key={String(quadra)} value={String(quadra)}>{String(quadra)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {vencimentoKey && (
                <>
                  <div className="space-y-2">
                    <Label>Data de Vencimento - De</Label>
                    <Input
                      type="date"
                      onChange={(e) => handleFilterChange('data_vencimento_start', e.target.value)}
                      value={filters.data_vencimento_start || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Vencimento - Até</Label>
                    <Input
                      type="date"
                      onChange={(e) => handleFilterChange('data_vencimento_end', e.target.value)}
                      value={filters.data_vencimento_end || ''}
                    />
                  </div>
                </>
              )}

              {valorKey && (
                <>
                  <div className="space-y-2">
                    <Label>Valor Mínimo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => handleFilterChange('valor_min', e.target.value)}
                      value={filters.valor_min || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Máximo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => handleFilterChange('valor_max', e.target.value)}
                      value={filters.valor_max || ''}
                    />
                  </div>
                </>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}