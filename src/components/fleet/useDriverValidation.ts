/**
 * useDriverValidation
 * -------------------
 * Tracks per-field errors + "touched" state for the driver registration form.
 * Fields validate on blur (after user interaction) and on submit.
 */
import { useCallback, useState } from "react";
import {
  validateDriverField,
  validateDriverForm,
  type DriverFieldName,
} from "./driverValidation";

export function useDriverValidation() {
  const [errors, setErrors] = useState<Partial<Record<DriverFieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<DriverFieldName, boolean>>>({});

  const validateField = useCallback((field: DriverFieldName, value: unknown) => {
    const msg = validateDriverField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
    return msg;
  }, []);

  const handleBlur = useCallback(
    (field: DriverFieldName, value: unknown) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, value);
    },
    [validateField],
  );

  const validateAll = useCallback((formData: Record<string, unknown>) => {
    const result = validateDriverForm(formData);
    setErrors(result.errors);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(result.errors).forEach((k) => {
        next[k as DriverFieldName] = true;
      });
      return next;
    });
    return result;
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getError = useCallback(
    (field: DriverFieldName): string | undefined =>
      touched[field] ? errors[field] : undefined,
    [errors, touched],
  );

  const errorCount = Object.keys(errors).length;

  return { errors, touched, errorCount, validateField, handleBlur, validateAll, reset, getError };
}
