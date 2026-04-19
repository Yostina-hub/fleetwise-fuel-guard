// 14 ET FMG SOP workflow configs.
// Each config drives a full E2E workflow page (file → stages → role-gated actions → audit).
//
// ⚠️ PHASE E NOTE: This file is now the **canonical baseline**, not the
// runtime source of truth. SOP behavior at runtime comes from the
// `workflows` table (see useEffectiveConfig). Editing this file changes
// the baseline used by:
//   • the "Seed SOP Workflows" button on /workflow-builder
//   • the per-SOP "Seed to builder" / "Restore baseline" buttons
//   • the drift indicator on each SOP page
// In-flight workflow instances are unaffected by edits here — they keep
// running against the snapshot they were created with.
import {
  ClipboardCheck, Car, ShieldCheck, Wrench, AlertOctagon, Truck, UserPlus,
  GraduationCap, Banknote, Hammer, LifeBuoy, IdCard, Building2, Shield,
} from "lucide-react";
import type { WorkflowConfig } from "./types";
import { tireRequestConfig } from "./configs/tireRequestConfig";
import { vehicleHandoverConfig } from "./configs/vehicleHandoverConfig";
import { fleetTransferConfig } from "./configs/fleetTransferConfig";
import { vehicleRequestConfig } from "./configs/vehicleRequestConfig";
import { fuelRequestConfig } from "./configs/fuelRequestConfig";
import { maintenanceRequestConfig } from "./configs/maintenanceRequestConfig";

// Reusable lane helpers
import type { Lane } from "./types";
const fleetOpsLane: Lane = { id: "fleet_ops", label: "Fleet Operation Section", roles: ["operations_manager", "fleet_manager"] };
const maintLane: Lane    = { id: "maintenance", label: "Fleet Maintenance Section", roles: ["maintenance_manager"] };
const sourcingLane: Lane = { id: "sourcing",    label: "Sourcing / Supply Chain",   roles: ["sourcing_manager"] };
const financeLane: Lane  = { id: "finance",     label: "Account Payable / Finance", roles: ["finance_manager"] };
const inspLane: Lane     = { id: "inspection",  label: "Inspection Center",         roles: ["inspection_center"] };
const transportLane: Lane= { id: "transport",   label: "Transport Authority",       roles: ["transport_authority"] };
const insuranceLane: Lane= { id: "insurance",   label: "Insurance Management",      roles: ["insurance_admin"] };
const driverLane: Lane   = { id: "driver",      label: "Driver",                    roles: ["driver"] };

