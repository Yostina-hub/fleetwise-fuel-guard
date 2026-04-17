// FMG-FA 03 — Vehicle Handover (Submission Form)
// Modeled on the Ethio Telecom "Vehicle Submission Form" (Form# EFM/FA/03, v01,
// April 2013). Captures the three-party handover ceremony between the
// outgoing custodian (Delivered by), the incoming custodian (Received by),
// and a Witness, including:
//   • Vehicle identity (type, model, chassis #, engine #, plate, capacity, fuel)
//   • 3rd-party & annual inspection expiry dates + Ref. No.
//   • Current odometer (KM) reading + fuel amount
//   • Fleet Safety, Comfort & Accessories checklist (30 line items)
//   • "Current Over all Vehicle Condition" narrative
//   • Three signatures: Delivered by / Received by / Witness (name + ID + date)
//
// E2E flow:
//   1.1 draft (form intake)
//   1.2 inspection (fleet ops verifies state of vehicle vs. checklist)
//   1.3 delivered_signoff (outgoing party signs)
//   1.4 received_signoff (incoming party signs)
//   1.5 witnessed (witness signs)
//   1.6 archived (form filed; PDF reference recorded)
import { ClipboardCheck } from "lucide-react";
import type { WorkflowConfig, Lane } from "../types";

const fleetOpsLane: Lane     = { id: "fleet_ops",   label: "Fleet Operations",        roles: ["operations_manager", "fleet_manager"] };
const deliveredByLane: Lane  = { id: "delivered_by", label: "Delivered by (outgoing)", roles: ["fleet_manager", "operations_manager", "driver", "user"] };
const receivedByLane: Lane   = { id: "received_by",  label: "Received by (incoming)",  roles: ["driver", "user", "fleet_manager", "operations_manager"] };
const witnessLane: Lane      = { id: "witness",      label: "Witness",                 roles: ["fleet_manager", "operations_manager", "user"] };
const archiveLane: Lane      = { id: "archive",      label: "Records / Archive",       roles: ["fleet_manager", "operations_manager"] };

// Reusable accessory checklist field set (mirrors the 30-row form table).
// Each item is a yes/no with an optional QTY note — kept compact via
// a single textarea per group to stay manageable in the workflow drawer.
const accessoryChecklistFields = [
  { key: "checklist_safety",    label: "Safety items (e.g. fire extinguisher, first-aid, triangle, jack, wheel spanner)", type: "textarea" as const,
    helpText: "List items present + QTY. Mark missing items as 'MISSING'." },
  { key: "checklist_comfort",   label: "Comfort items (e.g. floor mats, headrests, seat covers, A/C remote)", type: "textarea" as const,
    helpText: "List items present + QTY. Mark missing items as 'MISSING'." },
  { key: "checklist_accessory", label: "Accessories (e.g. spare tire, tools, radio/antenna, jumper, tow rope, manuals)", type: "textarea" as const,
    helpText: "List items present + QTY. Mark missing items as 'MISSING'." },
  { key: "checklist_other",     label: "Other items (free-form, items 1–30 from form)", type: "textarea" as const,
    helpText: "Any additional items inspected per Form EFM/FA/03." },
];

