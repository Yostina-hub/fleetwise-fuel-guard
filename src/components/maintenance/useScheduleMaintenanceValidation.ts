/**
 * useScheduleMaintenanceValidation — touched-state + per-field error tracking
 * for the Schedule Maintenance dialog. Mirrors the Inspection / Tire hooks.
 */
import { useCallback, useMemo, useState } from "react";
import {
  scheduleMaintenanceSchema,
  scheduleMaintenancePayload,
  validateScheduleMaintenanceField,
  type ScheduleMaintenanceFieldKey,
  type ScheduleMaintenanceValues,
} from "./scheduleMaintenanceValidation";

type Touched = Partial<Record<ScheduleMaintenanceFieldKey, boolean>>;
type Errors = Partial<Record<ScheduleMaintenanceFieldKey, string>>;

export const useScheduleMaintenanceValidation = (
  values: Partial<ScheduleMaintenanceValues>,
) => {
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allErrors: Errors = useMemo(() => {
    const result = scheduleMaintenanceSchema.safeParse(
      scheduleMaintenancePayload(values),
    );
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as ScheduleMaintenanceFieldKey | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [values]);

  const visibleErrors: Errors = useMemo(() => {
    const out: Errors = {};
    (Object.keys(allErrors) as ScheduleMaintenanceFieldKey[]).forEach((k) => {
      if (submitAttempted || touched[k]) out[k] = allErrors[k];
    });
    return out;
  }, [allErrors, touched, submitAttempted]);

  const markTouched = useCallback((field: ScheduleMaintenanceFieldKey) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    setSubmitAttempted(true);
    setTouched({
      vehicle_id: true,
      service_type: true,
      interval_type: true,
      interval_value: true,
      priority: true,
      reminder_days_before: true,
      reminder_km_before: true,
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
    validateField: validateScheduleMaintenanceField,
    reset,
    submitAttempted,
  };
};
