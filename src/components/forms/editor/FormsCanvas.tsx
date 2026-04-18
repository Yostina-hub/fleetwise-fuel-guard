/**
 * FormsCanvas — droppable list of fields representing the form's top level.
 *
 * Supports:
 *  - drop-from-palette (creates a new field at end or before a specific item)
 *  - reorder of existing fields (sortable)
 *  - select / delete
 *  - nested children (sections / repeaters) shown inline in a compact list
 *
 * Selection state is owned by the parent editor.
 */
import {
  DndContext, DragEndEvent, KeyboardSensor, PointerSensor,
  closestCenter, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PALETTE } from "@/lib/forms/fieldCatalog";
import type { BaseField, FieldType } from "@/lib/forms/schema";

const ICON_BY_TYPE = Object.fromEntries(
  PALETTE.map((p) => [p.type, p.icon]),
) as Record<FieldType, React.ComponentType<{ className?: string }>>;

export interface FormsCanvasProps {
  fields: BaseField[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder: (newOrder: string[]) => void;
  onDelete: (id: string) => void;
  onAddPaletteAtEnd: (type: FieldType) => void;
  onAddPaletteToContainer: (containerId: string, type: FieldType) => void;
  onSelectChild: (id: string) => void;
  onDeleteChild: (id: string) => void;
}

export function FormsCanvas(props: FormsCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeData: any = active.data.current;
    const overData: any = over.data.current;

    // Drop from palette
    if (activeData?.source === "palette") {
      const type = activeData.type as FieldType;
      if (overData?.containerId) {
        props.onAddPaletteToContainer(overData.containerId, type);
      } else {
        props.onAddPaletteAtEnd(type);
      }
      return;
    }

    // Reorder existing top-level fields
    if (active.id !== over.id) {
      const ids = props.fields.map((f) => f.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return;
      const next = [...ids];
      next.splice(from, 1);
      next.splice(to, 0, String(active.id));
      props.onReorder(next);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <ScrollArea className="h-full">
        <CanvasDropZone hasFields={props.fields.length > 0}>
          <SortableContext
            items={props.fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {props.fields.map((f) => (
                <SortableFieldItem
                  key={f.id}
                  field={f}
                  selectedId={props.selectedId}
                  onSelect={props.onSelect}
                  onDelete={props.onDelete}
                  onSelectChild={props.onSelectChild}
                  onDeleteChild={props.onDeleteChild}
                />
              ))}
            </div>
          </SortableContext>
        </CanvasDropZone>
      </ScrollArea>
    </DndContext>
  );
}

// ---------- Drop zone (top-level) ----------------------------------------

function CanvasDropZone({ hasFields, children }: { hasFields: boolean; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas-root", data: {} });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[400px] p-3 rounded-md border-2 border-dashed transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {!hasFields ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p>Drag a field from the left, or click to add.</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ---------- Sortable field row ------------------------------------------

interface SortableProps {
  field: BaseField;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectChild: (id: string) => void;
  onDeleteChild: (id: string) => void;
}

function SortableFieldItem(props: SortableProps) {
  const { field } = props;
  const sortable = useSortable({ id: field.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const Icon = ICON_BY_TYPE[field.type] ?? null;
  const isSelected = props.selectedId === field.id;
  const isContainer = field.type === "section" || field.type === "repeater";
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card transition-colors",
        isSelected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-border/80",
        sortable.isDragging && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          type="button"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {isContainer ? (
          <button type="button" onClick={() => setExpanded((s) => !s)} className="text-muted-foreground">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : null}
        {Icon ? <Icon className="h-3.5 w-3.5 text-primary shrink-0" /> : null}
        <button
          type="button"
          onClick={() => props.onSelect(field.id)}
          className="flex-1 text-left text-sm truncate"
        >
          {field.label}
          {field.required ? <span className="text-destructive ml-0.5">*</span> : null}
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">{field.key}</span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => props.onDelete(field.id)}
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {isContainer && expanded ? (
        <ContainerChildren
          containerId={field.id}
          children={field.fields ?? []}
          selectedId={props.selectedId}
          onSelectChild={props.onSelectChild}
          onDeleteChild={props.onDeleteChild}
        />
      ) : null}
    </div>
  );
}

// ---------- Container children (sections / repeaters) -------------------

function ContainerChildren({
  containerId, children, selectedId, onSelectChild, onDeleteChild,
}: {
  containerId: string;
  children: BaseField[];
  selectedId: string | null;
  onSelectChild: (id: string) => void;
  onDeleteChild: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `container:${containerId}`,
    data: { containerId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "ml-5 mr-2 mb-2 p-2 rounded-md border-2 border-dashed transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-border/50",
      )}
    >
      {children.length === 0 ? (
        <div className="py-3 text-center text-[11px] text-muted-foreground">
          Drop fields here
        </div>
      ) : (
        <div className="space-y-1">
          {children.map((c) => {
            const Icon = ICON_BY_TYPE[c.type];
            const sel = selectedId === c.id;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded border bg-background/60 text-xs",
                  sel ? "border-primary" : "border-border/60",
                )}
              >
                {Icon ? <Icon className="h-3 w-3 text-primary shrink-0" /> : null}
                <button
                  type="button"
                  onClick={() => onSelectChild(c.id)}
                  className="flex-1 text-left truncate"
                >
                  {c.label}
                  <span className="ml-2 text-[10px] font-mono text-muted-foreground">{c.key}</span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0"
                  onClick={() => onDeleteChild(c.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
