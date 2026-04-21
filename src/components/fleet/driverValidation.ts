/**
 * Driver Registration — Validation & Sanitization Schema
 * ======================================================
 * Single source of truth for field-level validation across the
 * driver registration & edit dialogs.
 *
 * - All string fields are trimmed (sanitization)
 * - Length caps prevent abuse + DB overflow
 * - Patterns enforce names, phones, IDs, license, email
 * - Used both for onBlur per-field validation AND final submit
 * - Error messages are field-specific (no generic "Invalid value")
 */
import { z } from "zod";

const MIN_AGE = 18;
const MAX_AGE = 80;

// Letters (incl. Amharic), spaces, hyphen, apostrophe, period
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
// Ethiopian local mobile format: 09XXXXXXXX (10 digits) or +2519XXXXXXXX
const ETH_PHONE_REGEX = /^(?:09\d{8}|\+2519\d{8})$/;
// Telebirr: typically 9 digits (without leading 0) or full 10-digit phone
const TELEBIRR_REGEX = /^(?:9\d{8}|09\d{8})$/;
// Ethiopian Fayda (FAN) National ID: exactly 12 digits.
// We strip spaces and dashes during validation so common formatting variants
// (e.g. "1234-5678-9012") still pass without surprising the operator.
const NATIONAL_ID_FAN_REGEX = /^\d{12}$/;

// ----- Reusable atoms with descriptive errors -----
const trimmedOptional = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

const trimmedRequired = (label: string, min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

const optionalDate = (label: string, opts?: { future?: boolean; past?: boolean }) =>
  z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || !Number.isNaN(Date.parse(v)),
      `${label} is not a valid date (use YYYY-MM-DD)`,
    )
    .refine(
      (v) => !v || (opts?.future ? new Date(v) > new Date() : true),
      `${label} must be a date in the future`,
    )
    .refine(
      (v) => !v || (opts?.past ? new Date(v) <= new Date() : true),
      `${label} cannot be in the future`,
    );

const numericOptional = (label: string, opts?: { min?: number; max?: number; integer?: boolean }) =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        const n = Number(v);
        if (Number.isNaN(n)) return false;
        if (opts?.integer && !Number.isInteger(n)) return false;
        if (opts?.min !== undefined && n < opts.min) return false;
        if (opts?.max !== undefined && n > opts.max) return false;
        return true;
      },
      {
        message: opts?.integer
          ? `${label} must be a whole number${opts?.min !== undefined ? ` (≥ ${opts.min})` : ""}${opts?.max !== undefined ? ` and ≤ ${opts.max}` : ""}`
          : `${label} must be a number${opts?.min !== undefined ? ` ≥ ${opts.min}` : ""}${opts?.max !== undefined ? ` and ≤ ${opts.max}` : ""}`,
      },
    );

