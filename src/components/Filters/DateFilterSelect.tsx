import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths, addYears, format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DateFilterSelectProps {
  value?: { from?: Date; to?: Date };
  onChange: (value: { from?: Date; to?: Date }) => void;
  label?: string;
}

export function DateFilterSelect({ value, onChange, label = "Período" }: DateFilterSelectProps) {
  const [preset, setPreset] = useState("");
  const [inputFrom, setInputFrom] = useState("");
  const [inputTo, setInputTo] = useState("");
  const [calendarMonthFrom, setCalendarMonthFrom] = useState<Date>(new Date());
  const [calendarMonthTo, setCalendarMonthTo] = useState<Date>(new Date());

  // Sincronizar preset com valor externo
  useEffect(() => {
    if (value && value.from && value.to) {
      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const endOfThisMonth = endOfMonth(now);

      // Verificar se é "Este mês"
      if (value.from.getTime() === startOfThisMonth.getTime() && 
          value.to.getTime() === endOfThisMonth.getTime()) {
        setPreset("este-mes");
      } else if (value && value.from && value.to) {
        setPreset("personalizado");
      }
    } else if (!value || (!value.from && !value.to)) {
      setPreset("todos");
    }
    
    // Sync calendar months with values
    if (value?.from) setCalendarMonthFrom(value.from);
    if (value?.to) setCalendarMonthTo(value.to);
    setInputFrom(value?.from ? format(value.from, "dd/MM/yyyy") : "");
    setInputTo(value?.to ? format(value.to, "dd/MM/yyyy") : "");
  }, [value]);

  const handlePresetChange = (presetValue: string) => {
    setPreset(presetValue);
    const now = new Date();

    switch (presetValue) {
      case "hoje":
        onChange({
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        });
        break;
      case "esta-semana":
        onChange({
          from: startOfWeek(now, { weekStartsOn: 0 }),
          to: endOfWeek(now, { weekStartsOn: 0 })
        });
        break;
      case "este-mes":
        onChange({
          from: startOfMonth(now),
          to: endOfMonth(now)
        });
        break;
      case "mes-passado":
        const lastMonth = subMonths(now, 1);
        onChange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        });
        break;
      case "proximo-mes":
        const nextMonth = addMonths(now, 1);
        onChange({
          from: startOfMonth(nextMonth),
          to: endOfMonth(nextMonth)
        });
        break;
      case "este-ano":
        onChange({
          from: startOfYear(now),
          to: endOfYear(now)
        });
        break;
      case "proximo-ano":
        const nextYear = addYears(now, 1);
        onChange({
          from: startOfYear(nextYear),
          to: endOfYear(nextYear)
        });
        break;
      case "personalizado":
        // Não alterar as datas, permitir seleção manual
        break;
      case "todos":
      default:
        onChange({ from: undefined, to: undefined });
        break;
    }
  };

  const handleDateChange = (field: 'from' | 'to', date: Date | undefined, calendarMonth?: Date) => {
    if (date && isNaN(date.getTime())) {
      console.warn('⚠️ Data inválida recebida:', date);
      return;
    }

    // If we have a calendar month reference and the selected date's month doesn't match,
    // use the calendar month instead
    if (date && calendarMonth) {
      const correctedDate = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        date.getDate(),
        date.getHours() || 0,
        date.getMinutes() || 0,
        date.getSeconds() || 0
      );
      date = correctedDate;
    }

    setPreset("personalizado");
    onChange({
      ...(value || {}),
      [field]: date
    });
  };

  const formatDateInput = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length <= 2) {
      return cleanValue;
    } else if (cleanValue.length <= 4) {
      return `${cleanValue.substring(0, 2)}/${cleanValue.substring(2)}`;
    } else {
      return `${cleanValue.substring(0, 2)}/${cleanValue.substring(2, 4)}/${cleanValue.substring(4, 8)}`;
    }
  };

  const handleManualInput = (field: 'from' | 'to', inputValue: string) => {
    const formatted = formatDateInput(inputValue);
    
    if (field === 'from') {
      setInputFrom(formatted);
    } else {
      setInputTo(formatted);
    }
    
    const cleanValue = inputValue.replace(/\D/g, '');
    
    if (cleanValue.length === 8) {
      const day = parseInt(cleanValue.substring(0, 2));
      const month = parseInt(cleanValue.substring(2, 4)) - 1;
      const year = parseInt(cleanValue.substring(4, 8));
      
      const parsedDate = new Date(year, month, day);
      
      if (!isNaN(parsedDate.getTime()) && 
          parsedDate.getDate() === day && 
          parsedDate.getMonth() === month &&
          parsedDate.getFullYear() === year) {
        handleDateChange(field, parsedDate);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Preset Selector */}
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os períodos</SelectItem>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="esta-semana">Esta semana</SelectItem>
          <SelectItem value="este-mes">Este mês</SelectItem>
          <SelectItem value="mes-passado">Mês passado</SelectItem>
          <SelectItem value="proximo-mes">Próximo mês</SelectItem>
          <SelectItem value="este-ano">Este ano</SelectItem>
          <SelectItem value="proximo-ano">Próximo ano</SelectItem>
          <SelectItem value="personalizado">Período personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Pickers */}
      {(preset === "personalizado" || (!preset && value && (value.from || value.to))) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs">Data Inicial</Label>
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={inputFrom}
              onChange={(e) => handleManualInput('from', e.target.value)}
              maxLength={10}
              className="mb-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.from ? format(value.from, "dd/MM/yyyy", { locale: ptBR }) : "Calendário"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value?.from}
                  onSelect={(date) => handleDateChange('from', date, calendarMonthFrom)}
                  month={calendarMonthFrom}
                  onMonthChange={setCalendarMonthFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Data Final</Label>
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={inputTo}
              onChange={(e) => handleManualInput('to', e.target.value)}
              maxLength={10}
              className="mb-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value?.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.to ? format(value.to, "dd/MM/yyyy", { locale: ptBR }) : "Calendário"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value?.to}
                  onSelect={(date) => handleDateChange('to', date, calendarMonthTo)}
                  month={calendarMonthTo}
                  onMonthChange={setCalendarMonthTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Display selected range */}
      {value && (value.from || value.to) ? (
        <p className="text-xs text-muted-foreground">
          {value.from && value.to && !isNaN(value.from.getTime()) && !isNaN(value.to.getTime()) ? (
            `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`
          ) : value.from && !isNaN(value.from.getTime()) ? (
            `A partir de ${format(value.from, "dd/MM/yyyy", { locale: ptBR })}`
          ) : value.to && !isNaN(value.to.getTime()) ? (
            `Até ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
