/**
 * Form Templates Library
 * =======================
 * Pre-built JSON form definitions mirroring the legacy registered workflow forms.
 * Users can clone any template into their organization's unified Forms module
 * to customize without touching the legacy components.
 *
 * Each template is an opinionated starting point — not a 1:1 replacement —
 * because legacy forms encode RPC calls, catalog lookups, and bespoke UX
 * that a generic schema can't fully capture.
 */
import type { FormSchema, FormSettings, BaseField } from "./schema";

const uid = (() => {
  let i = 0;
  return (prefix: string) => `${prefix}_${++i}_${Date.now().toString(36)}`;
})();

const f = (partial: Partial<BaseField> & Pick<BaseField, "key" | "type" | "label">): BaseField => ({
  id: uid("fld"),
  required: false,
  ...partial,
});

export interface FormTemplate {
  /** Suggested form key (organization-unique). */
  key: string;
  name: string;
  description: string;
  category: string;
  /** Free-text reason to clone — shown in the picker. */
  rationale: string;
  schema: FormSchema;
  settings: FormSettings;
}

// ---------------------------------------------------------------------------
// 1) Safety & Comfort Report (driver)
// ---------------------------------------------------------------------------
const safetyComfortTemplate: FormTemplate = {
  key: "safety_comfort_report",
  name: "Safety & Comfort Report",
  description: "Driver-facing quick form for reporting safety or comfort issues with a vehicle.",
  category: "safety",
  rationale: "Generic equivalent of the built-in Safety & Comfort dialog. Customize categories, severities, or required fields per org.",
  schema: {
    version: 1,
    fields: [
      f({
        key: "title",
        type: "text",
        label: "Issue Title",
        required: true,
        placeholder: "e.g. Missing first-aid kit",
        validation: { minLength: 3, maxLength: 120 },
      }),
      f({
        key: "vehicle_id",
        type: "vehicle",
        label: "Vehicle",
        required: true,
      }),
      f({
        key: "severity",
        type: "select",
        label: "Severity",
        required: true,
        defaultValue: "medium",
        options: [
          { value: "low", label: "Low — comfort only" },
          { value: "medium", label: "Medium — minor safety" },
          { value: "high", label: "High — affects safe operation" },
          { value: "critical", label: "Critical — vehicle must be grounded" },
        ],
      }),
      f({
        key: "category",
        type: "select",
        label: "Category",
        required: true,
        options: [
          { value: "fleet_safety_material", label: "Fleet Safety Material" },
          { value: "vehicle_helping_tools", label: "Vehicle Helping Tools" },
          { value: "vehicle_accessories", label: "Vehicle Accessories" },
          { value: "vehicle_comfort_materials", label: "Vehicle Comfort Materials" },
          { value: "other", label: "Other" },
        ],
      }),
      f({
        key: "location_on_vehicle",
        type: "text",
        label: "Location on Vehicle",
        placeholder: "e.g. Driver cabin, rear cargo",
      }),
      f({
        key: "description",
        type: "textarea",
        label: "Description",
        required: true,
        validation: { minLength: 10, maxLength: 1000 },
      }),
      f({
        key: "needs_immediate_attention",
        type: "switch",
        label: "Requires immediate attention",
        defaultValue: false,
      }),
      f({
        key: "photos",
        type: "file",
        label: "Photos / Attachments",
      }),
    ],
  },
  settings: {
    submitLabel: "Submit Report",
    successMessage: "Thank you — your report was submitted.",
    twoColumnLayout: true,
  },
};

