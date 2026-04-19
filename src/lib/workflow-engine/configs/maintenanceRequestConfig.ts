// FMG-MNT 06.1 — Manage Request for Vehicle Maintenance @ Corporate / Zone
//
// Encodes the full swimlane SOP (steps 1–29) covering:
//   • Driver intake (1)
//   • Fleet Operation review against PM schedule (2–3)
//   • Maintenance pre-inspection & WO preparation (4–7)
//      - 6  Prepare WO + delegation-matrix approval
//      - 7a PDR release (0 value, qty 1) + delegation-matrix approval
//      - 7b Driver delivers vehicle to outsourcing garage
//   • Sourcing / SCD — manage maintenance against created PO (8a)
//   • Supplier execution (9), variation handling (10–13, 26)
//   • Fleet inspector check (11) and post-maintenance inspection (15–16, 25)
//   • Sourcing fulfillment confirmation (17–18) and supplier invoicing
//   • Operations plan + scrap return + file update (19–22, 24)
//   • Driver receives vehicle + entry/delivery doc check (23, 28–29)
import { Wrench } from "lucide-react";
import type { WorkflowConfig, Lane } from "../types";

const driverLane: Lane     = { id: "driver",     label: "Driver", roles: ["driver"] };
const fleetOpsLane: Lane   = { id: "fleet_ops",  label: "Fleet Operation / QA / Assurance",
                               roles: ["operations_manager", "fleet_manager"] };
const maintLane: Lane      = { id: "maintenance", label: "Corporate Fleet Maintenance / Facilities",
                               roles: ["maintenance_manager", "maintenance_supervisor"] };
const approvalLane: Lane   = { id: "approval",   label: "Approval (Delegation Matrix)",
                               roles: ["fleet_manager", "operations_manager", "fleet_owner"] };
const sourcingLane: Lane   = { id: "sourcing",   label: "SCD — Sourcing / Contract Management",
                               roles: ["sourcing_manager"] };
// Supplier swimlane — actions are taken on the supplier's behalf by Sourcing
// (no dedicated supplier role exists in the workflow engine's AppRole enum).
const supplierLane: Lane   = { id: "supplier",   label: "Supplier (Outsourced Garage)",
                               roles: ["sourcing_manager"] };

