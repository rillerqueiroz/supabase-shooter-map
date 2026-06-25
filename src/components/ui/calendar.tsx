import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

interface CustomCaptionProps {
  displayMonth: Date;
  onMonthChange: (date: Date) => void;
}

function CustomCaption({ displayMonth, onMonthChange }: CustomCaptionProps) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const monthsShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const handlePrevMonth = () => {
    const d = new Date(displayMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };
  const handleNextMonth = () => {
    const d = new Date(displayMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-1">
        <Select
          value={String(displayMonth.getMonth())}
          onValueChange={(m) => {
            const d = new Date(displayMonth);
            d.setMonth(parseInt(m));
            onMonthChange(d);
          }}
        >
          <SelectTrigger className="h-7 px-1.5 border-0 bg-transparent shadow-none font-bold text-base hover:bg-accent focus:ring-0 focus:ring-offset-0 gap-1 [&>svg]:hidden w-auto">
            <SelectValue>{monthsShort[displayMonth.getMonth()]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[240px]">
            {months.map((m, i) => (
              <SelectItem key={m} value={String(i)} className="text-sm">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(displayMonth.getFullYear())}
          onValueChange={(y) => {
            const d = new Date(displayMonth);
            d.setFullYear(parseInt(y));
            onMonthChange(d);
          }}
        >
          <SelectTrigger className="h-7 px-1.5 border-0 bg-transparent shadow-none font-bold text-base hover:bg-accent focus:ring-0 focus:ring-offset-0 gap-1 [&>svg]:hidden w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[240px]">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-foreground"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleNextMonth}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-foreground"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(props.month || new Date());

  // Sync internal month state with external month prop
  React.useEffect(() => {
    if (props.month && props.month.getTime() !== month.getTime()) {
      setMonth(props.month);
    }
  }, [props.month]);

  // Forward month changes to parent while keeping local state in sync
  const handleMonthChange = React.useCallback((newDate: Date) => {
    setMonth(newDate);
    (props as any).onMonthChange?.(newDate);
  }, [props]);

  return (
    <div className={cn("relative w-fit mx-auto", className)}>
      <CustomCaption displayMonth={month} onMonthChange={handleMonthChange} />
      <DayPicker
        {...props}
        showOutsideDays={showOutsideDays}
        month={month}
        onMonthChange={handleMonthChange}
        className="p-0 pointer-events-auto"
        locale={ptBR}
        weekStartsOn={0}
        formatters={{
          formatWeekdayName: (date) => {
            const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
            return days[date.getDay()];
          }
        }}
        classNames={{
          months: "flex flex-col",
          month: "space-y-2",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "border-collapse",
          head_row: "flex",
          head_cell: "text-muted-foreground w-8 font-normal text-[11px] flex items-center justify-center h-8",
          row: "flex mt-1",
          cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal text-xs aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
