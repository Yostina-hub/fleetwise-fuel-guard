import * as React from "react";
import { format, addDays, isToday, isTomorrow, isSameDay } from "date-fns";
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
  /** When true, render the trigger with a destructive border so the field
   *  visually matches the inline error message shown below it. */
  error?: boolean;
}

/**
 * Coerce unknown values (Date, ISO string, timestamp) into a valid Date or undefined.
 * Prevents `d.getTime is not a function` when callers accidentally pass a string.
 */
function toDateSafe(value: unknown): Date | undefined {
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/**
 * Friendly relative-day label: "Today", "Tomorrow", "In 3 days · Wed Apr 23".
 * Shown inside the trigger to make picked dates instantly readable.
 */
function smartLabel(d: Date): string {
  if (isToday(d)) return `Today · ${format(d, "MMM dd")}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, "MMM dd")}`;
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days > 1 && days <= 7) return `In ${days} days · ${format(d, "EEE MMM dd")}`;
  return format(d, "EEE, MMM dd, yyyy");
}

export function DateTimePicker({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  placeholder = "Pick a date",
  required,
  disabled,
  minDate,
  hideTime,
  error,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  // Defensive: callers occasionally pass an ISO string instead of a Date.
  const safeDate = React.useMemo(() => toDateSafe(date), [date]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);
  const inAWeek = addDays(today, 7);

  // Normalize minDate to start-of-day so "today" is selectable even when
  // callers pass `new Date()` (which carries the current time-of-day).
  const normalizedMinDate = React.useMemo(() => {
    if (!minDate) return undefined;
    const m = new Date(minDate);
    m.setHours(0, 0, 0, 0);
    return m;
  }, [minDate]);

  const quickPicks = [
    { label: "Today", value: today, hint: format(today, "EEE") },
    { label: "Tomorrow", value: tomorrow, hint: format(tomorrow, "EEE") },
    { label: "+1 Week", value: inAWeek, hint: format(inAWeek, "MMM dd") },
  ];

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              aria-invalid={error || undefined}
              className={cn(
                "flex-1 justify-start text-left font-normal h-10",
                !safeDate && "text-muted-foreground",
                safeDate && !error && "border-primary/40 bg-primary/5",
                error && "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/40",
              )}
            >
              <CalendarIcon className={cn("mr-2 h-4 w-4 shrink-0", safeDate && !error && "text-primary", error && "text-destructive")} />
              <span className="truncate">
                {safeDate ? smartLabel(safeDate) : placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
            {/* Quick picks header — friendlier than scrolling the calendar */}
            <div className="border-b border-border bg-muted/30 p-2 flex items-center gap-1.5 flex-wrap">
              {quickPicks.map((q) => {
                const isSel = safeDate && isSameDay(safeDate, q.value);
                const blocked = normalizedMinDate && q.value < normalizedMinDate;
                return (
                  <Button
                    key={q.label}
                    type="button"
                    variant={isSel ? "default" : "outline"}
                    size="sm"
                    disabled={blocked}
                    onClick={() => { onDateChange(q.value); setOpen(false); }}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    {q.label}
                    <span className="text-[10px] opacity-70">{q.hint}</span>
                  </Button>
                );
              })}
              {safeDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { onDateChange(undefined); setOpen(false); }}
                  className="h-7 px-2 text-xs ml-auto text-muted-foreground hover:text-destructive"
                >
                  Clear
                </Button>
              )}
            </div>
            <Calendar
              mode="single"
              selected={safeDate}
              onSelect={(d) => { onDateChange(d); if (d) setOpen(false); }}
              disabled={normalizedMinDate ? (d) => d < normalizedMinDate : undefined}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {!hideTime && (
          <div className="relative w-[120px] shrink-0">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              value={time ?? ""}
              onChange={(e) => onTimeChange?.(e.target.value)}
              disabled={disabled}
              className="pl-9 h-10"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Resolve the active timezone. Reads the org-level timezone saved by Lovable Cloud
 * (`localStorage.org_timezone`, written by useOrganizationSettings); falls back to
 * Africa/Addis_Ababa (the default for this fleet). This keeps date/time inputs
 * stable regardless of the browser's locale (e.g. a Lovable preview running in UTC).
 */
export function getActiveTimezone(): string {
  if (typeof window !== "undefined") {
    const fromStorage = window.localStorage?.getItem("org_timezone");
    if (fromStorage) return fromStorage;
  }
  return "Africa/Addis_Ababa";
}

/**
 * Compute the UTC offset (in minutes) of a given timezone at a given UTC instant.
 * Positive = ahead of UTC (e.g. EAT = +180).
 */
function tzOffsetMinutes(tz: string, atUtcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(atUtcMs));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - atUtcMs) / 60000);
}

/** Combine a Date + "HH:mm" string into an ISO string, interpreted in the org's timezone. */
export function combineDateAndTime(date?: Date, time?: string): string | undefined {
  if (!date) return undefined;
  const [h, m] = (time || "00:00").split(":").map(Number);
  const tz = getActiveTimezone();
  const y = date.getFullYear();
  const mo = date.getMonth();
  const day = date.getDate();
  const naiveUtcMs = Date.UTC(y, mo, day, h, m, 0, 0);
  const offsetMin = tzOffsetMinutes(tz, naiveUtcMs);
  return new Date(naiveUtcMs - offsetMin * 60_000).toISOString();
}

/** Parse an ISO string into { date, time } expressed in the org's timezone. */
export function splitDateTime(iso?: string | null): { date: Date | undefined; time: string } {
  if (!iso) return { date: undefined, time: "09:00" };
  const tz = getActiveTimezone();
  const d = new Date(iso);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || "00";
  const localDate = new Date(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  return { date: localDate, time: `${get("hour")}:${get("minute")}` };
}
