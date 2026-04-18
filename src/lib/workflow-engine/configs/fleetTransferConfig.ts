// FMG-FA 02 — Fleet Distribution & Transfer Management
// Modeled on the Ethio Telecom swimlane (Corporate Fleet Operation Section /
// Zone / Region Fleet Management × Fleet Safety and Quality Assurance Section).
//
// Two parallel intake lanes meet at "5-Notify to manage transfer/relocation":
//
//   ▶ Operations lane (transfer/reallocation request):
//     1a Raise vehicle transfer/reallocation (Email)
//     2a Get approval as per delegation matrix → Approved?
//        ├─ No  → 3 Engage the vehicle (END for that branch)
//        └─ Yes → Need maintenance?
//             ├─ Yes → 4 Request for maintenance → FMG-FMG 05 Vehicle maintenance process
//             └─ No  → 5 Notify to manage transfer/relocation
//
//   ▶ Safety / QA lane (distribution plan):
//     1b Prepare vehicle distribution & transfer plan (Email)
//     2b Get approval as per delegation matrix → Approved?
//        ├─ No  → back to 1b
//        └─ Yes → 6 Request for required data (Email)
//
//   Then merged flow:
//     7 Send all required information for data update (Email)  ← Ops
//     8 Record/update the data (ERP/Vehicle history file)      ← Safety/QA
//        Transfer / New distribution?
//          ├─ New      → 9  Distribute new vehicle as per approved plan (Email)
//          │             10 Check for missed items / tool → Ok?
//          │                ├─ No  → back to 9
//          │                └─ Yes → FMG-FMG 01 Vehicle request management process (END)
//          └─ Transfer →  11 Transfer vehicle as per approved plan → END
//
import { Truck } from "lucide-react";
import type { WorkflowConfig, Lane } from "../types";

const opsLane: Lane    = { id: "fleet_ops",   label: "Corporate Fleet Operation / Zone / Region", roles: ["operations_manager", "fleet_manager", "fleet_supervisor"] };
const safetyLane: Lane = { id: "safety_qa",   label: "Fleet Safety & Quality Assurance",          roles: ["fleet_manager", "operations_manager"] };
const maintLane: Lane  = { id: "maintenance", label: "Maintenance (FMG-FMG 05)",                  roles: ["maintenance_manager", "maintenance_supervisor"] };
const dataLane: Lane   = { id: "records",     label: "Records / ERP / Vehicle history",           roles: ["fleet_manager", "operations_manager"] };

