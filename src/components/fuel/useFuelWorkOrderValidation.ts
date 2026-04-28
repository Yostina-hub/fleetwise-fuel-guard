/**
 * useFuelWorkOrderValidation — touched-state + per-field error tracking
 * for the Fuel Work Order dialog. Targeted at the mandatory header fields.
 */
import { useCallback, useMemo, useState } from "react";
import {
  fuelWorkOrderSchema,
  buildFuelWorkOrderPayload,
  validateFuelWorkOrderField,
  type FuelWorkOrderFieldKey,
  type FuelWorkOrderValues,
} from "./fuelWorkOrderValidation";

type Touched = Partial<Record<FuelWorkOrderFieldKey, boolean>>;
type Errors = Partial<Record<FuelWorkOrderFieldKey, string>>;

const FIELDS: FuelWorkOrderFieldKey[] = [
  "work_order_number",
  "asset_number",
  "asset_group",
  "wip_accounting_class",
  "asset_activity",
  "scheduled_start_date",
  "scheduled_completion_date",
  "duration",
  "priority",
  "wo_status",
  "emoney_amount",
];

export const useFuelWorkOrderValidation = (
  values: Partial<FuelWorkOrderValues>,
) => {
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allErrors: Errors = useMemo(() => {
    const result = fuelWorkOrderSchema.safeParse(
      buildFuelWorkOrderPayload(values),
    );
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as FuelWorkOrderFieldKey | undefined;
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

  const markTouched = useCallback((field: FuelWorkOrderFieldKey) => {
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
    validateField: validateFuelWorkOrderField,
    reset,
    submitAttempted,
  };
};
