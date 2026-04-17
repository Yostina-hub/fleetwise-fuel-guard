// FMG-TIR 01 — Tire Request Workflow
// Maps tire request SOP steps 1.1–1.8 into the workflow engine.
//   1.1–1.2 → submitted (intake)
//   1.3     → fleet_ops_review (Fleet Operations approval)
//   loop    → iproc_return_check (decision + reminder loop)
//   1.4     → wo_preparation (with embedded iPROC on-hand & serial widgets)
//   1.5     → quantity_decision (Maintenance approves quantity)
//   1.6     → authority_approval (delegation matrix — amount-based)
//   1.7     → mr_generation (auto Material Requisition via iPROC)
//             fulfillment (parts dispatched + installed)
//   1.8     → closed (utilization records snapshot)
import { CircleDot } from "lucide-react";
import type { WorkflowConfig, Lane } from "../types";

const requesterLane: Lane = { id: "requester", label: "Requester", roles: ["driver", "user"] };
const fleetOpsLane: Lane = { id: "fleet_ops", label: "Fleet Operations", roles: ["operations_manager", "fleet_manager"] };
const maintLane: Lane = { id: "maintenance", label: "Maintenance", roles: ["maintenance_lead"] };
const approvalLane: Lane = { id: "approval", label: "Approval (Authority Matrix)", roles: ["fleet_owner", "operations_manager"] };
const erpLane: Lane = { id: "erp_sync", label: "ERP Sync (iPROC)", roles: ["operations_manager"] };
const reportingLane: Lane = { id: "reporting", label: "Reporting", roles: ["fleet_manager"] };

