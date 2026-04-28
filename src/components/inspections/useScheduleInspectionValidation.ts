/**
 * useScheduleInspectionValidation — touched-state + per-field error tracking
 * for the Schedule Inspection dialog.
 */
import { useCallback, useMemo, useState } from "react";
import {
  scheduleInspectionSchema,
  scheduleInspectionPayload,
  validateScheduleInspectionField,
  type ScheduleInspectionFieldKey,
  type ScheduleInspectionValues,
} from "./scheduleInspectionValidation";

type Touched = Partial<Record<ScheduleInspectionFieldKey, boolean>>;
type Errors = Partial<Record<ScheduleInspectionFieldKey, string>>;

export const useScheduleInspectionValidation = (
  values: Partial<ScheduleInspectionValues>,
) => {
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allErrors: Errors = useMemo(() => {
    const result = scheduleInspectionSchema.safeParse(
      scheduleInspectionPayload(values),
    );
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as ScheduleInspectionFieldKey | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [values]);

  const visibleErrors: Errors = useMemo(() => {
    const out: Errors = {};
    (Object.keys(allErrors) as ScheduleInspectionFieldKey[]).forEach((k) => {
      if (submitAttempted || touched[k]) out[k] = allErrors[k];
    });
    return out;
  }, [allErrors, touched, submitAttempted]);

  const markTouched = useCallback((field: ScheduleInspectionFieldKey) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    setSubmitAttempted(true);
    setTouched({
      vehicle_id: true,
      inspection_type: true,
      inspection_date: true,
      inspector: true,
      notes: true,
    });
  }, []);

  const validateAll = useCallback(
    () => Object.keys(allErrors).length === 0,
    [allErrors],
  );

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
    validateField: validateScheduleInspectionField,
    reset,
    submitAttempted,
  };
};
