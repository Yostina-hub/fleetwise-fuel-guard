/**
 * useVehicleRequestValidation
 * ---------------------------
 * Per-field error + touched tracking for the Fleet (Vehicle) Request form.
 * Validates on blur and on submit; exposes `getError(field)` so inputs only
 * show messages after the user has interacted with that field.
 */
import { useCallback, useState } from "react";
import {
  validateVRField,
  validateVehicleRequestForm,
  type VRFieldName,
  type VRFormValues,
} from "./vehicleRequestValidation";

export function useVehicleRequestValidation() {
  const [errors, setErrors] = useState<Partial<Record<VRFieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<VRFieldName, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const validateField = useCallback(
    (field: VRFieldName, value: unknown, ctx: Partial<VRFormValues> = {}) => {
      const msg = validateVRField(field, value, ctx);
      setErrors((prev) => {
        const next = { ...prev };
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
      // Auto-mark as touched once the user has supplied any value, so the
      // error message becomes visible without requiring an explicit blur.
      const hasValue =
        value !== undefined && value !== null && value !== "" &&
        !(Array.isArray(value) && value.length === 0);
      if (hasValue) {
        setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
      }
      return msg;
    },
    [],
  );

  const handleBlur = useCallback(
    (field: VRFieldName, value: unknown, ctx: Partial<VRFormValues> = {}) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, value, ctx);
    },
    [validateField],
  );

  const validateAll = useCallback((values: VRFormValues) => {
    const result = validateVehicleRequestForm(values);
    setErrors(result.errors);
    setShowAllErrors(true);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(result.errors).forEach((k) => {
        next[k as VRFieldName] = true;
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
    (field: VRFieldName): string | undefined =>
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
