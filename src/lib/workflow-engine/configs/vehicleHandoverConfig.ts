// FMG-FA 03 — Vehicle Handover (Submission Form)
// Modeled 1:1 on the Ethio Telecom "Vehicle Submission Form"
// (Form# EFM/FA/03, Version 01, Printing Year April 2013).
//
// Paper layout captured by this intake form (in the same order):
//   • Header band: "3rd party and annual inspection expiry date" (two dates)
//                  + "Ref No." + "Date"
//   • Vehicle identity — numbered 1..8:
//       1. Type of vehicle    2. Model
//       3. Chassis No.        4. Engine No.
//       5. Plate No.          6. Passenger / Load capacity
//       7. KM reading         8. Fuel amount
//   • Fleet Safety, Comfort, Accessories and Comfort Material Lists —
//       30 numbered slots (Serial No / List of material / QTY), shown in two
//       columns 1-15 / 16-30 (rendered by the `handover_lines_30` field type).
//   • "Current Over all Vehicle Condition" — free-text narrative.
//   • Sign-off block: "I have checked, inspected and received the vehicle and
//       all the accessories that are found on the vehicle." with three columns
//       (Delivered by / Received by / Witness) × four rows
//       (Name / ID No / Signature / Date).
//   • Footer: Copy 1st Recipient · 2nd Submitter · 3rd Witness ·
//       Form Number EFM/FA/03 Version 01 · Printing Year April 2013.
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

export const vehicleHandoverConfig: WorkflowConfig = {
  type: "vehicle_handover",
  sopCode: "FMG-FA 03",
  title: "Vehicle Handover",
  description:
    "End-to-end vehicle handover (Form EFM/FA/03): inspection → delivered → received → witnessed → archived.",
  icon: ClipboardCheck,
  initialStage: "draft",
  requiresVehicle: true,
  // Intake is now rendered by the centralized Forms module.
  // Editable in /forms under the "Vehicle Handover (EFM/FA/03)" template
  // (key: vehicle_handover, seeded per organization). The DynamicFormWrapper
  // resolves the published version at runtime, so changes published in /forms
  // take effect immediately for new handovers.
  intakeFormKey: "user_form:vehicle_handover",
  intakeFields: [],
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

    // 1.2 Inspection — verify the 30-line checklist captured at intake
    { id: "inspection", label: "1.2 Inspect vehicle & accessories", lane: "fleet_ops",
      description: "Verify the 30-item Fleet Safety, Comfort, Accessories and Comfort Material Lists captured at intake, plus the overall vehicle condition.",
      actions: [
        { id: "inspection_done", label: "Inspection complete → Delivered sign-off", toStage: "delivered_signoff",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "checklist_lines", label: "Confirm / amend 30-line material list", type: "handover_lines_30" },
            { key: "overall_vehicle_condition", label: "Current Over all Vehicle Condition", type: "textarea", required: true,
              helpText: "Summary of body, interior, mechanical, tires, lights, glass, etc." },
            { key: "inspection_photos", label: "Inspection photos (URLs, comma-separated)", type: "textarea",
              helpText: "Optional — paste image URLs or upload references." },
          ] },
        { id: "inspection_blocker", label: "Blocking issue — return to draft", toStage: "draft",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "outline",
          fields: [{ key: "blocker_notes", label: "What's blocking?", type: "textarea", required: true }] },
      ] },

    // 1.3 Delivered-by sign-off (outgoing custodian) — Name / ID / Signature / Date
    { id: "delivered_signoff", label: "1.3 Delivered-by sign-off", lane: "delivered_by",
      description: "Outgoing custodian confirms vehicle + accessories handed over per the form.",
      actions: [
        { id: "delivered_sign", label: "Sign as Delivered-by", toStage: "received_signoff",
          allowedRoles: ["fleet_manager", "operations_manager", "driver", "user"],
          fields: [
            { key: "delivered_by_name", label: "Delivered by — Name", type: "text", required: true },
            { key: "delivered_by_id", label: "Delivered by — ID No.", type: "text", required: true },
            { key: "delivered_signature", label: "Signature (typed full name)", type: "text", required: true },
            { key: "delivered_signed_at", label: "Date", type: "datetime", required: true },
            { key: "delivered_remarks", label: "Remarks", type: "textarea" },
          ],
          confirm: "Confirm: I have delivered the vehicle and all accessories listed above." },
      ] },

    // 1.4 Received-by sign-off (incoming custodian) — Name / ID / Signature / Date
    { id: "received_signoff", label: "1.4 Received-by sign-off", lane: "received_by",
      description: "Incoming custodian (driver / requester) acknowledges receipt of the vehicle and listed accessories.",
      actions: [
        { id: "received_sign", label: "Sign as Received-by", toStage: "witnessed",
          allowedRoles: ["driver", "user", "fleet_manager", "operations_manager"],
          fields: [
            { key: "received_by_name", label: "Received by — Name", type: "text", required: true },
            { key: "received_by_id", label: "Received by — ID No.", type: "text", required: true },
            { key: "received_signature", label: "Signature (typed full name)", type: "text", required: true },
            { key: "received_signed_at", label: "Date", type: "datetime", required: true },
            { key: "received_remarks", label: "Remarks / exceptions noted on receipt", type: "textarea" },
          ],
          confirm: "I have checked, inspected and received the vehicle and all the accessories that are found on the vehicle." },
        { id: "received_dispute", label: "Dispute — return for re-inspection", toStage: "inspection",
          allowedRoles: ["driver", "user", "fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "dispute_reason", label: "What's incorrect or missing?", type: "textarea", required: true }] },
      ] },

    // 1.5 Witness sign-off — Name / ID / Signature / Date
    { id: "witnessed", label: "1.5 Witness sign-off", lane: "witness",
      description: "Witness confirms the handover took place between the named parties on the recorded date.",
      actions: [
        { id: "witness_sign", label: "Sign as Witness → archive", toStage: "archived",
          allowedRoles: ["fleet_manager", "operations_manager", "user"],
          fields: [
            { key: "witness_name", label: "Witness — Name", type: "text", required: true },
            { key: "witness_id", label: "Witness — ID No.", type: "text", required: true },
            { key: "witness_signature", label: "Signature (typed full name)", type: "text", required: true },
            { key: "witness_signed_at", label: "Date", type: "datetime", required: true },
            { key: "witness_remarks", label: "Remarks", type: "textarea" },
          ] },
      ] },

    // 1.6 Archived (terminal) — PDF or scanned form reference recorded
    { id: "archived", label: "1.6 Archived (form filed)", lane: "archive", terminal: true,
      description: "Signed Vehicle Submission Form is archived. Record the document URL and copy distribution (Copy 1 → Recipient, Copy 2 → Submitter, Copy 3 → Witness). Form# EFM/FA/03 Version 01, Printing Year April 2013.",
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
