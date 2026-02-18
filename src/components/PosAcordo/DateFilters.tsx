import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateFiltersProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onClear: () => void;
}

export function DateFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateFiltersProps) {
  const presets = [
    {
      label: 'Hoje',
      getValue: () => ({
        start: startOfDay(new Date()),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Esta Semana',
      getValue: () => ({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Este Mês',
      getValue: () => ({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
      }),
    },
    {
      label: 'Últimos 7 dias',
      getValue: () => ({
        start: startOfDay(subDays(new Date(), 6)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Últimos 30 dias',
      getValue: () => ({
        start: startOfDay(subDays(new Date(), 29)),
        end: endOfDay(new Date()),
      }),
    },
  ];

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  const hasDateFilter = startDate || endDate;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className="text-xs h-8"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Start date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'w-[130px] justify-start text-left font-normal h-8',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {startDate ? format(startDate, 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate || undefined}
              onSelect={(date) => onStartDateChange(date || null)}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">até</span>

        {/* End date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'w-[130px] justify-start text-left font-normal h-8',
                !endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {endDate ? format(endDate, 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate || undefined}
              onSelect={(date) => onEndDateChange(date || null)}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {hasDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
