/**
 * useInspectionValidation — touched-state + per-field error tracking for the
 * Vehicle Inspection form. Mirrors the Fuel / Maintenance / Roadside hooks.
 */
import { useCallback, useMemo, useState } from "react";
import {
  inspectionSchema,
  validateInspectionField,
  type InspectionFieldKey,
  type InspectionFormValues,
} from "./inspectionValidation";

type Touched = Partial<Record<InspectionFieldKey, boolean>>;
type Errors = Partial<Record<InspectionFieldKey, string>>;

export const useInspectionValidation = (
  values: Partial<InspectionFormValues> & { has_failures?: boolean },
) => {
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allErrors: Errors = useMemo(() => {
    const result = inspectionSchema.safeParse({
      vehicle_id: values.vehicle_id ?? "",
      driver_id: values.driver_id ?? "",
      inspection_type: values.inspection_type ?? "pre_trip",
      odometer_km: values.odometer_km,
      defects_text: values.defects_text ?? "",
      mechanic_notes: values.mechanic_notes ?? "",
      certified_safe: values.certified_safe ?? true,
      has_failures: values.has_failures ?? false,
    });
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as InspectionFieldKey | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [values]);

  const visibleErrors: Errors = useMemo(() => {
    const out: Errors = {};
    (Object.keys(allErrors) as InspectionFieldKey[]).forEach((k) => {
      if (submitAttempted || touched[k]) out[k] = allErrors[k];
    });
    return out;
  }, [allErrors, touched, submitAttempted]);

  const markTouched = useCallback((field: InspectionFieldKey) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    setSubmitAttempted(true);
    setTouched({
      vehicle_id: true,
      driver_id: true,
      inspection_type: true,
      odometer_km: true,
      defects_text: true,
      mechanic_notes: true,
      certified_safe: true,
    });
  }, []);

  const validateAll = useCallback(() => {
    return Object.keys(allErrors).length === 0;
  }, [allErrors]);

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
    validateField: validateInspectionField,
    reset,
    submitAttempted,
  };
};
