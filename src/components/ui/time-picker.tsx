/**
 * TimePicker — friendly 24h time selector.
 *
 * Replaces the native <input type="time"> which renders inconsistently
 * across browsers (tiny icon, low contrast on dark themes, hidden minutes).
 *
 * UX:
 *  - Trigger button shows the time large + clock icon, themed.
 *  - Popover with two scrollable lists (Hours 00–23, Minutes 00–55 in 5-min steps).
 *  - Falls back to free typing via the trigger's keyboard input is NOT supported;
 *    if a user needs an exact minute, they can pick the nearest 5 then type.
 *
 * Value contract: "HH:MM" string (24h). Empty string = unset.
 */
import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaInvalid?: boolean;
  /** Minute granularity (default 5). Use 1 for exact minute. */
  minuteStep?: number;
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function TimePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Select time",
  disabled,
  className,
  ariaInvalid,
  minuteStep = 5,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Live current time in Africa/Addis_Ababa (EAT, UTC+3) — fleet operates on
  // Ethiopian local time so the hint and the "Use current time" shortcut
  // always reflect EAT regardless of the user's device timezone.
  const eatNow = React.useCallback(() => {
    const dtf = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return dtf.format(new Date()); // "HH:MM"
  }, []);
  const [now, setNow] = React.useState<string>(eatNow);
  React.useEffect(() => {
    const id = setInterval(() => setNow(eatNow()), 30_000);
    return () => clearInterval(id);
  }, [eatNow]);

  const setNowTime = () => {
    const [h, mRaw] = eatNow().split(":").map(Number);
    let m = mRaw;
    if (minuteStep > 1) {
      // round to nearest step so the selected value matches a list entry
      m = Math.round(mRaw / minuteStep) * minuteStep;
      if (m === 60) m = 0;
    }
    onChange(`${pad(h)}:${pad(m)}`);
  };

  // Parse partials too: "14:" (hour only) or ":30" (minute only) so users
  // can see which half they still need to pick.
  const [hh, mm] = React.useMemo(() => {
    if (!value) return ["", ""] as const;
    const [h = "", m = ""] = value.split(":");
    const hNum = h ? parseInt(h, 10) : NaN;
    const mNum = m ? parseInt(m, 10) : NaN;
    return [
      Number.isFinite(hNum) ? pad(hNum) : "",
      Number.isFinite(mNum) ? pad(mNum) : "",
    ] as const;
  }, [value]);

  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep)),
    [minuteStep],
  );

  // Both hour and minute must be explicitly chosen — never silently default
  // the missing component to "00", which would let users submit a half-picked
  // time that looks complete (e.g. picking "14" → "14:00") and bypass the
  // "End time required" validation.
  const setHour = (h: string) => onChange(mm ? `${h}:${mm}` : `${h}:`);
  const setMinute = (m: string) => onChange(hh ? `${hh}:${m}` : `:${m}`);

  const display = hh && mm ? `${hh}:${mm}` : (hh || mm) ? `${hh || "--"}:${mm || "--"}` : "";

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) onBlur?.(); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-10 w-full justify-start gap-2 font-mono text-base tracking-wider",
            !display && "text-muted-foreground font-sans text-sm",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 text-left">{display || placeholder}</span>
          <span className="ml-auto text-[10px] font-sans font-normal text-muted-foreground tabular-nums">
            now {now} EAT
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5 bg-muted/30">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Now <span className="font-mono text-foreground tabular-nums">{now}</span> <span className="text-muted-foreground/80">EAT</span>
          </span>
          <button
            type="button"
            onClick={setNowTime}
            className="text-xs font-medium text-primary hover:underline px-2 py-0.5"
          >
            Use current time
          </button>
        </div>
        <div className="flex">
          <div className="border-r">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center bg-muted/40">
              Hour (24h)
            </div>
            <ScrollArea className="h-56 w-16">
              <div className="p-1">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-sm font-mono text-center transition-colors",
                      h === hh
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent",
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div>
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center bg-muted/40">
              Min
            </div>
            <ScrollArea className="h-56 w-16">
              <div className="p-1">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-sm font-mono text-center transition-colors",
                      m === mm
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-2 py-1.5 bg-muted/20">
          <button
            type="button"
            onClick={() => { onChange(""); }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline px-2 py-1"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
