/**
 * useTireRequestValidation — touched-state + per-field error tracking.
 */
import { useCallback, useMemo, useState } from "react";
import {
  tireRequestSchema,
  validateTireField,
  type TireRequestFieldKey,
  type TireRequestFormValues,
} from "./tireRequestValidation";

type Touched = Partial<Record<TireRequestFieldKey, boolean>>;
type Errors = Partial<Record<TireRequestFieldKey, string>>;

const ALL_FIELDS: TireRequestFieldKey[] = [
  "vehicle_id", "assigned_department_id", "requestor_department_id",
  "request_type", "priority",
  "request_by_start_date", "request_by_completion_date",
  "additional_description", "notes", "reason", "estimated_cost",
  "km_reading", "driver_type", "driver_name", "driver_phone",
  "fuel_level_in_tank", "contact_phone", "contact_email", "contact_preference",
];

export const useTireRequestValidation = (values: Partial<TireRequestFormValues>) => {
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allErrors: Errors = useMemo(() => {
    const result = tireRequestSchema.safeParse({
      vehicle_id: values.vehicle_id ?? "",
      assigned_department_id: values.assigned_department_id ?? "",
      requestor_department_id: values.requestor_department_id ?? "",
      request_type: values.request_type ?? "replacement",
      priority: values.priority ?? "normal",
      request_by_start_date: values.request_by_start_date ?? "",
      request_by_completion_date: values.request_by_completion_date ?? "",
      additional_description: values.additional_description ?? "",
      notes: values.notes ?? "",
      reason: values.reason ?? "",
      estimated_cost: values.estimated_cost ?? "",
      km_reading: values.km_reading ?? "",
      driver_type: (values.driver_type as any) ?? undefined,
      driver_name: values.driver_name ?? "",
      driver_phone: values.driver_phone ?? "",
      fuel_level_in_tank: (values.fuel_level_in_tank as any) ?? undefined,
      contact_phone: values.contact_phone ?? "",
      contact_email: values.contact_email ?? "",
      contact_preference: values.contact_preference ?? "",
    });
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as TireRequestFieldKey | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [values]);

  const visibleErrors: Errors = useMemo(() => {
    const out: Errors = {};
    (Object.keys(allErrors) as TireRequestFieldKey[]).forEach((k) => {
      if (submitAttempted || touched[k]) out[k] = allErrors[k];
    });
    return out;
  }, [allErrors, touched, submitAttempted]);

  const markTouched = useCallback((field: TireRequestFieldKey) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    setSubmitAttempted(true);
    const t: Touched = {};
    ALL_FIELDS.forEach((k) => { t[k] = true; });
    setTouched(t);
  }, []);

  const validateAll = useCallback(() => Object.keys(allErrors).length === 0, [allErrors]);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitAttempted(false);
  }, []);

  return {
    errors: visibleErrors,
    allErrors,
    invalidCount: Object.keys(allErrors).length,
    touched,
    markTouched,
    markAllTouched,
    validateAll,
    validateField: validateTireField,
    reset,
    submitAttempted,
  };
};
