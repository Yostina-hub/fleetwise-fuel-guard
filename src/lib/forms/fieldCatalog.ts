/**
 * Field catalog — palette definition for the WYSIWYG editor.
 * Each entry maps to a FieldType and provides default props for new fields.
 */
import {
  Type, AlignLeft, Hash, DollarSign, Mail, Phone, Calendar,
  CalendarClock, Clock, ChevronDown, ListChecks, Circle, CheckSquare,
  ToggleLeft, Upload, Car, User, Package, MapPin, UserCircle,
  LayoutGrid, Repeat, Minus, Info, Calculator, Navigation, Layers,
} from "lucide-react";
import type { BaseField, FieldType } from "./schema";

export interface PaletteEntry {
  type: FieldType;
  label: string;
  group: "Standard" | "Entity" | "Structural" | "Logic";
  icon: React.ComponentType<{ className?: string }>;
}

export const PALETTE: PaletteEntry[] = [
  // Standard
  { type: "text",        label: "Text",          group: "Standard", icon: Type },
  { type: "textarea",    label: "Long text",     group: "Standard", icon: AlignLeft },
  { type: "number",      label: "Number",        group: "Standard", icon: Hash },
  { type: "currency",    label: "Currency",      group: "Standard", icon: DollarSign },
  { type: "email",       label: "Email",         group: "Standard", icon: Mail },
  { type: "phone",       label: "Phone",         group: "Standard", icon: Phone },
  { type: "date",        label: "Date",          group: "Standard", icon: Calendar },
  { type: "datetime",    label: "Date & time",   group: "Standard", icon: CalendarClock },
  { type: "time",        label: "Time",          group: "Standard", icon: Clock },
  { type: "select",      label: "Dropdown",      group: "Standard", icon: ChevronDown },
  { type: "multiselect", label: "Multi-select",  group: "Standard", icon: ListChecks },
  { type: "radio",       label: "Radio",         group: "Standard", icon: Circle },
  { type: "checkbox",    label: "Checkbox",      group: "Standard", icon: CheckSquare },
  { type: "switch",      label: "Switch",        group: "Standard", icon: ToggleLeft },
  { type: "file",        label: "File / URL",    group: "Standard", icon: Upload },
  { type: "location",    label: "Location (map)", group: "Standard", icon: Navigation },
  { type: "pool",        label: "Fleet pool",    group: "Standard", icon: Layers },
  // Entity pickers
  { type: "vehicle",     label: "Vehicle",       group: "Entity",   icon: Car },
  { type: "driver",      label: "Driver",        group: "Entity",   icon: User },
  { type: "asset",       label: "Asset / part",  group: "Entity",   icon: Package },
  { type: "geofence",    label: "Geofence",      group: "Entity",   icon: MapPin },
  { type: "user",        label: "User",          group: "Entity",   icon: UserCircle },
  // Structural
  { type: "section",     label: "Section",       group: "Structural", icon: LayoutGrid },
  { type: "repeater",    label: "Repeater",      group: "Structural", icon: Repeat },
  { type: "divider",     label: "Divider",       group: "Structural", icon: Minus },
  { type: "info_banner", label: "Info banner",   group: "Structural", icon: Info },
  // Logic
  { type: "computed",    label: "Computed",      group: "Logic",      icon: Calculator },
];

const TYPE_LABEL: Record<FieldType, string> = Object.fromEntries(
  PALETTE.map((p) => [p.type, p.label]),
) as Record<FieldType, string>;

let _counter = 0;
function uid() {
  _counter += 1;
  return `f_${Date.now().toString(36)}_${_counter.toString(36)}`;
}

/** Generate a stable, snake_case key derived from a label, with collision fallback. */
export function keyFromLabel(label: string, existing: Set<string> = new Set()): string {
  const base =
    (label || "field")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";
  let key = base;
  let n = 1;
  while (existing.has(key)) {
    n += 1;
    key = `${base}_${n}`;
  }
  return key;
}

/** Build a default BaseField for a given type. */
export function makeField(type: FieldType, existingKeys: Set<string> = new Set()): BaseField {
  const label = TYPE_LABEL[type] || "Field";
  const key = keyFromLabel(label, existingKeys);
  const base: BaseField = {
    id: uid(),
    key,
    type,
    label,
    layout: { colSpan: 2 },
  };
  if (type === "select" || type === "radio" || type === "multiselect") {
    base.options = [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
    ];
  }
  if (type === "section" || type === "repeater") {
    base.fields = [];
    base.label = type === "section" ? "Section" : "Items";
  }
  if (type === "repeater") {
    base.minRows = 1;
    base.maxRows = 30;
  }
  if (type === "info_banner") {
    base.label = "Info";
    base.content = "Add some helpful context here.";
  }
  if (type === "computed") {
    base.computedFrom = { expression: "", resultType: "number" };
    base.label = "Computed";
  }
  if (type === "divider") {
    base.label = "Divider";
  }
  if (type === "location") {
    base.label = "Location";
    base.placeholder = "Select or type a place";
    // Lat/lng siblings auto-derived if omitted: <key>_lat / <key>_lng
  }
  if (type === "pool") {
    base.label = "Pool";
    base.helpText = "Select a fleet pool. Options come from the chosen Pool Category.";
    base.filterByKey = "pool_category";
  }
  return base;
}

/** Collect every key currently in use in a schema (top + nested). */
export function collectKeys(fields: BaseField[]): Set<string> {
  const set = new Set<string>();
  const walk = (arr: BaseField[]) => {
    for (const f of arr) {
      if (f.key) set.add(f.key);
      if (f.fields) walk(f.fields);
    }
  };
  walk(fields);
  return set;
}
