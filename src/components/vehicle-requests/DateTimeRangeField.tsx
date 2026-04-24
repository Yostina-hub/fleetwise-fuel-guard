import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ArrowRight, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

/**
 * Single combined trigger for Date + Start Time + End Time.
 * Shows a unified summary like: "Thu, Apr 24 · 04:00 PM → 06:00 PM"
 * Opens a popover with calendar (left) and the two time pickers (right).
 */
interface Props {
  date: Date | undefined;
  startTime: string;
  endTime: string;
  onDateChange: (d: Date | undefined) => void;
  onStartTimeChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  onBlurDate?: () => void;
  onBlurStart?: () => void;
  onBlurEnd?: () => void;
  errorDate?: boolean;
  errorStart?: boolean;
  errorEnd?: boolean;
  minDate?: Date;
  /** Optional whitelist of time-of-day ranges (minutes) the pickers may select. */
  allowedTimeRanges?: Array<[number, number]>;
  className?: string;
}

function fmt12(t: string) {
  if (!t) return "--:--";
  const [hStr, m] = t.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12.toString().padStart(2, "0")}:${m} ${period}`;
}

export const DateTimeRangeField: React.FC<Props> = ({
  date, startTime, endTime,
  onDateChange, onStartTimeChange, onEndTimeChange,
  onBlurDate, onBlurStart, onBlurEnd,
  errorDate, errorStart, errorEnd, minDate, allowedTimeRanges, className,
}) => {
  const [open, setOpen] = React.useState(false);
  const hasError = errorDate || errorStart || errorEnd;

  const summary = React.useMemo(() => {
    const datePart = date ? format(date, "EEE, MMM d") : "Pick date";
    const startPart = startTime ? fmt12(startTime) : "Start";
    const endPart = endTime ? fmt12(endTime) : "End";
    return { datePart, startPart, endPart };
  }, [date, startTime, endTime]);

  return (
    <div className={className}>
      <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5">
        <CalendarIcon className="w-3.5 h-3.5" /> Date &amp; Time <span className="text-destructive">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-invalid={hasError}
            className={cn(
              "w-full min-h-10 rounded-md border bg-background px-3 py-2 text-sm",
              "flex items-center gap-2 text-left transition-colors",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
              hasError ? "border-destructive" : "border-input",
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className={cn("font-medium", !date && "text-muted-foreground font-normal")}>
              {summary.datePart}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className={cn(!startTime && "text-muted-foreground")}>
              {summary.startPart}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className={cn(!endTime && "text-muted-foreground")}>
              {summary.endPart}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col md:flex-row">
            <div className="border-b md:border-b-0 md:border-r border-border">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { onDateChange(d ?? undefined); onBlurDate?.(); }}
                disabled={minDate ? { before: minDate } : undefined}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <div className="p-3 space-y-3 min-w-[220px]">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Start Time
                </Label>
                <TimePicker
                  value={startTime}
                  onChange={onStartTimeChange}
                  onBlur={onBlurStart}
                  ariaInvalid={!!errorStart}
                  allowedRanges={allowedTimeRanges}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                  End Time
                </Label>
                <TimePicker
                  value={endTime}
                  onChange={onEndTimeChange}
                  onBlur={onBlurEnd}
                  ariaInvalid={!!errorEnd}
                  allowedRanges={allowedTimeRanges}
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
