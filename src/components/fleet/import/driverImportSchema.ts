/**
 * Driver bulk import/export schema — single source of truth for the
 * Drivers template, parser and validator.
 *
 * Adding a new importable column is a one-line change here.
 */
import { ImportField } from "./importSchema";

export const DRIVER_STATUSES = ["active", "inactive", "suspended", "on_leave"];
export const DRIVER_TYPES = [
  "company",
  "ethio_contract",
  "outsource",
  "rental",
  "third_party",
  "government",
];
export const EMPLOYMENT_TYPES = [
  "permanent",
  "regular",
  "contract",
  "temporary",
  "intern",
];
export const GENDERS = ["male", "female", "other"];
export const ROUTE_TYPES = ["intracity", "intercity", "longhaul"];
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const DRIVER_IMPORT_FIELDS: ImportField[] = [
  // Identity (required)
  { header: "First Name",     dbKey: "first_name",     type: "string", required: true,  maxLength: 100 },
  { header: "Last Name",      dbKey: "last_name",      type: "string", required: true,  maxLength: 100 },
  { header: "License Number", dbKey: "license_number", type: "string", required: true,  maxLength: 50, hint: "Unique key for upsert" },

  // Contact
  { header: "Email",          dbKey: "email",          type: "string", maxLength: 255 },
  { header: "Phone",          dbKey: "phone",          type: "string", maxLength: 30 },

  // Personal
  { header: "Date of Birth",  dbKey: "date_of_birth",  type: "date" },
  { header: "Gender",         dbKey: "gender",         type: "enum",   enumValues: GENDERS },
  { header: "Blood Type",     dbKey: "blood_type",     type: "string", maxLength: 5, hint: "e.g. O+, A-, AB+" },
  { header: "National ID",    dbKey: "national_id",    type: "string", maxLength: 50 },

  // License
  { header: "License Class",  dbKey: "license_class",  type: "string", maxLength: 30, hint: "e.g. A, B, C, D" },
  { header: "License Type",   dbKey: "license_type",   type: "string", maxLength: 50 },
  { header: "License Expiry", dbKey: "license_expiry", type: "date" },

  // Employment
  { header: "Employee ID",      dbKey: "employee_id",       type: "string", maxLength: 50 },
  { header: "Driver Type",      dbKey: "driver_type",       type: "enum",   enumValues: DRIVER_TYPES },
  { header: "Employment Type",  dbKey: "employment_type",   type: "enum",   enumValues: EMPLOYMENT_TYPES },
  { header: "Department",       dbKey: "department",        type: "string", maxLength: 100 },
  { header: "Hire Date",        dbKey: "hire_date",         type: "date" },
  { header: "Contract End Date",dbKey: "contract_end_date", type: "date" },
  { header: "Experience Years", dbKey: "experience_years",  type: "int", min: 0, max: 80 },
  { header: "Route Type",       dbKey: "route_type",        type: "enum", enumValues: ROUTE_TYPES },
  { header: "Assigned Pool",    dbKey: "assigned_pool",     type: "string", maxLength: 80 },
  { header: "Status",           dbKey: "status",            type: "enum", enumValues: DRIVER_STATUSES },

  // Hardware identifiers
  { header: "RFID Tag",     dbKey: "rfid_tag",     type: "string", maxLength: 50 },
  { header: "iButton ID",   dbKey: "ibutton_id",   type: "string", maxLength: 50 },
  { header: "Bluetooth ID", dbKey: "bluetooth_id", type: "string", maxLength: 50 },

  // Banking & payment
  { header: "Bank Name",        dbKey: "bank_name",        type: "string", maxLength: 100 },
  { header: "Bank Account",     dbKey: "bank_account",     type: "string", maxLength: 50 },
  { header: "Telebirr Account", dbKey: "telebirr_account", type: "string", maxLength: 50 },

  // Emergency contact
  { header: "Emergency Contact Name",         dbKey: "emergency_contact_name",         type: "string", maxLength: 200 },
  { header: "Emergency Contact Phone",        dbKey: "emergency_contact_phone",        type: "string", maxLength: 30 },
  { header: "Emergency Contact Relationship", dbKey: "emergency_contact_relationship", type: "string", maxLength: 50 },

  // Compliance
  { header: "Medical Certificate Expiry", dbKey: "medical_certificate_expiry", type: "date" },

  // Notes
  { header: "Notes", dbKey: "notes", type: "string", maxLength: 1000 },
];

const FIELD_BY_HEADER = new Map(
  DRIVER_IMPORT_FIELDS.map((f) => [f.header.toLowerCase(), f]),
);
const FIELD_BY_DBKEY = new Map(
  DRIVER_IMPORT_FIELDS.map((f) => [f.dbKey.toLowerCase(), f]),
);

export function resolveDriverField(header: string): ImportField | undefined {
  const k = header.trim().toLowerCase();
  return FIELD_BY_HEADER.get(k) ?? FIELD_BY_DBKEY.get(k.replace(/\s+/g, "_"));
}

export const DRIVER_SAMPLE_VALUES: Record<string, any> = {
  first_name: "Abebe",
  last_name: "Bekele",
  license_number: "DL-AA-123456",
  email: "abebe.bekele@example.com",
  phone: "+251911234567",
  date_of_birth: "1990-04-15",
  gender: "male",
  blood_type: "O+",
  national_id: "ETH-001234567",
  license_class: "B",
  license_type: "Public Service",
  license_expiry: "2027-06-30",
  employee_id: "EMP-1042",
  driver_type: "company",
  employment_type: "permanent",
  department: "Operations",
  hire_date: "2022-03-01",
  contract_end_date: "",
  experience_years: 8,
  route_type: "intracity",
  assigned_pool: "HQ Pool",
  status: "active",
  rfid_tag: "RFID-001042",
  ibutton_id: "",
  bluetooth_id: "",
  bank_name: "Commercial Bank of Ethiopia",
  bank_account: "1000123456789",
  telebirr_account: "+251911234567",
  emergency_contact_name: "Hana Bekele",
  emergency_contact_phone: "+251922345678",
  emergency_contact_relationship: "Spouse",
  medical_certificate_expiry: "2026-02-28",
  notes: "Senior driver — long-haul certified",
};