// ---------------------------------------------------------------------------
// 2) Fuel Request
// ---------------------------------------------------------------------------
const fuelRequestTemplate: FormTemplate = {
  key: "fuel_request",
  name: "Fuel Request",
  description: "Driver / Operator request for fuel allocation with approval routing.",
  category: "fuel",
  rationale: "Mirror of the Fuel Request dialog. Use this if you want a custom fuel request shape per org without touching the canonical workflow.",
  schema: {
    version: 1,
    fields: [
      f({
        key: "request_type",
        type: "select",
        label: "Request Type",
        required: true,
        defaultValue: "vehicle",
        options: [
          { value: "vehicle", label: "Vehicle" },
          { value: "generator", label: "Generator" },
        ],
      }),
      f({
        key: "vehicle_id",
        type: "vehicle",
        label: "Vehicle",
        visibleWhen: { field: "request_type", operator: "equals", value: "vehicle" },
        required: true,
      }),
      f({
        key: "driver_id",
        type: "driver",
        label: "Driver",
        visibleWhen: { field: "request_type", operator: "equals", value: "vehicle" },
      }),
      f({
        key: "asset_id",
        type: "asset",
        label: "Generator (asset)",
        visibleWhen: { field: "request_type", operator: "equals", value: "generator" },
        required: true,
      }),
      f({
        key: "fuel_type",
        type: "select",
        label: "Fuel Type",
        required: true,
        defaultValue: "diesel",
        options: [
          { value: "diesel", label: "Diesel" },
          { value: "petrol", label: "Petrol" },
        ],
      }),
      f({
        key: "liters_requested",
        type: "number",
        label: "Liters Requested",
        required: true,
        validation: { min: 1, max: 1000 },
      }),
      f({
        key: "current_odometer",
        type: "number",
        label: "Current Odometer (km)",
        visibleWhen: { field: "request_type", operator: "equals", value: "vehicle" },
        validation: { min: 0 },
      }),
      f({
        key: "estimated_cost",
        type: "computed",
        label: "Estimated Cost (ETB)",
        helpText: "Auto-calculated from liters × price/L (override price below).",
        computedFrom: { expression: "{{liters_requested}} * {{price_per_liter}}", resultType: "currency" },
      }),
      f({
        key: "price_per_liter",
        type: "number",
        label: "Price per Liter (ETB)",
        defaultValue: 90,
        validation: { min: 0 },
      }),
      f({
        key: "cost_center",
        type: "text",
        label: "Cost Center",
      }),
      f({
        key: "purpose",
        type: "textarea",
        label: "Purpose / Trip Description",
        validation: { maxLength: 500 },
      }),
      f({
        key: "notes",
        type: "textarea",
        label: "Additional Notes",
      }),
    ],
  },
  settings: {
    submitLabel: "Submit Fuel Request",
    successMessage: "Fuel request submitted for approval.",
    twoColumnLayout: true,
  },
};

// ---------------------------------------------------------------------------
// 3) Create Work Request
// ---------------------------------------------------------------------------
const createWorkRequestTemplate: FormTemplate = {
  key: "create_work_request",
  name: "Create Work Request",
  description: "Oracle EBS-style maintenance / inspection work request intake form.",
  category: "maintenance",
  rationale: "Lightweight clone of the Work Request dialog — useful as a quick-intake form before promoting to a full Work Order.",
  schema: {
    version: 1,
    fields: [
      f({
        key: "request_type",
        type: "select",
        label: "Request Type",
        required: true,
        defaultValue: "maintenance",
        options: [
          { value: "maintenance", label: "Maintenance" },
          { value: "inspection", label: "Inspection" },
          { value: "repair", label: "Repair" },
          { value: "modification", label: "Modification" },
        ],
      }),
      f({
        key: "vehicle_id",
        type: "vehicle",
        label: "Vehicle",
        required: true,
      }),
      f({
        key: "asset_id",
        type: "asset",
        label: "Component / Asset",
        helpText: "Optional — pick a sub-asset if the issue is component-specific.",
      }),
      f({
        key: "priority",
        type: "select",
        label: "Priority",
        required: true,
        defaultValue: "medium",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
          { value: "critical", label: "Critical" },
        ],
      }),
      f({
        key: "summary",
        type: "text",
        label: "Summary",
        required: true,
        placeholder: "Short title for the request",
        validation: { maxLength: 120 },
      }),
      f({
        key: "description",
        type: "textarea",
        label: "Description",
        required: true,
        validation: { minLength: 10 },
      }),
      f({
        key: "needed_by",
        type: "date",
        label: "Needed By",
      }),
      f({
        key: "estimated_hours",
        type: "number",
        label: "Estimated Labor Hours",
        validation: { min: 0, max: 200 },
      }),
      f({
        key: "attachments",
        type: "file",
        label: "Attachments",
      }),
    ],
  },
  settings: { submitLabel: "Create Request", twoColumnLayout: true },
};

