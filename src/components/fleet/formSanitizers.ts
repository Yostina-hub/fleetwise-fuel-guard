/**
 * Shared sanitization helpers for the vehicle/driver registration forms.
 * Mirrors the style used in InviteUserDialog so all "create" forms behave
 * consistently.
 */

/** Strip ASCII control chars (except \n, \t) and trim ends. */
export const sanitizeText = (v: string): string =>
  v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

/** Same as sanitizeText but preserves leading/trailing single space while typing.
 *  Useful for fields where final trim happens onBlur. */
export const sanitizeWhileTyping = (v: string): string =>
  v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

/** Email: lowercase + strip whitespace + control chars. */
export const sanitizeEmail = (v: string): string =>
  sanitizeText(v).toLowerCase().replace(/\s+/g, "");

/** Full name: collapse internal whitespace, allow letters/spaces/'-./. */
export const sanitizeFullName = (v: string): string =>
  sanitizeWhileTyping(v).replace(/\s+/g, " ").slice(0, 200);

/** Phone: keep digits, +, spaces, dashes, parens, dots — strip everything else. */
export const sanitizePhone = (v: string): string =>
  sanitizeWhileTyping(v).replace(/[^+\d\s\-().]/g, "").slice(0, 20);

/** VIN: uppercase, alphanumerics only, strip I/O/Q (invalid in VINs). */
export const sanitizeVin = (v: string): string =>
  sanitizeWhileTyping(v).toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);

/** Plate digits part: digits only. */
export const sanitizePlateDigits = (v: string): string =>
  v.replace(/\D/g, "").slice(0, 5);

/** Numeric input: digits, optional minus, single decimal point. */
export const sanitizeNumeric = (v: string, opts?: { integer?: boolean; allowNegative?: boolean }) => {
  let cleaned = sanitizeWhileTyping(v);
  // Strip everything except digits, optional decimal, optional leading minus
  const allow = opts?.integer ? /[^\d-]/g : /[^\d.-]/g;
  cleaned = cleaned.replace(allow, "");
  if (!opts?.allowNegative) cleaned = cleaned.replace(/-/g, "");
  // Ensure single leading minus only
  cleaned = cleaned.replace(/(?!^)-/g, "");
  // Single decimal point
  if (!opts?.integer) {
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return cleaned;
};

/** Compose className for an input based on its validation status. */
export const inputStatusClass = (status: "neutral" | "success" | "error"): string => {
  if (status === "error") return "border-destructive focus-visible:ring-destructive/30";
  if (status === "success") return "border-success/60 focus-visible:ring-success/30";
  return "";
};
