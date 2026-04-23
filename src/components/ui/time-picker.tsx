/**
 * TimePicker — friendly 12h time selector (AM/PM) with 24h value contract.
 *
 * Why 12h UI: Ethiopian fleet operators read time on a 12-hour clock
 * ("8:00 night" = 20:00). The picker shows hours 1–12 + AM/PM, while the
 * stored value remains "HH:MM" in 24-hour format so downstream logic
 * (Day/Night auto-classification, validation, DB writes) is unchanged.
 *
 * UX:
 *  - Trigger button shows formatted time (e.g. "08:30 PM") + clock icon.
 *  - Popover with three columns: Hours (01–12), Minutes (step), AM/PM.
 *  - "Use current time" reads Africa/Addis_Ababa (EAT) live time.
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
  value: string; // "HH:MM" 24h
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

/** 24h "HH:MM" → { h12: "01".."12", m: "MM", period: "AM"|"PM" } */
const to12h = (value: string) => {
  if (!value) return { h12: "", m: "", period: "AM" as "AM" | "PM" };
  const [hStr = "", mStr = ""] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const hasH = Number.isFinite(h);
  const hasM = Number.isFinite(m);
  const period: "AM" | "PM" = hasH ? (h >= 12 ? "PM" : "AM") : "AM";
  let h12 = "";
  if (hasH) {
    const v = h % 12 === 0 ? 12 : h % 12;
    h12 = pad(v);
  }
  return { h12, m: hasM ? pad(m) : "", period };
};

/** "01".."12" + AM/PM → 24h "HH" string */
const h12To24 = (h12: string, period: "AM" | "PM") => {
  const n = parseInt(h12, 10);
  if (!Number.isFinite(n)) return "";
  const base = n % 12; // 12 → 0
  const h = period === "PM" ? base + 12 : base;
  return pad(h);
};

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
  const eatNow24 = React.useCallback(() => {
    const dtf = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return dtf.format(new Date()); // "HH:MM"
  }, []);
  const eatNow12Display = React.useCallback(() => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return dtf.format(new Date()); // e.g. "08:30 PM"
  }, []);

  const [now12, setNow12] = React.useState<string>(eatNow12Display);
  React.useEffect(() => {
    const id = setInterval(() => setNow12(eatNow12Display()), 30_000);
    return () => clearInterval(id);
  }, [eatNow12Display]);

  const currentEatPeriod = React.useCallback((): "AM" | "PM" => {
    const [hour] = eatNow24().split(":").map(Number);
    return Number.isFinite(hour) && hour >= 12 ? "PM" : "AM";
  }, [eatNow24]);

  const setNowTime = () => {
    const [h, mRaw] = eatNow24().split(":").map(Number);
    let m = mRaw;
    if (minuteStep > 1) {
      m = Math.round(mRaw / minuteStep) * minuteStep;
      if (m === 60) m = 0;
    }
    onChange(`${pad(h)}:${pad(m)}`);
  };

  const { h12, m: mm, period } = React.useMemo(() => to12h(value), [value]);

  const hours12 = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => pad(i + 1)),
    [],
  );
  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep)),
    [minuteStep],
  );

  // Local fallback for period when no hour is selected yet.
  const [localPeriod, setLocalPeriod] = React.useState<"AM" | "PM">(() => currentEatPeriod());
  const effectivePeriod: "AM" | "PM" = h12 ? period : localPeriod;

  React.useEffect(() => {
    if (open && !value) {
      setLocalPeriod(currentEatPeriod());
    }
  }, [open, value, currentEatPeriod]);

  // Both hour and minute must be explicitly chosen — never silently default
  // the missing component, which would let users submit a half-picked time
  // that bypasses "End time required" validation.
  const setHour = (h: string) => {
    const h24 = h12To24(h, effectivePeriod);
    onChange(mm ? `${h24}:${mm}` : `${h24}:`);
  };
  const setMinute = (m: string) => {
    if (h12) {
      const h24 = h12To24(h12, period);
      onChange(`${h24}:${m}`);
    } else {
      onChange(`:${m}`);
    }
  };
  const setPeriod = (p: "AM" | "PM") => {
    if (!h12) {
      // No hour yet — just remember the period by writing a placeholder we
      // can read back. Keep value empty until user picks an hour.
      setLocalPeriod(p);
      return;
    }
    const h24 = h12To24(h12, p);
    onChange(mm ? `${h24}:${mm}` : `${h24}:`);
  };

  // Trigger display: "HH:MM AM" 12h, or partial markers if half-picked.
  const display = React.useMemo(() => {
    if (h12 && mm) return `${h12}:${mm} ${period}`;
    if (h12 || mm) return `${h12 || "--"}:${mm || "--"} ${effectivePeriod}`;
    return "";
  }, [h12, mm, period, effectivePeriod]);

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
            now {now12} EAT
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5 bg-muted/30">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Now <span className="font-mono text-foreground tabular-nums">{now12}</span> <span className="text-muted-foreground/80">EAT</span>
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
              Hour
            </div>
            <ScrollArea className="h-56 w-16">
              <div className="p-1">
                {hours12.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-sm font-mono text-center transition-colors",
                      h === h12
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
          <div className="border-r">
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
          <div>
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center bg-muted/40">
              AM/PM
            </div>
            <div className="h-56 w-16 p-1 flex flex-col gap-1">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "w-full rounded px-2 py-2 text-sm font-mono text-center transition-colors",
                    p === effectivePeriod
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-accent",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-2 py-1.5 bg-muted/20">
          <button
            type="button"
            onClick={() => { onChange(""); setLocalPeriod("AM"); }}
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
