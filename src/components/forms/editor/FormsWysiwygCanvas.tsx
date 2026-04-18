/**
 * FormsWysiwygCanvas — renders the live form (the same way FormRenderer does)
 * but wraps every top-level field in click-to-select chrome with a drag handle
 * and quick actions. The form on screen IS both the editor and the preview.
 *
 * Differences from FormRenderer:
 *  - Inputs are visually rendered but interaction is captured by an overlay
 *    so clicks select the field instead of focusing the input.
 *  - Sections are collapsible cards with rename / move / duplicate / delete.
 *  - Drag-to-reorder uses dnd-kit; palette drops append a new field at the
 *    end of the section the drop occurred in (or to the form if no section).
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
  Columns2, Square, ChevronDown, ChevronRight, LayoutGrid, Plus,
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
}

interface SectionBand {
  sectionId: string | null;
  section: BaseField | null;
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

// ------------------------------------------------------------------ root

export function FormsWysiwygCanvas(props: FormsWysiwygCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bands = useMemo(() => buildBands(props.schema.fields), [props.schema.fields]);
  const twoCol = props.settings.twoColumnLayout ?? true;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const a: any = active.data.current;
    const o: any = over.data.current;

    // Palette drop
    if (a?.source === "palette") {
      const type = a.type as FieldType;
      if (o?.containerId) props.onAddPaletteToContainer(o.containerId, type);
      else props.onAddPaletteAtEnd(type);
      return;
    }

    // Field reorder (within or across sections)
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
          className="p-4 md:p-6 mx-auto max-w-3xl space-y-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onSelect(null);
          }}
        >
          {props.schema.fields.length === 0 ? (
            <RootDropZone />
          ) : (
            bands.map((band, i) => (
              <SectionBandCard
                key={band.sectionId ?? `__head_${i}`}
                band={band}
                index={i}
                totalBands={bands.length}
                twoCol={twoCol}
                {...props}
              />
            ))
          )}

          <div className="flex justify-center pt-2">
            <Button
              size="sm" variant="outline"
              onClick={() => props.onAddPaletteAtEnd("section")}
              className="text-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Add section
            </Button>
          </div>

          {/* Mock submit row — visual only */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border opacity-60 pointer-events-none">
            <Button type="button" variant="ghost">{props.settings.cancelLabel || "Cancel"}</Button>
            <Button type="button">{props.settings.submitLabel || "Submit"}</Button>
          </div>
        </div>
      </ScrollArea>
    </DndContext>
  );
}

function RootDropZone() {
  const { isOver, setNodeRef } = useDroppable({ id: "canvas-root", data: {} });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[300px] rounded-lg border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <p className="font-medium">Drag a field from the left to start</p>
      <p className="text-xs mt-2">or click any field in the library to append it.</p>
    </div>
  );
}

// ---------------------------------------------------------- section card

interface BandCardProps extends FormsWysiwygCanvasProps {
  band: SectionBand;
  index: number;
  totalBands: number;
  twoCol: boolean;
}

