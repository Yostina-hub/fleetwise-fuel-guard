/**
 * FormsWysiwygCanvas — Oracle-EBS / Google-Forms hybrid WYSIWYG editor.
 *
 * Visual model
 * ────────────
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  ▸ Section title           [▲ ▼]  [duplicate] [delete]   │  ← bold band
 *   │ ────────────────────────────────────────────────────────  │
 *   │  Field A (half)           │   Field B (half)              │
 *   │  Field C (full width)                                      │
 *   │  ┌─ + Add field to section ──────────────────────────┐   │
 *   └──────────────────────────────────────────────────────────┘
 *           ╭──── + Add section here ────╮       ← inline gap inserter
 *   ┌──────────────────────────────────────────────────────────┐
 *
 * Differences from Google Forms
 *  - Strict 2-column grid inside each section by default (Oracle EBS style).
 *  - Per-field width toggle (½ / full) with visible chip.
 *  - Per-section "Add field" inline button (no need to drag every time).
 *  - Inline "Add section here" handles between every section.
 */
import { useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, KeyboardSensor, PointerSensor,
  closestCenter, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DOMPurify from "isomorphic-dompurify";
import {
  GripVertical, Trash2, Copy, ArrowUp, ArrowDown,
  Columns2, Square, ChevronDown, ChevronRight, Plus, Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PALETTE } from "@/lib/forms/fieldCatalog";
import type { BaseField, FieldType, FormSchema, FormSettings } from "@/lib/forms/schema";

const ICON_BY_TYPE = Object.fromEntries(
  PALETTE.map((p) => [p.type, p.icon]),
) as Record<FieldType, React.ComponentType<{ className?: string }>>;

export interface FormsWysiwygCanvasProps {
  schema: FormSchema;
  settings: FormSettings;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReplaceFields: (next: BaseField[]) => void;
  onDelete: (id: string) => void;
  onAddPaletteAtEnd: (type: FieldType) => void;
  onAddPaletteToContainer: (containerId: string, type: FieldType) => void;
  onPatchField: (id: string, patch: Partial<BaseField>) => void;
  onDuplicateField: (id: string) => void;
  /** Insert a new field at a specific top-level index (used by per-section adders). */
  onInsertAt?: (index: number, type: FieldType) => void;
}

interface SectionBand {
  sectionId: string | null;
  section: BaseField | null;
  /** Index in schema.fields where the section marker sits (null for headless). */
  sectionIndex: number | null;
  /** Index just after the last item belonging to this band. */
  endIndex: number;
  items: BaseField[];
}

function buildBands(fields: BaseField[]): SectionBand[] {
  const bands: SectionBand[] = [];
  let current: SectionBand = {
    sectionId: null, section: null, sectionIndex: null, endIndex: 0, items: [],
  };
  fields.forEach((f, idx) => {
    if (f.type === "section") {
      if (current.section || current.items.length) {
        current.endIndex = idx;
        bands.push(current);
      } else if (idx === 0) {
        // Drop the empty leading headless band entirely.
      }
      current = {
        sectionId: f.id, section: f, sectionIndex: idx, endIndex: idx + 1, items: [],
      };
    } else {
      current.items.push(f);
    }
  });
  current.endIndex = fields.length;
  bands.push(current);
  return bands;
}

// ───────────────────────────────────────────────────────────── root

export function FormsWysiwygCanvas(props: FormsWysiwygCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bands = useMemo(() => buildBands(props.schema.fields), [props.schema.fields]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const a: any = active.data.current;
    const o: any = over.data.current;

    if (a?.source === "palette") {
      const type = a.type as FieldType;
      if (o?.containerId) props.onAddPaletteToContainer(o.containerId, type);
      else if (o?.bandSectionId !== undefined && props.onInsertAt) {
        // Drop into a specific band -> insert at that band's end.
        const band = bands.find((b) => b.sectionId === o.bandSectionId);
        if (band) props.onInsertAt(band.endIndex, type);
        else props.onAddPaletteAtEnd(type);
      } else props.onAddPaletteAtEnd(type);
      return;
    }

    if (a?.kind === "field" && o?.kind === "field" && active.id !== over.id) {
      moveField(props, String(active.id), String(over.id));
      return;
    }
    if (a?.kind === "field" && o?.bandSectionId !== undefined) {
      moveFieldToBandEnd(props, String(active.id), o.bandSectionId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <ScrollArea className="h-full">
        <div
          className="p-4 md:p-6 mx-auto max-w-4xl space-y-2"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onSelect(null);
          }}
        >
          {props.schema.fields.length === 0 ? (
            <RootDropZone onAddSection={() => props.onAddPaletteAtEnd("section")} />
          ) : (
            <>
              {bands.map((band, i) => (
                <div key={band.sectionId ?? `__head_${i}`}>
                  <SectionBandCard
                    band={band}
                    index={i}
                    totalBands={bands.length}
                    {...props}
                  />
                  <SectionGapInserter
                    onAdd={() => {
                      if (props.onInsertAt) props.onInsertAt(band.endIndex, "section");
                      else props.onAddPaletteAtEnd("section");
                    }}
                  />
                </div>
              ))}
            </>
          )}

          {/* Mock submit row — visual only */}
          <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-border opacity-60 pointer-events-none">
            <Button type="button" variant="ghost">{props.settings.cancelLabel || "Cancel"}</Button>
            <Button type="button">{props.settings.submitLabel || "Submit"}</Button>
          </div>
        </div>
      </ScrollArea>
    </DndContext>
  );
}

function RootDropZone({ onAddSection }: { onAddSection: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas-root", data: {} });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[320px] rounded-lg border-2 border-dashed border-border p-12 text-center transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <p className="text-sm font-medium text-foreground">Start by adding a section</p>
      <p className="text-xs text-muted-foreground mt-1.5 mb-4">
        Sections group related fields — like Oracle EBS panels.
      </p>
      <Button size="sm" onClick={onAddSection}>
        <Plus className="h-4 w-4 mr-1.5" /> Add first section
      </Button>
      <p className="text-[11px] text-muted-foreground mt-4">
        …or drag any field from the left.
      </p>
    </div>
  );
}

function SectionGapInserter({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="group relative h-3 my-1 flex items-center justify-center">
      <div className="absolute inset-x-8 h-px bg-transparent group-hover:bg-primary/30 transition-colors" />
      <button
        type="button"
        onClick={onAdd}
        className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full border border-primary/40 bg-background hover:bg-primary hover:text-primary-foreground text-primary text-[11px] font-medium px-2.5 py-0.5 shadow-sm flex items-center gap-1"
      >
        <Plus className="h-3 w-3" /> Add section here
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────── section card

interface BandCardProps extends FormsWysiwygCanvasProps {
  band: SectionBand;
  index: number;
  totalBands: number;
}

function SectionBandCard(p: BandCardProps) {
  const { band } = p;
  const [collapsed, setCollapsed] = useState(false);
  const isHeadless = !band.section;
  const isSelected = band.sectionId !== null && p.selectedId === band.sectionId;
  // Per-section column count (stored on the section field as `layout.colSpan`
  // repurposed: 2 = two-column grid, 1 = single-column).
  const columns = (band.section?.layout?.colSpan as 1 | 2 | undefined) ?? 2;

  return (
    <section
      className={cn(
        "rounded-lg border bg-card overflow-hidden shadow-sm transition-all",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : isHeadless ? "border-dashed border-border/60" : "border-border hover:border-border",
      )}
      onClick={(e) => {
        if (band.section) {
          e.stopPropagation();
          p.onSelect(band.section.id);
        }
      }}
    >
      {/* ── Section header band (Oracle EBS style: bold title, faint underline) */}
      <header
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 border-b",
          isHeadless
            ? "bg-muted/20 border-border/40"
            : "bg-gradient-to-r from-primary/8 to-transparent border-primary/15",
        )}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCollapsed((s) => !s); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isHeadless ? (
          <span className="text-sm font-semibold text-muted-foreground italic">
            (Untitled top group — fields without a section)
          </span>
        ) : (
          <Input
            value={band.section!.label}
            placeholder="Section title…"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => p.onPatchField(band.section!.id, { label: e.target.value })}
            className="h-7 text-sm font-bold border-0 bg-transparent px-1.5 focus-visible:ring-1 focus-visible:bg-background max-w-md"
          />
        )}

        <span className="text-[10px] text-muted-foreground font-mono ml-auto mr-1">
          {band.items.length} field{band.items.length === 1 ? "" : "s"}
        </span>

        {!isHeadless ? (
          <div className="flex items-center gap-0.5">
            {/* Column toggle */}
            <Button
              size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
              onClick={(e) => {
                e.stopPropagation();
                p.onPatchField(band.section!.id, {
                  layout: { colSpan: columns === 2 ? 1 : 2 },
                });
              }}
              title={columns === 2 ? "Switch to single column" : "Switch to two columns"}
            >
              {columns === 2 ? <Columns2 className="h-3.5 w-3.5 mr-1" /> : <Square className="h-3.5 w-3.5 mr-1" />}
              {columns === 2 ? "2-col" : "1-col"}
            </Button>
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              disabled={p.index <= (p.band.section && p.totalBands > 1 ? 0 : 1)}
              onClick={(e) => { e.stopPropagation(); moveSection(p, "up"); }}
              aria-label="Move section up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              disabled={p.index >= p.totalBands - 1}
              onClick={(e) => { e.stopPropagation(); moveSection(p, "down"); }}
              aria-label="Move section down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); p.onDuplicateField(band.section!.id); }}
              aria-label="Duplicate section"
              title="Duplicate section"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); p.onDelete(band.section!.id); }}
              aria-label="Delete section"
              title="Delete section"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </header>

      {/* ── Section description (optional, editable inline) */}
      {!isHeadless && !collapsed ? (
        <div className="px-4 pt-2" onClick={(e) => e.stopPropagation()}>
          <Input
            value={band.section!.helpText ?? ""}
            placeholder="Section description (optional)…"
            onChange={(e) => p.onPatchField(band.section!.id, { helpText: e.target.value })}
            className="h-7 text-xs text-muted-foreground border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
        </div>
      ) : null}

      {/* ── Section body */}
      {!collapsed ? (
        <BandDropZone bandSectionId={band.sectionId} hasItems={band.items.length > 0} columns={columns}>
          <SortableContext items={band.items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className={cn("grid gap-3 px-4 py-3", columns === 2 && "md:grid-cols-2")}>
              {band.items.map((f) => (
                <WysiwygFieldCard
                  key={f.id}
                  field={f}
                  columns={columns}
                  selectedId={p.selectedId}
                  onSelect={p.onSelect}
                  onDelete={p.onDelete}
                  onPatchField={p.onPatchField}
                  onDuplicateField={p.onDuplicateField}
                />
              ))}
            </div>
          </SortableContext>

          {/* Inline add-field button at bottom of every section */}
          <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
            <AddFieldMenu
              onPick={(t) => {
                if (p.onInsertAt) p.onInsertAt(band.endIndex, t);
                else if (band.sectionId) p.onAddPaletteToContainer(band.sectionId, t);
                else p.onAddPaletteAtEnd(t);
              }}
            />
          </div>
        </BandDropZone>
      ) : null}
    </section>
  );
}

