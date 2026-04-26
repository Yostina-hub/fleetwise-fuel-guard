import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ArrowRight, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

/**
 * Unified Start Date → End Date field for multi-day operation types
 * (Project / Field / Nighttime / Group / Messenger).
 *
 * When `withTimes` is true the field also captures a Start Time and End Time
 * (HH:MM strings) so the parent form can persist a precise `needed_from` /
 * `needed_until` instead of midnight. Times render in a popover next to the
 * calendar, mirroring `DateTimeRangeField` for the daily-operation flow.
 */
interface Props {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (d: Date | undefined) => void;
  onEndDateChange: (d: Date | undefined) => void;
  onBlurStart?: () => void;
  onBlurEnd?: () => void;
  errorStart?: boolean;
  errorEnd?: boolean;
  minStart?: Date;
  endRequired?: boolean;
  label?: string;
  className?: string;
  // Optional time inputs
  withTimes?: boolean;
  startTime?: string;
  endTime?: string;
  onStartTimeChange?: (v: string) => void;
  onEndTimeChange?: (v: string) => void;
  onBlurStartTime?: () => void;
  onBlurEndTime?: () => void;
  errorStartTime?: boolean;
  errorEndTime?: boolean;
}

function fmt12(t?: string) {
  if (!t) return "--:--";
  const [hStr, m] = t.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12.toString().padStart(2, "0")}:${m} ${period}`;
}

export const DateRangeField: React.FC<Props> = ({
  startDate, endDate,
  onStartDateChange, onEndDateChange,
  onBlurStart, onBlurEnd,
  errorStart, errorEnd, minStart, endRequired, label = "Start → End Date",
  className,
  withTimes,
  startTime, endTime,
  onStartTimeChange, onEndTimeChange,
  onBlurStartTime, onBlurEndTime,
  errorStartTime, errorEndTime,
}) => {
  const [open, setOpen] = React.useState(false);
  const hasError = errorStart || errorEnd || errorStartTime || errorEndTime;

  const startPart = startDate ? format(startDate, "EEE, MMM d, yyyy") : "Pick start";
  const endPart = endDate ? format(endDate, "EEE, MMM d, yyyy") : "Pick end";

  const minEnd = startDate || minStart;

  const finalLabel = withTimes && label === "Start → End Date" ? "Start → End (Date & Time)" : label;

  return (
    <div className={className}>
      <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5">
        <CalendarIcon className="w-3.5 h-3.5" /> {finalLabel} <span className="text-destructive">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-invalid={hasError}
            className={cn(
              "w-full min-h-10 rounded-md border bg-background px-3 py-2 text-sm",
              "flex items-center gap-2 text-left transition-colors flex-wrap",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
              hasError ? "border-destructive" : "border-input",
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className={cn("font-medium truncate", !startDate && "text-muted-foreground font-normal")}>
              {startPart}
            </span>
            {withTimes && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className={cn("text-xs", !startTime && "text-muted-foreground")}>{fmt12(startTime)}</span>
              </>
            )}
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className={cn("truncate", !endDate && "text-muted-foreground")}>
              {endPart}
            </span>
            {withTimes && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className={cn("text-xs", !endTime && "text-muted-foreground")}>{fmt12(endTime)}</span>
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col md:flex-row">
            <div className="border-b md:border-b-0 md:border-r border-border p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                Start Date {withTimes && "& Time"}
              </p>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  onStartDateChange(d ?? undefined);
                  onBlurStart?.();
                  if (d && endDate && endDate < d) {
                    onEndDateChange(undefined);
                  }
                }}
                disabled={minStart ? { before: minStart } : undefined}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              {withTimes && onStartTimeChange && (
                <div className="px-2 pb-2">
                  <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Start Time <span className="text-destructive">*</span>
                  </Label>
                  <TimePicker
                    value={startTime || ""}
                    onChange={onStartTimeChange}
                    onBlur={onBlurStartTime}
                    ariaInvalid={!!errorStartTime}
                  />
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                End Date {withTimes && "& Time"} {endRequired && <span className="text-destructive">*</span>}
              </p>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => { onEndDateChange(d ?? undefined); onBlurEnd?.(); }}
                disabled={minEnd ? { before: minEnd } : undefined}
                className={cn("p-3 pointer-events-auto")}
              />
              {withTimes && onEndTimeChange && (
                <div className="px-2 pb-2">
                  <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    End Time {endRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <TimePicker
                    value={endTime || ""}
                    onChange={onEndTimeChange}
                    onBlur={onBlurEndTime}
                    ariaInvalid={!!errorEndTime}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
