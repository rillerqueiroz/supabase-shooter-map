import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, X } from "lucide-react";
import { SetorSulCliente } from "@/hooks/useSetorSulClientes";
import { ClientesFieldMap, inferClientesFieldMap } from "@/utils/fieldMapping";

interface ClientesFiltersProps {
  onFiltersChange: (filters: any) => void;
  data: SetorSulCliente[];
  fieldMap?: ClientesFieldMap;
}

export function ClientesFilters({ onFiltersChange, data, fieldMap }: ClientesFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});

  const map = fieldMap || inferClientesFieldMap(data as any[]);
  const { nomeKey, cpfKey, telefoneKey, emailKey, situacaoKey, loteKey, quadraKey } = map;

  // Extrair valores únicos dos dados para os filtros (somente se a coluna existir)
  const uniqueSituacoes = situacaoKey ? [...new Set((data as any[]).map(item => (item as any)[situacaoKey]).filter(Boolean))].sort() : [];
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
              {nomeKey && (
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Filtrar por nome"
                    onChange={(e) => handleFilterChange('nome', e.target.value)}
                    value={filters.nome || ''}
                  />
                </div>
              )}

              {cpfKey && (
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    placeholder="Filtrar por CPF"
                    onChange={(e) => handleFilterChange('cpf', e.target.value)}
                    value={filters.cpf || ''}
                  />
                </div>
              )}

              {telefoneKey && (
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="Filtrar por telefone"
                    onChange={(e) => handleFilterChange('telefone', e.target.value)}
                    value={filters.telefone || ''}
                  />
                </div>
              )}

              {emailKey && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="Filtrar por email"
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                    value={filters.email || ''}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>ID</Label>
                <Input
                  placeholder="Filtrar por ID"
                  onChange={(e) => handleFilterChange('id', e.target.value)}
                  value={filters.id || ''}
                />
              </div>

              {situacaoKey && (
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select onValueChange={(value) => handleFilterChange('person_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {uniqueSituacoes.map(situacao => (
                        <SelectItem key={situacao as string} value={String(situacao)}>{String(situacao)}</SelectItem>
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
                        <SelectItem key={lote as string} value={String(lote)}>{String(lote)}</SelectItem>
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
                        <SelectItem key={quadra as string} value={String(quadra)}>{String(quadra)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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