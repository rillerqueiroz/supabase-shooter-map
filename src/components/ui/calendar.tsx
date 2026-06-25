import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function getCalendarMonth(selected?: unknown, month?: Date) {
  if (month) return month;
  if (selected instanceof Date) return selected;
  if (selected && typeof selected === "object" && "from" in selected && selected.from instanceof Date) return selected.from;
  return new Date();
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month: controlledMonth,
  onMonthChange,
  ...props
}: CalendarProps) {
  const selected = (props as { selected?: unknown }).selected;
  const [month, setMonth] = React.useState<Date>(() => getCalendarMonth(selected, controlledMonth));

  React.useEffect(() => {
    if (controlledMonth) setMonth(controlledMonth);
  }, [controlledMonth]);

  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => Array.from({ length: 31 }, (_, index) => currentYear - 15 + index), [currentYear]);

  const handleMonthChange = React.useCallback(
    (newMonth: Date) => {
      setMonth(newMonth);
      onMonthChange?.(newMonth);
    },
    [onMonthChange]
  );

  const goToMonth = (offset: number) => {
    const nextMonth = new Date(month);
    nextMonth.setMonth(nextMonth.getMonth() + offset);
    handleMonthChange(nextMonth);
  };

  const selectMonth = (value: string) => {
    const nextMonth = new Date(month);
    nextMonth.setMonth(Number(value));
    handleMonthChange(nextMonth);
  };

  const selectYear = (value: string) => {
    const nextMonth = new Date(month);
    nextMonth.setFullYear(Number(value));
    handleMonthChange(nextMonth);
  };

  return (
    <div className={cn("w-[276px] max-w-[276px] p-2", className)}>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-[1fr_74px] gap-1">
          <Select value={String(month.getMonth())} onValueChange={selectMonth}>
            <SelectTrigger className="h-8 min-w-0 rounded-md px-2 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[260px]">
              {MONTHS.map((monthName, index) => (
                <SelectItem key={monthName} value={String(index)}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(month.getFullYear())} onValueChange={selectYear}>
            <SelectTrigger className="h-8 min-w-0 rounded-md px-2 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[260px]">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => goToMonth(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <DayPicker
        {...props}
        month={month}
        onMonthChange={handleMonthChange}
        showOutsideDays={showOutsideDays}
        hideNavigation
        locale={ptBR}
        weekStartsOn={0}
        className="w-full"
        formatters={{
          formatWeekdayName: (date) => ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][date.getDay()],
        }}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full",
          month_caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          month_grid: "w-full table-fixed border-collapse",
          weekdays: "table-row",
          weekday: "h-7 w-9 text-center align-middle text-[11px] font-medium text-muted-foreground",
          weeks: "table-row-group",
          week: "table-row",
          day: "h-9 w-9 p-0 text-center align-middle text-sm",
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "mx-auto flex h-8 w-8 items-center justify-center rounded-full p-0 text-sm font-normal hover:bg-accent hover:text-accent-foreground"
          ),
          selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
          range_start: "[&>button]:bg-primary [&>button]:text-primary-foreground",
          range_middle: "bg-accent/60 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-accent-foreground [&>button]:hover:bg-transparent",
          range_end: "[&>button]:bg-primary [&>button]:text-primary-foreground",
          today: "[&>button]:border [&>button]:border-primary [&>button]:font-semibold [&>button]:text-primary",
          outside: "text-muted-foreground/40 [&>button]:text-muted-foreground/40",
          disabled: "text-muted-foreground/30 opacity-40 [&>button]:cursor-not-allowed",
          hidden: "invisible",
          ...classNames,
        }}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };