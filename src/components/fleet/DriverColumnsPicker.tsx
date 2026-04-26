// Modern column visibility picker for the Drivers table.
// Mirrors the VehicleColumnsPicker UX with grouped, searchable toggles.
import { useMemo, useState } from "react";
import { Check, Columns3, RotateCcw, Search, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DRIVER_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  type DriverColumnDef,
  type DriverColumnGroup,
  type DriverColumnId,
} from "./driverTableColumns";

interface DriverColumnsPickerProps {
  visibleColumns: DriverColumnId[];
  onChange: (cols: DriverColumnId[]) => void;
  className?: string;
}

const GROUP_ORDER: DriverColumnGroup[] = [
  "Identity",
  "Contact",
  "License",
  "Employment",
  "Performance",
  "Address",
  "Compliance",
  "Banking",
  "Hardware",
  "Emergency",
  "Medical",
  "System",
];

export const DriverColumnsPicker = ({
  visibleColumns,
  onChange,
  className,
}: DriverColumnsPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const totalToggleable = DRIVER_COLUMNS.filter((c) => !c.required).length;
  const visibleToggleable = DRIVER_COLUMNS.filter(
    (c) => !c.required && visibleSet.has(c.id),
  ).length;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<DriverColumnGroup, DriverColumnDef[]>();
    DRIVER_COLUMNS.forEach((col) => {
      if (col.id === "actions" || col.id === "select") return;
      if (q && !col.label.toLowerCase().includes(q) && !col.group.toLowerCase().includes(q)) return;
      const list = map.get(col.group) ?? [];
      list.push(col);
      map.set(col.group, list);
    });
    return GROUP_ORDER
      .filter((g) => map.has(g))
      .map((g) => ({ group: g, columns: map.get(g) ?? [] }));
  }, [query]);

  const toggle = (id: DriverColumnId) => {
    const next = new Set(visibleSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(DRIVER_COLUMNS.map((c) => c.id).filter((cid) => next.has(cid)));
  };

  const setAll = (value: boolean) => {
    if (value) {
      onChange(DRIVER_COLUMNS.map((c) => c.id));
    } else {
      onChange(DRIVER_COLUMNS.filter((c) => c.required).map((c) => c.id));
    }
  };

  const resetDefaults = () => onChange(DEFAULT_VISIBLE_COLUMNS);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 gap-2", className)}
          aria-label="Configure visible columns"
        >
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-mono">
            {visibleToggleable}/{totalToggleable}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 overflow-hidden border-primary/20"
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-primary/20"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold leading-tight">Driver columns</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle which fields appear in the driver list
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={resetDefaults}
              aria-label="Reset to default columns"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>

          <div className="relative mt-3">
            <label htmlFor="driver-columns-search" className="sr-only">
              Search columns
            </label>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <Input
              id="driver-columns-search"
              aria-label="Search columns"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns…"
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 flex-1"
              onClick={() => setAll(true)}
            >
              <Eye className="h-3 w-3" />
              Show all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 flex-1"
              onClick={() => setAll(false)}
            >
              <EyeOff className="h-3 w-3" />
              Hide all
            </Button>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No columns match “{query}”
              </p>
            )}

            {grouped.map(({ group, columns }, idx) => {
              const onCount = columns.filter((c) => visibleSet.has(c.id)).length;
              return (
                <div key={group} className="mb-2">
                  {idx > 0 && <Separator className="my-2" />}
                  <div className="px-2 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      {group}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 px-1.5 text-[9px] font-mono",
                        onCount > 0 && "border-primary/40 text-primary",
                      )}
                    >
                      {onCount}/{columns.length}
                    </Badge>
                  </div>
                  <div className="grid gap-0.5">
                    {columns.map((col) => {
                      const isOn = visibleSet.has(col.id);
                      const isRequired = !!col.required;
                      return (
                        <label
                          key={col.id}
                          className={cn(
                            "group flex items-center gap-3 w-full px-2 py-2 rounded-md text-left text-xs cursor-pointer",
                            "transition-all border border-transparent",
                            isOn
                              ? "bg-primary/[0.07] hover:bg-primary/10 border-primary/15"
                              : "hover:bg-muted/60",
                            isRequired && "opacity-60 cursor-not-allowed",
                          )}
                        >
                          <Switch
                            checked={isOn}
                            disabled={isRequired}
                            onCheckedChange={() => !isRequired && toggle(col.id)}
                            aria-label={`Toggle ${col.label}`}
                            className="data-[state=checked]:bg-primary"
                          />
                          <span
                            className={cn(
                              "flex-1 truncate font-medium",
                              isOn ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {col.label}
                          </span>
                          {isRequired ? (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                              required
                            </Badge>
                          ) : isOn ? (
                            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{visibleToggleable}</span> of {totalToggleable} optional columns visible
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DriverColumnsPicker;