export const tireRequestConfig: WorkflowConfig = {
  type: "tire_request",
  sopCode: "FMG-TIR 01",
  title: "Tire Request",
  description: "End-to-end tire request flow: review → iPROC return check → WO prep → approval → MR → fulfillment → utilization.",
  icon: CircleDot,
  initialStage: "submitted",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Request title", type: "text", required: true, placeholder: "Tire replacement — front axle" },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "request_type", label: "Request type", type: "select", required: true,
      options: [
        { value: "replacement", label: "Tire Replacement" },
        { value: "rotation", label: "Rotation" },
        { value: "repair", label: "Repair" },
        { value: "new_install", label: "New Install" },
      ] },
    { key: "estimated_cost", label: "Estimated cost (ETB)", type: "number" },
    { key: "description", label: "Description / context", type: "textarea" },
  ],
  lanes: [requesterLane, fleetOpsLane, maintLane, approvalLane, erpLane, reportingLane],
  stages: [
    // 1.1–1.2 Intake
    { id: "submitted", label: "1. Request submitted", lane: "requester",
      description: "Tire request filed by driver / workshop. Includes vehicle, KM, fuel, position(s), attachments.",
      actions: [
        { id: "send_to_fleet_ops", label: "Send to Fleet Operations", toStage: "fleet_ops_review",
          allowedRoles: ["driver", "user", "fleet_manager", "operations_manager"] },
      ] },

    // 1.3 Fleet Operations review
    { id: "fleet_ops_review", label: "1.3 Fleet Ops review & approve", lane: "fleet_ops",
      description: "Fleet Operations team verifies legitimacy of the request and forwards to maintenance.",
      actions: [
        { id: "fleet_ops_approve", label: "Approve — check old tires", toStage: "iproc_return_check",
          allowedRoles: ["operations_manager", "fleet_manager"],
          fields: [{ key: "fleet_ops_notes", label: "Approval notes", type: "textarea" }] },
        { id: "fleet_ops_request_info", label: "Request more info", toStage: "submitted",
          allowedRoles: ["operations_manager", "fleet_manager"], variant: "outline",
          fields: [{ key: "info_requested", label: "What's needed?", type: "textarea", required: true }] },
        { id: "fleet_ops_reject", label: "Reject", toStage: "rejected",
          allowedRoles: ["operations_manager", "fleet_manager"], variant: "destructive",
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    { id: "rejected", label: "Rejected", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close_rejected", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["operations_manager", "fleet_manager"] }] },

    // iPROC return loop (decision + reminder)
    { id: "iproc_return_check", label: "iPROC return check (loop)", lane: "maintenance",
      description: "Wait for previous tires to be returned to the warehouse via iPROC. Auto-advances when all items are returned. Daily reminders are sent if pending > 24h.",
      actions: [
        { id: "iproc_returned_manual", label: "All returned — proceed", toStage: "wo_preparation",
          allowedRoles: ["maintenance_lead", "operations_manager"],
          fields: [
            { key: "return_reference", label: "iPROC return reference (or override note)", type: "text", required: true },
          ],
          confirm: "Confirm that all old tires have been physically returned to the warehouse?" },
        { id: "iproc_reminder", label: "Send reminder", toStage: "iproc_return_check",
          allowedRoles: ["maintenance_lead", "operations_manager"], variant: "outline" },
      ] },

    // 1.4 Work Order preparation (iPROC widgets embedded in detail drawer via data fields)
    { id: "wo_preparation", label: "1.4 WO preparation (iPROC lookups)", lane: "maintenance",
      description: "Maintenance prepares the work order. Reference panels: 1.4.1 on-hand balance (iPROC), 1.4.2 old tire serial numbers (iPROC). Save the snapshot before advancing.",
      actions: [
        { id: "wo_prepared", label: "WO prepared — set quantity", toStage: "quantity_decision",
          allowedRoles: ["maintenance_lead"],
          fields: [
            { key: "iproc_onhand_snapshot", label: "On-hand balance (iPROC)", type: "textarea",
              helpText: "Paste iPROC on-hand JSON or note (e.g. '4 of 295/80R22.5 in WH-A')" },
            { key: "iproc_old_serial_numbers", label: "Old tire serial numbers (iPROC)", type: "textarea",
              helpText: "List comma-separated serial numbers of tires being replaced" },
            { key: "wo_number", label: "Work Order #", type: "text", required: true },
          ] },
      ] },

    // 1.5 Quantity decision
    { id: "quantity_decision", label: "1.5 Decide approved quantity", lane: "maintenance",
      description: "Maintenance approves the quantity of tires (may differ from requested).",
      actions: [
        { id: "set_quantity", label: "Set quantity → Authority approval", toStage: "authority_approval",
          allowedRoles: ["maintenance_lead"],
          fields: [
            { key: "approved_quantity", label: "Approved quantity", type: "number", required: true },
            { key: "quantity_rationale", label: "Rationale", type: "textarea" },
          ] },
      ] },

    // 1.6 Authority Matrix approval
    { id: "authority_approval", label: "1.6 Approval (delegation matrix)", lane: "approval",
      description: "Approver role is resolved at runtime from the Authority Matrix based on estimated_cost. Default: fleet_manager → operations_manager → fleet_owner.",
      actions: [
        { id: "authority_approve", label: "Approve WO", toStage: "mr_generation",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"],
          fields: [{ key: "approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "authority_reject", label: "Reject", toStage: "rejected",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"], variant: "destructive",
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    // 1.7 Auto MR generation via iPROC
    { id: "mr_generation", label: "1.7 Auto MR generation (iPROC)", lane: "erp_sync",
      description: "System auto-generates a Material Requisition via the iPROC integration. The MR # is recorded on the request.",
      actions: [
        { id: "mr_generated", label: "MR generated → Fulfillment", toStage: "fulfillment",
          allowedRoles: ["operations_manager", "maintenance_lead"],
          fields: [
            { key: "iproc_mr_number", label: "iPROC MR #", type: "text", required: true,
              helpText: "Stub: enter MR number returned by iPROC (mock/manual until ERP wired)" },
          ] },
      ] },

    // Fulfillment
    { id: "fulfillment", label: "Fulfillment (install new tires)", lane: "maintenance",
      description: "Parts dispatched, new tires installed, and inventory updated.",
      actions: [
        { id: "fulfilled", label: "Tires installed → Close", toStage: "closed",
          allowedRoles: ["maintenance_lead", "fleet_manager"],
          fields: [
            { key: "installed_at", label: "Install date/time", type: "datetime", required: true },
            { key: "km_at_install", label: "KM at install", type: "number", required: true },
            { key: "install_notes", label: "Install notes", type: "textarea" },
          ] },
      ] },

    // 1.8 Closed (utilization snapshot taken)
    { id: "closed", label: "1.8 Closed — utilization tracked", lane: "reporting", terminal: true,
      description: "Utilization record created. View the per-vehicle tire utilization report.",
      actions: [{ id: "complete", label: "Complete", toStage: "closed", completes: true,
        allowedRoles: ["fleet_manager", "operations_manager", "maintenance_lead"] }] },
  ],
};
