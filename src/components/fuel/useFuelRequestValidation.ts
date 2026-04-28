/**
 * useFuelRequestValidation
 * ------------------------
 * Per-field error + touched tracking for the Fuel Request dialog.
 * Mirrors `useVehicleRequestValidation` so every operational request form
 * shares the same blur / submit / showAllErrors semantics.
 */
import { useCallback, useState } from "react";
import {
  validateFRField,
  validateFuelRequestForm,
  type FRFieldName,
  type FRFormValues,
} from "./fuelRequestValidation";

export function useFuelRequestValidation() {
  const [errors, setErrors] = useState<Partial<Record<FRFieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FRFieldName, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const validateField = useCallback(
    (field: FRFieldName, value: unknown, ctx: Partial<FRFormValues> = {}) => {
      const msg = validateFRField(field, value, ctx);
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
    (field: FRFieldName, value: unknown, ctx: Partial<FRFormValues> = {}) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, value, ctx);
    },
    [validateField],
  );

  const validateAll = useCallback((values: FRFormValues) => {
    const result = validateFuelRequestForm(values);
    setErrors(result.errors);
    setShowAllErrors(true);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(result.errors).forEach((k) => {
        next[k as FRFieldName] = true;
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
    (field: FRFieldName): string | undefined =>
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
