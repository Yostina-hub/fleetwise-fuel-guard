/**
 * FormsPalette — left-hand sidebar of draggable field types for the editor.
 */
import { useDraggable } from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PALETTE, type PaletteEntry } from "@/lib/forms/fieldCatalog";
import { cn } from "@/lib/utils";

export function FormsPalette({ onAdd }: { onAdd: (type: PaletteEntry["type"]) => void }) {
  const groups = ["Standard", "Entity", "Structural", "Logic"] as const;
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Field library
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Drag onto the canvas, or click to append to the end.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g} className="space-y-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {g}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE.filter((p) => p.group === g).map((entry) => (
                <PaletteItem key={entry.type} entry={entry} onClick={() => onAdd(entry.type)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function PaletteItem({ entry, onClick }: { entry: PaletteEntry; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${entry.type}`,
    data: { source: "palette", type: entry.type },
  });
  const Icon = entry.icon;
  return (
    <button
      ref={setNodeRef as any}
      {...attributes}
      {...listeners}
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-left text-xs hover:border-primary/50 hover:bg-accent/40 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate">{entry.label}</span>
    </button>
  );
}
