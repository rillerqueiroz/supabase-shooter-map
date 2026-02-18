import React, { useState, useMemo } from "react";
import { useGestaoDisparos } from "@/hooks/useGestaoDisparos";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterState } from "@/components/Dashboard/FilterBar";
import { exportToPDF } from "@/utils/exportToPDF";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, MessageSquare } from "lucide-react";
import { parseDateFromDatabase } from "@/lib/utils";

const Calendario = () => {
  const { toast } = useToast();
  const { data: disparos, isLoading } = useGestaoDisparos();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    }
  });

  // Disparos do dia selecionado
  const selectedDateDisparos = useMemo(() => {
    if (!disparos) return [];
    
    return disparos.filter(disparo => {
      // Usar data_disparo prioritariamente, fallback para created_at
      const dateString = disparo.data_disparo || disparo.created_at;
      if (!dateString) return false;
      
      const disparoDate = parseDateFromDatabase(dateString);
      if (!disparoDate) return false;
      
      return isSameDay(disparoDate, selectedDate);
    });
  }, [disparos, selectedDate]);

  // Dias com disparos e contadores para marcar no calendário
  const daysWithDisparos = useMemo(() => {
    if (!disparos) return {};
    
    const disparosMap = new Map<string, number>();
    
    disparos.forEach(disparo => {
      const dateString = disparo.data_disparo || disparo.created_at;
      const date = parseDateFromDatabase(dateString);
      if (date) {
        const dateKey = date.toDateString();
        disparosMap.set(dateKey, (disparosMap.get(dateKey) || 0) + 1);
      }
    });
    
    return Object.fromEntries(disparosMap);
  }, [disparos]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('calendario-content', {
        filename: 'calendario_disparos_whatsapp',
        title: 'Calendário - Gestão de Disparos WhatsApp'
      });
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="calendario-content" className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Calendário de Disparos</h1>
      </div>

      <FilterBar 
        filters={filters}
        onFiltersChange={setFilters}
        onExportPDF={handleExportPDF}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md border shadow-sm"
                modifiers={{
                  hasDisparos: Object.keys(daysWithDisparos).map(key => new Date(key))
                }}
                modifiersStyles={{
                  hasDisparos: {
                    backgroundColor: 'hsl(0 84% 60%)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '6px'
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Informações do dia */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {selectedDateDisparos.length} disparos
                  </span>
                </div>

                {selectedDateDisparos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Tipos de disparo:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(selectedDateDisparos.map(d => d.tipo_disparo).filter(Boolean))).map(tipo => (
                        <Badge 
                          key={tipo}
                          variant="outline"
                        >
                          {tipo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de disparos do dia */}
          {selectedDateDisparos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Disparos do Dia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDateDisparos.slice(0, 5).map((disparo, index) => (
                  <div key={disparo.id || index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {disparo.cliente || `Cliente ${index + 1}`}
                    </span>
                    <Badge variant="outline">
                      {disparo.tipo_disparo || '-'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Descrição: {disparo.descricao || '-'}
                  </p>
                    {(disparo.data_disparo || disparo.created_at) && (
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {disparo.hora_disparo || (
                          disparo.created_at && format(new Date(disparo.created_at), "HH:mm")
                        )}
                      </p>
                    )}
                  </div>
                ))}
                
                {selectedDateDisparos.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    ... e mais {selectedDateDisparos.length - 5} disparos
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Resumo mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {Object.keys(daysWithDisparos).filter(dateKey => {
                  const date = new Date(dateKey);
                  return date.getMonth() === selectedDate.getMonth() && 
                         date.getFullYear() === selectedDate.getFullYear();
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Dias com disparos
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {disparos?.filter(d => {
                  const dateString = d.data_disparo || d.created_at;
                  const date = parseDateFromDatabase(dateString);
                  if (!date) return false;
                  return date.getMonth() === selectedDate.getMonth() && 
                         date.getFullYear() === selectedDate.getFullYear();
                }).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Total de disparos
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {Math.round((Object.keys(daysWithDisparos).filter(dateKey => {
                  const date = new Date(dateKey);
                  return date.getMonth() === selectedDate.getMonth() && 
                         date.getFullYear() === selectedDate.getFullYear();
                }).length / new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Dias ativos
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendario;