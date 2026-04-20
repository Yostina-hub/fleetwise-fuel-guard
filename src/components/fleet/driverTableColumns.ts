// Driver table column registry — mirrors every column from the `drivers` table
// plus a few computed fields (vehicle, safety chip). Used by DriverColumnsPicker
// and the Drivers list page to drive show/hide logic with persistence.

export type DriverColumnGroup =
  | "Identity"
  | "Contact"
  | "License"
  | "Employment"
  | "Address"
  | "Compliance"
  | "Performance"
  | "Banking"
  | "Hardware"
  | "Emergency"
  | "Medical"
  | "System";

export type DriverColumnId =
  // Identity
  | "select"
  | "driver"           // composite: avatar + name + hire date
  | "first_name"
  | "middle_name"
  | "last_name"
  | "gender"
  | "date_of_birth"
  | "national_id"
  | "govt_id_type"
  | "avatar_url"
  // Contact
  | "phone"
  | "email"
  // License
  | "license_number"
  | "license_class"
  | "license_type"
  | "license_issue_date"
  | "license_expiry"
  | "license_verified"
  | "license_front_url"
  | "license_back_url"
  // Employment
  | "employee_id"
  | "driver_type"
  | "employment_type"
  | "department"
  | "outsource_company"
  | "hire_date"
  | "joining_date"
  | "experience_years"
  | "route_type"
  | "assigned_pool"
  | "status"
  // Address
  | "address_region"
  | "address_zone"
  | "address_woreda"
  | "address_specific"
  // Compliance / Verification
  | "verification_status"
  | "national_id_verified"
  | "verified_at"
  | "verified_by"
  | "verification_notes"
  | "processing_restricted"
  | "processing_restricted_at"
  | "processing_restricted_reason"
  // Performance
  | "vehicle"          // computed: assigned vehicle
  | "safety_score"
  | "total_trips"
  | "total_distance_km"
  // Banking
  | "bank_name"
  | "bank_account"
  | "telebirr_account"
  // Hardware
  | "rfid_tag"
  | "ibutton_id"
  | "bluetooth_id"
  // Emergency
  | "emergency_contact_name"
  | "emergency_contact_phone"
  | "emergency_contact_relationship"
  // Medical
  | "blood_type"
  | "medical_certificate_expiry"
  | "medical_info"
  // System
  | "id"
  | "user_id"
  | "organization_id"
  | "notes"
  | "created_at"
  | "updated_at"
  | "actions";

export interface DriverColumnDef {
  id: DriverColumnId;
  label: string;
  group: DriverColumnGroup;
  /** Cannot be hidden by the user (e.g. row checkbox, primary "driver" cell, actions). */
  required?: boolean;
  /** Default visible on first load. */
  default?: boolean;
}

