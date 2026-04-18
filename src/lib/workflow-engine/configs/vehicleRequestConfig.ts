// FMG-VRQ 15 — Vehicle Request (full lifecycle).
//
// This SOP wraps the existing Vehicle Request flow (request → approval →
// pool review → vehicle/driver assignment → driver check-in/out → optional
// requester rating). It is the **engine-driven** counterpart of the
// `vehicle_requests` table.
//
// Behavior:
//   • Intake reuses the published unified Vehicle Request form
//     (`user_form:vehicle_request`). The legacy form continues to insert
//     a row into `vehicle_requests` and call `route_vehicle_request_approval`.
//   • A DB trigger (see migration `vehicle_request_workflow_sync`) creates the
//     matching `workflow_instances` row when a vehicle_requests row is inserted,
//     and emits `workflow_transitions` whenever the legacy row advances
//     (assigned, checked-in, checked-out, completed, rejected). This means the
//     SOP page, Inbox, and read-model panel all stay in sync without rewriting
//     every UI mutation.
//   • Editing this config changes the visual baseline shown in WorkflowBuilder
//     and the SOP page; in-flight instances run against their original snapshot.
import { ClipboardList } from "lucide-react";
import type { WorkflowConfig, Lane } from "../types";

const requestorLane: Lane = { id: "requestor",  label: "Requester",         roles: ["user"] };
const approverLane:  Lane = { id: "approver",   label: "Delegation Approver", roles: ["operations_manager","fleet_manager","fleet_owner"] };
const poolLane:      Lane = { id: "pool",       label: "Pool Supervisor",   roles: ["fleet_supervisor","fleet_manager"] };
const dispatchLane:  Lane = { id: "dispatch",   label: "Fleet Operations",  roles: ["operations_manager","fleet_manager"] };
const driverLane:    Lane = { id: "driver",     label: "Assigned Driver",   roles: ["driver"] };

export const vehicleRequestConfig: WorkflowConfig = {
  type: "vehicle_request",
  sopCode: "FMG-VRQ 15",
  title: "Vehicle Request",
  description:
    "End-to-end vehicle request lifecycle: submission → delegation-matrix approval → pool review → vehicle & driver assignment → driver check-in/out → completion & optional requester rating.",
  icon: ClipboardList,
  initialStage: "submitted",
  intakeFormKey: "user_form:vehicle_request",
  intakeRoles: [
    "user", "driver", "fleet_supervisor",
    "fleet_manager", "operations_manager", "fleet_owner",
  ],
  requiresVehicle: false,
  requiresDriver: false,
  lanes: [requestorLane, approverLane, poolLane, dispatchLane, driverLane],
  stages: [
    // 1. Submission — auto-routes to pending_approval via DB trigger after the
    // legacy `route_vehicle_request_approval` RPC fires.
    { id: "submitted", label: "1. Request submitted", lane: "requestor",
      description: "Request filed via the unified Vehicle Request form. Routing to the correct approver happens automatically via the delegation matrix.",
      actions: [
        { id: "auto_route", label: "Route for approval", toStage: "pending_approval",
          allowedRoles: ["user","fleet_manager","operations_manager"] },
      ] },

    // 2. Delegation-matrix approval. Approver role(s) come from authority_matrix
    // (scope='vehicle_request') resolved at runtime.
    { id: "pending_approval", label: "2. Pending approval (delegation matrix)", lane: "approver",
      description: "Approver is resolved from your organization's authority_matrix using the requester's role and trip duration. Defaults: operations_manager / fleet_manager.",
      actions: [
        { id: "approve", label: "Approve", toStage: "pool_review",
          allowedRoles: ["operations_manager","fleet_manager","fleet_owner","org_admin"],
          fields: [{ key: "approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "reject", label: "Reject", toStage: "rejected", variant: "destructive",
          allowedRoles: ["operations_manager","fleet_manager","fleet_owner","org_admin"],
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    { id: "rejected", label: "Rejected — closed", lane: "approver", terminal: true,
      actions: [{ id: "close_rejected", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["operations_manager","fleet_manager","fleet_owner"] }] },

    // 3. Pool supervisor review (vehicle pool routing & cross-pool overrides).
    { id: "pool_review", label: "3. Pool supervisor review", lane: "pool",
      description: "Pool supervisor confirms pool availability or escalates to a cross-pool assignment.",
      actions: [
        { id: "assign_to_pool", label: "Forward to dispatch", toStage: "awaiting_assignment",
          allowedRoles: ["fleet_supervisor","fleet_manager","operations_manager"] },
        { id: "cross_pool", label: "Cross-pool override", toStage: "awaiting_assignment",
          allowedRoles: ["fleet_supervisor","fleet_manager","operations_manager"],
          fields: [{ key: "cross_pool_notes", label: "Cross-pool justification", type: "textarea", required: true }] },
      ] },

    // 4. Dispatcher assigns vehicle + driver.
    { id: "awaiting_assignment", label: "4. Awaiting vehicle & driver", lane: "dispatch",
      description: "Dispatcher selects the vehicle and driver. The legacy assignment dialog mirrors these fields onto the request row; the engine advances automatically.",
      actions: [
        { id: "assign", label: "Assign vehicle & driver", toStage: "assigned",
          allowedRoles: ["operations_manager","fleet_manager","fleet_supervisor"],
          fields: [
            { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
            { key: "__driver_id",  label: "Driver",  type: "driver",  required: true },
          ] },
      ] },

    // 5. Driver check-in (start of trip).
    { id: "assigned", label: "5. Vehicle & driver assigned", lane: "driver",
      description: "Driver performs check-in and records starting odometer.",
      actions: [
        { id: "checkin", label: "Driver check-in", toStage: "in_progress",
          allowedRoles: ["driver","fleet_manager","operations_manager"],
          fields: [
            { key: "driver_checkin_odometer", label: "Odometer at check-in (km)", type: "number", required: true },
            { key: "driver_checkin_notes", label: "Check-in notes / vehicle condition", type: "textarea" },
          ] },
      ] },

    // 6. Trip in progress — driver check-out (end of trip).
    { id: "in_progress", label: "6. Trip in progress", lane: "driver",
      description: "Driver completes the trip and records the closing odometer. Distance is computed automatically.",
      actions: [
        { id: "checkout", label: "Driver check-out", toStage: "completed",
          allowedRoles: ["driver","fleet_manager","operations_manager"],
          fields: [
            { key: "driver_checkout_odometer", label: "Odometer at check-out (km)", type: "number", required: true },
            { key: "checkout_notes", label: "End-of-trip notes", type: "textarea" },
          ] },
      ] },

    // 7. Completed — optional rating from requester.
    { id: "completed", label: "7. Trip completed", lane: "requestor",
      description: "Trip is complete. The requester may optionally rate the service.",
      actions: [
        { id: "rate", label: "Rate & close", toStage: "closed",
          allowedRoles: ["user","fleet_manager","operations_manager","driver"],
          fields: [
            { key: "requester_rating", label: "Rating (1-5)", type: "number", required: true },
            { key: "requester_feedback", label: "Feedback", type: "textarea" },
          ] },
        { id: "close", label: "Close without rating", toStage: "closed",
          allowedRoles: ["user","fleet_manager","operations_manager"], variant: "outline" },
      ] },

    { id: "closed", label: "8. Closed", lane: "requestor", terminal: true,
      actions: [{ id: "complete", label: "Complete (END)", toStage: "closed", completes: true,
        allowedRoles: ["user","fleet_manager","operations_manager"] }] },
  ],
};
