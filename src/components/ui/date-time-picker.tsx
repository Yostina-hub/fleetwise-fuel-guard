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

/**
 * Resolve the active timezone. Reads the org-level timezone saved by Lovable Cloud
 * (`localStorage.org_timezone`, written by useOrganizationSettings); falls back to
 * Africa/Addis_Ababa (the default for this fleet). This keeps date/time inputs
 * stable regardless of the browser's locale (e.g. a Lovable preview running in UTC).
 */
function getActiveTimezone(): string {
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
  // Use the calendar Y-M-D the user picked (in their browser) — DatePicker stores
  // these as "midnight local" Dates so Y/M/D match what they saw on screen.
  const y = date.getFullYear();
  const mo = date.getMonth();
  const day = date.getDate();
  // Pretend the picked wall time is UTC, then shift by the org-tz offset at that instant.
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
  // Build a Date whose local Y/M/D matches the org-tz wall date (for the picker).
  const localDate = new Date(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  return { date: localDate, time: `${get("hour")}:${get("minute")}` };
}
