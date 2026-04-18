/**
 * FormsCanvas — Google Forms–style organized canvas.
 *
 * Layout model:
 *  - Top-level fields are visually grouped into "section bands". A `section`
 *    field starts a new band; everything until the next `section` belongs to it.
 *  - Fields with no preceding section live in a default "Untitled section" band.
 *  - Inside each band you can drag fields to reorder, drop palette items at the
 *    end, change column width inline (half/full), duplicate, and delete.
 *  - Sections themselves can be collapsed, moved up/down, duplicated, deleted,
 *    and renamed inline.
 *  - `repeater` fields keep their own nested drop-zone (legacy behavior).
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
import {
  GripVertical, Trash2, ChevronRight, ChevronDown, Copy,
  ArrowUp, ArrowDown, Columns2, Square, LayoutGrid,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  /** Replace the whole top-level fields array (used for cross-section moves & section reordering). */
  onReplaceFields?: (next: BaseField[]) => void;
  /** Legacy reorder hook — still supported for in-section reorder. */
  onReorder: (newOrder: string[]) => void;
  onDelete: (id: string) => void;
  onAddPaletteAtEnd: (type: FieldType) => void;
  onAddPaletteToContainer: (containerId: string, type: FieldType) => void;
  onSelectChild: (id: string) => void;
  onDeleteChild: (id: string) => void;
  /** Optional — patch a single field (for inline width toggle, label rename). */
  onPatchField?: (id: string, patch: Partial<BaseField>) => void;
  /** Optional — duplicate a field (top-level or child). */
  onDuplicateField?: (id: string) => void;
}

// ---------- Group fields into section bands ------------------------------

interface SectionBand {
  /** id of the `section` field, or null for the implicit head band. */
  sectionId: string | null;
  section: BaseField | null;
  /** Top-level fields belonging to this band (excluding the section itself). */
  items: BaseField[];
}

function buildBands(fields: BaseField[]): SectionBand[] {
  const bands: SectionBand[] = [];
  let current: SectionBand = { sectionId: null, section: null, items: [] };
  for (const f of fields) {
    if (f.type === "section") {
      if (current.section || current.items.length) bands.push(current);
      current = { sectionId: f.id, section: f, items: [] };
    } else {
      current.items.push(f);
    }
  }
  bands.push(current);
  return bands;
}

// ---------- Top-level component ------------------------------------------

export function FormsCanvas(props: FormsCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bands = useMemo(() => buildBands(props.fields), [props.fields]);

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
      } else if (overData?.bandSectionId !== undefined) {
        // Drop into a band → append to that band (after its last item)
        addToBand(props, overData.bandSectionId, type);
      } else {
        props.onAddPaletteAtEnd(type);
      }
      return;
    }

    // Reorder inside the same band
    if (activeData?.kind === "field" && overData?.kind === "field" && active.id !== over.id) {
      moveField(props, String(active.id), String(over.id));
      return;
    }

    // Drop a field into an empty band area
    if (activeData?.kind === "field" && overData?.bandSectionId !== undefined) {
      moveFieldToBandEnd(props, String(active.id), overData.bandSectionId);
      return;
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <ScrollArea className="h-full">
        <CanvasRoot hasFields={props.fields.length > 0}>
          <div className="space-y-3">
            {bands.map((band, i) => (
              <SectionBandView
                key={band.sectionId ?? `__head_${i}`}
                band={band}
                index={i}
                totalBands={bands.length}
                {...props}
              />
            ))}
            {/* Add-section quick action */}
            <div className="flex justify-center pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onAddPaletteAtEnd("section")}
                className="text-xs"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Add section
              </Button>
            </div>
          </div>
        </CanvasRoot>
      </ScrollArea>
    </DndContext>
  );
}

// ---------- Cross-section move helpers -----------------------------------