// =============================================================
// 1) FMG-INS 01 — Fleet Inspection
// Updates (Phase F):
//   • Step 1.5 added: "Approval (delegation matrix)" — approver role is
//     resolved at runtime from authority_matrix → approval_levels (see
//     useWorkflow's fleet_inspection interceptor + inspectionApproval.ts).
//   • Step 3 ("Request maintenance") now offers two actions: "Use existing
//     open WO" (auto-link the vehicle's open WO from work_orders) or
//     "Open Work Order form" (creates a new one). The chosen WO id is
//     stored in data.work_order_id and reused downstream.
//   • Pre-trip / Post-trip path branches at "ready_for_trip": the request
//     initiator (or fleet_manager / operations_manager) closes the linked WO.
//   • Annual path now mirrors the Outsource Rental SOP — supplier select →
//     contract → handover → perform → return → registration paid → close,
//     capturing registration cost & date, bolo / certificate # + expiry,
//     inspection center + contract ref + agreed amount, handover/return dates.
// =============================================================
export const fleetInspectionConfig: WorkflowConfig = {
  type: "fleet_inspection",
  sopCode: "FMG-INS 01",
  title: "Fleet Inspection",
  description: "Annual & internal vehicle inspection workflow.",
  icon: ClipboardCheck,
  initialStage: "pending_approval",
  intakeFormChoices: [
    {
      key: "create_work_request",
      label: "Create Work Request (Oracle EBS)",
      description: "File a Pre-trip, Post-trip or Annual vehicle inspection request via the Oracle EBS aligned form.",
      prefill: {
        context: "trip_inspection",
        request_type: "inspection",
      },
    },
    {
      key: "vehicle_inspection",
      label: "Vehicle Inspection Checklist",
      description: "Complete the operational pre-trip / post-trip / annual checklist directly.",
      prefill: {},
    },
  ],
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Inspection title", type: "text", required: true, placeholder: "Q2 fleet inspection" },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "inspection_type", label: "Inspection type", type: "select", required: true,
      options: [
        { value: "annual",    label: "Annual (Bolo)" },
        { value: "pre_trip",  label: "Pre-trip" },
        { value: "post_trip", label: "Post-trip" },
        { value: "internal",  label: "Internal" },
      ] },
    { key: "description", label: "Notes", type: "textarea" },
  ],
  lanes: [
    { ...fleetOpsLane },
    { ...maintLane },
    { ...inspLane },
    { ...transportLane },
    { ...sourcingLane },
    { ...financeLane },
  ],
  stages: [
    // 0. Approval — delegation matrix (authority_matrix → approval_levels → defaults).
    { id: "pending_approval", label: "0. Approval (delegation matrix)", lane: "fleet_ops",
      description: "Approver role is resolved from your organization's authority_matrix or approval_levels rules. Default: fleet_manager / operations_manager.",
      actions: [
        { id: "approve_request", label: "Approve request", toStage: "list_vehicles",
          allowedRoles: ["fleet_manager","operations_manager"],
          fields: [{ key: "approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "reject_request", label: "Reject", toStage: "rejected",
          allowedRoles: ["fleet_manager","operations_manager"], variant: "destructive",
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },
    { id: "rejected", label: "Rejected — closed", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close_rejected", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["fleet_manager","operations_manager"] }] },

    // 1. List vehicles to inspect
    { id: "list_vehicles", label: "1. List vehicles to be inspected", lane: "fleet_ops",
      actions: [{ id: "ready", label: "Make vehicles ready", toStage: "ready_for_inspection",
        allowedRoles: ["fleet_manager","operations_manager"] }] },

    // 2. Branch — pre/post & internal go to maintenance; annual goes to outsourcing chain
    { id: "ready_for_inspection", label: "2. Vehicles ready", lane: "fleet_ops",
      actions: [
        { id: "to_internal", label: "Pre/Post/Internal → Maintenance", toStage: "request_maintenance",
          allowedRoles: ["fleet_manager","operations_manager"] },
        { id: "to_annual", label: "Annual → Outsourced Inspection", toStage: "annual_supplier_select",
          allowedRoles: ["fleet_manager","operations_manager"] },
      ] },

    // 3. Request maintenance — REUSE existing open WO if one exists, else create one.
    { id: "request_maintenance", label: "3. Request maintenance (reuse WO)", lane: "maintenance",
      description: "Reuse an open work order on this vehicle if available, otherwise open the Oracle WO form.",
      actions: [
        { id: "use_existing_wo", label: "Use existing open WO", toStage: "assign_inspector",
          allowedRoles: ["maintenance_manager","maintenance_supervisor","fleet_manager"],
          confirm: "Link this inspection to the vehicle's open Work Order?" },
        { id: "open_wo_form", label: "Open Work Order form", toStage: "assign_inspector",
          allowedRoles: ["maintenance_manager","maintenance_supervisor","fleet_manager"],
          fields: [{ key: "work_order_id", label: "Work Order # (paste WO id after creating)", type: "text", required: true }] },
      ] },

    // 4. Inspector assigned
    { id: "assign_inspector", label: "4. Assign fleet inspector", lane: "maintenance",
      actions: [
        { id: "pass", label: "Pass inspection — release", toStage: "ready_for_trip",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"], variant: "default" },
        { id: "fail", label: "Fail — manage breakdown", toStage: "manage_breakdown",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"], variant: "destructive" },
      ] },
    { id: "manage_breakdown", label: "Manage preventive/breakdown maintenance", lane: "maintenance",
      actions: [{ id: "back_to_inspector", label: "Re-assign inspector", toStage: "assign_inspector",
        allowedRoles: ["maintenance_manager"] }] },

    // 5. Ready for trip — initiator closes the WO for pre/post inspections
    { id: "ready_for_trip", label: "5. Vehicle ready — initiator closes WO", lane: "fleet_ops",
      description: "For Pre-trip / Post-trip inspections, the request initiator (or fleet_manager / operations_manager) closes the linked Work Order here.",
      actions: [
        { id: "initiator_close_wo", label: "Close Work Order (initiator)", toStage: "wo_closed",
          allowedRoles: ["user","fleet_manager","operations_manager"],
          fields: [
            { key: "wo_close_notes", label: "Closure notes", type: "textarea" },
            { key: "wo_closed_at", label: "Closed at", type: "datetime", required: true },
          ] },
      ] },
    { id: "wo_closed", label: "6. Work Order closed (END)", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete_pre_post", label: "Complete", toStage: "wo_closed", completes: true,
        allowedRoles: ["user","fleet_manager","operations_manager"] }] },

    // ===== Annual path — mirrors Outsource Rental (FMG-OUT 14) =====
    { id: "annual_supplier_select", label: "A1. Select inspection center / supplier", lane: "sourcing",
      actions: [{ id: "select_supplier", label: "Select inspection center", toStage: "annual_contract",
        allowedRoles: ["sourcing_manager","fleet_manager"],
        fields: [
          { key: "inspection_center_name", label: "Inspection center", type: "text", required: true },
          { key: "contract_ref", label: "Contract reference", type: "text" },
          { key: "agreed_amount", label: "Agreed amount (ETB)", type: "number", required: true },
        ] }] },
    { id: "annual_contract", label: "A2. Contract signed", lane: "sourcing",
      actions: [{ id: "ready_handover", label: "Ready for handover", toStage: "annual_handover",
        allowedRoles: ["sourcing_manager","fleet_manager"] }] },
    { id: "annual_handover", label: "A3. Vehicle handover to inspection center", lane: "fleet_ops",
      actions: [{ id: "handover_done", label: "Handover complete", toStage: "annual_perform",
        allowedRoles: ["fleet_manager","operations_manager"],
        fields: [
          { key: "handover_at", label: "Handover date/time", type: "datetime", required: true },
          { key: "handover_notes", label: "Handover notes / vehicle condition", type: "textarea" },
        ] }] },
    { id: "annual_perform", label: "A4. Perform annual inspection", lane: "inspection",
      actions: [
        { id: "annual_pass", label: "Pass — issue certificate & Bolo", toStage: "annual_returned",
          allowedRoles: ["inspection_center"],
          fields: [
            { key: "certificate_no", label: "Certificate #", type: "text", required: true },
            { key: "bolo_number", label: "Bolo #", type: "text", required: true },
            { key: "bolo_expiry", label: "Bolo expiry", type: "date", required: true },
          ] },
        { id: "annual_fail", label: "Fail — send back for maintenance", toStage: "manage_breakdown",
          allowedRoles: ["inspection_center"], variant: "destructive" },
      ] },
    { id: "annual_returned", label: "A5. Vehicle returned from inspection", lane: "fleet_ops",
      actions: [{ id: "return_done", label: "Return received", toStage: "annual_registration_paid",
        allowedRoles: ["fleet_manager","operations_manager"],
        fields: [
          { key: "returned_at", label: "Returned at", type: "datetime", required: true },
          { key: "return_notes", label: "Return notes", type: "textarea" },
        ] }] },
    { id: "annual_registration_paid", label: "A6. Pay annual registration", lane: "finance",
      actions: [{ id: "register_paid", label: "Registration paid", toStage: "annual_complete",
        allowedRoles: ["finance_manager","fleet_manager"],
        fields: [
          { key: "annual_registration_cost", label: "Annual registration cost (ETB)", type: "number", required: true },
          { key: "registration_payment_date", label: "Payment date", type: "date", required: true },
          { key: "registration_receipt_no", label: "Receipt #", type: "text" },
        ] }] },
    { id: "annual_complete", label: "A7. Annual inspection complete", lane: "finance", terminal: true,
      actions: [{ id: "complete_annual", label: "Close annual inspection", toStage: "annual_complete", completes: true,
        allowedRoles: ["finance_manager","fleet_manager","operations_manager"] }] },
  ],
};

// =============================================================
// 2) FMG-REG 02 — Vehicle Registration & Bolo Renewal
// =============================================================
export const vehicleRegistrationConfig: WorkflowConfig = {
  type: "vehicle_registration",
  sopCode: "FMG-REG 02",
  title: "Vehicle Registration & Bolo Renewal",
  description: "Register a new vehicle or renew Bolo with Transport Authority.",
  icon: Car,
  initialStage: "request",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "renewal_type", label: "Type", type: "select", required: true,
      options: [{ value: "new", label: "New registration" }, { value: "renewal", label: "Renewal" }] },
    { key: "current_bolo_expiry", label: "Current Bolo expiry", type: "date" },
  ],
  lanes: [{...fleetOpsLane}, {...transportLane}, {...financeLane}],
  stages: [
    { id: "request", label: "1. File registration request", lane: "fleet_ops",
      actions: [{ id: "verify_docs", label: "Verify documents", toStage: "verify_docs",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "verify_docs", label: "2. Verify documents", lane: "fleet_ops",
      actions: [{ id: "submit_ta", label: "Submit to Transport Authority", toStage: "submit_ta",
        allowedRoles: ["fleet_manager"] }] },
    { id: "submit_ta", label: "3. Submitted to TA", lane: "transport",
      actions: [
        { id: "ta_approve", label: "TA approves & issues Bolo", toStage: "ta_approved",
          allowedRoles: ["transport_authority"],
          fields: [{ key: "bolo_number", label: "Bolo #", type: "text", required: true },
                   { key: "bolo_expiry", label: "Bolo expiry", type: "date", required: true }] },
        { id: "ta_reject", label: "TA rejects", toStage: "ta_rejected",
          allowedRoles: ["transport_authority"], variant: "destructive" },
      ] },
    { id: "ta_rejected", label: "TA rejected — fix & resubmit", lane: "fleet_ops",
      actions: [{ id: "back_verify", label: "Re-verify & resubmit", toStage: "verify_docs",
        allowedRoles: ["fleet_manager"] }] },
    { id: "ta_approved", label: "4. Bolo issued — pay fees", lane: "finance",
      actions: [{ id: "pay_fees", label: "Pay registration fees", toStage: "fees_paid",
        allowedRoles: ["finance_manager"],
        fields: [{ key: "fees_paid", label: "Amount paid (ETB)", type: "number", required: true }] }] },
    { id: "fees_paid", label: "5. Fees paid — collect Bolo", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Complete & file Bolo", toStage: "fees_paid", completes: true,
        allowedRoles: ["fleet_manager"] }] },
  ],
};

// =============================================================
// 3) FMG-INS 03 — Vehicle Insurance Renewal
// =============================================================
export const vehicleInsuranceRenewalConfig: WorkflowConfig = {
  type: "vehicle_insurance_renewal",
  sopCode: "FMG-INS 03",
  title: "Vehicle Insurance Renewal",
  description: "Annual vehicle insurance policy renewal & payment.",
  icon: ShieldCheck,
  initialStage: "request",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "current_policy_expiry", label: "Current policy expiry", type: "date", required: true },
    { key: "coverage_type", label: "Coverage type", type: "select",
      options: [{ value: "third_party", label: "Third party" }, { value: "comprehensive", label: "Comprehensive" }] },
  ],
  lanes: [{...fleetOpsLane}, {...insuranceLane}, {...financeLane}],
  stages: [
    { id: "request", label: "1. Renewal request", lane: "fleet_ops",
      actions: [{ id: "to_insurance", label: "Forward to Insurance Mgmt", toStage: "request_quotes",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "request_quotes", label: "2. Request quotations from insurers", lane: "insurance",
      actions: [{ id: "select_quote", label: "Select best quotation", toStage: "select_quote",
        allowedRoles: ["insurance_admin"],
        fields: [{ key: "insurer_name", label: "Insurer", type: "text", required: true },
                 { key: "premium_amount", label: "Premium (ETB)", type: "number", required: true }] }] },
    { id: "select_quote", label: "3. Quotation selected", lane: "insurance",
      actions: [{ id: "approve_pay", label: "Approve & request payment", toStage: "request_payment",
        allowedRoles: ["insurance_admin","fleet_manager"] }] },
    { id: "request_payment", label: "4. Payment requested", lane: "finance",
      actions: [{ id: "pay", label: "Pay premium", toStage: "policy_issued",
        allowedRoles: ["finance_manager"] }] },
    { id: "policy_issued", label: "5. Policy issued", lane: "insurance", terminal: true,
      actions: [{ id: "complete", label: "Archive policy & complete", toStage: "policy_issued", completes: true,
        allowedRoles: ["insurance_admin","fleet_manager"],
        fields: [{ key: "policy_number", label: "Policy #", type: "text", required: true },
                 { key: "policy_expiry", label: "Policy expiry", type: "date", required: true }] }] },
  ],
};

// =============================================================
// 4) FMG-MNT 04 — Preventive Maintenance Request
// =============================================================
export const preventiveMaintenanceConfig: WorkflowConfig = {
  type: "preventive_maintenance",
  sopCode: "FMG-MNT 04",
  title: "Preventive Maintenance",
  description: "Scheduled preventive maintenance request & execution.",
  icon: Wrench,
  initialStage: "request",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "service_type", label: "Service type", type: "select", required: true,
      options: [{ value: "oil_change", label: "Oil change" }, { value: "tire_rotation", label: "Tire rotation" },
                { value: "general_service", label: "General service" }, { value: "other", label: "Other" }] },
    { key: "current_odometer", label: "Current odometer", type: "number" },
    { key: "description", label: "Notes", type: "textarea" },
  ],
  lanes: [{...fleetOpsLane}, {...maintLane}, {...sourcingLane}],
  stages: [
    { id: "request", label: "1. PM request filed", lane: "fleet_ops",
      actions: [{ id: "to_maint", label: "Send to Maintenance", toStage: "scheduled",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "scheduled", label: "2. Scheduled", lane: "maintenance",
      actions: [{ id: "start", label: "Start service", toStage: "in_service",
        allowedRoles: ["maintenance_manager","maintenance_supervisor"],
        fields: [{ key: "scheduled_at", label: "Scheduled at", type: "datetime", required: true }] }] },
    { id: "in_service", label: "3. In service", lane: "maintenance",
      actions: [
        { id: "need_parts", label: "Need parts → Sourcing", toStage: "parts_sourcing",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"] },
        { id: "complete_service", label: "Complete service", toStage: "completed",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"],
          fields: [{ key: "actual_cost", label: "Actual cost (ETB)", type: "number", required: true }] },
      ] },
    { id: "parts_sourcing", label: "4. Parts sourcing", lane: "sourcing",
      actions: [{ id: "parts_delivered", label: "Parts delivered → resume service", toStage: "in_service",
        allowedRoles: ["sourcing_manager"] }] },
    { id: "completed", label: "5. Completed", lane: "fleet_ops", terminal: true,
      actions: [{ id: "release", label: "Release to operations (END)", toStage: "completed", completes: true,
        allowedRoles: ["fleet_manager","operations_manager"] }] },
  ],
};

// =============================================================
// 5) FMG-MNT 05 — Breakdown / Corrective Maintenance
// =============================================================
export const breakdownMaintenanceConfig: WorkflowConfig = {
  type: "breakdown_maintenance",
  sopCode: "FMG-MNT 05",
  title: "Breakdown Maintenance",
  description: "Corrective maintenance for unexpected breakdowns.",
  icon: AlertOctagon,
  initialStage: "report",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Issue title", type: "text", required: true },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "__driver_id", label: "Driver who reported", type: "driver" },
    { key: "severity", label: "Severity", type: "select", required: true,
      options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }] },
    { key: "location", label: "Breakdown location", type: "text" },
    { key: "description", label: "Symptoms", type: "textarea", required: true },
  ],
  lanes: [{...driverLane}, {...fleetOpsLane}, {...maintLane}, {...sourcingLane}],
  stages: [
    { id: "report", label: "1. Driver reports breakdown", lane: "driver",
      actions: [{ id: "ack", label: "Acknowledge & dispatch", toStage: "diagnose",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "diagnose", label: "2. Diagnose", lane: "maintenance",
      actions: [{ id: "estimate", label: "Estimate cost", toStage: "estimate",
        allowedRoles: ["maintenance_manager","maintenance_supervisor"],
        fields: [{ key: "diagnosis", label: "Diagnosis", type: "textarea", required: true }] }] },
    { id: "estimate", label: "3. Cost estimate", lane: "maintenance",
      actions: [
        { id: "approve", label: "Approve & repair", toStage: "repair",
          allowedRoles: ["fleet_manager","maintenance_manager"],
          fields: [{ key: "estimate_amount", label: "Estimate (ETB)", type: "number", required: true }] },
        { id: "outsource", label: "Outsource → Sourcing", toStage: "outsourced",
          allowedRoles: ["fleet_manager","sourcing_manager"] },
      ] },
    { id: "repair", label: "4. Repair in progress", lane: "maintenance",
      actions: [{ id: "done", label: "Repair done", toStage: "qa",
        allowedRoles: ["maintenance_manager","maintenance_supervisor"] }] },
    { id: "outsourced", label: "Outsourced repair", lane: "sourcing",
      actions: [{ id: "delivered", label: "Vehicle returned by supplier", toStage: "qa",
        allowedRoles: ["sourcing_manager"] }] },
    { id: "qa", label: "5. QA / road test", lane: "maintenance",
      actions: [
        { id: "pass_qa", label: "QA pass — return to ops", toStage: "returned",
          allowedRoles: ["maintenance_manager"] },
        { id: "fail_qa", label: "QA fail — re-repair", toStage: "repair",
          allowedRoles: ["maintenance_manager"], variant: "destructive" },
      ] },
    { id: "returned", label: "6. Returned to operations", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Close ticket", toStage: "returned", completes: true,
        allowedRoles: ["fleet_manager","operations_manager"] }] },
  ],
};

