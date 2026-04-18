/**
 * Forms Module — zod schema builder
 * =================================
 *
 * Walks a FormSchema and produces a zod object schema that enforces:
 *   - per-field required/min/max/pattern
 *   - type coercion (numbers, dates) where appropriate
 *   - repeater shape (array of row objects)
 *   - skips fields hidden by `visibleWhen` (validated dynamically in renderer)
 *
 * The renderer calls this per-submit, passing only the currently-visible
 * fields, so hidden fields never block submission.
 */
import { z, ZodTypeAny } from "zod";
import type { BaseField, FormSchema } from "./schema";
import { isInputField } from "./schema";

function applyTextRules(s: z.ZodString, f: BaseField): z.ZodString {
  if (f.validation?.minLength != null) {
    s = s.min(f.validation.minLength, `Minimum ${f.validation.minLength} characters`);
  }
  if (f.validation?.maxLength != null) {
    s = s.max(f.validation.maxLength, `Maximum ${f.validation.maxLength} characters`);
  }
  if (f.validation?.pattern) {
    try {
      const re = new RegExp(f.validation.pattern);
      s = s.regex(re, f.validation.patternMessage || "Invalid format");
    } catch {
      // bad regex in schema → ignore rather than crash
    }
  }
  return s;
}

function buildScalar(f: BaseField): ZodTypeAny {
  const required = !!f.required;
  const requiredMsg = `${f.label} is required`;

  switch (f.type) {
    case "text":
    case "textarea":
    case "select":
    case "radio":
    case "date":
    case "datetime":
    case "time":
    case "vehicle":
    case "driver":
    case "asset":
    case "geofence":
    case "user": {
      let s = z.string().trim();
      s = applyTextRules(s, f);
      return required ? s.min(1, requiredMsg) : s.optional().or(z.literal(""));
    }
    case "email": {
      let s = z.string().trim().email("Invalid email");
      s = applyTextRules(s, f);
      return required ? s : s.optional().or(z.literal(""));
    }
    case "phone": {
      // Permissive — digits, spaces, +, -, ().
      let s = z.string().trim().regex(/^[+\d\s\-().]{4,}$/, "Invalid phone");
      s = applyTextRules(s, f);
      return required ? s : s.optional().or(z.literal(""));
    }
    case "number":
    case "currency": {
      let n = z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
        z.number({ invalid_type_error: "Must be a number" }),
      ) as unknown as z.ZodNumber;
      if (f.validation?.min != null) n = n.min(f.validation.min, `Minimum ${f.validation.min}`);
      if (f.validation?.max != null) n = n.max(f.validation.max, `Maximum ${f.validation.max}`);
      return required ? n : n.optional();
    }
    case "checkbox":
    case "switch": {
      const b = z.boolean();
      return required ? b.refine((v) => v === true, requiredMsg) : b.optional();
    }
    case "multiselect": {
      const arr = z.array(z.string());
      return required ? arr.min(1, requiredMsg) : arr.optional();
    }
    case "file": {
      const s = z.union([z.string(), z.array(z.string())]);
      return required ? s : s.optional();
    }
    default:
      return z.any().optional();
  }
}

function buildField(f: BaseField): ZodTypeAny | null {
  if (!isInputField(f.type)) return null;
  if (f.type === "repeater") {
    const rowShape: Record<string, ZodTypeAny> = {};
    for (const child of f.fields ?? []) {
      const c = buildField(child);
      if (c) rowShape[child.key] = c;
    }
    let arr = z.array(z.object(rowShape).passthrough());
    if (f.minRows != null) arr = arr.min(f.minRows, `Add at least ${f.minRows} row(s)`);
    if (f.maxRows != null) arr = arr.max(f.maxRows, `Maximum ${f.maxRows} row(s)`);
    return f.required ? arr : arr.optional();
  }
  return buildScalar(f);
}

/** Build a zod object schema for a flat list of currently-visible top-level
 *  fields. The renderer is responsible for flattening sections and skipping
 *  hidden fields before calling this. */
export function buildZodForFields(fields: BaseField[]): z.ZodObject<any> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) {
    if (f.type === "section") {
      // Section children are validated as siblings of the section itself.
      const inner = buildZodForFields(f.fields ?? []);
      Object.assign(shape, inner.shape);
      continue;
    }
    const z = buildField(f);
    if (z) shape[f.key] = z;
  }
  return z.object(shape).passthrough();
}

/** Top-level helper used by the renderer. */
export function buildZodSchema(schema: FormSchema): z.ZodObject<any> {
  return buildZodForFields(schema.fields);
}
