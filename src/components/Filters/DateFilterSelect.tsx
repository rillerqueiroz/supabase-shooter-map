import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface DateFilterSelectProps {
  label?: string;
  value?: { from?: Date; to?: Date };
  onChange: (value?: { from?: Date; to?: Date }) => void;
}

export function DateFilterSelect({ label = "Período", value, onChange }: DateFilterSelectProps) {
  const [open, setOpen] = useState(false);

  const hasValue = value?.from || value?.to;

  const selected: DateRange | undefined = value?.from
    ? { from: value.from, to: value.to }
    : undefined;

  const formatRange = () => {
    if (!value?.from) return label;
    if (!value.to) return format(value.from, "dd/MM/yy", { locale: ptBR });
    return `${format(value.from, "dd/MM/yy", { locale: ptBR })} - ${format(value.to, "dd/MM/yy", { locale: ptBR })}`;
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs">
            <span className="truncate">{formatRange()}</span>
            <div className="flex items-center gap-1">
              {hasValue && (
                <X
                  className="h-3 w-3 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(undefined);
                  }}
                />
              )}
              <CalendarIcon className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 pointer-events-auto" 
          align="start"
          side="bottom"
          sideOffset={4}
          // Força renderização via portal para escapar de containers com overflow
          forceMount={open ? undefined : undefined}
        >
          <Calendar
            mode="range"
            selected={selected}
            onSelect={(range: any) => {
              if (!range) {
                onChange(undefined);
              } else {
                onChange({ from: range.from, to: range.to });
              }
            }}
            numberOfMonths={1}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
