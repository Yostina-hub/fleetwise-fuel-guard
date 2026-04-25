/**
 * useFieldValidation
 * ------------------
 * Generic on-blur / on-touched-change Zod field validation.
 *
 * Behavior (mirrors useVehicleValidation):
 *   1. Validate a single field on blur — mark touched and surface the first error.
 *   2. Re-validate the field on change AFTER it has been touched, so the error
 *      message updates live while the user is fixing it.
 *   3. validateAll() on submit marks every errored field as touched.
 *   4. getError(field) returns a string ONLY if the field has been touched
 *      (so we don't shout at users before they've interacted).
 *   5. getStatus(field, value) drives visual indicators (success / error border).
 *
 * Usage:
 *   const schema = z.object({ name: z.string().min(1, "Required") });
 *   const v = useFieldValidation(schema);
 *
 *   <Input
 *     value={form.name}
 *     onChange={(e) => { setForm({ ...form, name: e.target.value }); v.handleChange("name", e.target.value); }}
 *     onBlur={() => v.handleBlur("name", form.name)}
 *     aria-invalid={!!v.getError("name")}
 *   />
 *   {v.getError("name") && <p className="text-destructive text-sm">{v.getError("name")}</p>}
 *
 *   const onSubmit = () => {
 *     const result = v.validateAll(form);
 *     if (!result.success) return;
 *     // submit result.data
 *   };
 */
import { useCallback, useMemo, useState } from "react";
import type { z, ZodTypeAny } from "zod";

export type FieldStatus = "neutral" | "success" | "error";

type ErrorsMap<T extends string> = Partial<Record<T, string>>;
type TouchedMap<T extends string> = Partial<Record<T, boolean>>;

export interface UseFieldValidationResult<S extends ZodTypeAny> {
  errors: ErrorsMap<keyof z.infer<S> & string>;
  touched: TouchedMap<keyof z.infer<S> & string>;
  /** Validate one field — usually called from handleBlur / handleChange. */
  validateField: (field: keyof z.infer<S> & string, value: unknown) => string | undefined;
  /** Mark touched + validate. Wire to <input onBlur>. */
  handleBlur: (field: keyof z.infer<S> & string, value: unknown) => string | undefined;
  /** Re-validate iff already touched. Wire to <input onChange> after updating local state. */
  handleChange: (field: keyof z.infer<S> & string, value: unknown) => void;
  /** Validate the whole form. Marks all errored fields as touched. */
  validateAll: (
    formData: Record<string, unknown>,
  ) =>
    | { success: true; data: z.infer<S>; errors: Record<string, never> }
    | { success: false; data: null; errors: ErrorsMap<keyof z.infer<S> & string> };
  reset: () => void;
  /** Returns error message ONLY if field is touched. */
  getError: (field: keyof z.infer<S> & string) => string | undefined;
  /** Visual status for inputs: neutral / error / success. */
  getStatus: (field: keyof z.infer<S> & string, value: unknown) => FieldStatus;
  /** True if there is any visible (touched) error. */
  hasVisibleErrors: boolean;
}

/**
 * Build a validator for a single field by parsing the whole object schema and
 * picking out the first issue whose path starts with that field. This works
 * for any z.object schema without needing to extract sub-schemas (which is
 * messy with .refine, .superRefine, discriminated unions, etc.).
 */
function validateOneField<S extends ZodTypeAny>(
  schema: S,
  field: string,
  value: unknown,
  contextFormData?: Record<string, unknown>,
): string | undefined {
  // Build a minimal object with the value under the field key, merged with
  // any context data so cross-field refinements have what they need.
  const candidate = { ...(contextFormData ?? {}), [field]: value };
  const result = schema.safeParse(candidate);
  if (result.success) return undefined;
  const issue = result.error.issues.find((iss) => iss.path[0] === field);
  return issue?.message;
}

export function useFieldValidation<S extends ZodTypeAny>(
  schema: S,
  /** Optional: a getter for current form data, used so cross-field refines work on blur. */
  getFormData?: () => Record<string, unknown>,
): UseFieldValidationResult<S> {
  type FieldName = keyof z.infer<S> & string;

  const [errors, setErrors] = useState<ErrorsMap<FieldName>>({});
  const [touched, setTouched] = useState<TouchedMap<FieldName>>({});

  const validateField = useCallback(
    (field: FieldName, value: unknown) => {
      const msg = validateOneField(schema, field, value, getFormData?.());
      setErrors((prev) => {
        const next = { ...prev };
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
      return msg;
    },
    [schema, getFormData],
  );

  const handleBlur = useCallback(
    (field: FieldName, value: unknown) => {
      setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
      return validateField(field, value);
    },
    [validateField],
  );

  const handleChange = useCallback(
    (field: FieldName, value: unknown) => {
      // Re-validate to keep message fresh, but `getError` gates display on `touched`.
      const msg = validateOneField(schema, field, value, getFormData?.());
      setErrors((prev) => {
        const next = { ...prev };
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
    },
    [schema, getFormData],
  );

  const validateAll = useCallback(
    (formData: Record<string, unknown>) => {
      const result = schema.safeParse(formData);
      if (result.success) {
        setErrors({});
        return { success: true as const, data: result.data, errors: {} as Record<string, never> };
      }
      const fieldErrors: ErrorsMap<FieldName> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "") as FieldName;
        if (!key) continue;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setTouched((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(fieldErrors)) next[k as FieldName] = true;
        return next;
      });
      return { success: false as const, data: null, errors: fieldErrors };
    },
    [schema],
  );

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getError = useCallback(
    (field: FieldName) => (touched[field] ? errors[field] : undefined),
    [errors, touched],
  );

  const getStatus = useCallback(
    (field: FieldName, value: unknown): FieldStatus => {
      if (!touched[field]) return "neutral";
      if (errors[field]) return "error";
      if (value !== undefined && value !== null && String(value).trim() !== "") return "success";
      return "neutral";
    },
    [errors, touched],
  );

  const hasVisibleErrors = useMemo(
    () => Object.keys(errors).some((k) => touched[k as FieldName]),
    [errors, touched],
  );

  return {
    errors,
    touched,
    validateField,
    handleBlur,
    handleChange,
    validateAll,
    reset,
    getError,
    getStatus,
    hasVisibleErrors,
  };
}
