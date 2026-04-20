/**
 * useVehicleValidation
 * --------------------
 * Vehicle registration form validation — mirrors the InviteUserDialog UX:
 *
 *   1. Sanitize-on-change (controlled input strips control chars / normalizes).
 *   2. Validate on blur — mark the field touched and surface the first error.
 *   3. Re-validate on change after the field has been touched, so the error
 *      message updates live while the user fixes it.
 *   4. Per-field success state for the green check indicator.
 *   5. Final submit: validateAll() marks every errored field as touched.
 */
import { useCallback, useState } from "react";
import {
  validateVehicleField,
  validateVehicleForm,
  type VehicleFieldName,
} from "./vehicleValidation";

export type FieldStatus = "neutral" | "success" | "error";

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

  /** Call from onChange — only re-validates if the field has already been touched. */
  const handleChange = useCallback(
    (field: VehicleFieldName, value: unknown) => {
      setTouched((prev) => {
        if (!prev[field]) return prev;
        return prev;
      });
      // Use functional read of touched via state to avoid stale closure
      setErrors((prevErrors) => {
        // We only want to update the error if the field is touched; check via touched state
        // through a local read using a setTouched no-op is awkward, so do it here:
        return prevErrors;
      });
      // Re-validate; the gate on `touched` happens in the inputs themselves
      // (we still recompute so callers can decide). Cheap.
      const msg = validateVehicleField(field, value);
      setErrors((prev) => {
        const next = { ...prev };
        // Only show/clear the error if the user has interacted with this field.
        // Reading touched directly here would be stale; instead, always update —
        // the UI gates display on `touched[field]` via getError().
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
      return msg;
    },
    [],
  );

  const validateAll = useCallback((formData: Record<string, unknown>) => {
    const result = validateVehicleForm(formData);
    setErrors(result.errors);
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

  /** Error message ONLY if field is touched (don't shout at users before they interact). */
  const getError = useCallback(
    (field: VehicleFieldName): string | undefined => (touched[field] ? errors[field] : undefined),
    [errors, touched],
  );

  /** Field status for visual indicators (success check / error border). */
  const getStatus = useCallback(
    (field: VehicleFieldName, value: unknown): FieldStatus => {
      if (!touched[field]) return "neutral";
      if (errors[field]) return "error";
      // touched + no error + has a non-empty value → success
      if (value !== undefined && value !== null && String(value).trim() !== "") return "success";
      return "neutral";
    },
    [errors, touched],
  );

  return {
    errors,
    touched,
    validateField,
    handleBlur,
    handleChange,
    validateAll,
    reset,
    getError,
    getStatus,
  };
}