export const vehicleHandoverConfig: WorkflowConfig = {
  type: "vehicle_handover",
  sopCode: "FMG-FA 03",
  title: "Vehicle Handover",
  description:
    "End-to-end vehicle handover (Form EFM/FA/03): inspection → delivered → received → witnessed → archived.",
  icon: ClipboardCheck,
  initialStage: "draft",
  requiresVehicle: true,
  intakeFormChoices: [
    {
      key: "vehicle_submission_form",
      label: "Vehicle Submission Form (EFM/FA/03)",
      description:
        "Standard Ethio Telecom Facility & Fleet handover form — captures vehicle identity, accessory checklist, condition narrative, and three-party sign-off.",
      prefill: { form_template: "EFM_FA_03" },
    },
  ],
  intakeFields: [
    // Header block (top of the form)
    { key: "title", label: "Handover title", type: "text", required: true, placeholder: "Handover — ETB-3-12345 to driver Abebe" },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "ref_no", label: "Ref No.", type: "text", placeholder: "EFM/FA/03-#####" },
    { key: "form_date", label: "Form date", type: "date", required: true },
    { key: "third_party_inspection_expiry", label: "3rd-party inspection expiry", type: "date" },
    { key: "annual_inspection_expiry", label: "Annual inspection expiry", type: "date" },

    // Vehicle identity (form rows 1–8)
    { key: "vehicle_type", label: "1. Type of vehicle", type: "text", placeholder: "Pick-up / Sedan / Van / Truck" },
    { key: "vehicle_model", label: "2. Model", type: "text" },
    { key: "chassis_no", label: "3. Chassis No.", type: "text" },
    { key: "engine_no", label: "4. Engine No.", type: "text" },
    { key: "plate_no", label: "5. Plate No.", type: "text" },
    { key: "passenger_load_capacity", label: "6. Passenger / Load capacity", type: "text" },
    { key: "km_reading", label: "7. KM reading at handover", type: "number", required: true },
    { key: "fuel_amount", label: "8. Fuel amount at handover (L)", type: "number" },

    // Parties
    { key: "delivered_by_name", label: "Delivered by — Name", type: "text", required: true },
    { key: "delivered_by_id", label: "Delivered by — ID No.", type: "text" },
    { key: "received_by_name", label: "Received by — Name", type: "text", required: true },
    { key: "received_by_id", label: "Received by — ID No.", type: "text" },
    { key: "witness_name", label: "Witness — Name", type: "text" },
    { key: "witness_id", label: "Witness — ID No.", type: "text" },

    { key: "description", label: "Notes / context", type: "textarea" },
  ],
  lanes: [fleetOpsLane, deliveredByLane, receivedByLane, witnessLane, archiveLane],
  stages: [
    // 1.1 Draft (form filed; awaiting physical inspection)
    { id: "draft", label: "1.1 Form filed (draft)", lane: "fleet_ops",
      description: "Vehicle Submission Form (EFM/FA/03) filed. Awaiting physical inspection of the vehicle and accessories.",
      actions: [
        { id: "start_inspection", label: "Start inspection", toStage: "inspection",
          allowedRoles: ["fleet_manager", "operations_manager"] },
        { id: "cancel_draft", label: "Cancel handover", toStage: "cancelled",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "cancel_reason", label: "Reason", type: "textarea", required: true }] },
      ] },

    // 1.2 Inspection — accessories checklist + overall condition
    { id: "inspection", label: "1.2 Inspect vehicle & accessories", lane: "fleet_ops",
      description: "Walk through the 30-item Fleet Safety, Comfort & Accessories checklist and capture the overall vehicle condition.",
      actions: [
        { id: "inspection_done", label: "Inspection complete → Delivered sign-off", toStage: "delivered_signoff",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            ...accessoryChecklistFields,
            { key: "overall_vehicle_condition", label: "Current overall vehicle condition", type: "textarea", required: true,
              helpText: "Summary of body, interior, mechanical, tires, lights, glass, etc." },
            { key: "inspection_photos", label: "Inspection photos (URLs, comma-separated)", type: "textarea",
              helpText: "Optional — paste image URLs or upload references." },
          ] },
        { id: "inspection_blocker", label: "Blocking issue — return to draft", toStage: "draft",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "outline",
          fields: [{ key: "blocker_notes", label: "What's blocking?", type: "textarea", required: true }] },
      ] },

    // 1.3 Delivered-by sign-off (outgoing custodian)
    { id: "delivered_signoff", label: "1.3 Delivered-by sign-off", lane: "delivered_by",
      description: "Outgoing custodian confirms vehicle + accessories handed over per the form.",
      actions: [
        { id: "delivered_sign", label: "Sign as Delivered-by", toStage: "received_signoff",
          allowedRoles: ["fleet_manager", "operations_manager", "driver", "user"],
          fields: [
            { key: "delivered_signature", label: "Signature (typed full name)", type: "text", required: true },
            { key: "delivered_signed_at", label: "Date/time signed", type: "datetime", required: true },
            { key: "delivered_remarks", label: "Remarks", type: "textarea" },
          ],
          confirm: "Confirm: I have delivered the vehicle and all accessories listed above." },
      ] },

    // 1.4 Received-by sign-off (incoming custodian)
    { id: "received_signoff", label: "1.4 Received-by sign-off", lane: "received_by",
      description: "Incoming custodian (driver / requester) acknowledges receipt of the vehicle and listed accessories.",
      actions: [
        { id: "received_sign", label: "Sign as Received-by", toStage: "witnessed",
          allowedRoles: ["driver", "user", "fleet_manager", "operations_manager"],
          fields: [
            { key: "received_signature", label: "Signature (typed full name)", type: "text", required: true },
            { key: "received_signed_at", label: "Date/time signed", type: "datetime", required: true },
            { key: "received_remarks", label: "Remarks / exceptions noted on receipt", type: "textarea" },
          ],
          confirm: "I have checked, inspected and received the vehicle and all the accessories that are found on the vehicle." },
        { id: "received_dispute", label: "Dispute — return for re-inspection", toStage: "inspection",
          allowedRoles: ["driver", "user", "fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "dispute_reason", label: "What's incorrect or missing?", type: "textarea", required: true }] },
      ] },

    // 1.5 Witness sign-off
    { id: "witnessed", label: "1.5 Witness sign-off", lane: "witness",
      description: "Witness confirms the handover took place between the named parties on the recorded date.",
      actions: [
        { id: "witness_sign", label: "Sign as Witness → archive", toStage: "archived",
          allowedRoles: ["fleet_manager", "operations_manager", "user"],
          fields: [
            { key: "witness_signature", label: "Signature (typed full name)", type: "text", required: true },
            { key: "witness_signed_at", label: "Date/time signed", type: "datetime", required: true },
            { key: "witness_remarks", label: "Remarks", type: "textarea" },
          ] },
      ] },

    // 1.6 Archived (terminal) — PDF or scanned form reference recorded
    { id: "archived", label: "1.6 Archived (form filed)", lane: "archive", terminal: true,
      description: "Signed Vehicle Submission Form is archived. Record the document URL and copy distribution (1st Recipient / 2nd Submitter / 3rd Witness).",
      actions: [
        { id: "complete", label: "Mark filed (END)", toStage: "archived", completes: true,
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "archived_form_url", label: "Signed form URL (PDF / scan)", type: "text" },
            { key: "copy_distribution_notes", label: "Copy distribution notes", type: "textarea",
              helpText: "Per form: Copy 1 → Recipient, Copy 2 → Submitter, Copy 3 → Witness." },
          ] },
      ] },

    // Cancelled (terminal)
    { id: "cancelled", label: "Cancelled", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete_cancel", label: "Close (cancelled)", toStage: "cancelled", completes: true,
        allowedRoles: ["fleet_manager", "operations_manager"] }] },
  ],
};
