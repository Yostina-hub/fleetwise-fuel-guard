import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  label?: string;
  date: Date | undefined;
  time?: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange?: (time: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  /** When true, only a date is shown (no time input). */
  hideTime?: boolean;
}

export function DateTimePicker({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  placeholder = "Select date",
  required,
  disabled,
  minDate,
  hideTime,
}: DateTimePickerProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {date ? format(date, "MMM dd, yyyy") : placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              disabled={minDate ? (d) => d < minDate : undefined}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {!hideTime && (
          <div className="relative w-[110px] shrink-0">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              value={time ?? ""}
              onChange={(e) => onTimeChange?.(e.target.value)}
              disabled={disabled}
              className="pl-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Combine a Date + "HH:mm" string into an ISO string */
export function combineDateAndTime(date?: Date, time?: string): string | undefined {
  if (!date) return undefined;
  const [h, m] = (time || "00:00").split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Parse an ISO string into { date, time } */
export function splitDateTime(iso?: string | null): { date: Date | undefined; time: string } {
  if (!iso) return { date: undefined, time: "09:00" };
  const d = new Date(iso);
  return {
    date: d,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}
