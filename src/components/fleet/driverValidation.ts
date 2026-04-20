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
 */
import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_AGE = 18;
const MAX_AGE = 80;

// Letters (incl. Amharic), spaces, hyphen, apostrophe, period
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
// Ethiopian local mobile format: 09XXXXXXXX (10 digits) or +2519XXXXXXXX
const ETH_PHONE_REGEX = /^(?:09\d{8}|\+2519\d{8})$/;
// FAN / National ID: digits, possibly with dashes, 10–20 chars
const NATIONAL_ID_REGEX = /^[A-Z0-9-]{6,30}$/i;

// ----- Reusable atoms -----
const trimmedOptional = (max: number) =>
  z.string().trim().max(max, `Maximum ${max} characters`).optional().or(z.literal(""));

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
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), `Invalid ${label.toLowerCase()}`)
    .refine(
      (v) => !v || (opts?.future ? new Date(v) > new Date() : true),
      `${label} must be in the future`,
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
          ? `${label} must be a whole number${opts?.min !== undefined ? ` ≥ ${opts.min}` : ""}${opts?.max !== undefined ? `, ≤ ${opts.max}` : ""}`
          : `${label} must be a valid number${opts?.min !== undefined ? ` ≥ ${opts.min}` : ""}${opts?.max !== undefined ? `, ≤ ${opts.max}` : ""}`,
      },
    );

/** Per-field schemas — keyed by formData field name. */
export const driverFieldSchemas = {
  // ----- Personal -----
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(100, "Maximum 100 characters")
    .regex(NAME_REGEX, "Only letters, spaces, hyphens, and apostrophes"),
  middle_name: z
    .string()
    .trim()
    .min(2, "Middle name must be at least 2 characters")
    .max(100, "Maximum 100 characters")
    .regex(NAME_REGEX, "Only letters, spaces, hyphens, and apostrophes"),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Maximum 100 characters")
    .regex(NAME_REGEX, "Only letters, spaces, hyphens, and apostrophes"),
  gender: trimmedOptional(20),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(ETH_PHONE_REGEX, "Use Ethiopian format: 09XXXXXXXX"),
  email: z
    .string()
    .trim()
    .max(255, "Maximum 255 characters")
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Invalid email address",
    ),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date of birth")
    .refine(
      (v) => {
        if (!v) return true;
        const dob = new Date(v);
        const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= MIN_AGE && age <= MAX_AGE;
      },
      `Driver must be between ${MIN_AGE} and ${MAX_AGE} years old`,
    ),
  employee_id: z
    .string()
    .trim()
    .max(50, "Maximum 50 characters")
    .optional()
    .or(z.literal("")),

  // ----- Address -----
  address_region: trimmedOptional(100),
  address_zone: trimmedOptional(100),
  address_woreda: trimmedOptional(100),
  address_specific: trimmedOptional(500),

  // ----- Legal & Verification -----
  driver_type: trimmedRequired("Driver type"),
  govt_id_type: trimmedRequired("ID type"),
  license_number: z
    .string()
    .trim()
    .min(3, "License/ID number must be at least 3 characters")
    .max(50, "Maximum 50 characters")
    .regex(/^[A-Z0-9\s\-\/]+$/i, "Only letters, digits, hyphens, slashes"),
  national_id: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || NATIONAL_ID_REGEX.test(v), "Invalid National ID (FAN) format"),
  license_type: trimmedOptional(20),
  license_issue_date: optionalDate("License issue date", { past: true }),
  license_expiry: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid expiry date"),

  // ----- Employment -----
  employment_type: trimmedOptional(50),
  status: trimmedRequired("Status", 1, 50),
  joining_date: optionalDate("Joining date", { past: true }),
  department: trimmedRequired("Assigned location"),
  experience_years: numericOptional("Experience years", { min: 0, max: 60, integer: true }),
  route_type: trimmedOptional(50),

  // ----- Banking -----
  bank_name: trimmedOptional(150),
  bank_account: z
    .string()
    .trim()
    .max(40, "Maximum 40 characters")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[A-Z0-9\-\s]{4,40}$/i.test(v), "Invalid account number"),

  // ----- Emergency -----
  emergency_contact_name: z
    .string()
    .trim()
    .min(2, "Contact name must be at least 2 characters")
    .max(150, "Maximum 150 characters")
    .regex(NAME_REGEX, "Only letters, spaces, hyphens, and apostrophes"),
  emergency_contact_phone: z
    .string()
    .trim()
    .min(1, "Emergency phone is required")
    .regex(ETH_PHONE_REGEX, "Use Ethiopian format: 09XXXXXXXX"),
  blood_type: trimmedOptional(10),

  // ----- Tags -----
  rfid_tag: trimmedOptional(100),
  ibutton_id: trimmedOptional(100),
  bluetooth_id: trimmedOptional(100),
  medical_certificate_expiry: z.string().optional().or(z.literal("")),

  // ----- Credentials -----
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(100, "Maximum 100 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a digit")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must include a special character"),

  notes: trimmedOptional(2000),
} as const;

export type DriverFieldName = keyof typeof driverFieldSchemas;

/** Fields that participate in cross-field rules below. */
type CrossFieldRule = (form: Record<string, any>) => Partial<Record<DriverFieldName, string>>;

const crossFieldRules: CrossFieldRule[] = [
  // License expiry must be after issue date
  (f) => {
    if (f.license_issue_date && f.license_expiry) {
      if (new Date(f.license_expiry) <= new Date(f.license_issue_date)) {
        return { license_expiry: "Expiry must be after issue date" };
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
        return { joining_date: `Driver must be at least ${MIN_AGE} years old at joining` };
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
];

/** Validate a single field; returns error message or null. */
export function validateDriverField(field: DriverFieldName, value: unknown): string | null {
  const schema = driverFieldSchemas[field];
  if (!schema) return null;
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.errors[0]?.message ?? "Invalid value";
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

  // Determine first error in declaration order so we can scroll to it
  let firstError: { field: DriverFieldName; message: string } | undefined;
  for (const key of Object.keys(driverFieldSchemas) as DriverFieldName[]) {
    if (errors[key]) {
      firstError = { field: key, message: errors[key]! };
      break;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, firstError };
}

/** Map a field name → which section/heading contains it (for UX hints). */
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
  department: "employment", experience_years: "employment", route_type: "employment",
  bank_name: "banking", bank_account: "banking",
  emergency_contact_name: "emergency", emergency_contact_phone: "emergency",
  blood_type: "emergency",
  rfid_tag: "tags", ibutton_id: "tags", bluetooth_id: "tags",
  medical_certificate_expiry: "tags",
  password: "credentials",
  notes: "notes",
};