function moveField(props: FormsCanvasProps, fromId: string, toId: string) {
  if (!props.onReplaceFields) {
    // fallback: legacy reorder (only works inside same band visually)
    const ids = props.fields.map((f) => f.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    props.onReorder(next);
    return;
  }
  const arr = [...props.fields];
  const from = arr.findIndex((f) => f.id === fromId);
  const to = arr.findIndex((f) => f.id === toId);
  if (from < 0 || to < 0) return;
  const [item] = arr.splice(from, 1);
  const newTo = arr.findIndex((f) => f.id === toId);
  arr.splice(newTo, 0, item);
  props.onReplaceFields(arr);
}

function moveFieldToBandEnd(
  props: FormsCanvasProps,
  fieldId: string,
  bandSectionId: string | null,
) {
  if (!props.onReplaceFields) return;
  const arr = [...props.fields];
  const from = arr.findIndex((f) => f.id === fieldId);
  if (from < 0) return;
  const [item] = arr.splice(from, 1);

  if (bandSectionId === null) {
    // Insert at the very start (before any section)
    let insertAt = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].type === "section") { insertAt = i; break; }
      insertAt = i + 1;
    }
    arr.splice(insertAt, 0, item);
  } else {
    const sIdx = arr.findIndex((f) => f.id === bandSectionId);
    if (sIdx < 0) {
      arr.push(item);
    } else {
      let insertAt = arr.length;
      for (let i = sIdx + 1; i < arr.length; i++) {
        if (arr[i].type === "section") { insertAt = i; break; }
      }
      arr.splice(insertAt, 0, item);
    }
  }
  props.onReplaceFields(arr);
}

function addToBand(props: FormsCanvasProps, bandSectionId: string | null, _type: FieldType) {
  // Simplest path: append at end. Future enhancement could insert at band end.
  props.onAddPaletteAtEnd(_type);
}

// ---------- Section band view --------------------------------------------

interface BandProps extends FormsCanvasProps {
  band: SectionBand;
  index: number;
  totalBands: number;
}

