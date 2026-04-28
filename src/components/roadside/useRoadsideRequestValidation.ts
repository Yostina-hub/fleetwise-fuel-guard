/**
 * useRoadsideRequestValidation
 * ----------------------------
 * Per-field error + touched tracking for the New Roadside Assistance dialog.
 * Mirrors the fuel/vehicle/maintenance request hooks for a consistent UX.
 */
import { useCallback, useState } from "react";
import {
  validateRSField,
  validateRoadsideRequestForm,
  type RSFieldName,
  type RSFormValues,
} from "./roadsideRequestValidation";

export function useRoadsideRequestValidation() {
  const [errors, setErrors] = useState<Partial<Record<RSFieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<RSFieldName, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const validateField = useCallback(
    (field: RSFieldName, value: unknown, ctx: Partial<RSFormValues> = {}) => {
      const msg = validateRSField(field, value, ctx);
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
    (field: RSFieldName, value: unknown, ctx: Partial<RSFormValues> = {}) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, value, ctx);
    },
    [validateField],
  );

  const validateAll = useCallback((values: RSFormValues) => {
    const result = validateRoadsideRequestForm(values);
    setErrors(result.errors);
    setShowAllErrors(true);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(result.errors).forEach((k) => {
        next[k as RSFieldName] = true;
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
    (field: RSFieldName): string | undefined =>
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