/** Per-field schemas — keyed by formData field name. */
export const driverFieldSchemas = {
  // ----- Personal -----
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name must be 100 characters or fewer")
    .regex(NAME_REGEX, "First name may only contain letters, spaces, hyphens, and apostrophes"),
  middle_name: z
    .string()
    .trim()
    .min(2, "Middle name must be at least 2 characters")
    .max(100, "Middle name must be 100 characters or fewer")
    .regex(NAME_REGEX, "Middle name may only contain letters, spaces, hyphens, and apostrophes"),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name must be 100 characters or fewer")
    .regex(NAME_REGEX, "Last name may only contain letters, spaces, hyphens, and apostrophes"),
  gender: trimmedOptional("Gender", 20),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(ETH_PHONE_REGEX, "Phone must be Ethiopian: 09XXXXXXXX (10 digits) or +2519XXXXXXXX"),
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or fewer")
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email address (e.g. name@example.com)",
    ),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Date of birth is not a valid date")
    .refine(
      (v) => {
        if (!v) return true;
        const dob = new Date(v);
        const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= MIN_AGE && age <= MAX_AGE;
      },
      `Driver age must be between ${MIN_AGE} and ${MAX_AGE} years`,
    ),
  employee_id: z
    .string()
    .trim()
    .max(50, "Employee ID must be 50 characters or fewer")
    .optional()
    .or(z.literal("")),

  // ----- Address -----
  address_region: trimmedOptional("Region", 100),
  address_zone: trimmedOptional("Zone", 100),
  address_woreda: trimmedOptional("Woreda", 100),
  address_specific: trimmedOptional("Specific address", 500),

  // ----- Legal & Verification -----
  // driver_type now REQUIRED with explicit selection (no default) per #15
  driver_type: z
    .string()
    .trim()
    .min(1, "Please select a driver type — no default is set"),
  govt_id_type: trimmedRequired("ID type"),
  license_number: z
    .string()
    .trim()
    .min(3, "License/ID number must be at least 3 characters")
    .max(50, "License/ID number must be 50 characters or fewer")
    .regex(/^[A-Z0-9\s\-\/]+$/i, "License/ID may only contain letters, digits, hyphens, and slashes"),
  national_id: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || NATIONAL_ID_FAN_REGEX.test(v.replace(/[\s-]/g, "")),
      "National ID (FAN) must be exactly 12 digits (e.g. 123456789012)",
    ),
  // Ethiopian license category — must be one of the official categories
  license_type: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || ["1", "2", "3", "4", "5", "Public-1", "Public-2", "Public-3"].includes(v),
      "License type must be a valid Ethiopian category (1–5 or Public-1/2/3)",
    ),
  license_issue_date: optionalDate("License issue date", { past: true }),
  // #10 — Reject any license that is already expired. Drivers cannot be
  // registered with an out-of-date document.
  license_expiry: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || !Number.isNaN(Date.parse(v)),
      "License expiry is not a valid date",
    )
    .refine(
      (v) => {
        if (!v) return true;
        const d = new Date(v);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime();
      },
      "License is expired — please renew it before registering this driver",
    ),

  // ----- Employment -----
  employment_type: trimmedOptional("Employment type", 50),
  status: trimmedRequired("Driver status", 1, 50),
  joining_date: optionalDate("Joining date", { past: true }),
  // #6 — Contract end date. Optional unless employment_type === "contract"
  // (cross-field rule below); when provided must be in the future.
  contract_end_date: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Contract end date is not a valid date"),
  department: trimmedRequired("Assigned location"),
  experience_years: numericOptional("Years of experience", { min: 0, max: 60, integer: true }),
  // assigned_pool replaces legacy route_type per #5 (optional but validated)
  assigned_pool: trimmedOptional("Assigned pool", 50),
  route_type: trimmedOptional("Route type", 50), // kept for legacy edit form

  // ----- Payment (Telebirr replaces bank fields) -----
  telebirr_account: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || TELEBIRR_REGEX.test(v),
      "Telebirr account must be 9 digits (e.g. 911234567) or 10 digits (09XXXXXXXX)",
    ),

  // ----- Emergency -----
  emergency_contact_name: z
    .string()
    .trim()
    .min(2, "Emergency contact name must be at least 2 characters")
    .max(150, "Emergency contact name must be 150 characters or fewer")
    .regex(NAME_REGEX, "Emergency contact name may only contain letters, spaces, hyphens, and apostrophes"),
  emergency_contact_phone: z
    .string()
    .trim()
    .min(1, "Emergency contact phone is required")
    .regex(ETH_PHONE_REGEX, "Emergency phone must be Ethiopian: 09XXXXXXXX or +2519XXXXXXXX"),
  blood_type: trimmedOptional("Blood type", 10),

  // ----- Tags -----
  rfid_tag: trimmedOptional("RFID tag", 100),
  ibutton_id: trimmedOptional("iButton ID", 100),
  bluetooth_id: trimmedOptional("Bluetooth ID", 100),
  medical_certificate_expiry: optionalDate("Medical certificate expiry"),

  // ----- Credentials -----
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(100, "Password must be 100 characters or fewer")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter (A–Z)")
    .regex(/[a-z]/, "Password must include at least one lowercase letter (a–z)")
    .regex(/[0-9]/, "Password must include at least one digit (0–9)")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must include at least one special character (e.g. !@#$%)"),

  notes: trimmedOptional("Notes", 2000),
} as const;

export type DriverFieldName = keyof typeof driverFieldSchemas;

/** Cross-field rules with descriptive messages. */
type CrossFieldRule = (form: Record<string, any>) => Partial<Record<DriverFieldName, string>>;