export const maintenanceRequestConfig: WorkflowConfig = {
  type: "maintenance_request",
  sopCode: "FMG-MNT 06.1",
  title: "Manage Request for Vehicle Maintenance",
  description:
    "Corporate / Zone vehicle maintenance request — driver intake → Fleet Ops review → pre-inspection → WO + delegation-matrix approval → PDR release → supplier execution → inspector check → variation loop → post-maintenance inspection → supplier invoice → file close.",
  icon: Wrench,
  initialStage: "request_filed",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Request title", type: "text", required: true,
      placeholder: "e.g. Brake replacement — Toyota Hilux ABC123" },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "__driver_id",  label: "Reporting driver", type: "driver" },
    { key: "request_channel", label: "Request channel", type: "select", required: true,
      options: [
        { value: "phone",        label: "Phone (driver call-in)" },
        { value: "erp",          label: "ERP — system notification" },
        { value: "pm_schedule",  label: "Preventive maintenance schedule" },
      ] },
    { key: "current_odometer", label: "Current odometer (km)", type: "number" },
    { key: "estimated_cost", label: "Estimated cost (ETB)", type: "number",
      helpText: "Drives delegation-matrix approver resolution at steps 6 & 7a." },
    { key: "symptoms", label: "Symptoms / reason", type: "textarea", required: true },
  ],
  lanes: [driverLane, fleetOpsLane, maintLane, approvalLane, sourcingLane, supplierLane],
  stages: [
    // 1 — Driver request
    { id: "request_filed", label: "1. Request for maintenance (Driver)", lane: "driver",
      description: "Driver files maintenance request by phone or ERP.",
      actions: [
        { id: "send_to_fleet_ops", label: "Send to Fleet Operations", toStage: "fleet_ops_review",
          allowedRoles: ["driver", "user", "fleet_manager", "operations_manager"] },
      ] },

    // 2–3 — Fleet Operation review against PM schedule
    { id: "fleet_ops_review", label: "2. Review request / PM schedule", lane: "fleet_ops",
      description: "Fleet Operation reviews against ERP preventive-maintenance schedule. Accept → raise Fleet Maintenance request; Reject → END.",
      actions: [
        { id: "accept_request", label: "Accept — raise Fleet Maintenance request", toStage: "pre_inspection",
          allowedRoles: ["operations_manager", "fleet_manager"],
          fields: [{ key: "review_notes", label: "Review notes", type: "textarea" }] },
        { id: "reject_request", label: "Reject", toStage: "rejected",
          allowedRoles: ["operations_manager", "fleet_manager"], variant: "destructive",
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    { id: "rejected", label: "Rejected — closed (END)", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close_rejected", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["operations_manager", "fleet_manager"] }] },

    // 4–5 — Maintenance pre-inspection
    { id: "pre_inspection", label: "4. Conduct pre-inspection (Maintenance)", lane: "maintenance",
      description: "Maintenance section conducts pre-inspection to confirm whether maintenance is needed.",
      actions: [
        { id: "needs_maintenance", label: "Maintenance needed → Prepare WO", toStage: "wo_preparation",
          allowedRoles: ["maintenance_manager", "maintenance_supervisor"],
          fields: [{ key: "pre_inspection_findings", label: "Pre-inspection findings", type: "textarea", required: true }] },
        { id: "no_maintenance", label: "Not needed — inform requester (END)", toStage: "no_maintenance_needed",
          allowedRoles: ["maintenance_manager", "maintenance_supervisor"],
          fields: [{ key: "informed_notes", label: "Notes to requester", type: "textarea" }] },
      ] },

    { id: "no_maintenance_needed", label: "5. Requester informed — no maintenance (END)", lane: "maintenance", terminal: true,
      actions: [{ id: "close_no_maint", label: "Close", toStage: "no_maintenance_needed", completes: true,
        allowedRoles: ["maintenance_manager", "fleet_manager"] }] },

    // 6 — Prepare WO + delegation-matrix approval
    { id: "wo_preparation", label: "6. Prepare maintenance WO", lane: "maintenance",
      description: "Maintenance prepares the work order. Submit for delegation-matrix approval (resolved from estimated_cost).",
      actions: [
        { id: "submit_wo_for_approval", label: "Submit WO → Delegation-matrix approval", toStage: "wo_pending_approval",
          allowedRoles: ["maintenance_manager", "maintenance_supervisor"],
          fields: [
            { key: "wo_number", label: "Work Order #", type: "text", required: true },
            { key: "wo_scope", label: "Scope of work", type: "textarea", required: true },
            { key: "wo_estimated_cost", label: "WO estimated cost (ETB)", type: "number", required: true },
          ] },
      ] },

    { id: "wo_pending_approval", label: "6a. WO pending approval (delegation matrix)", lane: "approval",
      description: "Approver role resolved at runtime from authority_matrix using wo_estimated_cost. Default: fleet_manager → operations_manager → fleet_owner.",
      actions: [
        { id: "approve_wo", label: "Approve WO", toStage: "pdr_release",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"],
          fields: [{ key: "wo_approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "reject_wo", label: "Reject WO", toStage: "rejected",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"], variant: "destructive",
          fields: [{ key: "wo_rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    // 7a — PDR release (0 value, 1 unit) + delegation-matrix approval
    { id: "pdr_release", label: "7a. Raise PDR release (0 value, qty 1)", lane: "maintenance",
      description: "Raise Purchase Document Release with 0 value and quantity = 1, then route through delegation matrix.",
      actions: [
        { id: "submit_pdr", label: "Submit PDR → Delegation-matrix approval", toStage: "pdr_pending_approval",
          allowedRoles: ["maintenance_manager", "maintenance_supervisor"],
          fields: [
            { key: "pdr_number", label: "PDR #", type: "text", required: true },
            { key: "pdr_value", label: "PDR value (ETB)", type: "number", required: true,
              helpText: "Per SOP this is 0 — kept editable for audit." },
            { key: "pdr_quantity", label: "Quantity", type: "number", required: true,
              helpText: "Per SOP this is 1." },
          ] },
      ] },

    { id: "pdr_pending_approval", label: "7a.1 PDR pending approval (delegation matrix)", lane: "approval",
      description: "Second delegation-matrix approval — releases the PDR for sourcing.",
      actions: [
        { id: "approve_pdr", label: "Approve PDR", toStage: "deliver_to_supplier",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"],
          fields: [{ key: "pdr_approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "reject_pdr", label: "Reject PDR", toStage: "wo_preparation",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"], variant: "destructive",
          fields: [{ key: "pdr_rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    // 7b / 6b — Inform driver + deliver vehicle to outsourcing garage
    { id: "deliver_to_supplier", label: "7b. Inform driver & submit WO to supplier", lane: "maintenance",
      description: "Maintenance informs the driver to deliver the vehicle and submits the WO to the outsourced garage.",
      actions: [
        { id: "vehicle_delivered", label: "Vehicle delivered to garage → Sourcing PO", toStage: "sourcing_po",
          allowedRoles: ["maintenance_manager", "fleet_manager", "driver"],
          fields: [
            { key: "delivered_at", label: "Delivered at", type: "datetime", required: true },
            { key: "supplier_garage", label: "Supplier / garage", type: "text", required: true },
            { key: "delivery_doc_ref", label: "Delivery document reference", type: "text" },
          ] },
      ] },

    // 8a — Sourcing accesses PO to manage WO
    { id: "sourcing_po", label: "8a. Access PO — manage maintenance per WO", lane: "sourcing",
      description: "SCD — Sourcing accesses the PO created for this WO and assigns the supplier.",
      actions: [
        { id: "po_assigned", label: "PO assigned → Supplier maintenance", toStage: "supplier_maintain",
          allowedRoles: ["sourcing_manager"],
          fields: [
            { key: "po_number", label: "PO #", type: "text", required: true },
            { key: "po_amount", label: "PO amount (ETB)", type: "number", required: true },
          ] },
      ] },

    // 9–10 — Supplier maintains, then declares variation or not
    { id: "supplier_maintain", label: "9. Maintain vehicle per WO & contract", lane: "supplier",
      description: "Supplier performs maintenance per WO and contract. If a variation is required, notify for confirmation.",
      actions: [
        { id: "no_variation", label: "No variation → Conduct maintenance per WO", toStage: "conduct_maintenance",
          allowedRoles: ["supplier", "sourcing_manager"] },
        { id: "wo_variation", label: "10. Notify variation for confirmation", toStage: "variation_review",
          allowedRoles: ["supplier", "sourcing_manager"], variant: "outline",
          fields: [
            { key: "variation_reason", label: "Reason for variation", type: "textarea", required: true },
            { key: "variation_amount", label: "Variation amount (ETB)", type: "number", required: true },
          ] },
      ] },

    // 11 — Fleet inspector assigned to check WO variation
    { id: "variation_review", label: "11. Assign fleet inspector — check variation", lane: "maintenance",
      actions: [
        { id: "variation_accepted", label: "12. Variation accepted — prepare additional WO", toStage: "additional_wo_pending_approval",
          allowedRoles: ["maintenance_manager", "fleet_manager"],
          fields: [{ key: "variation_inspector_notes", label: "Inspector notes", type: "textarea" }] },
        { id: "variation_rejected", label: "26. Variation rejected — inform supplier to correct", toStage: "supplier_correct",
          allowedRoles: ["maintenance_manager", "fleet_manager"], variant: "destructive",
          fields: [{ key: "variation_rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    { id: "supplier_correct", label: "26. Supplier corrects per feedback", lane: "supplier",
      actions: [
        { id: "correction_done", label: "Correction done → resume maintenance", toStage: "supplier_maintain",
          allowedRoles: ["supplier", "sourcing_manager"] },
      ] },

    // 12 — Additional WO for accepted variation + delegation-matrix approval
    { id: "additional_wo_pending_approval", label: "12. Additional WO — delegation-matrix approval", lane: "approval",
      description: "Additional WO for the accepted variation routed through the delegation matrix.",
      actions: [
        { id: "approve_additional_wo", label: "Approve additional WO", toStage: "conduct_maintenance",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"],
          fields: [{ key: "additional_wo_number", label: "Additional WO #", type: "text", required: true }] },
        { id: "reject_additional_wo", label: "Reject", toStage: "supplier_correct",
          allowedRoles: ["fleet_manager", "operations_manager", "fleet_owner"], variant: "destructive",
          fields: [{ key: "additional_wo_rejection", label: "Rejection reason", type: "textarea", required: true }] },
      ] },

    // 13 — Supplier conducts maintenance per WO
    { id: "conduct_maintenance", label: "13. Conduct maintenance per WO", lane: "supplier",
      actions: [
        { id: "ready_for_inspection", label: "14. Inform — ready for post-maintenance inspection", toStage: "post_inspection",
          allowedRoles: ["supplier", "sourcing_manager"],
          fields: [
            { key: "maintenance_completed_at", label: "Maintenance completed at", type: "datetime", required: true },
            { key: "supplier_invoice_ref", label: "Supplier invoice reference", type: "text" },
          ] },
      ] },

    // 15–16 / 25 — Post-maintenance inspection
    { id: "post_inspection", label: "15. Conduct post-maintenance inspection", lane: "maintenance",
      actions: [
        { id: "post_accepted", label: "16. Inform acceptance → request payment", toStage: "request_payment",
          allowedRoles: ["maintenance_manager", "fleet_manager"],
          fields: [{ key: "post_inspection_notes", label: "Inspection notes", type: "textarea" }] },
        { id: "post_rejected", label: "25. Send back for required correction", toStage: "supplier_correct",
          allowedRoles: ["maintenance_manager", "fleet_manager"], variant: "destructive",
          fields: [{ key: "correction_required", label: "Correction required", type: "textarea", required: true }] },
      ] },

    // 16 — Request payment to supplier
    { id: "request_payment", label: "16. Inform acceptance — request payment", lane: "sourcing",
      actions: [
        { id: "payment_requested", label: "17. Supplier sends maintenance report & invoice", toStage: "supplier_report",
          allowedRoles: ["sourcing_manager", "finance_manager"] },
      ] },

    // 17–18 — Supplier sends report/invoice + sourcing requests confirmation
    { id: "supplier_report", label: "17. Supplier maintenance report & invoice", lane: "supplier",
      actions: [
        { id: "report_received", label: "18. Request fulfillment confirmation", toStage: "fulfillment_confirm",
          allowedRoles: ["supplier", "sourcing_manager"],
          fields: [{ key: "supplier_invoice_no", label: "Supplier invoice #", type: "text", required: true }] },
      ] },

    { id: "fulfillment_confirm", label: "18. Fulfillment confirmation (SCD)", lane: "sourcing",
      actions: [
        { id: "fulfilled_yes", label: "Fulfilled — proceed to operation plan", toStage: "ops_plan",
          allowedRoles: ["sourcing_manager", "fleet_manager"] },
        { id: "fulfilled_no", label: "Not fulfilled — back to supplier correction", toStage: "supplier_correct",
          allowedRoles: ["sourcing_manager", "fleet_manager"], variant: "destructive" },
      ] },

    // 19 — Compile maintenance operation plan
    { id: "ops_plan", label: "19. Compile maintenance operation plan", lane: "fleet_ops",
      actions: [
        { id: "plan_compiled", label: "20. Collect replaced/recovered SP to WH", toStage: "scrap_return",
          allowedRoles: ["fleet_manager", "operations_manager", "maintenance_manager"],
          fields: [{ key: "ops_plan_ref", label: "Operation plan reference", type: "text" }] },
      ] },

    // 20–21 — Scrap return + file update
    { id: "scrap_return", label: "20. Collect replaced/recovered SP to WH (Scrap return form)", lane: "maintenance",
      actions: [
        { id: "scrap_returned", label: "21. Update file with vehicle file", toStage: "file_update",
          allowedRoles: ["maintenance_manager", "fleet_manager"],
          fields: [
            { key: "scrap_return_form_no", label: "Scrap return form #", type: "text", required: true },
            { key: "recovered_parts", label: "Replaced/recovered parts", type: "textarea" },
          ] },
      ] },

    { id: "file_update", label: "21. Update file documents (vehicle file)", lane: "maintenance",
      actions: [
        { id: "files_updated", label: "22. Receive report & assign driver/admin", toStage: "assign_driver_admin",
          allowedRoles: ["maintenance_manager", "fleet_manager"] },
      ] },

    // 22 — Receive the report & assign driver/admin (Fleet Ops)
    { id: "assign_driver_admin", label: "22. Receive report & assign driver/admin", lane: "fleet_ops",
      actions: [
        { id: "driver_assigned", label: "23. Driver receives the maintained vehicle", toStage: "driver_receive",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "assigned_driver_name", label: "Assigned driver/admin", type: "text", required: true },
            { key: "vehicle_handover_at", label: "Vehicle handover at", type: "datetime", required: true },
          ] },
      ] },

    // 23 — Driver receives the maintained vehicle
    { id: "driver_receive", label: "23. Driver receives the maintained vehicle", lane: "driver",
      actions: [
        { id: "driver_received", label: "28. Submit entry & delivery document for filing", toStage: "doc_check",
          allowedRoles: ["driver", "fleet_manager", "operations_manager"],
          fields: [
            { key: "vehicle_received_at", label: "Vehicle received at", type: "datetime", required: true },
            { key: "driver_acknowledgement", label: "Driver acknowledgement notes", type: "textarea" },
          ] },
      ] },

    // 28–29 — Check entry/delivery doc & file
    { id: "doc_check", label: "28. Check entry & delivery time / file documents", lane: "fleet_ops",
      description: "Verify entry/delivery times against supplier report. Acceptable → END (close & file). Not acceptable → take appropriate action.",
      actions: [
        { id: "doc_acceptable", label: "Acceptable — file & close (24)", toStage: "closed",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "filing_notes", label: "Filing notes", type: "textarea" }] },
        { id: "doc_not_acceptable", label: "29. Not acceptable — take appropriate action", toStage: "appropriate_action",
          allowedRoles: ["fleet_manager", "operations_manager"], variant: "destructive",
          fields: [{ key: "appropriate_action_reason", label: "Reason / discrepancy", type: "textarea", required: true }] },
      ] },

    { id: "appropriate_action", label: "29. Take appropriate action", lane: "fleet_ops",
      actions: [
        { id: "action_taken", label: "Action taken — file & close (24)", toStage: "closed",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [{ key: "action_taken_notes", label: "Action notes", type: "textarea", required: true }] },
      ] },

    // 24 — END: file with vehicle records (terminal)
    { id: "closed", label: "24. Files updated — closed (END)", lane: "fleet_ops", terminal: true,
      description: "All documents filed with the vehicle file. SCM-PRO 05 Service / Work Delivery confirmation handled via PO-Contract Process.",
      actions: [{ id: "complete", label: "Complete", toStage: "closed", completes: true,
        allowedRoles: ["fleet_manager", "operations_manager", "maintenance_manager"] }] },
  ],
};