// =============================================================
// 7) FMG-DSP 07 — Vehicle Dispatch / Trip Request
// =============================================================
export const vehicleDispatchConfig: WorkflowConfig = {
  type: "vehicle_dispatch",
  sopCode: "FMG-DSP 07",
  title: "Vehicle Dispatch / Trip",
  description: "Trip request, approval, vehicle/driver assignment, completion.",
  icon: Truck,
  initialStage: "request",
  intakeFields: [
    { key: "title", label: "Trip title", type: "text", required: true },
    { key: "origin", label: "Origin", type: "text", required: true },
    { key: "destination", label: "Destination", type: "text", required: true },
    { key: "departure_at", label: "Departure", type: "datetime", required: true },
    { key: "return_at", label: "Expected return", type: "datetime" },
    { key: "passengers", label: "Passengers", type: "number" },
    { key: "purpose", label: "Purpose", type: "textarea" },
  ],
  lanes: [
    { id: "requestor",  label: "Requestor",         roles: ["user"] },
    { ...fleetOpsLane },
    { ...driverLane },
  ],
  stages: [
    { id: "request", label: "1. Trip requested", lane: "requestor",
      actions: [{ id: "review", label: "Review request", toStage: "review",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "review", label: "2. Under review", lane: "fleet_ops",
      actions: [
        { id: "approve_assign", label: "Approve & assign", toStage: "assigned",
          allowedRoles: ["fleet_manager","operations_manager"],
          fields: [{ key: "__vehicle_id", label: "Assigned vehicle", type: "vehicle", required: true },
                   { key: "__driver_id", label: "Assigned driver", type: "driver", required: true }] },
        { id: "reject", label: "Reject", toStage: "rejected",
          allowedRoles: ["fleet_manager","operations_manager"], variant: "destructive" },
      ] },
    { id: "rejected", label: "Rejected", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["fleet_manager"] }] },
    { id: "assigned", label: "3. Driver assigned — pre-trip required", lane: "driver",
      actions: [{ id: "pretrip_pass", label: "Pre-trip inspection passed", toStage: "pretrip_done",
        allowedRoles: ["driver","fleet_manager"],
        fields: [
          { key: "pretrip_odometer", label: "Odometer (pre-trip)", type: "number", required: true },
          { key: "pretrip_notes", label: "Pre-trip notes / defects", type: "textarea" },
        ] },
        { id: "pretrip_fail", label: "Pre-trip failed → Breakdown", toStage: "rejected",
          allowedRoles: ["driver","fleet_manager"], variant: "destructive",
          fields: [{ key: "pretrip_fail_reason", label: "Reason for failure", type: "textarea", required: true }] },
      ] },
    { id: "pretrip_done", label: "3b. Pre-trip cleared — start trip", lane: "driver",
      actions: [{ id: "checkout", label: "Driver check-out (start trip)", toStage: "in_trip",
        allowedRoles: ["driver","fleet_manager"],
        fields: [{ key: "odometer_start", label: "Odometer start", type: "number", required: true }] }] },
    { id: "in_trip", label: "4. Trip in progress", lane: "driver",
      actions: [{ id: "checkin", label: "Driver check-in (end trip)", toStage: "completed",
        allowedRoles: ["driver","fleet_manager"],
        fields: [{ key: "odometer_end", label: "Odometer end", type: "number", required: true }] }] },
    { id: "completed", label: "5. Trip completed — post-trip auto-created", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close", label: "Close trip", toStage: "completed", completes: true,
        allowedRoles: ["fleet_manager","operations_manager"] }] },
  ],
};

