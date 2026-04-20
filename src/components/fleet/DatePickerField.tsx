import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerFieldProps {
  /** ISO date string (yyyy-MM-dd) or empty */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Restrict selectable range */
  minDate?: Date;
  maxDate?: Date;
  /** Show clear (X) button when a value is set */
  clearable?: boolean;
}

const ISO = "yyyy-MM-dd";

/**
 * Professional shadcn-based date picker with calendar popover.
 * Drop-in replacement for `<Input type="date">` — uses ISO yyyy-MM-dd
 * strings on both sides so existing form state stays compatible.
 */
export function DatePickerField({
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  disabled,
  className,
  minDate,
  maxDate,
  clearable = true,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const date = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = parse(value, ISO, new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) onBlur?.(); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">
            {date ? format(date, "PPP") : placeholder}
          </span>
          {clearable && date && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-sm opacity-60 hover:opacity-100 hover:bg-muted"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { onChange(d ? format(d, ISO) : ""); if (d) setOpen(false); }}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          defaultMonth={date}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePickerField;