const crossFieldRules: CrossFieldRule[] = [
  // License expiry must be after issue date
  (f) => {
    if (f.license_issue_date && f.license_expiry) {
      if (new Date(f.license_expiry) <= new Date(f.license_issue_date)) {
        return { license_expiry: "License expiry must be after the issue date" };
      }
    }
    return {};
  },
  // Joining date must be after date of birth + min age
  (f) => {
    if (f.date_of_birth && f.joining_date) {
      const minJoin = new Date(f.date_of_birth);
      minJoin.setFullYear(minJoin.getFullYear() + MIN_AGE);
      if (new Date(f.joining_date) < minJoin) {
        return { joining_date: `Driver must be at least ${MIN_AGE} years old at joining date` };
      }
    }
    return {};
  },
  // Email is required when password is set (portal account provisioning)
  (f) => {
    if (f.password && !f.email) {
      return { email: "Email is required when setting a portal password" };
    }
    return {};
  },
  // #6 — Contract employment must declare an end date (and it must be > today).
  (f) => {
    if (f.employment_type === "contract") {
      if (!f.contract_end_date) {
        return { contract_end_date: "Contract end date is required for contract employees" };
      }
      const end = new Date(f.contract_end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (end.getTime() <= today.getTime()) {
        return { contract_end_date: "Contract end date must be in the future" };
      }
    }
    return {};
  },
];

/**
 * Compute a license expiry date from issue date + Ethiopian category validity.
 * Returns ISO yyyy-mm-dd string or empty string.
 */
export function computeLicenseExpiry(
  issueDate: string,
  category: string,
  validityYearsByCategory?: Record<string, number>,
): string {
  if (!issueDate || !category) return "";
  const fallback: Record<string, number> = {
    "1": 5, "2": 5, "3": 5, "4": 3, "5": 3,
    "Public-1": 3, "Public-2": 3, "Public-3": 3,
  };
  const years = validityYearsByCategory?.[category] ?? fallback[category];
  if (!years) return "";
  const d = new Date(issueDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  // Subtract 1 day so expiry falls on the day BEFORE the anniversary
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/** Validate a single field; returns error message or null. */
export function validateDriverField(field: DriverFieldName, value: unknown): string | null {
  const schema = driverFieldSchemas[field];
  if (!schema) return null;
  const result = schema.safeParse(value);
  if (result.success) return null;
  // Descriptive fallback if no message — should rarely fire now
  return result.error.errors[0]?.message ?? `${field.replace(/_/g, " ")} is invalid`;
}

/** Validate the full form. Returns { ok, errors, firstError } */
export function validateDriverForm(formData: Record<string, unknown>): {
  ok: boolean;
  errors: Partial<Record<DriverFieldName, string>>;
  firstError?: { field: DriverFieldName; message: string };
} {
  const errors: Partial<Record<DriverFieldName, string>> = {};

  // Per-field
  (Object.keys(driverFieldSchemas) as DriverFieldName[]).forEach((key) => {
    const msg = validateDriverField(key, formData[key]);
    if (msg) errors[key] = msg;
  });

  // Cross-field
  crossFieldRules.forEach((rule) => {
    const extra = rule(formData);
    Object.entries(extra).forEach(([k, v]) => {
      if (v && !errors[k as DriverFieldName]) errors[k as DriverFieldName] = v;
    });
  });

  // First error in declaration order so we can scroll to it
  let firstError: { field: DriverFieldName; message: string } | undefined;
  for (const key of Object.keys(driverFieldSchemas) as DriverFieldName[]) {
    if (errors[key]) {
      firstError = { field: key, message: errors[key]! };
      break;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, firstError };
}

/** Map field → section. */
export const DRIVER_FIELD_TO_SECTION: Record<DriverFieldName, string> = {
  driver_type: "employment-type",
  first_name: "personal", middle_name: "personal", last_name: "personal",
  gender: "personal", phone: "personal", email: "personal",
  date_of_birth: "personal", employee_id: "personal",
  address_region: "address", address_zone: "address", address_woreda: "address",
  address_specific: "address",
  govt_id_type: "legal", license_number: "legal", national_id: "legal",
  license_type: "legal", license_issue_date: "legal", license_expiry: "legal",
  employment_type: "employment", status: "employment", joining_date: "employment",
  contract_end_date: "employment",
  department: "employment", experience_years: "employment",
  assigned_pool: "employment", route_type: "employment",
  telebirr_account: "payment",
  emergency_contact_name: "emergency", emergency_contact_phone: "emergency",
  blood_type: "emergency",
  rfid_tag: "tags", ibutton_id: "tags", bluetooth_id: "tags",
  medical_certificate_expiry: "tags",
  password: "credentials",
  notes: "notes",
};