// =============================================================
// 8) FMG-DRV 08 — Driver Recruitment & Onboarding (E2E)
// Flow: Hire (centralized intake form) → Document Verify (HR) → Training → Activate (Ops Manager)
// Intake is the centralized `driver_registration` form (Forms module),
// so labels/sections/validations edited in /forms apply automatically.
// The actual `drivers` row + auth user are created by the legacy
// CreateDriverDialog logic at intake time; this workflow tracks the
// post-creation onboarding lifecycle (HR verify → training → activate).
// =============================================================
export const driverOnboardingConfig: WorkflowConfig = {
  type: "driver_onboarding",
  sopCode: "FMG-DRV 08",
  title: "Driver Recruitment & Onboarding",
  description: "Hire → Document verify (HR) → Training → Activate (Ops Manager).",
  icon: UserPlus,
  initialStage: "doc_verify",
  // Use the centralized Driver Registration form built in /forms.
  // The DynamicFormWrapper resolves the published version at runtime.
  intakeFormKey: "user_form:driver_registration",
  intakeFields: [],
  intakeRoles: ["fleet_manager", "operations_manager", "fleet_owner", "super_admin"],
  lanes: [
    { id: "hr", label: "HR / People Ops", roles: ["fleet_manager", "operations_manager"] },
    { id: "training", label: "Training", roles: ["fleet_manager", "operations_manager"] },
    { ...fleetOpsLane },
  ],
  stages: [
    // 1. Document verification — HR (or fleet_manager) reviews license/ID/medical
    {
      id: "doc_verify",
      label: "1. Document verification (HR)",
      lane: "hr",
      description:
        "HR verifies that all driver documents captured at intake (license, national ID, medical certificate, photo) are present, legible and unexpired.",
      actions: [
        {
          id: "docs_ok",
          label: "Documents verified → Schedule training",
          toStage: "training",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "license_verified", label: "License verified", type: "checkbox", required: true },
            { key: "id_verified", label: "National ID verified", type: "checkbox", required: true },
            { key: "medical_verified", label: "Medical certificate verified", type: "checkbox" },
            { key: "doc_verify_notes", label: "Verification notes", type: "textarea" },
          ],
        },
        {
          id: "docs_missing",
          label: "Reject — documents incomplete",
          toStage: "rejected",
          variant: "destructive",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true },
          ],
        },
      ],
    },

    // 2. Training — assign + run onboarding training course
    {
      id: "training",
      label: "2. Onboarding training",
      lane: "training",
      description:
        "Assign and run the onboarding training course (defensive driving / fleet rules / safety). Capture course completion + score.",
      actions: [
        {
          id: "training_complete",
          label: "Training complete → Send to Ops for activation",
          toStage: "activation",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "training_course", label: "Course name", type: "text", required: true, placeholder: "Defensive driving — Onboarding 101" },
            { key: "training_completed_at", label: "Completion date", type: "date", required: true },
            { key: "training_score", label: "Exam score (%)", type: "number" },
            { key: "training_notes", label: "Trainer notes", type: "textarea" },
          ],
        },
        {
          id: "training_failed",
          label: "Failed — reject candidate",
          toStage: "rejected",
          variant: "destructive",
          allowedRoles: ["fleet_manager", "operations_manager"],
          fields: [
            { key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true },
          ],
        },
      ],
    },

    // 3. Activation — Operations Manager final approval, driver becomes active
    {
      id: "activation",
      label: "3. Activate driver (Operations Manager)",
      lane: "fleet_ops",
      description:
        "Operations Manager performs the final review and activates the driver. After activation the driver is eligible for dispatch and vehicle assignment.",
      actions: [
        {
          id: "activate",
          label: "Activate driver",
          toStage: "active",
          allowedRoles: ["operations_manager", "fleet_manager"],
          confirm: "Activate this driver? They will become eligible for dispatch and vehicle assignment.",
          fields: [
            { key: "employee_id", label: "Employee ID", type: "text" },
            { key: "assigned_vehicle_id", label: "Assigned vehicle (optional)", type: "vehicle" },
            { key: "activation_notes", label: "Activation notes", type: "textarea" },
          ],
        },
        {
          id: "send_back_training",
          label: "Send back for additional training",
          toStage: "training",
          variant: "outline",
          allowedRoles: ["operations_manager", "fleet_manager"],
        },
      ],
    },

    // 4. Active — terminal success
    {
      id: "active",
      label: "4. Driver active",
      lane: "fleet_ops",
      terminal: true,
      description: "Driver is active and available for dispatch.",
      actions: [
        {
          id: "complete_active",
          label: "Close onboarding case",
          toStage: "active",
          completes: true,
          allowedRoles: ["operations_manager", "fleet_manager"],
        },
      ],
    },

    // Rejected — terminal failure (used by both doc_verify and training stages)
    {
      id: "rejected",
      label: "Rejected — closed",
      lane: "hr",
      terminal: true,
      actions: [
        {
          id: "close_rejected",
          label: "Close",
          toStage: "rejected",
          completes: true,
          allowedRoles: ["fleet_manager", "operations_manager"],
        },
      ],
    },
  ],
};

