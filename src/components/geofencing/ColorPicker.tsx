import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  { value: "#3B82F6", name: "Blue" },
  { value: "#10B981", name: "Green" },
  { value: "#F59E0B", name: "Amber" },
  { value: "#EF4444", name: "Red" },
  { value: "#8B5CF6", name: "Purple" },
  { value: "#EC4899", name: "Pink" },
  { value: "#06B6D4", name: "Cyan" },
  { value: "#84CC16", name: "Lime" },
];

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  return (
    <div className="space-y-2">
      <Label>Fence Color</Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              value === color.value ? "border-foreground scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: color.value }}
            aria-label={`Select ${color.name} color`}
            aria-pressed={value === color.value}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Choose a color to display this geofence on the map
      </p>
    </div>
  );
};

export default ColorPicker;
