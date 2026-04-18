// FMG-FR 09 — Fuel Request (full lifecycle).
//
// Engine-driven counterpart of the `fuel_requests` table. Mirrors the SOP:
//   submitted → pending_approval (authority_matrix scope='fuel_request')
//     → approved → work_order_issued → e_money_transfer → dispensing
//     → (deviation? → clearance) → completed
// with reject + deviation branches.
//
// Behavior:
//   • Intake reuses the published Fuel Request form (`user_form:fuel_request`).
//     The legacy form continues to insert into `fuel_requests`.
//   • A DB trigger (`sync_fuel_request_workflow`) creates the matching
//     `workflow_instances` row on insert and emits `workflow_transitions`
//     whenever the legacy row advances (approved, work order issued,
//     e-money transferred, dispensed, deviation flagged, cleared, completed,
//     rejected). The SOP page, Inbox, and read-model panel stay in sync
//     without rewriting every UI mutation.
//   • Approver role(s) at "pending_approval" are resolved at runtime from
//     `authority_matrix` (scope='fuel_request') with cost thresholds +
//     `user_substitutions` — no legacy `approval_levels` fallback for fuel.
//   • Editing this config changes the visual baseline shown in WorkflowBuilder
//     and the SOP page; in-flight instances run against their original snapshot.
import { Fuel } from "lucide-react";
import type { WorkflowConfig, Lane } from "../types";

const requestorLane: Lane = { id: "requestor", label: "Requester / Driver",     roles: ["user", "driver"] };
const approverLane:  Lane = { id: "approver",  label: "Delegation Approver",   roles: ["operations_manager", "fleet_manager", "fleet_owner"] };
const fleetOpsLane:  Lane = { id: "fleet_ops", label: "Fleet Operations",      roles: ["fleet_manager", "operations_manager"] };
const financeLane:   Lane = { id: "finance",   label: "Finance / Treasury",    roles: ["finance_manager"] };
const stationLane:   Lane = { id: "station",   label: "Fuel Station / Driver", roles: ["driver", "fleet_manager"] };

