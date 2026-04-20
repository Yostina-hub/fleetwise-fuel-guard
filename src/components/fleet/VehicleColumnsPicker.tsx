import { useMemo, useState } from "react";
import { Check, Columns3, RotateCcw, Search, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  VEHICLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  type VehicleColumnDef,
  type VehicleColumnGroup,
  type VehicleColumnId,
} from "./vehicleTableColumns";

interface VehicleColumnsPickerProps {
  visibleColumns: VehicleColumnId[];
  onChange: (cols: VehicleColumnId[]) => void;
  className?: string;
}

const GROUP_ORDER: VehicleColumnGroup[] = [
  "Identity",
  "Live",
  "Operations",
  "Classification",
  "Specs",
  "Financial",
  "Rental",
  "Compliance",
  "Safety",
  "Hardware",
  "System",
];

export const VehicleColumnsPicker = ({
  visibleColumns,
  onChange,
  className,
}: VehicleColumnsPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const totalToggleable = VEHICLE_COLUMNS.filter((c) => !c.required).length;
  const visibleToggleable = VEHICLE_COLUMNS.filter(
    (c) => !c.required && visibleSet.has(c.id),
  ).length;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<VehicleColumnGroup, VehicleColumnDef[]>();
    VEHICLE_COLUMNS.forEach((col) => {
      if (col.id === "actions") return; // never expose Actions in the picker
      if (q && !col.label.toLowerCase().includes(q) && !col.group.toLowerCase().includes(q)) return;
      const list = map.get(col.group) ?? [];
      list.push(col);
      map.set(col.group, list);
    });
    return GROUP_ORDER
      .filter((g) => map.has(g))
      .map((g) => ({ group: g, columns: map.get(g) ?? [] }));
  }, [query]);

  const toggle = (id: VehicleColumnId) => {
    const next = new Set(visibleSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Re-order according to canonical column order so the table stays consistent.
    onChange(VEHICLE_COLUMNS.map((c) => c.id).filter((cid) => next.has(cid)));
  };

  const setAll = (value: boolean) => {
    if (value) {
      onChange(VEHICLE_COLUMNS.map((c) => c.id));
    } else {
      onChange(VEHICLE_COLUMNS.filter((c) => c.required).map((c) => c.id));
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
        className="w-[360px] p-0 overflow-hidden border-cyan-500/20"
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-cyan-500/20"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold leading-tight">Table columns</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle which fields appear in the fleet table
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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
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
        <ScrollArea className="h-[360px]">
          <div className="p-2">
            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No columns match “{query}”
              </p>
            )}

            {grouped.map(({ group, columns }, idx) => (
              <div key={group} className="mb-2">
                {idx > 0 && <Separator className="my-2" />}
                <div className="px-2 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                    {columns.filter((c) => visibleSet.has(c.id)).length}/{columns.length}
                  </span>
                </div>
                <div className="grid gap-0.5">
                  {columns.map((col) => {
                    const isOn = visibleSet.has(col.id);
                    const isRequired = !!col.required;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        disabled={isRequired}
                        onClick={() => toggle(col.id)}
                        className={cn(
                          "group flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-xs",
                          "transition-colors",
                          isOn
                            ? "bg-primary/10 text-foreground hover:bg-primary/15"
                            : "text-muted-foreground hover:bg-muted",
                          isRequired && "opacity-60 cursor-not-allowed hover:bg-transparent",
                        )}
                        aria-pressed={isOn}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border transition-all",
                            isOn
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-transparent",
                          )}
                        >
                          {isOn && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 truncate">{col.label}</span>
                        {isRequired && (
                          <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                            required
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default VehicleColumnsPicker;
