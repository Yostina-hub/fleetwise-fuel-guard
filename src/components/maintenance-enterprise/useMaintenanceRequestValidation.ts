/**
 * useMaintenanceRequestValidation
 * -------------------------------
 * Per-field error + touched tracking for the Create Work Request dialog.
 * Mirrors `useFuelRequestValidation` and `useVehicleRequestValidation` so all
 * operational request forms share the same blur / submit / showAllErrors
 * semantics.
 */
import { useCallback, useState } from "react";
import {
  validateMRField,
  validateMaintenanceRequestForm,
  type MRFieldName,
  type MRFormValues,
} from "./maintenanceRequestValidation";

export function useMaintenanceRequestValidation() {
  const [errors, setErrors] = useState<Partial<Record<MRFieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<MRFieldName, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const validateField = useCallback(
    (field: MRFieldName, value: unknown, ctx: Partial<MRFormValues> = {}) => {
      const msg = validateMRField(field, value, ctx);
      setErrors((prev) => {
        const next = { ...prev };
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
      const hasValue =
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0);
      if (hasValue) {
        setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
      }
      return msg;
    },
    [],
  );

  const handleBlur = useCallback(
    (field: MRFieldName, value: unknown, ctx: Partial<MRFormValues> = {}) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, value, ctx);
    },
    [validateField],
  );

  const validateAll = useCallback((values: MRFormValues) => {
    const result = validateMaintenanceRequestForm(values);
    setErrors(result.errors);
    setShowAllErrors(true);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(result.errors).forEach((k) => {
        next[k as MRFieldName] = true;
      });
      return next;
    });
    return result;
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
    setShowAllErrors(false);
  }, []);

  const getError = useCallback(
    (field: MRFieldName): string | undefined =>
      touched[field] || showAllErrors ? errors[field] : undefined,
    [errors, touched, showAllErrors],
  );

  const errorCount = Object.keys(errors).length;

  return {
    errors,
    touched,
    showAllErrors,
    errorCount,
    validateField,
    handleBlur,
    validateAll,
    reset,
    getError,
  };
}