function BandDropZone({
  bandSectionId, hasItems, columns, children,
}: {
  bandSectionId: string | null;
  hasItems: boolean;
  columns: 1 | 2;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `band:${bandSectionId ?? "__head__"}`,
    data: { bandSectionId },
  });
  return (
    <div ref={setNodeRef} className={cn("transition-colors", isOver && "bg-primary/5")}>
      {!hasItems ? (
        <div className={cn(
          "mx-4 my-3 py-6 text-center text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-md",
          isOver && "border-primary bg-primary/5 text-primary",
        )}>
          {isOver ? "Release to drop here" : "Drop fields here, or click ＋ Add field below"}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────── add field menu

function AddFieldMenu({ onPick }: { onPick: (t: FieldType) => void }) {
  const groups = ["Standard", "Entity", "Structural", "Logic"] as const;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button" variant="ghost" size="sm"
          className="w-full justify-center text-xs border border-dashed border-border/60 hover:border-primary hover:bg-primary/5 hover:text-primary text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add field to this section
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-96 overflow-auto" align="start">
        {groups.map((g, gi) => (
          <div key={g}>
            {gi > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground py-1">
              {g}
            </DropdownMenuLabel>
            {PALETTE.filter((p) => p.group === g && p.type !== "section").map((entry) => {
              const Icon = entry.icon;
              return (
                <DropdownMenuItem
                  key={entry.type}
                  onClick={() => onPick(entry.type)}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {entry.label}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────── field card

interface FieldCardProps {
  field: BaseField;
  columns: 1 | 2;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPatchField: (id: string, patch: Partial<BaseField>) => void;
  onDuplicateField: (id: string) => void;
}

function WysiwygFieldCard(props: FieldCardProps) {
  const { field, columns } = props;
  const sortable = useSortable({ id: field.id, data: { kind: "field" } });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const isSelected = props.selectedId === field.id;
  const colSpan = field.layout?.colSpan ?? 2;
  const isHalf = colSpan === 1;
  const Icon = ICON_BY_TYPE[field.type];
  // Width toggle is only meaningful inside a 2-col section.
  const showWidthToggle = columns === 2 && field.type !== "divider" && field.type !== "info_banner";

  const toggleWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onPatchField(field.id, { layout: { colSpan: isHalf ? 2 : 1 } });
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); props.onSelect(field.id); }}
      className={cn(
        "group relative rounded-md border bg-background p-3 cursor-pointer transition-all",
        // In 2-col mode, full-width fields span both columns.
        columns === 2 && colSpan === 2 && "md:col-span-2",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-sm"
          : "border-border hover:border-primary/40 hover:shadow-sm",
        sortable.isDragging && "opacity-50 z-10",
      )}
    >
      {/* Selected indicator bar (left) */}
      {isSelected ? (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md" />
      ) : null}

      {/* Floating toolbar */}
      <div
        className={cn(
          "absolute -top-3 right-2 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm transition-opacity z-10",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing px-1"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {showWidthToggle ? (
          <Button
            size="sm" variant="ghost" className="h-6 px-1.5 gap-1 text-[10px]"
            onClick={toggleWidth}
            title={isHalf ? "Half width — click for full" : "Full width — click for half"}
          >
            {isHalf ? <Columns2 className="h-3 w-3 text-accent" /> : <Square className="h-3 w-3 text-muted-foreground" />}
            <span>{isHalf ? "½" : "full"}</span>
          </Button>
        ) : null}
        <Button
          size="sm" variant="ghost" className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); props.onDuplicateField(field.id); }}
          aria-label="Duplicate field"
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="sm" variant="ghost" className="h-6 w-6 p-0 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); props.onDelete(field.id); }}
          aria-label="Delete field"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Click-shield overlay so inputs don't steal focus from selection */}
      <div className="pointer-events-none">
        <FieldPreview field={field} icon={Icon} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────── field preview

function FieldPreview({
  field, icon: Icon,
}: { field: BaseField; icon?: React.ComponentType<{ className?: string }> }) {
  if (field.type === "divider") {
    return <Separator className="my-1" />;
  }
  if (field.type === "info_banner") {
    const html = DOMPurify.sanitize(field.content || "");
    return (
      <div
        className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (field.type === "repeater") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {Icon ? <Icon className="h-3.5 w-3.5 text-primary" /> : null}
          {field.label}
          <span className="text-[10px] font-mono">({field.key})</span>
        </div>
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          Repeater · {(field.fields ?? []).length} child field{(field.fields ?? []).length === 1 ? "" : "s"} per row
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-xs flex items-center gap-1.5">
        {Icon ? <Icon className="h-3 w-3 text-primary" /> : null}
        <span className="font-medium">{field.label}</span>
        {field.required ? <span className="text-destructive">*</span> : null}
        <span className="ml-1 text-[10px] font-mono text-muted-foreground">{field.key}</span>
      </Label>
      <FieldInputPreview field={field} />
      {field.helpText ? <p className="text-[11px] text-muted-foreground">{field.helpText}</p> : null}
    </div>
  );
}

function FieldInputPreview({ field }: { field: BaseField }) {
  switch (field.type) {
    case "textarea":
      return <Textarea rows={3} placeholder={field.placeholder} disabled />;
    case "select":
    case "vehicle":
    case "driver":
    case "asset":
    case "geofence":
    case "user":
    case "pool":
      return (
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? `Select ${field.type === "select" ? "" : field.type}…`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multiselect":
      return (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-input p-2 min-h-9">
          {(field.options ?? []).slice(0, 4).map((o) => (
            <span key={o.value} className="px-2 py-0.5 rounded text-[11px] border bg-muted">{o.label}</span>
          ))}
          {(field.options ?? []).length === 0 ? (
            <span className="text-xs text-muted-foreground">No options</span>
          ) : null}
        </div>
      );
    case "radio":
      return (
        <div className="space-y-1">
          {(field.options ?? []).map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border border-input" />
              <span className="text-sm">{o.label}</span>
            </div>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Checkbox disabled />
          <span className="text-sm">{field.placeholder || "Yes"}</span>
        </div>
      );
    case "switch":
      return <Switch disabled />;
    case "computed":
      return <Input value="" readOnly placeholder="(computed)" className="bg-muted/40" disabled />;
    case "location":
      return <Input placeholder={field.placeholder || "📍 Select or type a place"} disabled />;
    case "file":
      return <Input type="file" disabled />;
    default:
      return (
        <Input
          type={
            field.type === "number" || field.type === "currency" ? "number" :
            field.type === "date" ? "date" :
            field.type === "datetime" ? "datetime-local" :
            field.type === "time" ? "time" :
            field.type === "email" ? "email" :
            field.type === "phone" ? "tel" : "text"
          }
          placeholder={field.placeholder}
          disabled
        />
      );
  }
}

// ─────────────────────────────────────────────────────── helpers

function moveField(props: FormsWysiwygCanvasProps, fromId: string, toId: string) {
  const arr = [...props.schema.fields];
  const from = arr.findIndex((f) => f.id === fromId);
  if (from < 0) return;
  const [item] = arr.splice(from, 1);
  const to = arr.findIndex((f) => f.id === toId);
  if (to < 0) { arr.push(item); }
  else arr.splice(to, 0, item);
  props.onReplaceFields(arr);
}

function moveFieldToBandEnd(
  props: FormsWysiwygCanvasProps,
  fieldId: string,
  bandSectionId: string | null,
) {
  const arr = [...props.schema.fields];
  const from = arr.findIndex((f) => f.id === fieldId);
  if (from < 0) return;
  const [item] = arr.splice(from, 1);

  if (bandSectionId === null) {
    let insertAt = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].type === "section") { insertAt = i; break; }
      insertAt = i + 1;
    }
    arr.splice(insertAt, 0, item);
  } else {
    const sIdx = arr.findIndex((f) => f.id === bandSectionId);
    if (sIdx < 0) arr.push(item);
    else {
      let insertAt = arr.length;
      for (let i = sIdx + 1; i < arr.length; i++) {
        if (arr[i].type === "section") { insertAt = i; break; }
      }
      arr.splice(insertAt, 0, item);
    }
  }
  props.onReplaceFields(arr);
}

function moveSection(p: BandCardProps, dir: "up" | "down") {
  if (!p.band.section) return;
  const arr = [...p.schema.fields];
  const startIdx = arr.findIndex((f) => f.id === p.band.section!.id);
  if (startIdx < 0) return;
  let endIdx = arr.length;
  for (let i = startIdx + 1; i < arr.length; i++) {
    if (arr[i].type === "section") { endIdx = i; break; }
  }
  const span = arr.slice(startIdx, endIdx);
  arr.splice(startIdx, span.length);

  if (dir === "up") {
    let prev = 0;
    for (let i = startIdx - 1; i >= 0; i--) {
      if (arr[i].type === "section") { prev = i; break; }
    }
    arr.splice(prev, 0, ...span);
  } else {
    let after = startIdx;
    for (let i = startIdx; i < arr.length; i++) {
      if (arr[i].type === "section") { after = i; break; }
      after = i + 1;
    }
    arr.splice(after, 0, ...span);
  }
  p.onReplaceFields(arr);
}