function SectionBandCard(p: BandCardProps) {
  const { band } = p;
  const [collapsed, setCollapsed] = useState(false);
  const isHeadless = !band.section;
  const isSelected = band.sectionId !== null && p.selectedId === band.sectionId;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden shadow-sm transition-colors",
        isSelected ? "border-primary ring-1 ring-primary/30" : "border-border",
      )}
      onClick={(e) => {
        if (band.section) {
          e.stopPropagation();
          p.onSelect(band.section.id);
        }
      }}
    >
      {/* Section header band */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 border-b",
          isHeadless ? "bg-muted/30 border-border/50" : "bg-primary/5 border-primary/20",
        )}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCollapsed((s) => !s); }}
          className="text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <LayoutGrid className={cn("h-4 w-4 shrink-0", isHeadless ? "text-muted-foreground" : "text-primary")} />
        {isHeadless ? (
          <span className="text-sm font-medium text-muted-foreground italic">Untitled section</span>
        ) : (
          <Input
            value={band.section!.label}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => p.onPatchField(band.section!.id, { label: e.target.value })}
            className="h-7 text-sm font-semibold border-0 bg-transparent px-1 focus-visible:ring-1"
          />
        )}
        <span className="text-[10px] text-muted-foreground font-mono ml-1">
          {band.items.length} field{band.items.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {!isHeadless ? (
            <>
              <Button
                size="sm" variant="ghost" className="h-6 w-6 p-0"
                disabled={p.index <= 1}
                onClick={(e) => { e.stopPropagation(); moveSection(p, "up"); }}
                aria-label="Move section up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm" variant="ghost" className="h-6 w-6 p-0"
                disabled={p.index >= p.totalBands - 1}
                onClick={(e) => { e.stopPropagation(); moveSection(p, "down"); }}
                aria-label="Move section down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={(e) => { e.stopPropagation(); p.onDuplicateField(band.section!.id); }}
                aria-label="Duplicate section"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={(e) => { e.stopPropagation(); p.onDelete(band.section!.id); }}
                aria-label="Delete section"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Section body */}
      {!collapsed ? (
        <BandDropZone bandSectionId={band.sectionId} hasItems={band.items.length > 0} twoCol={p.twoCol}>
          <SortableContext items={band.items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className={cn("grid gap-3 p-4", p.twoCol && "md:grid-cols-2")}>
              {band.items.map((f) => (
                <WysiwygFieldCard
                  key={f.id}
                  field={f}
                  selectedId={p.selectedId}
                  onSelect={p.onSelect}
                  onDelete={p.onDelete}
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

function BandDropZone({
  bandSectionId, hasItems, twoCol, children,
}: {
  bandSectionId: string | null;
  hasItems: boolean;
  twoCol: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `band:${bandSectionId ?? "__head__"}`,
    data: { bandSectionId },
  });
  return (
    <div ref={setNodeRef} className={cn("transition-colors", isOver && "bg-primary/5")}>
      {!hasItems ? (
        <div className="m-4 py-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-md">
          Drop fields here
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// --------------------------------------------------------- field card

interface FieldCardProps {
  field: BaseField;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPatchField: (id: string, patch: Partial<BaseField>) => void;
  onDuplicateField: (id: string) => void;
}

function WysiwygFieldCard(props: FieldCardProps) {
  const { field } = props;
  const sortable = useSortable({ id: field.id, data: { kind: "field" } });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const isSelected = props.selectedId === field.id;
  const colSpan = field.layout?.colSpan ?? 2;
  const isHalf = colSpan === 1;
  const Icon = ICON_BY_TYPE[field.type];

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
        "group relative rounded-lg border bg-background p-3 cursor-pointer transition-all",
        colSpan === 2 && "md:col-span-2",
        isSelected
          ? "border-primary ring-1 ring-primary/30 shadow-sm"
          : "border-border hover:border-primary/50 hover:shadow-sm",
        sortable.isDragging && "opacity-60",
      )}
    >
      {/* Floating toolbar (visible on hover or when selected) */}
      <div
        className={cn(
          "absolute -top-2.5 right-2 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm transition-opacity",
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
        {field.type !== "divider" && field.type !== "info_banner" ? (
          <Button
            size="sm" variant="ghost" className="h-6 w-6 p-0"
            onClick={toggleWidth}
            title={isHalf ? "Half width — click for full" : "Full width — click for half"}
            aria-label={isHalf ? "Make full width" : "Make half width"}
          >
            {isHalf ? <Columns2 className="h-3.5 w-3.5 text-accent" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
        ) : null}
        <Button
          size="sm" variant="ghost" className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); props.onDuplicateField(field.id); }}
          aria-label="Duplicate field"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="sm" variant="ghost" className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); props.onDelete(field.id); }}
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Click-shield overlay so inputs don't steal focus from selection */}
      <div className="pointer-events-none">
        <FieldPreview field={field} icon={Icon} />
      </div>
    </div>
  );
}

// --------------------------------------------------------- field preview

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
        <span>{field.label}</span>
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
      return <Input type="url" placeholder="https://..." disabled />;
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

// --------------------------------------------------------- helpers

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