// ---------------------------------------------------------------------------
// 4) Vehicle Inspection Checklist
// ---------------------------------------------------------------------------
const vehicleInspectionTemplate: FormTemplate = {
  key: "vehicle_inspection",
  name: "Vehicle Inspection Checklist",
  description: "Pre-trip / post-trip / annual vehicle inspection.",
  category: "inspection",
  rationale: "Generic checklist clone. Customize the inspection items per inspection type or fleet category.",
  schema: {
    version: 1,
    fields: [
      f({
        key: "vehicle_id",
        type: "vehicle",
        label: "Vehicle",
        required: true,
      }),
      f({
        key: "driver_id",
        type: "driver",
        label: "Driver / Inspector",
        required: true,
      }),
      f({
        key: "inspection_type",
        type: "select",
        label: "Inspection Type",
        required: true,
        defaultValue: "pre_trip",
        options: [
          { value: "pre_trip", label: "Pre-Trip" },
          { value: "post_trip", label: "Post-Trip" },
          { value: "annual", label: "Annual" },
          { value: "spot", label: "Spot Check" },
        ],
      }),
      f({
        key: "odometer",
        type: "number",
        label: "Odometer (km)",
        validation: { min: 0 },
      }),
      f({
        key: "checklist_section",
        type: "section",
        label: "Inspection Checklist",
        fields: [
          f({ key: "tires_ok", type: "switch", label: "Tires — pressure & tread OK", defaultValue: true }),
          f({ key: "lights_ok", type: "switch", label: "Lights — headlight, brake, indicators", defaultValue: true }),
          f({ key: "brakes_ok", type: "switch", label: "Brakes — pedal & parking", defaultValue: true }),
          f({ key: "fluids_ok", type: "switch", label: "Fluids — oil, coolant, washer", defaultValue: true }),
          f({ key: "wipers_ok", type: "switch", label: "Wipers & washers", defaultValue: true }),
          f({ key: "horn_mirrors_ok", type: "switch", label: "Horn & mirrors", defaultValue: true }),
          f({ key: "seatbelts_ok", type: "switch", label: "Seatbelts", defaultValue: true }),
          f({ key: "first_aid_ok", type: "switch", label: "First-aid kit & triangle", defaultValue: true }),
        ],
      }),
      f({
        key: "issues_found",
        type: "textarea",
        label: "Issues Found / Notes",
        placeholder: "Describe any failed items or observations",
      }),
      f({
        key: "photos",
        type: "file",
        label: "Photos",
      }),
      f({
        key: "vehicle_safe_to_operate",
        type: "switch",
        label: "Vehicle is safe to operate",
        required: true,
        defaultValue: true,
      }),
    ],
  },
  settings: { submitLabel: "Submit Inspection", twoColumnLayout: true },
};

