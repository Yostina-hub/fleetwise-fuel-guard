import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, GripVertical } from "lucide-react";
import { PALETTE_ITEMS, CATEGORY_LABELS, type NodeCategory, type PaletteItem } from "./types";

interface WorkflowPaletteProps {
  onDragStart: (event: React.DragEvent, item: PaletteItem) => void;
}

export const WorkflowPalette = ({ onDragStart }: WorkflowPaletteProps) => {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(["triggers", "conditions", "fleet", "notifications", "data", "timing"])
  );

  const filteredItems = search
    ? PALETTE_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      )
    : PALETTE_ITEMS;

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<NodeCategory, PaletteItem[]>
  );

  const toggleCategory = (cat: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground mb-2">Node Palette</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Categories */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {Object.entries(groupedItems).map(([category, items]) => {
            const cat = category as NodeCategory;
            const catInfo = CATEGORY_LABELS[cat];
            const isExpanded = expandedCategories.has(cat);

            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs font-semibold hover:bg-accent transition-colors"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: catInfo.color }}
                  />
                  <span className="text-foreground">{catInfo.label}</span>
                  <span className="ml-auto text-muted-foreground text-[10px]">
                    {items.length}
                  </span>
                  <span className={cn("transition-transform text-muted-foreground", isExpanded && "rotate-90")}>
                    ›
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-0.5 ml-2 mt-0.5">
                    {items.map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        className="group flex items-center gap-2 px-2 py-2 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                        <span className="text-base leading-none">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
