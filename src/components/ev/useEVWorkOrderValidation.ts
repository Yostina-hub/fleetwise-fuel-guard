/**
 * useEVWorkOrderValidation — touched-state + per-field error tracking
 * for the EV Work Order dialog. Targeted at mandatory header fields and
 * EV-specific safety constraints (SoC, energy, released-status gates).
 */
import { useCallback, useMemo, useState } from "react";
import {
  evWorkOrderSchema,
  buildEVWorkOrderPayload,
  validateEVWorkOrderField,
  type EVWorkOrderFieldKey,
  type EVWorkOrderValues,
} from "./evWorkOrderValidation";

type Touched = Partial<Record<EVWorkOrderFieldKey, boolean>>;
type Errors = Partial<Record<EVWorkOrderFieldKey, string>>;

const FIELDS: EVWorkOrderFieldKey[] = [
  "work_order_number",
  "vehicle_id",
  "asset_number",
  "asset_group",
  "wip_accounting_class",
  "scheduled_start_date",
  "scheduled_completion_date",
  "duration",
  "priority",
  "wo_status",
  "work_order_type",
  "charging_type",
  "current_soc_percent",
  "target_soc_percent",
  "energy_required_kwh",
  "energy_delivered_kwh",
  "cost_per_kwh",
  "estimated_cost",
  "actual_cost",
];

export const useEVWorkOrderValidation = (
  values: Partial<EVWorkOrderValues>,
) => {
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allErrors: Errors = useMemo(() => {
    const result = evWorkOrderSchema.safeParse(buildEVWorkOrderPayload(values));
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as EVWorkOrderFieldKey | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }, [values]);

  const visibleErrors: Errors = useMemo(() => {
    const out: Errors = {};
    FIELDS.forEach((k) => {
      if (allErrors[k] && (submitAttempted || touched[k])) {
        out[k] = allErrors[k];
      }
    });
    return out;
  }, [allErrors, touched, submitAttempted]);

  const markTouched = useCallback((field: EVWorkOrderFieldKey) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    setSubmitAttempted(true);
    setTouched(
      FIELDS.reduce((acc, k) => {
        acc[k] = true;
        return acc;
      }, {} as Touched),
    );
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
    validateField: validateEVWorkOrderField,
    reset,
    submitAttempted,
  };
};