export const DRIVER_COLUMNS: DriverColumnDef[] = [
  // Identity
  { id: "select",          label: "Select",          group: "Identity",   required: true, default: true },
  { id: "driver",          label: "Driver",          group: "Identity",   required: true, default: true },
  { id: "first_name",      label: "First Name",      group: "Identity" },
  { id: "middle_name",     label: "Middle Name",     group: "Identity" },
  { id: "last_name",       label: "Last Name",       group: "Identity" },
  { id: "gender",          label: "Gender",          group: "Identity" },
  { id: "date_of_birth",   label: "Date of Birth",   group: "Identity" },
  { id: "national_id",     label: "National ID",     group: "Identity" },
  { id: "govt_id_type",    label: "Govt ID Type",    group: "Identity" },
  { id: "avatar_url",      label: "Avatar URL",      group: "Identity" },

  // Contact
  { id: "phone",           label: "Phone",           group: "Contact",    default: true },
  { id: "email",           label: "Email",           group: "Contact" },

  // License
  { id: "license_number",  label: "License Number",  group: "License",    default: true },
  { id: "license_class",   label: "License Class",   group: "License" },
  { id: "license_type",    label: "License Type",    group: "License" },
  { id: "license_issue_date", label: "License Issue Date", group: "License" },
  { id: "license_expiry",  label: "License Expiry",  group: "License",    default: true },
  { id: "license_verified", label: "License Verified", group: "License" },
  { id: "license_front_url", label: "License Front",   group: "License" },
  { id: "license_back_url",  label: "License Back",    group: "License" },

  // Employment
  { id: "employee_id",     label: "Employee ID",     group: "Employment", default: true },
  { id: "driver_type",     label: "Driver Type",     group: "Employment" },
  { id: "employment_type", label: "Employment Type", group: "Employment" },
  { id: "department",      label: "Department",      group: "Employment" },
  { id: "outsource_company", label: "Outsource Company", group: "Employment" },
  { id: "hire_date",       label: "Hire Date",       group: "Employment" },
  { id: "joining_date",    label: "Joining Date",    group: "Employment" },
  { id: "experience_years", label: "Experience (yrs)", group: "Employment" },
  { id: "route_type",      label: "Route Type",      group: "Employment" },
  { id: "assigned_pool",   label: "Assigned Pool",   group: "Employment" },
  { id: "status",          label: "Status",          group: "Employment", default: true },

  // Address
  { id: "address_region",  label: "Region",          group: "Address" },
  { id: "address_zone",    label: "Zone",            group: "Address" },
  { id: "address_woreda",  label: "Woreda",          group: "Address" },
  { id: "address_specific", label: "Specific Address", group: "Address" },

  // Compliance
  { id: "verification_status", label: "Verification Status", group: "Compliance" },
  { id: "national_id_verified", label: "National ID Verified", group: "Compliance" },
  { id: "verified_at",     label: "Verified At",     group: "Compliance" },
  { id: "verified_by",     label: "Verified By",     group: "Compliance" },
  { id: "verification_notes", label: "Verification Notes", group: "Compliance" },
  { id: "processing_restricted", label: "Processing Restricted", group: "Compliance" },
  { id: "processing_restricted_at", label: "Restricted At", group: "Compliance" },
  { id: "processing_restricted_reason", label: "Restriction Reason", group: "Compliance" },

  // Performance
  { id: "vehicle",         label: "Assigned Vehicle", group: "Performance", default: true },
  { id: "safety_score",    label: "Safety Score",    group: "Performance", default: true },
  { id: "total_trips",     label: "Total Trips",     group: "Performance" },
  { id: "total_distance_km", label: "Total Distance (km)", group: "Performance" },

  // Banking
  { id: "bank_name",       label: "Bank Name",       group: "Banking" },
  { id: "bank_account",    label: "Bank Account",    group: "Banking" },
  { id: "telebirr_account", label: "Telebirr Account", group: "Banking" },

  // Hardware
  { id: "rfid_tag",        label: "RFID Tag",        group: "Hardware" },
  { id: "ibutton_id",      label: "iButton ID",      group: "Hardware" },
  { id: "bluetooth_id",    label: "Bluetooth ID",    group: "Hardware" },

  // Emergency
  { id: "emergency_contact_name",  label: "Emergency Contact Name",  group: "Emergency" },
  { id: "emergency_contact_phone", label: "Emergency Contact Phone", group: "Emergency" },
  { id: "emergency_contact_relationship", label: "Emergency Relationship", group: "Emergency" },

  // Medical
  { id: "blood_type",      label: "Blood Type",      group: "Medical" },
  { id: "medical_certificate_expiry", label: "Medical Cert Expiry", group: "Medical" },
  { id: "medical_info",    label: "Medical Info",    group: "Medical" },

  // System
  { id: "id",              label: "Driver ID",       group: "System" },
  { id: "user_id",         label: "User ID",         group: "System" },
  { id: "organization_id", label: "Organization ID", group: "System" },
  { id: "notes",           label: "Notes",           group: "System" },
  { id: "created_at",      label: "Created At",      group: "System" },
  { id: "updated_at",      label: "Updated At",      group: "System" },
  { id: "actions",         label: "Actions",         group: "System", required: true, default: true },
];

export const COLUMN_BY_ID: Record<DriverColumnId, DriverColumnDef> = DRIVER_COLUMNS.reduce(
  (acc, col) => {
    acc[col.id] = col;
    return acc;
  },
  {} as Record<DriverColumnId, DriverColumnDef>,
);

export const DEFAULT_VISIBLE_COLUMNS: DriverColumnId[] = DRIVER_COLUMNS
  .filter((c) => c.default || c.required)
  .map((c) => c.id);

const STORAGE_KEY = "drivers.visibleColumns.v1";

export const loadVisibleColumns = (): DriverColumnId[] => {
  if (typeof window === "undefined") return DEFAULT_VISIBLE_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as DriverColumnId[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_VISIBLE_COLUMNS;
    const valid = new Set(DRIVER_COLUMNS.map((c) => c.id));
    const filtered = parsed.filter((id) => valid.has(id));
    // Always re-include required
    DRIVER_COLUMNS.forEach((c) => {
      if (c.required && !filtered.includes(c.id)) filtered.push(c.id);
    });
    // Re-order according to canonical order
    return DRIVER_COLUMNS.map((c) => c.id).filter((id) => filtered.includes(id));
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
};

export const saveVisibleColumns = (cols: DriverColumnId[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  } catch {
    // ignore quota / privacy errors
  }
};
