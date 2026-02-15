/**
 * Shared input validation utilities for edge functions.
 *
 * Provides type-safe validation with clear error messages.
 * All validators return { valid, error } objects.
 */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ── String validators ───────────────────────────────────────────────

/** Validate a required string field with length limits. */
export function validateString(
  value: unknown,
  fieldName: string,
  opts: { minLength?: number; maxLength?: number; required?: boolean } = {}
): ValidationResult {
  const { minLength = 1, maxLength = 1000, required = true } = opts;

  if (value === undefined || value === null) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true };
  }

  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();
  if (required && trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
  }

  return { valid: true };
}

// ── Email validator ─────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: unknown, fieldName = "email"): ValidationResult {
  const strCheck = validateString(value, fieldName, { maxLength: 255 });
  if (!strCheck.valid) return strCheck;

  if (!EMAIL_REGEX.test(value as string)) {
    return { valid: false, error: `${fieldName} is not a valid email address` };
  }

  return { valid: true };
}

// ── UUID validator ──────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(value: unknown, fieldName = "id"): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    return { valid: false, error: `${fieldName} must be a valid UUID` };
  }

  return { valid: true };
}

/** Validate an optional UUID (allows null/undefined). */
export function validateOptionalUUID(value: unknown, fieldName = "id"): ValidationResult {
  if (value === undefined || value === null) return { valid: true };
  return validateUUID(value, fieldName);
}

// ── Number validators ───────────────────────────────────────────────

export function validateNumber(
  value: unknown,
  fieldName: string,
  opts: { min?: number; max?: number; required?: boolean; integer?: boolean } = {}
): ValidationResult {
  const { min, max, required = true, integer = false } = opts;

  if (value === undefined || value === null) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true };
  }

  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (integer && !Number.isInteger(value)) {
    return { valid: false, error: `${fieldName} must be an integer` };
  }

  if (min !== undefined && value < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true };
}

// ── Phone number validator ──────────────────────────────────────────

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

export function validatePhone(value: unknown, fieldName = "phone"): ValidationResult {
  const strCheck = validateString(value, fieldName, { maxLength: 20 });
  if (!strCheck.valid) return strCheck;

  if (!PHONE_REGEX.test(value as string)) {
    return { valid: false, error: `${fieldName} is not a valid phone number` };
  }

  return { valid: true };
}

// ── Enum validator ──────────────────────────────────────────────────

export function validateEnum(
  value: unknown,
  fieldName: string,
  allowedValues: string[]
): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(", ")}` };
  }

  return { valid: true };
}

// ── Array validator ─────────────────────────────────────────────────

export function validateArray(
  value: unknown,
  fieldName: string,
  opts: { minLength?: number; maxLength?: number; required?: boolean } = {}
): ValidationResult {
  const { minLength = 0, maxLength = 100, required = true } = opts;

  if (value === undefined || value === null) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true };
  }

  if (!Array.isArray(value)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }

  if (value.length < minLength) {
    return { valid: false, error: `${fieldName} must have at least ${minLength} items` };
  }

  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} must have at most ${maxLength} items` };
  }

  return { valid: true };
}

// ── ISO date string validator ───────────────────────────────────────

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export function validateDateString(value: unknown, fieldName = "date"): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== "string" || !ISO_DATE_REGEX.test(value)) {
    return { valid: false, error: `${fieldName} must be a valid ISO date string` };
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }

  return { valid: true };
}

// ── Batch validation helper ─────────────────────────────────────────

/**
 * Run multiple validations and return the first error, or null if all pass.
 *
 * Usage:
 *   const error = validateAll(
 *     () => validateEmail(body.email),
 *     () => validateString(body.name, "name", { maxLength: 100 }),
 *     () => validateUUID(body.organizationId, "organizationId"),
 *   );
 *   if (error) return secureJsonResponse({ error }, req, 400);
 */
export function validateAll(
  ...validators: Array<() => ValidationResult>
): string | null {
  for (const validate of validators) {
    const result = validate();
    if (!result.valid) return result.error!;
  }
  return null;
}

// ── Sanitization helpers ────────────────────────────────────────────

/** Strip HTML tags from a string to prevent XSS in stored/emailed content. */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Truncate a string to a max length. */
export function truncate(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input;
}
