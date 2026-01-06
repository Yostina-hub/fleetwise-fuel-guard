import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export type TimePeriodOption = 
  | "today"
  | "last_24_hours"
  | "yesterday"
  | "last_7_days"
  | "last_14_days"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

interface ReportTimePeriodSelectProps {
  value: TimePeriodOption;
  onChange: (period: TimePeriodOption) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const TIME_PERIOD_OPTIONS: { value: TimePeriodOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_24_hours", label: "Last 24 Hours" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_14_days", label: "Last 14 Days" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Date" },
];

export const getDateRangeFromPeriod = (period: TimePeriodOption): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case "today":
      return { from: today, to: now };
    case "last_24_hours":
      return { from: subDays(now, 1), to: now };
    case "yesterday":
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59) };
    case "last_7_days":
      return { from: subDays(today, 7), to: now };
    case "last_14_days":
      return { from: subDays(today, 14), to: now };
    case "this_week":
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    case "last_week":
      const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
      return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last_month":
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "custom":
    default:
      return { from: subDays(today, 7), to: now };
  }
};

export const ReportTimePeriodSelect = ({
  value,
  onChange,
  dateRange,
  onDateRangeChange,
  className,
}: ReportTimePeriodSelectProps) => {
  const [customDateOpen, setCustomDateOpen] = useState(false);

  const handlePeriodChange = (newPeriod: TimePeriodOption) => {
    onChange(newPeriod);
    if (newPeriod !== "custom") {
      onDateRangeChange(getDateRangeFromPeriod(newPeriod));
    }
  };

  const getDisplayLabel = () => {
    if (value === "custom" && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
    }
    return TIME_PERIOD_OPTIONS.find(opt => opt.value === value)?.label || "Select Period";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-primary">Report Time Period</Label>
      <div className="flex flex-col gap-2">
        <Select value={value} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-full bg-background/50 border-border/50">
            <SelectValue placeholder="Select One">
              {getDisplayLabel()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TIME_PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {value === "custom" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal flex-1",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "PPP") : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && onDateRangeChange({ ...dateRange, from: date })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal flex-1",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "PPP") : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && onDateRangeChange({ ...dateRange, to: date })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};