function SectionBandView(p: BandProps) {
  const { band } = p;
  const [collapsed, setCollapsed] = useState(false);
  const isHeadless = !band.section;
  const title = isHeadless ? "Untitled section" : (band.section?.label || "Section");

  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      "border-border",
    )}>
      {/* Section header band */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 border-b",
          isHeadless ? "bg-muted/30 border-border/50" : "bg-primary/5 border-primary/20",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((s) => !s)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <LayoutGrid className={cn("h-4 w-4 shrink-0", isHeadless ? "text-muted-foreground" : "text-primary")} />
        {isHeadless ? (
          <span className="text-sm font-medium text-muted-foreground italic">{title}</span>
        ) : (
          <Input
            value={band.section!.label}
            onChange={(e) => p.onPatchField?.(band.section!.id, { label: e.target.value })}
            className="h-7 text-sm font-semibold border-0 bg-transparent px-1 focus-visible:ring-1"
          />
        )}
        <span className="text-[10px] text-muted-foreground font-mono">
          {band.items.length} field{band.items.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {!isHeadless && p.onReplaceFields ? (
            <>
              <Button
                size="sm" variant="ghost" className="h-6 w-6 p-0"
                disabled={p.index <= 1 && !!p.band.section /* head band is index 0, first real section is 1 */}
                onClick={() => moveSection(p, "up")}
                aria-label="Move section up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm" variant="ghost" className="h-6 w-6 p-0"
                disabled={p.index >= p.totalBands - 1}
                onClick={() => moveSection(p, "down")}
                aria-label="Move section down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
          {!isHeadless && p.onDuplicateField ? (
            <Button
              size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => p.onDuplicateField!(band.section!.id)}
              aria-label="Duplicate section"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {!isHeadless ? (
            <Button
              size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => p.onDelete(band.section!.id)}
              aria-label="Delete section"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Section body */}
      {!collapsed ? (
        <BandDropZone bandSectionId={band.sectionId} hasItems={band.items.length > 0}>
          <SortableContext
            items={band.items.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5 p-2">
              {band.items.map((f) => (
                <SortableFieldItem
                  key={f.id}
                  field={f}
                  selectedId={p.selectedId}
                  onSelect={p.onSelect}
                  onDelete={p.onDelete}
                  onSelectChild={p.onSelectChild}
                  onDeleteChild={p.onDeleteChild}
                  onPatchField={p.onPatchField}
                  onDuplicateField={p.onDuplicateField}
                />
              ))}
            </div>
          </SortableContext>
        </BandDropZone>
      ) : null}
    </div>
  );
}

function moveSection(p: BandProps, dir: "up" | "down") {
  if (!p.onReplaceFields || !p.band.section) return;
  const arr = [...p.fields];
  const startIdx = arr.findIndex((f) => f.id === p.band.section!.id);
  if (startIdx < 0) return;
  // span = section + everything until next section
  let endIdx = arr.length;
  for (let i = startIdx + 1; i < arr.length; i++) {
    if (arr[i].type === "section") { endIdx = i; break; }
  }
  const span = arr.slice(startIdx, endIdx);
  arr.splice(startIdx, span.length);

  if (dir === "up") {
    // Find prev section start (or 0)
    let prev = 0;
    for (let i = startIdx - 1; i >= 0; i--) {
      if (arr[i].type === "section") { prev = i; break; }
    }
    arr.splice(prev, 0, ...span);
  } else {
    // Find next section after our original endIdx-span.length
    const insertBaseline = startIdx; // arr already mutated
    let next = arr.length;
    for (let i = insertBaseline; i < arr.length; i++) {
      if (arr[i].type === "section") { next = i + 1; break; }
    }
    // skip the next section block too
    let after = next;
    for (let i = next; i < arr.length; i++) {
      if (arr[i].type === "section") { after = i; break; }
      after = i + 1;
    }
    arr.splice(after, 0, ...span);
  }
  p.onReplaceFields(arr);
}

// ---------- Canvas root drop zone (empty state) --------------------------

function CanvasRoot({ hasFields, children }: { hasFields: boolean; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas-root", data: {} });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[400px] p-3 rounded-md transition-colors",
        isOver ? "bg-primary/5" : "",
      )}
    >
      {!hasFields ? (
        <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed border-border rounded-md">
          <p>Drag a field from the left, or click to add.</p>
          <p className="text-xs mt-2">Tip: Add a <span className="font-medium">Section</span> to group related fields.</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ---------- Per-band drop zone ------------------------------------------

function BandDropZone({
  bandSectionId, hasItems, children,
}: { bandSectionId: string | null; hasItems: boolean; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `band:${bandSectionId ?? "__head__"}`,
    data: { bandSectionId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        isOver ? "bg-primary/5" : "",
      )}
    >
      {!hasItems ? (
        <div className="m-2 py-6 text-center text-[11px] text-muted-foreground border-2 border-dashed border-border/50 rounded-md">
          Drop fields here
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
  onPatchField?: (id: string, patch: Partial<BaseField>) => void;
  onDuplicateField?: (id: string) => void;
}

function SortableFieldItem(props: SortableProps) {
  const { field } = props;
  const sortable = useSortable({ id: field.id, data: { kind: "field" } });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const Icon = ICON_BY_TYPE[field.type] ?? null;
  const isSelected = props.selectedId === field.id;
  const isContainer = field.type === "repeater";
  const [expanded, setExpanded] = useState(true);

  const colSpan = field.layout?.colSpan ?? 2;
  const isHalf = colSpan === 1;

  const toggleWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onPatchField?.(field.id, { layout: { colSpan: isHalf ? 2 : 1 } });
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card transition-colors",
        isSelected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-border/80",
        sortable.isDragging && "opacity-60",
        isHalf && "border-l-2 border-l-accent",
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          type="button"
          aria-label="Drag to reorder"
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
        {/* Inline alignment / width toggle */}
        {props.onPatchField && field.type !== "divider" && field.type !== "info_banner" ? (
          <Button
            size="sm" variant="ghost" className="h-6 w-6 p-0"
            onClick={toggleWidth}
            aria-label={isHalf ? "Make full width" : "Make half width"}
            title={isHalf ? "Half width — click for full" : "Full width — click for half"}
          >
            {isHalf ? <Columns2 className="h-3.5 w-3.5 text-accent" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
        ) : null}
        {props.onDuplicateField ? (
          <Button
            size="sm" variant="ghost" className="h-6 w-6 p-0"
            onClick={(e) => { e.stopPropagation(); props.onDuplicateField!(field.id); }}
            aria-label="Duplicate field"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); props.onDelete(field.id); }}
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

// ---------- Container children (repeaters) -------------------------------

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
