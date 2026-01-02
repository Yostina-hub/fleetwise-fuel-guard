import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";

interface ScheduleConfigProps {
  scheduleEnabled: boolean;
  activeDays: number[];
  activeStartTime: string;
  activeEndTime: string;
  onScheduleEnabledChange: (enabled: boolean) => void;
  onActiveDaysChange: (days: number[]) => void;
  onActiveStartTimeChange: (time: string) => void;
  onActiveEndTimeChange: (time: string) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const ScheduleConfigSection = ({
  scheduleEnabled,
  activeDays,
  activeStartTime,
  activeEndTime,
  onScheduleEnabledChange,
  onActiveDaysChange,
  onActiveStartTimeChange,
  onActiveEndTimeChange,
}: ScheduleConfigProps) => {
  const handleDayToggle = (day: number) => {
    if (activeDays.includes(day)) {
      onActiveDaysChange(activeDays.filter((d) => d !== day));
    } else {
      onActiveDaysChange([...activeDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="schedule_enabled" className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Schedule-Based Monitoring
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Only trigger alerts during specified hours and days
          </p>
        </div>
        <Switch
          id="schedule_enabled"
          checked={scheduleEnabled}
          onCheckedChange={onScheduleEnabledChange}
        />
      </div>

      {scheduleEnabled && (
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {/* Active Days */}
          <div>
            <Label className="mb-2 block">Active Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={activeDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                    aria-label={`Toggle ${day.label}`}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Active Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={activeStartTime}
                onChange={(e) => onActiveStartTimeChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={activeEndTime}
                onChange={(e) => onActiveEndTimeChange(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Alerts will only trigger between {activeStartTime || "00:00"} and{" "}
            {activeEndTime || "23:59"} on selected days
          </p>
        </div>
      )}
    </div>
  );
};

export default ScheduleConfigSection;
