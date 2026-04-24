import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Unified Start Date → End Date field for multi-day operation types
 * (Project / Field / Nighttime / Group / Messenger). Mirrors the
 * DateTimeRangeField pattern used for Daily ops so the form has a
 * single, consistent control for any date span.
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
}

export const DateRangeField: React.FC<Props> = ({
  startDate, endDate,
  onStartDateChange, onEndDateChange,
  onBlurStart, onBlurEnd,
  errorStart, errorEnd, minStart, endRequired, label = "Start → End Date",
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const hasError = errorStart || errorEnd;

  const startPart = startDate ? format(startDate, "EEE, MMM d, yyyy") : "Pick start";
  const endPart = endDate ? format(endDate, "EEE, MMM d, yyyy") : "Pick end";

  const minEnd = startDate || minStart;

  return (
    <div className={className}>
      <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5">
        <CalendarIcon className="w-3.5 h-3.5" /> {label} <span className="text-destructive">*</span>
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
            <span className={cn("font-medium truncate", !startDate && "text-muted-foreground font-normal")}>
              {startPart}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className={cn("truncate", !endDate && "text-muted-foreground")}>
              {endPart}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col md:flex-row">
            <div className="border-b md:border-b-0 md:border-r border-border p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                Start Date
              </p>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  onStartDateChange(d ?? undefined);
                  onBlurStart?.();
                  // If end < new start, clear end so the user re-picks
                  if (d && endDate && endDate < d) {
                    onEndDateChange(undefined);
                  }
                }}
                disabled={minStart ? { before: minStart } : undefined}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <div className="p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                End Date {endRequired && <span className="text-destructive">*</span>}
              </p>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => { onEndDateChange(d ?? undefined); onBlurEnd?.(); }}
                disabled={minEnd ? { before: minEnd } : undefined}
                className={cn("p-3 pointer-events-auto")}
              />
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
