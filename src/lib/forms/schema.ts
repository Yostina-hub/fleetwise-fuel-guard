/**
 * Forms Module — Schema Specification
 * ====================================
 *
 * The canonical TypeScript shape for the JSONB stored in `form_versions.schema`.
 * The Editor produces this shape, and the Renderer consumes it.
 *
 * Versioning: `version` allows safe future migrations of the schema shape.
 */

// ---------- Field types ---------------------------------------------------

export type StandardFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "email"
  | "phone"
  | "date"
  | "datetime"
  | "time"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "switch"
  | "file";

export type EntityFieldType =
  | "vehicle"
  | "driver"
  | "asset"
  | "geofence"
  | "user";

export type StructuralFieldType =
  | "section"
  | "repeater"
  | "divider"
  | "info_banner";

export type ComputedFieldType = "computed";

export type FieldType =
  | StandardFieldType
  | EntityFieldType
  | StructuralFieldType
  | ComputedFieldType;

// ---------- Validation ----------------------------------------------------

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // regex source
  patternMessage?: string;
}

// ---------- Logic (conditional visibility) -------------------------------

export type LogicOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "is_empty"
  | "is_filled";

export interface VisibilityRule {
  /** Stable key of the field whose value drives this rule. */
  field: string;
  operator: LogicOperator;
  /** Comparison value (string | number | boolean | array). Not required for
   *  `is_empty` / `is_filled`. */
  value?: unknown;
}

// ---------- Computed expression ------------------------------------------

export interface ComputedSpec {
  /**
   * A simple expression with `{{field_key}}` placeholders, math operators
   * `+ - * /`, parentheses, numeric literals, and the aggregate helpers
   *   SUM(repeater_key.field_key)
   *   COUNT(repeater_key)
   * Evaluated by `evalExpression()` at render time.
   */
  expression: string;
  /** The result type — controls formatting in the UI. */
  resultType?: "number" | "currency" | "text";
}

// ---------- Option (for select / radio / multiselect) ---------------------

export interface FieldOption {
  label: string;
  value: string;
}

// ---------- Field definitions --------------------------------------------

export interface BaseField {
  id: string;        // editor-only stable id (uuid)
  key: string;       // identifier used in submission data
  type: FieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  validation?: FieldValidation;
  options?: FieldOption[];
  visibleWhen?: VisibilityRule;
  computedFrom?: ComputedSpec;
  /** Layout — 1 (half-width on md+) or 2 (full width). Default 2. */
  layout?: { colSpan?: 1 | 2 };
  /** For info_banner — markdown content (sanitized at render). */
  content?: string;
  /** For repeater fields. */
  minRows?: number;
  maxRows?: number;
  /** Section / repeater children. */
  fields?: BaseField[];
}

// ---------- Form-level settings ------------------------------------------

export interface FormSettings {
  submitLabel?: string;
  cancelLabel?: string;
  successMessage?: string;
  /** Render in compact two-column grid (md+). Default true. */
  twoColumnLayout?: boolean;
}

// ---------- Top-level schema ---------------------------------------------

export interface FormSchema {
  version: number;
  fields: BaseField[];
}

export const EMPTY_SCHEMA: FormSchema = { version: 1, fields: [] };
export const EMPTY_SETTINGS: FormSettings = {
  submitLabel: "Submit",
  cancelLabel: "Cancel",
  successMessage: "Submitted successfully.",
  twoColumnLayout: true,
};

// ---------- Helpers -------------------------------------------------------

/** Walks a schema tree and yields every field (including nested) with its
 *  parent context. Useful for collecting keys, building zod schemas, etc. */
export function* walkFields(
  fields: BaseField[],
  parent: { repeaterKey?: string } = {},
): Generator<{ field: BaseField; parent: typeof parent }> {
  for (const f of fields) {
    yield { field: f, parent };
    if (f.type === "section" && f.fields?.length) {
      yield* walkFields(f.fields, parent);
    }
    if (f.type === "repeater" && f.fields?.length) {
      yield* walkFields(f.fields, { repeaterKey: f.key });
    }
  }
}

/** Returns true if a field actually collects user input (vs structural). */
export function isInputField(type: FieldType): boolean {
  return ![
    "section",
    "repeater",
    "divider",
    "info_banner",
    "computed",
  ].includes(type);
}
