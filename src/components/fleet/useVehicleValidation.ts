/**
 * useVehicleValidation
 * --------------------
 * Tracks per-field errors + "touched" state for the vehicle registration form.
 * Fields validate on blur (after user interaction) and on submit.
 */
import { useCallback, useState } from "react";
import {
  validateVehicleField,
  validateVehicleForm,
  type VehicleFieldName,
} from "./vehicleValidation";

export function useVehicleValidation() {
  const [errors, setErrors] = useState<Partial<Record<VehicleFieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<VehicleFieldName, boolean>>>({});

  const validateField = useCallback((field: VehicleFieldName, value: unknown) => {
    const msg = validateVehicleField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
    return msg;
  }, []);

  const handleBlur = useCallback(
    (field: VehicleFieldName, value: unknown) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, value);
    },
    [validateField],
  );

  const validateAll = useCallback((formData: Record<string, unknown>) => {
    const result = validateVehicleForm(formData);
    setErrors(result.errors);
    // Mark every errored field as touched so messages show.
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(result.errors).forEach((k) => {
        next[k as VehicleFieldName] = true;
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
    (field: VehicleFieldName): string | undefined => (touched[field] ? errors[field] : undefined),
    [errors, touched],
  );

  return { errors, touched, validateField, handleBlur, validateAll, reset, getError };
}
