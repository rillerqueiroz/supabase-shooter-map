import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CalendarRange } from "lucide-react";

interface PresetFiltersProps {
  onFilterSelect: (dateRange: { from?: Date; to?: Date }) => void;
  currentFilters?: { from?: Date; to?: Date };
}

export const PresetFilters: React.FC<PresetFiltersProps> = ({ onFilterSelect, currentFilters }) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const isActive = (range: { from?: Date; to?: Date }) => {
    if (!currentFilters?.from || !currentFilters?.to) return false;
    const currentStart = currentFilters.from.toDateString();
    const currentEnd = currentFilters.to.toDateString();
    const rangeStart = range.from?.toDateString();
    const rangeEnd = range.to?.toDateString();
    return currentStart === rangeStart && currentEnd === rangeEnd;
  };

  const presets = [
    {
      label: "Hoje",
      icon: Calendar,
      range: { from: startOfToday, to: today },
      onClick: () => onFilterSelect({ from: startOfToday, to: today })
    },
    {
      label: "Esta Semana", 
      icon: Clock,
      range: { from: thisWeekStart, to: today },
      onClick: () => onFilterSelect({ from: thisWeekStart, to: today })
    },
    {
      label: "Este Mês",
      icon: CalendarRange,
      range: { from: thisMonthStart, to: today },
      onClick: () => onFilterSelect({ from: thisMonthStart, to: today })
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Filtros Rápidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            return (
              <Button
                key={preset.label}
                variant={isActive(preset.range) ? "default" : "outline"}
                size="sm"
                onClick={preset.onClick}
                className="flex items-center gap-2 animate-fade-in"
              >
                <Icon className="h-4 w-4" />
                {preset.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};