// =============================================================
// 9) FMG-DRV 09 — Driver Training & Re-certification
// =============================================================
export const driverTrainingConfig: WorkflowConfig = {
  type: "driver_training",
  sopCode: "FMG-DRV 09",
  title: "Driver Training & Re-certification",
  description: "Training plan → enrollment → completion → certificate.",
  icon: GraduationCap,
  initialStage: "plan",
  requiresDriver: true,
  intakeFields: [
    { key: "title", label: "Training title", type: "text", required: true },
    { key: "__driver_id", label: "Driver", type: "driver", required: true },
    { key: "course_type", label: "Course type", type: "select", required: true,
      options: [{ value: "defensive", label: "Defensive driving" }, { value: "ecodrive", label: "Eco-drive" }, { value: "hazmat", label: "HAZMAT" }, { value: "recert", label: "Re-certification" }] },
    { key: "scheduled_date", label: "Scheduled date", type: "date", required: true },
  ],
  lanes: [{...fleetOpsLane}, { id: "trainer", label: "Trainer", roles: ["fleet_manager"] }, {...driverLane}],
  stages: [
    { id: "plan", label: "1. Training planned", lane: "fleet_ops",
      actions: [{ id: "enroll", label: "Enroll driver", toStage: "enrolled",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "enrolled", label: "2. Enrolled", lane: "trainer",
      actions: [{ id: "start", label: "Start training", toStage: "in_progress",
        allowedRoles: ["fleet_manager"] }] },
    { id: "in_progress", label: "3. Training in progress", lane: "driver",
      actions: [
        { id: "pass", label: "Pass exam — issue certificate", toStage: "certified",
          allowedRoles: ["fleet_manager"],
          fields: [{ key: "exam_score", label: "Exam score", type: "number", required: true },
                   { key: "certificate_no", label: "Certificate #", type: "text", required: true }] },
        { id: "fail", label: "Fail — re-enroll", toStage: "enrolled",
          allowedRoles: ["fleet_manager"], variant: "destructive" },
      ] },
    { id: "certified", label: "4. Certified", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Archive certificate", toStage: "certified", completes: true,
        allowedRoles: ["fleet_manager"] }] },
  ],
};

// =============================================================
// 10) FMG-DRV 10 — Driver Allowance & Per-diem
// =============================================================
export const driverAllowanceConfig: WorkflowConfig = {
  type: "driver_allowance",
  sopCode: "FMG-DRV 10",
  title: "Driver Allowance / Per-diem",
  description: "Per-diem request → approval → payment → settlement.",
  icon: Banknote,
  initialStage: "request",
  requiresDriver: true,
  intakeFields: [
    { key: "title", label: "Trip / mission name", type: "text", required: true },
    { key: "__driver_id", label: "Driver", type: "driver", required: true },
    { key: "from_date", label: "From", type: "date", required: true },
    { key: "to_date", label: "To", type: "date", required: true },
    { key: "destination", label: "Destination", type: "text", required: true },
    { key: "requested_amount", label: "Requested amount (ETB)", type: "number", required: true },
  ],
  lanes: [{...driverLane}, {...fleetOpsLane}, {...financeLane}],
  stages: [
    { id: "request", label: "1. Per-diem request", lane: "driver",
      actions: [{ id: "to_supervisor", label: "Submit to supervisor", toStage: "supervisor",
        allowedRoles: ["driver","fleet_manager"] }] },
    { id: "supervisor", label: "2. Supervisor review", lane: "fleet_ops",
      actions: [
        { id: "approve", label: "Approve", toStage: "finance",
          allowedRoles: ["fleet_manager","operations_manager"] },
        { id: "reject", label: "Reject", toStage: "rejected",
          allowedRoles: ["fleet_manager","operations_manager"], variant: "destructive" },
      ] },
    { id: "rejected", label: "Rejected", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["fleet_manager"] }] },
    { id: "finance", label: "3. Finance disbursement", lane: "finance",
      actions: [{ id: "disburse", label: "Disburse to driver", toStage: "disbursed",
        allowedRoles: ["finance_manager"],
        fields: [{ key: "disbursed_amount", label: "Disbursed (ETB)", type: "number", required: true },
                 { key: "payment_ref", label: "Payment reference", type: "text", required: true }] }] },
    { id: "disbursed", label: "4. Disbursed", lane: "driver",
      actions: [{ id: "settle", label: "Settle expenses (driver)", toStage: "settled",
        allowedRoles: ["driver","fleet_manager"],
        fields: [{ key: "actual_spent", label: "Actual spent (ETB)", type: "number", required: true },
                 { key: "receipts_url", label: "Receipts", type: "file" }] }] },
    { id: "settled", label: "5. Settled", lane: "finance", terminal: true,
      actions: [{ id: "complete", label: "Close per-diem", toStage: "settled", completes: true,
        allowedRoles: ["finance_manager"] }] },
  ],
};