// ---------------------------------------------------------------------------
// 5) Oracle Work Order (lite)
// ---------------------------------------------------------------------------
const oracleWorkOrderTemplate: FormTemplate = {
  key: "oracle_work_order",
  name: "Work Order (lite)",
  description: "Simplified work order with operations, parts, and labor lines.",
  category: "maintenance",
  rationale: "A simplified, schema-driven version of the full ERP Work Order. Use for ad-hoc orgs that don't need GL postings & approvals.",
  schema: {
    version: 1,
    fields: [
      f({
        key: "wo_number",
        type: "text",
        label: "WO Number",
        helpText: "Leave blank to auto-generate downstream.",
      }),
      f({
        key: "vehicle_id",
        type: "vehicle",
        label: "Vehicle",
        required: true,
      }),
      f({
        key: "wo_type",
        type: "select",
        label: "Type",
        required: true,
        defaultValue: "corrective",
        options: [
          { value: "preventive", label: "Preventive" },
          { value: "corrective", label: "Corrective" },
          { value: "inspection", label: "Inspection" },
          { value: "warranty", label: "Warranty" },
        ],
      }),
      f({
        key: "status",
        type: "select",
        label: "Status",
        defaultValue: "draft",
        options: [
          { value: "draft", label: "Draft" },
          { value: "released", label: "Released" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" },
        ],
      }),
      f({
        key: "summary",
        type: "text",
        label: "Summary",
        required: true,
      }),
      f({
        key: "operations",
        type: "repeater",
        label: "Operations",
        minRows: 1,
        fields: [
          f({ key: "op_seq", type: "number", label: "Seq #", required: true }),
          f({ key: "op_desc", type: "text", label: "Description", required: true }),
          f({ key: "op_hours", type: "number", label: "Std Hours" }),
        ],
      }),
      f({
        key: "parts",
        type: "repeater",
        label: "Parts",
        fields: [
          f({ key: "part_no", type: "text", label: "Part #", required: true }),
          f({ key: "part_desc", type: "text", label: "Description" }),
          f({ key: "qty", type: "number", label: "Qty", required: true }),
          f({ key: "unit_cost", type: "currency", label: "Unit Cost (ETB)" }),
        ],
      }),
      f({
        key: "labor",
        type: "repeater",
        label: "Labor",
        fields: [
          f({ key: "tech_name", type: "text", label: "Technician", required: true }),
          f({ key: "hours", type: "number", label: "Hours", required: true }),
          f({ key: "rate", type: "currency", label: "Rate / Hour" }),
        ],
      }),
      f({
        key: "total_parts_cost",
        type: "computed",
        label: "Total Parts Cost",
        computedFrom: { expression: "SUM(parts.qty) * SUM(parts.unit_cost)", resultType: "currency" },
      }),
      f({
        key: "notes",
        type: "textarea",
        label: "Notes",
      }),
    ],
  },
  settings: { submitLabel: "Save Work Order", twoColumnLayout: true },
};

// ---------------------------------------------------------------------------
// 6) Vehicle Request — 1:1 mirror of legacy VehicleRequestForm
// ---------------------------------------------------------------------------
// IMPORTANT: Field keys, option values, and defaults MUST match
// src/components/vehicle-requests/VehicleRequestForm.tsx exactly.
// This template exists ONLY so users can re-label / re-arrange / hide the
// presentation layer. The legacy dialog stays the canonical submitter and
// owns pool routing, KPI calc, SMS, and approval flow.
const vehicleRequestTemplate: FormTemplate = {
  key: "vehicle_request",
  name: "Vehicle Request (Fleet Request Form)",
  description: "Mirrors the legacy Fleet Request Form 1:1 — same field keys, same option values, same defaults. Editable for labels, help text, and layout only.",
  category: "operations",
  rationale: "Use this to re-label or re-order the Fleet Request Form fields without forking the legacy dialog. Field keys are locked to the legacy contract (vehicle_requests table + route_vehicle_request_approval RPC).",
  schema: {
    version: 1,
    fields: [
      // ---- Vehicle Request Type ----
      f({
        key: "request_type",
        type: "select",
        label: "Vehicle Request Type",
        required: true,
        defaultValue: "daily_operation",
        options: [
          { value: "daily_operation", label: "Daily Operation" },
          { value: "project_operation", label: "Project Operation" },
          { value: "field_operation", label: "Field Operation" },
        ],
      }),

      // ---- Daily Operation: date + start/end time ----
      f({
        key: "date",
        type: "date",
        label: "Start Date",
        required: true,
        visibleWhen: { field: "request_type", operator: "equals", value: "daily_operation" },
      }),
      f({
        key: "start_time",
        type: "time",
        label: "Start Time",
        defaultValue: "08:00",
        visibleWhen: { field: "request_type", operator: "equals", value: "daily_operation" },
      }),
      f({
        key: "end_time",
        type: "time",
        label: "End Time",
        defaultValue: "17:00",
        visibleWhen: { field: "request_type", operator: "equals", value: "daily_operation" },
      }),

      // ---- Project / Field Operation: start_date + start_date_time ----
      f({
        key: "start_date",
        type: "date",
        label: "Start Date",
        required: true,
        visibleWhen: { field: "request_type", operator: "not_equals", value: "daily_operation" },
      }),
      f({
        key: "start_date_time",
        type: "time",
        label: "Start Time",
        defaultValue: "08:00",
        visibleWhen: { field: "request_type", operator: "not_equals", value: "daily_operation" },
      }),
      f({
        key: "end_date_time",
        type: "time",
        label: "End Time",
        defaultValue: "18:00",
        visibleWhen: { field: "request_type", operator: "not_equals", value: "daily_operation" },
      }),

      // ---- End Date — shared by ALL request types (matches legacy) ----
      f({
        key: "end_date",
        type: "date",
        label: "End Date",
      }),

      // ---- Project Number (project_operation only) ----
      f({
        key: "project_number",
        type: "text",
        label: "Project Number",
        placeholder: "Enter project number (e.g. PRJ-2026-001)",
        visibleWhen: { field: "request_type", operator: "equals", value: "project_operation" },
      }),

      // ---- Route — legacy LocationPickerField with lat/lng siblings ----
      f({
        key: "departure_place",
        type: "location",
        label: "Departure Place",
        placeholder: "Select or type departure",
        latKey: "departure_lat",
        lngKey: "departure_lng",
      }),
      f({
        key: "destination",
        type: "location",
        label: "Destination Place",
        placeholder: "Select or type destination",
        latKey: "destination_lat",
        lngKey: "destination_lng",
      }),

      // ---- Logistics ----
      f({
        key: "num_vehicles",
        type: "number",
        label: "No. Of Vehicle",
        defaultValue: 1,
        validation: { min: 1, max: 20 },
      }),
      f({
        key: "passengers",
        type: "number",
        label: "No. Of Passenger",
        defaultValue: 1,
        validation: { min: 1, max: 100 },
      }),
      f({
        key: "vehicle_type",
        type: "select",
        label: "Vehicle Type",
        placeholder: "Select Vehicle Type",
        options: [
          { value: "sedan", label: "Sedan" },
          { value: "suv", label: "SUV" },
          { value: "pickup", label: "Pickup" },
          { value: "minibus", label: "Minibus" },
          { value: "truck", label: "Truck" },
          { value: "van", label: "Van" },
          { value: "bus", label: "Bus" },
          { value: "motorcycle", label: "Motorcycle" },
          { value: "other", label: "Other" },
        ],
      }),
      f({
        key: "trip_type",
        type: "select",
        label: "Trip Type",
        placeholder: "Select Trip Type",
        options: [
          { value: "one_way", label: "One Way Trip" },
          { value: "round_trip", label: "Round Trip" },
        ],
      }),

      // ---- Pool Assignment ----
      f({
        key: "pool_category",
        type: "select",
        label: "Pool Category",
        placeholder: "Select Pool Category",
        options: [
          { value: "corporate", label: "Corporate" },
          { value: "zone", label: "Zone" },
          { value: "region", label: "Region" },
        ],
      }),
      f({
        key: "pool_name",
        type: "pool",
        label: "Pool",
        filterByKey: "pool_category",
      }),

      // ---- Trip Description (legacy = "Trip Description", required by submit guard) ----
      f({
        key: "purpose",
        type: "textarea",
        label: "Trip Description",
        required: true,
        placeholder: "Description",
      }),
    ],
  },
  settings: {
    submitLabel: "Create Request",
    cancelLabel: "Cancel",
    successMessage: "Vehicle request submitted successfully",
    twoColumnLayout: true,
  },
};

// ---------------------------------------------------------------------------
// Public registry
// ---------------------------------------------------------------------------

export const FORM_TEMPLATES: FormTemplate[] = [
  safetyComfortTemplate,
  fuelRequestTemplate,
  createWorkRequestTemplate,
  vehicleInspectionTemplate,
  oracleWorkOrderTemplate,
  vehicleRequestTemplate,
];

export const getTemplate = (key: string): FormTemplate | undefined =>
  FORM_TEMPLATES.find((t) => t.key === key);
