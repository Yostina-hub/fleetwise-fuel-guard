// Shared workflow engine types — used by all 14 ET FMG SOP workflows.
import type { LucideIcon } from "lucide-react";

export type AppRole =
  | "super_admin"
  | "fleet_owner"
  | "operations_manager"
  | "fleet_manager"
  | "fleet_supervisor"
  | "maintenance_manager"
  | "maintenance_supervisor"
  | "insurance_admin"
  | "finance_manager"
  | "sourcing_manager"
  | "transport_authority"
  | "inspection_center"
  | "driver"
  | "user";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "checkbox"
  | "vehicle"
  | "driver"
  | "file";

export interface StageField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
}

export interface StageAction {
  /** Stable identifier, also used as decision label in the audit log */
  id: string;
  label: string;
  /** Where this action moves the case */
  toStage: string;
  /** Visual variant for the button */
  variant?: "default" | "outline" | "destructive" | "secondary";
  /** If set, only users with one of these roles can perform this action */
  allowedRoles?: AppRole[];
  /** Optional fields the user must fill before submitting the action */
  fields?: StageField[];
  /** Confirmation prompt shown before submit */
  confirm?: string;
  /** Mark the workflow as completed after this transition */
  completes?: boolean;
}

export interface Stage {
  id: string;
  label: string;
  /** Lane id this stage lives in (must exist in the lanes array) */
  lane: string;
  /** Free-form description shown in the detail drawer */
  description?: string;
  /** Actions available from this stage */
  actions: StageAction[];
  /** Treat this stage as terminal (no further actions, marks status complete) */
  terminal?: boolean;
}

export interface Lane {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Roles that "own" this lane (informational; used for color hints) */
  roles?: AppRole[];
}

export interface WorkflowConfig {
  /** Unique workflow type key — also written to the DB workflow_type column */
  type: string;
  /** SOP code shown in headers (e.g., "FMG-INS 01") */
  sopCode: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Stage id used when a new instance is created */
  initialStage: string;
  lanes: Lane[];
  stages: Stage[];
  /** Fields collected when filing a new instance */
  intakeFields?: StageField[];
  /** Roles allowed to file a new instance */
  intakeRoles?: AppRole[];
  /** Whether this workflow is tied to a vehicle / driver */
  requiresVehicle?: boolean;
  requiresDriver?: boolean;
}

export interface WorkflowInstance {
  id: string;
  organization_id: string;
  workflow_type: string;
  reference_number: string;
  title: string | null;
  description: string | null;
  current_stage: string;
  current_lane: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  data: Record<string, any>;
  documents: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTransition {
  id: string;
  organization_id: string;
  instance_id: string;
  workflow_type: string;
  from_stage: string | null;
  to_stage: string;
  from_lane: string | null;
  to_lane: string | null;
  decision: string | null;
  notes: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  payload: Record<string, any>;
  documents: string[] | null;
  created_at: string;
}