// =============================================================
// 11) FMG-DSP 11 — Vehicle Disposal / Auction
// =============================================================
export const vehicleDisposalConfig: WorkflowConfig = {
  type: "vehicle_disposal",
  sopCode: "FMG-DSP 11",
  title: "Vehicle Disposal / Auction",
  description: "Disposal proposal → valuation → auction → handover → finance.",
  icon: Hammer,
  initialStage: "proposal",
  requiresVehicle: true,
  intakeFields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "reason", label: "Disposal reason", type: "select", required: true,
      options: [{ value: "end_of_life", label: "End of life" }, { value: "uneconomic", label: "Uneconomic to repair" }, { value: "accident", label: "Accident write-off" }, { value: "obsolete", label: "Obsolete" }] },
    { key: "description", label: "Justification", type: "textarea", required: true },
  ],
  lanes: [{...fleetOpsLane}, {...maintLane}, {...sourcingLane}, {...financeLane}],
  stages: [
    { id: "proposal", label: "1. Disposal proposal", lane: "fleet_ops",
      actions: [{ id: "valuate", label: "Send for valuation", toStage: "valuation",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "valuation", label: "2. Valuation", lane: "maintenance",
      actions: [{ id: "approve_auction", label: "Approve & list for auction", toStage: "auction",
        allowedRoles: ["maintenance_manager","fleet_manager"],
        fields: [{ key: "valuation_amount", label: "Valuation (ETB)", type: "number", required: true }] }] },
    { id: "auction", label: "3. Auction", lane: "sourcing",
      actions: [{ id: "winner", label: "Winner selected", toStage: "handover",
        allowedRoles: ["sourcing_manager","fleet_manager"],
        fields: [{ key: "winner_name", label: "Winner", type: "text", required: true },
                 { key: "sale_amount", label: "Sale amount (ETB)", type: "number", required: true }] }] },
    { id: "handover", label: "4. Handover", lane: "fleet_ops",
      actions: [{ id: "to_finance", label: "Handed over → finance collects", toStage: "finance",
        allowedRoles: ["fleet_manager"] }] },
    { id: "finance", label: "5. Finance collects sale", lane: "finance", terminal: true,
      actions: [{ id: "complete", label: "Close disposal", toStage: "finance", completes: true,
        allowedRoles: ["finance_manager"] }] },
  ],
};

// =============================================================
// 12) FMG-RSA 12 — Roadside Assistance / Towing
// =============================================================
export const roadsideAssistanceConfig: WorkflowConfig = {
  type: "roadside_assistance",
  sopCode: "FMG-RSA 12",
  title: "Roadside Assistance / Towing",
  description: "Incident report → dispatch tow → recovery → close.",
  icon: LifeBuoy,
  initialStage: "report",
  requiresVehicle: true,
  // Centralized intake — reuses the full Roadside Assistance request dialog
  // (vehicle/driver pickers, GPS capture, provider details, tow flag) so the
  // SOP "File new" button stays in sync with the standalone page.
  intakeFormKey: "roadside_request",
  intakeRoles: [
    "driver", "fleet_supervisor", "fleet_manager",
    "operations_manager", "fleet_owner", "super_admin",
  ],
  intakeFields: [
    { key: "title", label: "Incident summary", type: "text", required: true },
    { key: "__vehicle_id", label: "Vehicle", type: "vehicle", required: true },
    { key: "__driver_id", label: "Driver", type: "driver" },
    { key: "location", label: "Location", type: "text", required: true },
    { key: "issue_type", label: "Issue", type: "select", required: true,
      options: [{ value: "flat_tire", label: "Flat tire" }, { value: "battery", label: "Battery" }, { value: "fuel_out", label: "Out of fuel" }, { value: "engine", label: "Engine failure" }, { value: "accident", label: "Accident" }] },
  ],
  lanes: [{...driverLane}, {...fleetOpsLane}, {...sourcingLane}],
  stages: [
    { id: "report", label: "1. Incident reported", lane: "driver",
      actions: [{ id: "dispatch", label: "Dispatch assistance", toStage: "dispatched",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "dispatched", label: "2. Tow / assist dispatched", lane: "sourcing",
      actions: [{ id: "on_site", label: "Assistance on site", toStage: "on_site",
        allowedRoles: ["sourcing_manager","fleet_manager"],
        fields: [{ key: "supplier_name", label: "Supplier", type: "text", required: true }] }] },
    { id: "on_site", label: "3. On site", lane: "sourcing",
      actions: [
        { id: "fixed", label: "Fixed on site", toStage: "closed",
          allowedRoles: ["sourcing_manager","fleet_manager"] },
        { id: "tow", label: "Towed to garage", toStage: "towed",
          allowedRoles: ["sourcing_manager","fleet_manager"] },
      ] },
    { id: "towed", label: "4. Towed to garage", lane: "fleet_ops",
      actions: [{ id: "close", label: "Vehicle handed to maintenance", toStage: "closed",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "closed", label: "5. Closed", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Close incident", toStage: "closed", completes: true,
        allowedRoles: ["fleet_manager","operations_manager"] }] },
  ],
};

// =============================================================
// 13) FMG-LIC 13 — License Renewal
// =============================================================
export const licenseRenewalConfig: WorkflowConfig = {
  type: "license_renewal",
  sopCode: "FMG-LIC 13",
  title: "Driver License Renewal",
  description: "Driver license / work permit renewal workflow.",
  icon: IdCard,
  initialStage: "request",
  requiresDriver: true,
  // Centralized intake — uses the user-built form `license_renewal_request`
  // from the Forms module. Drivers can self-file from the Driver Portal;
  // back-office roles can also file on behalf of a driver.
  intakeFormKey: "user_form:license_renewal_request",
  intakeRoles: [
    "driver", "fleet_supervisor", "fleet_manager",
    "operations_manager", "fleet_owner", "super_admin",
  ],
  intakeFields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "__driver_id", label: "Driver", type: "driver", required: true },
    { key: "license_type", label: "License type", type: "select", required: true,
      options: [{ value: "driver", label: "Driver license" }, { value: "work_permit", label: "Work permit" }, { value: "hazmat", label: "HAZMAT permit" }] },
    { key: "current_expiry", label: "Current expiry", type: "date", required: true },
  ],
  lanes: [{...driverLane}, {...fleetOpsLane}, {...transportLane}, {...financeLane}],
  stages: [
    { id: "request", label: "1. Renewal requested", lane: "driver",
      actions: [{ id: "verify", label: "Verify documents", toStage: "verify",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "verify", label: "2. Documents verified", lane: "fleet_ops",
      actions: [{ id: "submit_ta", label: "Submit to TA", toStage: "ta_processing",
        allowedRoles: ["fleet_manager"] }] },
    { id: "ta_processing", label: "3. TA processing", lane: "transport",
      actions: [
        { id: "approve", label: "TA approves", toStage: "pay_fees",
          allowedRoles: ["transport_authority"] },
        { id: "reject", label: "TA rejects", toStage: "verify",
          allowedRoles: ["transport_authority"], variant: "destructive" },
      ] },
    { id: "pay_fees", label: "4. Pay fees", lane: "finance",
      actions: [{ id: "paid", label: "Fees paid", toStage: "issued",
        allowedRoles: ["finance_manager"],
        fields: [{ key: "amount_paid", label: "Amount (ETB)", type: "number", required: true }] }] },
    { id: "issued", label: "5. New license issued", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Archive & complete", toStage: "issued", completes: true,
        allowedRoles: ["fleet_manager"],
        fields: [{ key: "new_expiry", label: "New expiry", type: "date", required: true }] }] },
  ],
};

// =============================================================
// 14) FMG-OUT 14 — Outsource Vehicle Rental
// =============================================================
export const outsourceRentalConfig: WorkflowConfig = {
  type: "outsource_rental",
  sopCode: "FMG-OUT 14",
  title: "Outsource Vehicle Rental",
  description: "Rental request → supplier selection → contract → attendance → payment.",
  icon: Building2,
  initialStage: "request",
  intakeFields: [
    { key: "title", label: "Rental title", type: "text", required: true },
    { key: "vehicle_type_needed", label: "Vehicle type needed", type: "text", required: true },
    { key: "qty", label: "Quantity", type: "number", required: true },
    { key: "from_date", label: "From", type: "date", required: true },
    { key: "to_date", label: "To", type: "date", required: true },
    { key: "purpose", label: "Purpose", type: "textarea" },
  ],
  lanes: [{...fleetOpsLane}, {...sourcingLane}, {...financeLane}],
  stages: [
    { id: "request", label: "1. Rental request", lane: "fleet_ops",
      actions: [{ id: "to_sourcing", label: "Send to sourcing", toStage: "supplier_select",
        allowedRoles: ["fleet_manager","operations_manager"] }] },
    { id: "supplier_select", label: "2. Supplier selection", lane: "sourcing",
      actions: [{ id: "select", label: "Select supplier", toStage: "contract",
        allowedRoles: ["sourcing_manager"],
        fields: [{ key: "supplier_name", label: "Supplier", type: "text", required: true },
                 { key: "rate_per_day", label: "Rate per day (ETB)", type: "number", required: true }] }] },
    { id: "contract", label: "3. Contract signed", lane: "sourcing",
      actions: [{ id: "active", label: "Activate rental", toStage: "active",
        allowedRoles: ["sourcing_manager","fleet_manager"] }] },
    { id: "active", label: "4. Rental active (attendance tracked)", lane: "fleet_ops",
      actions: [{ id: "end", label: "End rental period", toStage: "invoice",
        allowedRoles: ["fleet_manager","operations_manager"]}] },
    { id: "invoice", label: "5. Supplier invoice", lane: "finance",
      actions: [{ id: "pay", label: "Pay invoice", toStage: "paid",
        allowedRoles: ["finance_manager"],
        fields: [{ key: "invoice_amount", label: "Invoice (ETB)", type: "number", required: true }] }] },
    { id: "paid", label: "6. Paid & closed", lane: "finance", terminal: true,
      actions: [{ id: "complete", label: "Close rental", toStage: "paid", completes: true,
        allowedRoles: ["finance_manager"] }] },
  ],
};

// =============================================================
// 15) FMG-SAF 15 — Vehicle Safety & Comfort Request
// Full lifecycle: report → severity-based approval (critical = auto) →
// triage → reuse/create WO → parts (if needed) → repair → QA → maintenance
// signoff → initiator acceptance → close.
// Intake: Oracle EBS form (office staff) OR Driver app form (drivers).
// Captures category, severity, location-on-vehicle, photos, agreed cost,
// parts used, and acceptance signature.
// =============================================================
export const safetyComfortConfig: WorkflowConfig = {
  type: "safety_comfort",
  sopCode: "FMG-SAF 15",
  title: "Vehicle Safety & Comfort",
  description: "Driver/staff reports of safety or comfort issues — triage, fix, accept.",
  icon: Shield,
  initialStage: "report",
  requiresVehicle: true,
  // Centralized intake — opens the unified Safety & Comfort report form
  // (registered in the workflow form registry as `safety_comfort_report`).
  // Mirrors the vehicle_request SOP pattern so "File new" launches a single
  // standardized form instead of a chooser.
  intakeFormKey: "safety_comfort_report",
  intakeRoles: [
    "user", "driver", "fleet_supervisor",
    "fleet_manager", "operations_manager", "maintenance_manager", "fleet_owner",
  ],
  lanes: [
    { ...driverLane },
    { ...fleetOpsLane },
    { ...maintLane },
    { ...sourcingLane },
  ],
  stages: [
    // 1. Report filed
    { id: "report", label: "1. Report filed", lane: "driver",
      description: "Driver or office staff has filed a Safety & Comfort report.",
      actions: [
        { id: "auto_approve_critical", label: "Auto-approve (critical)", toStage: "triage",
          allowedRoles: ["fleet_manager","operations_manager","maintenance_manager","super_admin"],
          confirm: "Use only for critical safety issues that require immediate action." },
        { id: "request_approval", label: "Send for approval", toStage: "pending_approval",
          allowedRoles: ["fleet_manager","operations_manager","driver","user"] },
      ] },

    // 2. Approval — severity-based
    { id: "pending_approval", label: "2. Approval (severity-based)", lane: "fleet_ops",
      description: "Critical issues should be auto-approved at step 1. Comfort & general issues need manager approval here.",
      actions: [
        { id: "approve", label: "Approve", toStage: "triage",
          allowedRoles: ["fleet_manager","operations_manager"],
          fields: [{ key: "approval_notes", label: "Approval notes", type: "textarea" }] },
        { id: "reject", label: "Reject", toStage: "rejected",
          allowedRoles: ["fleet_manager","operations_manager"], variant: "destructive",
          fields: [{ key: "rejection_reason", label: "Rejection reason", type: "textarea", required: true }] },
      ] },
    { id: "rejected", label: "Rejected — closed", lane: "fleet_ops", terminal: true,
      actions: [{ id: "close_rejected", label: "Close", toStage: "rejected", completes: true,
        allowedRoles: ["fleet_manager","operations_manager"] }] },

    // 3. Triage by maintenance — also captures the standard Safety & Comfort
    // checklist (per Vehicle Group: G1/G2/G3) from the paper SOP.
    { id: "triage", label: "3. Triage", lane: "maintenance",
      actions: [{ id: "ready_wo", label: "Ready for Work Order", toStage: "request_wo",
        allowedRoles: ["maintenance_manager","maintenance_supervisor"],
        fields: [
          { key: "triage_notes", label: "Triage notes / diagnosis", type: "textarea", required: true },
          { key: "estimated_cost", label: "Estimated cost (ETB)", type: "number" },
          { key: "standards_checklist", label: "Standard Safety & Comfort Checklist (by Vehicle Group)", type: "safety_comfort_checklist",
            helpText: "Pick the vehicle group, then mark each standard item as present, set its condition, and add notes." },
        ] }] },

    // 4. WO — reuse or create
    { id: "request_wo", label: "4. Work Order (reuse or create)", lane: "maintenance",
      description: "Reuse an open WO on this vehicle if available, otherwise open the Oracle WO form.",
      actions: [
        { id: "use_existing_wo", label: "Use existing open WO", toStage: "in_repair",
          allowedRoles: ["maintenance_manager","maintenance_supervisor","fleet_manager"],
          confirm: "Link this safety & comfort request to the vehicle's open Work Order?" },
        { id: "open_wo_form", label: "Open Work Order form", toStage: "in_repair",
          allowedRoles: ["maintenance_manager","maintenance_supervisor","fleet_manager"],
          fields: [{ key: "work_order_id", label: "Work Order # (paste WO id after creating)", type: "text", required: true }] },
      ] },

    // 5. Repair (with optional parts detour)
    { id: "in_repair", label: "5. Repair in progress", lane: "maintenance",
      actions: [
        { id: "need_parts", label: "Need parts → Sourcing", toStage: "parts_sourcing",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"],
          fields: [{ key: "parts_needed", label: "Parts needed", type: "textarea", required: true }] },
        { id: "repair_done", label: "Repair done — go to QA", toStage: "qa",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"],
          fields: [
            { key: "actual_cost", label: "Actual cost (ETB)", type: "number", required: true },
            { key: "repair_notes", label: "Repair notes", type: "textarea" },
          ] },
      ] },
    { id: "parts_sourcing", label: "5a. Parts sourcing", lane: "sourcing",
      actions: [{ id: "parts_delivered", label: "Parts delivered → resume repair", toStage: "in_repair",
        allowedRoles: ["sourcing_manager"],
        fields: [{ key: "parts_received_at", label: "Parts received at", type: "datetime", required: true }] }] },

    // 6. QA / road test
    { id: "qa", label: "6. QA / road test", lane: "maintenance",
      actions: [
        { id: "qa_pass", label: "QA pass — maintenance signoff", toStage: "maintenance_signoff",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"] },
        { id: "qa_fail", label: "QA fail — re-repair", toStage: "in_repair",
          allowedRoles: ["maintenance_manager","maintenance_supervisor"], variant: "destructive" },
      ] },

    // 7. Maintenance signoff (step 1 of 2-step closure)
    { id: "maintenance_signoff", label: "7. Maintenance signoff", lane: "maintenance",
      description: "Maintenance confirms the issue is fixed; the request initiator must then accept.",
      actions: [{ id: "signoff", label: "Sign off — request initiator acceptance", toStage: "awaiting_acceptance",
        allowedRoles: ["maintenance_manager","maintenance_supervisor"],
        fields: [
          { key: "signoff_notes", label: "Signoff notes", type: "textarea" },
          { key: "signoff_at", label: "Signed off at", type: "datetime", required: true },
        ] }] },

    // 8. Initiator acceptance (step 2 of 2-step closure)
    { id: "awaiting_acceptance", label: "8. Awaiting initiator acceptance", lane: "driver",
      description: "Only the request initiator (or fleet/operations manager) can accept and close.",
      actions: [
        { id: "accept", label: "Accept fix — close", toStage: "closed",
          allowedRoles: ["user","driver","fleet_manager","operations_manager"],
          fields: [
            { key: "acceptance_notes", label: "Acceptance notes", type: "textarea" },
            { key: "accepted_at", label: "Accepted at", type: "datetime", required: true },
          ] },
        { id: "reject_fix", label: "Reject — re-open repair", toStage: "in_repair",
          allowedRoles: ["user","driver","fleet_manager","operations_manager"], variant: "destructive",
          fields: [{ key: "rejection_reason", label: "Why is the fix not acceptable?", type: "textarea", required: true }] },
      ] },

    // 9. Closed
    { id: "closed", label: "9. Closed", lane: "fleet_ops", terminal: true,
      actions: [{ id: "complete", label: "Complete (END)", toStage: "closed", completes: true,
        allowedRoles: ["fleet_manager","operations_manager","user","driver"] }] },
  ],
};

// All configs in one map for the registry
export const WORKFLOW_CONFIGS: Record<string, WorkflowConfig> = {
  fleet_inspection:        fleetInspectionConfig,
  vehicle_registration:    vehicleRegistrationConfig,
  vehicle_insurance_renewal: vehicleInsuranceRenewalConfig,
  preventive_maintenance:  preventiveMaintenanceConfig,
  breakdown_maintenance:   breakdownMaintenanceConfig,
  vehicle_dispatch:        vehicleDispatchConfig,
  vehicle_request:         vehicleRequestConfig,
  driver_onboarding:       driverOnboardingConfig,
  driver_training:         driverTrainingConfig,
  driver_allowance:        driverAllowanceConfig,
  vehicle_disposal:        vehicleDisposalConfig,
  roadside_assistance:     roadsideAssistanceConfig,
  license_renewal:         licenseRenewalConfig,
  outsource_rental:        outsourceRentalConfig,
  safety_comfort:          safetyComfortConfig,
  tire_request:            tireRequestConfig,
  vehicle_handover:        vehicleHandoverConfig,
  fleet_transfer:          fleetTransferConfig,
  fuel_request:            fuelRequestConfig,
  maintenance_request:     maintenanceRequestConfig,
};

export { tireRequestConfig, vehicleHandoverConfig, fleetTransferConfig, vehicleRequestConfig, fuelRequestConfig, maintenanceRequestConfig };