export const fuelRequestConfig: WorkflowConfig = {
  type: "fuel_request",
  sopCode: "FMG-FR 09",
  title: "Fuel Request",
  description:
    "End-to-end fuel request lifecycle: submission → authority-matrix approval → work order generation → e-money/wallet funding → dispensing → deviation detection (≥5%) → clearance → completion.",
  icon: Fuel,
  initialStage: "submitted",
  intakeFormKey: "user_form:fuel_request",
  intakeRoles: [
    "user", "driver", "fleet_supervisor",
    "fleet_manager", "operations_manager", "fleet_owner",
  ],
  requiresVehicle: false,
  requiresDriver: false,
  lanes: [requestorLane, approverLane, fleetOpsLane, financeLane, stationLane],
  stages: [
    // 1. Submission — auto-routes to pending_approval via DB trigger.
    { id: "submitted", label: "1. Request submitted", lane: "requestor",
      description: "Fuel request filed via the unified Fuel Request form (vehicle or generator). Routing to the correct approver happens automatically via the authority matrix.",
      actions: [
        { id: "auto_route", label: "Route for approval", toStage: "pending_approval",
          allowedRoles: ["user", "driver", "fleet_manager", "operations_manager"] },
      ] },

    // 2. Authority-matrix approval (scope='fuel_request', cost thresholds).
    { id: "pending_approval", label: "2. Pending approval (authority matrix)", lane: "approver",
      description: "Approver is resolved from your organization's authority_matrix using scope='fuel_request' and the requested liters × unit price. Substitutes from user_substitutions are honored automatically.",
      actions: [
        { id: "approve", label: "Approve", toStage: "approved",
          allowedRoles: ["operations_manager", "fleet_manager", "fleet_owner"],
          fields: [
            { key: "liters_approved", label: "Approved liters", type: "number", required: true },
            { key: "approval_notes",  label: "Approval notes",  type: "textarea" },
          ] },
        { id: "reject", label: "Reject", toStage: "rejected", variant: "destructive",
          allowedRoles: ["operations_manager", "fleet_manager", "fleet_owner"],
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    { id: "rejected", label: "Rejected — closed", lane: "approver", terminal: true,
      actions: [{ id: "close_rejected", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["operations_manager", "fleet_manager", "fleet_owner"] }] },

    // 3. Approved → Fleet Ops issues a work order.
    { id: "approved", label: "3. Approved — issue work order", lane: "fleet_ops",
      description: "Fleet Operations generates the fuel work order, locking the approved liters, station and unit price.",
      actions: [
        { id: "issue_work_order", label: "Issue work order", toStage: "work_order_issued",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "work_order_number", label: "Work order #", type: "text", required: true },
            { key: "station_id",        label: "Approved station", type: "text" },
          ] },
      ] },

    // 4. Finance funds the driver wallet / e-money account.
    { id: "work_order_issued", label: "4. E-money / wallet funding", lane: "finance",
      description: "Finance transfers the approved amount to the driver wallet or e-money provider for redemption at the station.",
      actions: [
        { id: "transfer_emoney", label: "Confirm e-money transfer", toStage: "e_money_transferred",
          allowedRoles: ["finance_manager", "fleet_manager"],
          fields: [
            { key: "transfer_reference", label: "Transfer reference", type: "text", required: true },
            { key: "transfer_amount",    label: "Amount transferred", type: "number", required: true },
          ] },
      ] },

    // 5. Driver dispenses fuel at approved station.
    { id: "e_money_transferred", label: "5. Dispensing at station", lane: "station",
      description: "Driver redeems e-money at an approved station and records actual liters dispensed and odometer reading.",
      actions: [
        { id: "record_dispensing", label: "Record dispensing", toStage: "dispensed",
          allowedRoles: ["driver", "fleet_manager", "operations_manager"],
          fields: [
            { key: "actual_liters",      label: "Actual liters dispensed", type: "number", required: true },
            { key: "odometer_reading",   label: "Odometer (km)", type: "number" },
            { key: "receipt_reference",  label: "Receipt #", type: "text" },
          ] },
      ] },

    // 6. Auto-evaluate deviation (≥5% gap between approved and actual).
    //    The DB trigger flips clearance_status to 'pending' when deviation
    //    exceeds threshold, otherwise it advances directly to completed.
    { id: "dispensed", label: "6. Deviation check", lane: "fleet_ops",
      description: "System compares actual vs approved liters. Deviations ≥5% require manager clearance; otherwise the request closes automatically.",
      actions: [
        { id: "no_deviation", label: "No deviation — complete", toStage: "completed",
          allowedRoles: ["fleet_manager", "operations_manager"] },
        { id: "flag_deviation", label: "Flag deviation for clearance", toStage: "deviation_pending",
          variant: "destructive",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "deviation_notes", label: "Deviation notes", type: "textarea", required: true }] },
      ] },

    // 7. Manager clearance for deviations.
    { id: "deviation_pending", label: "7. Deviation clearance", lane: "approver",
      description: "Fleet manager reviews the deviation, accepts or escalates, and clears the request for closure.",
      actions: [
        { id: "clear_deviation", label: "Clear & complete", toStage: "completed",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"],
          fields: [{ key: "clearance_notes", label: "Clearance notes", type: "textarea", required: true }] },
        { id: "escalate_deviation", label: "Escalate (reject)", toStage: "rejected", variant: "destructive",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"],
          fields: [{ key: "escalation_reason", label: "Escalation reason", type: "textarea", required: true }] },
      ] },

    // 8. Closed.
    { id: "completed", label: "8. Completed", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Complete (END)", toStage: "completed", completes: true,
        allowedRoles: ["fleet_manager", "operations_manager", "user", "driver"] }] },
  ],
};
