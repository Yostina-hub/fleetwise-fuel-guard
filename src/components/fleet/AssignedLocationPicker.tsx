import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, MapPin, Check } from "lucide-react";
import { ASSIGNED_LOCATIONS } from "./formConstants";
import { cn } from "@/lib/utils";

interface AssignedLocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const GROUP_ORDER = ["Corporate", "Zone", "Region"] as const;

/**
 * Reusable searchable + grouped + collapsible picker for vehicle/driver
 * assigned location. Groups (Corporate / Zone / Region) collapse independently
 * and show counts. Filters live on every keystroke.
 */
export function AssignedLocationPicker({
  value,
  onChange,
  placeholder = "Select location...",
  className,
}: AssignedLocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Corporate: false,
    Zone: false,
    Region: false,
  });

  const selected = useMemo(
    () => ASSIGNED_LOCATIONS.find((l) => l.value === value),
    [value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ASSIGNED_LOCATIONS;
    return ASSIGNED_LOCATIONS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.group.toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: filtered.filter((l) => l.group === group),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const toggleGroup = (g: string) =>
    setCollapsed((prev) => ({ ...prev, [g]: !prev[g] }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selected ? (
              <>
                <span className="truncate">{selected.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  · {selected.group}
                </span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          {grouped.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No locations found
            </div>
          )}
          {grouped.map(({ group, items }) => {
            const isCollapsed = collapsed[group];
            return (
              <div key={group}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors sticky top-0 bg-popover border-b border-border"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {group}
                  <span className="ml-auto text-[10px] font-normal">
                    {items.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="py-1">
                    {items.map((l) => {
                      const isActive = l.value === value;
                      return (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => {
                            onChange(l.value);
                            setOpen(false);
                            setSearch("");
                          }}
                          className={cn(
                            "w-full text-left px-6 py-1.5 text-sm transition-colors hover:bg-muted flex items-center justify-between gap-2",
                            isActive && "bg-muted font-medium",
                          )}
                        >
                          <span className="truncate">{l.label}</span>
                          {isActive && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AssignedLocationPicker;
