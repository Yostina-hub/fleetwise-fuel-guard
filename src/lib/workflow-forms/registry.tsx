import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

/**
 * Workflow Form Registry
 *
 * Maps a `form_key` (configured per workflow node in the Builder) to an existing
 * app form component. Each registered form receives a unified interface:
 *
 *   onSubmitted(result?: Record<string, any>) → called when the form has been
 *      successfully saved. The optional `result` payload becomes the
 *      `_result` argument passed to `complete_workflow_task`, and the
 *      task is automatically marked as completed with the registered
 *      `default_decision` (e.g. "submitted").
 *
 *   onCancel() → close the dialog without completing the task.
 *
 *   prefill?: Record<string, any> — values from the workflow run context
 *      (e.g. vehicle_id, driver_id) that should pre-populate the form.
 *
 * To keep the Inbox bundle small, each wrapper is loaded lazily.
 */

export interface WorkflowFormProps {
  prefill?: Record<string, any>;
  onSubmitted: (result?: Record<string, any>) => void;
  onCancel: () => void;
}

export interface RegisteredWorkflowForm {
  key: string;
  label: string;
  description: string;
  /** Decision label sent to complete_workflow_task when the form is submitted. */
  default_decision: string;
  Component: React.ComponentType<WorkflowFormProps>;
}

// ---------------------------------------------------------------------------
// Lazy wrappers around existing app forms
// ---------------------------------------------------------------------------

const CreateWorkRequestWrapper = lazy(() => import("./wrappers/CreateWorkRequestWrapper"));
const OracleWorkOrderWrapper = lazy(() => import("./wrappers/OracleWorkOrderWrapper"));
const VehicleInspectionWrapper = lazy(() => import("./wrappers/VehicleInspectionWrapper"));
const FuelRequestWrapper = lazy(() => import("./wrappers/FuelRequestWrapper"));

const FORMS: RegisteredWorkflowForm[] = [
  {
    key: "create_work_request",
    label: "Create Work Request",
    description: "Oracle EBS-style maintenance / inspection work request form.",
    default_decision: "submitted",
    Component: CreateWorkRequestWrapper,
  },
  {
    key: "oracle_work_order",
    label: "Oracle Work Order",
    description: "Full EBS-style Work Order editor (operations, parts, labor, costs).",
    default_decision: "submitted",
    Component: OracleWorkOrderWrapper,
  },
  {
    key: "vehicle_inspection",
    label: "Vehicle Inspection Checklist",
    description: "Pre-trip / Post-trip / Annual vehicle inspection with checklist items.",
    default_decision: "submitted",
    Component: VehicleInspectionWrapper,
  },
  {
    key: "fuel_request",
    label: "Fuel Request",
    description: "Driver/Operator fuel request with approval routing.",
    default_decision: "submitted",
    Component: FuelRequestWrapper,
  },
];

const FORM_MAP = new Map(FORMS.map((f) => [f.key, f]));

export const listWorkflowForms = (): RegisteredWorkflowForm[] => FORMS;

export const getWorkflowForm = (key?: string | null): RegisteredWorkflowForm | undefined =>
  key ? FORM_MAP.get(key) : undefined;

/**
 * Renders the registered form by key inside a Suspense boundary.
 * Returns null if the key is unknown.
 */
export const RenderWorkflowForm = ({
  formKey,
  prefill,
  onSubmitted,
  onCancel,
}: { formKey: string } & Omit<WorkflowFormProps, never>) => {
  const reg = getWorkflowForm(formKey);
  if (!reg) return null;
  const Comp = reg.Component;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Comp prefill={prefill} onSubmitted={onSubmitted} onCancel={onCancel} />
    </Suspense>
  );
};
