import { useState } from "react"
import { CalendarIcon, Filter, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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

interface FilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onExportPDF: () => void
  showExport?: boolean
  availableClientes?: string[]
  availableTiposDisparo?: string[]
}

export function FilterBar({ 
  filters, 
  onFiltersChange, 
  onExportPDF,
  showExport = true,
  availableClientes = [],
  availableTiposDisparo = []
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Menos Filtros' : 'Mais Filtros'}
            </Button>
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPDF}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Primeira linha - sempre visível */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Buscar por cliente, devedor..."
              value={filters.searchTerm || ''}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
                <Calendar
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
                    "w-full justify-start text-left font-normal",
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
                <Calendar
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
            <Label>Clientes</Label>
            <Select 
              value={filters.clientes && filters.clientes.length > 0 ? 'selected' : 'todos'} 
              onValueChange={() => {}}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  filters.clientes && filters.clientes.length > 0 
                    ? `${filters.clientes.length} selecionados`
                    : "Todos os clientes"
                } />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 space-y-2">
                  {availableClientes.map((cliente) => (
                    <div key={cliente} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`cliente-${cliente}`}
                        checked={filters.clientes?.includes(cliente) || false}
                        onChange={(e) => {
                          const currentClientes = filters.clientes || []
                          const newClientes = e.target.checked
                            ? [...currentClientes, cliente]
                            : currentClientes.filter(c => c !== cliente)
                          updateFilters({ clientes: newClientes })
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`cliente-${cliente}`} className="text-sm cursor-pointer">
                        {cliente}
                      </label>
                    </div>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros expandidos */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Tipos de Disparo</Label>
              <Select 
                value={filters.tiposDisparo && filters.tiposDisparo.length > 0 ? 'selected' : 'todos'} 
                onValueChange={() => {}}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    filters.tiposDisparo && filters.tiposDisparo.length > 0 
                      ? `${filters.tiposDisparo.length} selecionados`
                      : "Todos os tipos"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 space-y-2">
                    {availableTiposDisparo.map((tipo) => (
                      <div key={tipo} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`tipo-${tipo}`}
                          checked={filters.tiposDisparo?.includes(tipo) || false}
                          onChange={(e) => {
                            const currentTipos = filters.tiposDisparo || []
                            const newTipos = e.target.checked
                              ? [...currentTipos, tipo]
                              : currentTipos.filter(t => t !== tipo)
                            updateFilters({ tiposDisparo: newTipos })
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`tipo-${tipo}`} className="text-sm cursor-pointer">
                          {tipo}
                        </label>
                      </div>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Devedor</Label>
              <Input
                placeholder="Filtrar por devedor"
                value={filters.devedor || ''}
                onChange={(e) => updateFilters({ devedor: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Botão limpar filtros */}
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({
              dateRange: {},
              clientes: [],
              tiposDisparo: [],
              devedor: undefined,
              searchTerm: undefined
            })}
          >
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}