export const fleetTransferConfig: WorkflowConfig = {
  type: "fleet_transfer",
  sopCode: "FMG-FA 02",
  title: "Fleet Distribution & Transfer Management",
  description:
    "End-to-end vehicle transfer / reallocation and new vehicle distribution: dual intake (Ops request + Safety/QA distribution plan), delegation approvals, optional maintenance branch, ERP data update, missed-items check, and final transfer.",
  icon: Truck,
  initialStage: "raise_request",
  requiresVehicle: true,
  intakeFormChoices: [
    {
      key: "vehicle_transfer_request",
      label: "1a — Vehicle transfer / reallocation request (Ops)",
      description: "Operations / Zone / Region raises a request to move a vehicle to another assignment, depot, or zone.",
      prefill: { intake_path: "ops_request", distribution_kind: "transfer" },
    },
    {
      key: "vehicle_distribution_plan",
      label: "1b — Vehicle distribution & transfer plan (Safety/QA)",
      description: "Safety & Quality Assurance prepares a distribution plan for newly procured or returned vehicles.",
      prefill: { intake_path: "safety_plan", distribution_kind: "new" },
    },
  ],
  intakeFields: [
    { key: "title", label: "Reference / title", type: "text", required: true, placeholder: "Transfer ETB-3-12345 → Adama depot" },
    { key: "intake_path", label: "Intake path", type: "select", required: true,
      options: [
        { value: "ops_request",  label: "1a — Operations request (transfer/reallocation)" },
        { value: "safety_plan",  label: "1b — Safety/QA distribution plan" },
      ] },
    { key: "distribution_kind", label: "Distribution kind", type: "select", required: true,
      options: [
        { value: "transfer", label: "Transfer (existing vehicle)" },
        { value: "new",      label: "New distribution (newly procured/returned)" },
      ] },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "__vehicle_summary", label: "Vehicle information (auto-fetched)", type: "vehicle_autofill_summary" },
    { key: "from_assignment", label: "From — current assignment / depot / zone", type: "text", helpText: "Auto-filled where possible." },
    { key: "to_assignment",   label: "To — target assignment / depot / zone", type: "text", required: true },
    { key: "to_driver_id",    label: "Target driver (optional)", type: "driver",
      helpText: "If provided, will be used to update vehicle assignment after the transfer is complete." },
    { key: "reason",          label: "Reason for transfer / distribution", type: "textarea", required: true },
    { key: "planned_transfer_date", label: "Planned transfer date", type: "date", required: true },
    { key: "description",     label: "Notes / context", type: "textarea" },
  ],
  lanes: [opsLane, safetyLane, maintLane, dataLane],
  stages: [
    // ===== Operations branch (1a → 2a → branches) =====
    { id: "raise_request", label: "1a. Raise vehicle transfer / reallocation", lane: "fleet_ops",
      description: "Operations / Zone / Region files the transfer request (Email equivalent — auto-notifies approvers).",
      actions: [
        { id: "submit_for_approval", label: "Submit for delegation approval (2a)", toStage: "ops_pending_approval",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_supervisor", "user"] },
        { id: "switch_to_plan", label: "Switch to Safety/QA distribution plan (1b)", toStage: "prepare_plan",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "outline" },
      ] },

    { id: "ops_pending_approval", label: "2a. Approval as per delegation matrix", lane: "fleet_ops",
      description: "Approver role resolved at runtime from authority_matrix → approval_levels (default: fleet_manager / operations_manager).",
      actions: [
        { id: "ops_approve", label: "Approve", toStage: "ops_approved_decide_maint",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "ops_approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "ops_reject", label: "Reject → engage the vehicle (3)", toStage: "engage_vehicle",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "ops_rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    // 3 — Engage the vehicle (terminal for the rejected branch)
    { id: "engage_vehicle", label: "3. Engage the vehicle (request closed)", lane: "fleet_ops", terminal: true,
      description: "Approval was not granted — vehicle remains engaged on its current assignment. Request is closed.",
      actions: [{ id: "close_engaged", label: "Close (END)", toStage: "engage_vehicle", completes: true,
        allowedRoles: ["fleet_manager", "operations_manager"] }] },

    // Need maintenance? branch
    { id: "ops_approved_decide_maint", label: "Approved — Need maintenance?", lane: "fleet_ops",
      description: "Decide whether the vehicle requires maintenance before transfer/relocation.",
      actions: [
        { id: "needs_maint_yes", label: "Yes → Request maintenance (4)", toStage: "request_maintenance",
          allowedRoles: ["fleet_manager", "operations_manager"] },
        { id: "needs_maint_no", label: "No → Notify to manage transfer (5)", toStage: "notify_transfer",
          allowedRoles: ["fleet_manager", "operations_manager"] },
      ] },

    // 4 — Request for maintenance → FMG-FMG 05
    { id: "request_maintenance", label: "4. Request for maintenance", lane: "maintenance",
      description: "Hand off to FMG-FMG 05 Vehicle maintenance process. Optionally link the existing/created Work Order id.",
      actions: [
        { id: "maint_done", label: "Maintenance complete → Notify transfer (5)", toStage: "notify_transfer",
          allowedRoles: ["maintenance_manager", "maintenance_supervisor", "fleet_manager"],
          fields: [
            { key: "linked_work_order_id", label: "Linked Work Order # (FMG-FMG 05)", type: "text" },
            { key: "maintenance_notes", label: "Maintenance summary", type: "textarea" },
            { key: "maintenance_completed_at", label: "Completed at", type: "datetime", required: true },
          ] },
      ] },

    // ===== Safety/QA branch (1b → 2b → 6) =====
    { id: "prepare_plan", label: "1b. Prepare vehicle distribution & transfer plan", lane: "safety_qa",
      description: "Fleet Safety & Quality Assurance drafts the distribution plan (Email equivalent).",
      actions: [
        { id: "submit_plan", label: "Submit plan for delegation approval (2b)", toStage: "plan_pending_approval",
          allowedRoles: ["fleet_manager", "operations_manager"] },
      ] },

    { id: "plan_pending_approval", label: "2b. Plan approval as per delegation matrix", lane: "safety_qa",
      actions: [
        { id: "plan_approve", label: "Approve plan → Request data (6)", toStage: "request_required_data",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "plan_approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "plan_reject", label: "Reject → back to 1b", toStage: "prepare_plan",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "plan_rejection_reason", label: "Why rejected?", type: "textarea", required: true }] },
      ] },

    // 6 — Request for required data (Safety/QA → Ops)
    { id: "request_required_data", label: "6. Request required data (Email)", lane: "safety_qa",
      description: "Safety/QA emails Operations requesting all data needed to update ERP / vehicle history.",
      actions: [
        { id: "data_requested", label: "Data requested → wait for Ops (7)", toStage: "send_required_info",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "required_data_list", label: "Required data items", type: "textarea", required: true,
            placeholder: "Plate, VIN, odometer, fuel level, accessory list, current driver, target depot…" }] },
      ] },

    // ===== Merge point: 5 (from Ops) and 7 (from Safety/QA) feed step 8 =====
    { id: "notify_transfer", label: "5. Notify to manage transfer / relocation", lane: "fleet_ops",
      description: "Operations notifies all parties that the vehicle is cleared to transfer.",
      actions: [
        { id: "send_info_for_update", label: "Send all required information for data update (7)", toStage: "send_required_info",
          allowedRoles: ["fleet_manager", "operations_manager"] },
      ] },

    { id: "send_required_info", label: "7. Send all required information for data update (Email)", lane: "fleet_ops",
      description: "Operations sends the information bundle to Safety/QA for ERP / vehicle history update.",
      actions: [
        { id: "info_sent", label: "Information sent → 2nd delegation approval (8-pre)", toStage: "records_pending_approval",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "info_bundle_notes", label: "Information bundle summary", type: "textarea", required: true },
            { key: "info_attachments_url", label: "Attachments URL (optional)", type: "text" },
          ] },
      ] },

    // 8-pre — Second delegation-matrix approval before ERP write (per FMG-FA 02 dual-control)
    { id: "records_pending_approval", label: "8-pre. Records approval as per delegation matrix", lane: "records",
      description: "Second approver (resolved at runtime from authority_matrix step_order=2) signs off before ERP / vehicle history is updated.",
      actions: [
        { id: "records_approve", label: "Approve → record/update (8)", toStage: "record_update_data",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "records_approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "records_reject", label: "Reject → back to send info (7)", toStage: "send_required_info",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "records_rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    // 8 — Record / update the data (ERP / Vehicle history file)
    { id: "record_update_data", label: "8. Record / update data (ERP / Vehicle history)", lane: "records",
      description: "Records team updates ERP and the vehicle history file, then chooses the distribution path.",
      actions: [
        { id: "branch_new", label: "New distribution → step 9", toStage: "distribute_new",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "erp_record_ref", label: "ERP record reference", type: "text", required: true },
            { key: "vehicle_history_updated_at", label: "History updated at", type: "datetime", required: true },
          ] },
        { id: "branch_transfer", label: "Transfer → step 11", toStage: "transfer_vehicle",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "erp_record_ref", label: "ERP record reference", type: "text", required: true },
            { key: "vehicle_history_updated_at", label: "History updated at", type: "datetime", required: true },
          ] },
      ] },

    // ===== "New" distribution branch (9 → 10 → END via FMG-FMG 01) =====
    { id: "distribute_new", label: "9. Distribute new vehicle as per approved plan (Email)", lane: "safety_qa",
      actions: [
        { id: "distributed_check_items", label: "Distributed → check for missed items/tool (10)", toStage: "check_missed_items",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "distribution_completed_at", label: "Distribution completed at", type: "datetime", required: true },
            { key: "distribution_notes", label: "Distribution notes", type: "textarea" },
          ] },
      ] },

    { id: "check_missed_items", label: "10. Check for missed items / tool", lane: "fleet_ops",
      description: "Fleet team verifies that all items, tools and accessories per the plan were delivered.",
      actions: [
        { id: "missed_items_ok", label: "OK → FMG-FMG 01 Vehicle Request Mgmt (END)", toStage: "handoff_request_mgmt",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "missed_items_check_notes", label: "Verification notes", type: "textarea" }] },
        { id: "missed_items_not_ok", label: "Not OK → back to step 9", toStage: "distribute_new",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "missed_items_list", label: "What's missing?", type: "textarea", required: true }] },
      ] },

    { id: "handoff_request_mgmt", label: "FMG-FMG 01. Vehicle request management process", lane: "fleet_ops", terminal: true,
      description: "Hand off to FMG-FMG 01 — the new vehicle is now under the Vehicle Request Management process.",
      actions: [{ id: "complete_new", label: "Complete (END)", toStage: "handoff_request_mgmt", completes: true,
        allowedRoles: ["fleet_manager", "operations_manager"] }] },

    // ===== "Transfer" branch (11 → END) =====
    { id: "transfer_vehicle", label: "11. Transfer vehicle as per approved plan", lane: "fleet_ops", terminal: true,
      description: "Vehicle is physically transferred to the target assignment / depot / zone.",
      actions: [
        { id: "complete_transfer", label: "Confirm transfer complete (END)", toStage: "transfer_vehicle", completes: true,
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "transfer_completed_at", label: "Transfer completed at", type: "datetime", required: true },
            { key: "receiver_name", label: "Receiver — name", type: "text", required: true },
            { key: "receiver_signature", label: "Receiver — signature (typed full name)", type: "text", required: true },
            { key: "transfer_notes", label: "Transfer notes", type: "textarea" },
          ] },
      ] },
  ],
};
