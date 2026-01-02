import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const presets = [
  { label: "Today", getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: "Last 7 days", getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "This month", getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: "Last month", getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
];

const DateRangeFilter = ({ dateRange, onDateRangeChange }: DateRangeFilterProps) => {
  const [open, setOpen] = useState(false);

  const handlePresetClick = (getValue: () => DateRange) => {
    onDateRangeChange(getValue());
    setOpen(false);
  };

  const formatRange = () => {
    const startStr = format(dateRange.start, "MMM d");
    const endStr = format(dateRange.end, "MMM d, yyyy");
    return `${startStr} - ${endStr}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 min-w-[200px] justify-start"
          aria-label={`Date range: ${formatRange()}`}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <CalendarDays className="w-4 h-4" />
          <span className="truncate">{formatRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePresetClick(preset.getValue)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.start,
                to: dateRange.end,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  onDateRangeChange({
                    start: range.from,
                    end: range.to || range.from,
                  });
                }
              }}
              numberOfMonths={2}
              className="rounded-md"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeFilter;
