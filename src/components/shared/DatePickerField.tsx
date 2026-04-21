/**
 * DatePickerField
 * ---------------
 * Polished, theme-aware date picker that's a drop-in replacement for
 * `<Input type="date" />`. Stores values as ISO `YYYY-MM-DD` strings so it
 * works with existing form state shapes (no Date objects required).
 *
 *  - Uses shadcn `Calendar` inside a `Popover`, with `pointer-events-auto`
 *    so the calendar stays interactive inside Radix dialogs.
 *  - Honors `min` / `max` bounds to disable out-of-range days.
 *  - Renders aria-invalid styling consistent with the rest of the form.
 */
import { useMemo } from "react";
import { format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  /** ISO date string `YYYY-MM-DD` (or empty string when unset). */
  value: string;
  /** Receives a `YYYY-MM-DD` string, or `""` when cleared. */
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Inclusive lower bound, ISO `YYYY-MM-DD`. */
  min?: string;
  /** Inclusive upper bound, ISO `YYYY-MM-DD`. */
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaInvalid?: boolean;
  /** Allow clearing the selected date via an inline button. */
  clearable?: boolean;
}

const ISO = "yyyy-MM-dd";

function parseISO(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, ISO, new Date());
  return isValid(d) ? d : undefined;
}

export function DatePickerField({
  value,
  onChange,
  onBlur,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  className,
  ariaInvalid,
  clearable = true,
}: DatePickerFieldProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const minDate = useMemo(() => parseISO(min), [min]);
  const maxDate = useMemo(() => parseISO(max), [max]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-10 w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            ariaInvalid && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          onBlur={onBlur}
        >
          <CalendarIcon className="h-4 w-4 opacity-60" />
          <span className="flex-1 truncate">
            {selected ? format(selected, "PPP") : placeholder}
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) {
              onChange("");
              return;
            }
            onChange(format(d, ISO));
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          defaultMonth={selected ?? maxDate ?? minDate}
          captionLayout="dropdown-buttons"
          fromYear={1950}
          toYear={new Date().getFullYear() + 10}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePickerField;
