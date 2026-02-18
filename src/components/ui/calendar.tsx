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
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const handlePrevMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  return (
    <div className="flex items-center justify-between gap-2 mb-2 px-1">
      <button
        type="button"
        onClick={handlePrevMonth}
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <Select
          value={months[displayMonth.getMonth()]}
          onValueChange={(month) => {
            const newDate = new Date(displayMonth);
            newDate.setMonth(months.indexOf(month));
            onMonthChange(newDate);
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {months.map((month) => (
              <SelectItem key={month} value={month} className="text-sm cursor-pointer">
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={(year) => {
            const newDate = new Date(displayMonth);
            newDate.setFullYear(parseInt(year));
            onMonthChange(newDate);
          }}
        >
          <SelectTrigger className="h-8 w-[90px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()} className="text-sm cursor-pointer">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={handleNextMonth}
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
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
    <div className={cn("relative", className)}>
      <CustomCaption displayMonth={month} onMonthChange={handleMonthChange} />
      <DayPicker
        {...props}
        showOutsideDays={showOutsideDays}
        month={month}
        onMonthChange={handleMonthChange}
        className="p-3 pt-0 pointer-events-auto"
        locale={ptBR}
        weekStartsOn={0}
        formatters={{
          formatWeekdayName: (date) => {
            const days = ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa'];
            return days[date.getDay()];
          }
        }}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-2",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse",
          head_row: "flex gap-1",
          head_cell: "text-muted-foreground w-9 font-normal text-xs flex items-center justify-center h-9",
          row: "flex w-full gap-1",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
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
