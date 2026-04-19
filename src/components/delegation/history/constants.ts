import {
  ArrowRightLeft,
  CheckCircle2,
  Edit,
  History,
  Plus,
  Power,
  PowerOff,
  Shield,
  SkipForward,
  Trash2,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type ActionMeta = {
  icon: LucideIcon;
  label: string;
  /** Tailwind classes using semantic tokens only. */
  className: string;
};

export const ACTION_META: Record<string, ActionMeta> = {
  create: {
    icon: Plus,
    label: "Created",
    className: "bg-success/10 text-success border-success/30",
  },
  update: {
    icon: Edit,
    label: "Updated",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  delete: {
    icon: Trash2,
    label: "Deleted",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  activate: {
    icon: Power,
    label: "Activated",
    className: "bg-success/10 text-success border-success/30",
  },
  deactivate: {
    icon: PowerOff,
    label: "Deactivated",
    className: "bg-muted text-muted-foreground border-border",
  },
  substitute: {
    icon: ArrowRightLeft,
    label: "Delegated",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  skip: {
    icon: SkipForward,
    label: "Skipped",
    className: "bg-muted text-muted-foreground border-border",
  },
  route: {
    icon: ArrowRightLeft,
    label: "Routed",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  approve: {
    icon: CheckCircle2,
    label: "Approved",
    className: "bg-success/10 text-success border-success/30",
  },
  reject: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  escalate: {
    icon: ArrowRightLeft,
    label: "Escalated",
    className: "bg-warning/10 text-warning border-warning/30",
  },
};

export const FALLBACK_ACTION: ActionMeta = ACTION_META.update;

export type SourceMeta = { icon: LucideIcon; label: string };

export const SOURCE_META: Record<string, SourceMeta> = {
  authority_matrix: { icon: Shield, label: "Authority Rule" },
  delegation_matrix: { icon: Users, label: "Substitution" },
  user_substitutions: { icon: Users, label: "Substitution" },
  approval_levels: { icon: Shield, label: "Approval Level" },
  fuel_request: { icon: ArrowRightLeft, label: "Fuel Request" },
  fuel_wo: { icon: ArrowRightLeft, label: "Fuel Work Order" },
  fuel_emoney: { icon: ArrowRightLeft, label: "Fuel e-Money" },
  vehicle_request: { icon: ArrowRightLeft, label: "Vehicle Request" },
  tire_request: { icon: ArrowRightLeft, label: "Tire Request" },
  fleet_transfer: { icon: ArrowRightLeft, label: "Fleet Transfer" },
  fleet_inspection: { icon: ArrowRightLeft, label: "Fleet Inspection" },
  safety_comfort: { icon: ArrowRightLeft, label: "Safety & Comfort" },
  outsource_payment_request: { icon: ArrowRightLeft, label: "Outsource Payment" },
  work_order: { icon: ArrowRightLeft, label: "Work Order" },
  trip_request: { icon: ArrowRightLeft, label: "Trip Request" },
};

export const FALLBACK_SOURCE = (table: string): SourceMeta => ({
  icon: History,
  label: table.replace(/_/g, " "),
});

/** Configuration source tables — show every action recorded against them. */
export const CONFIG_SOURCES = [
  "authority_matrix",
  "delegation_matrix",
  "user_substitutions",
  "approval_levels",
] as const;

/**
 * Workflow actions that always belong in delegation history regardless of the
 * source table. Includes routing decisions made by the matrix at runtime AND
 * approval/rejection decisions made by matrix-governed approvers.
 */
export const DELEGATION_ACTIONS = [
  "route",
  "substitute",
  "skip",
  "approve",
  "reject",
  "escalate",
] as const;

/** Workflow-transition decision values that represent matrix routing. */
export const ROUTING_DECISIONS = [
  "auto_route",
  "route",
  "delegate",
  "substitute",
  "reroute",
] as const;

/** Stage-name fragments where the authority/delegation matrix governs the approver. */
export const APPROVAL_STAGE_FRAGMENTS = [
  "pending_approval",
  "authority_approval",
  "records_pending_approval",
] as const;

/** Decision-id substrings that indicate an approval/rejection outcome. */
export const APPROVAL_DECISION_TOKENS = [
  "approve",
  "reject",
  "approved",
  "rejected",
] as const;
