export interface FormField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "safety_comfort_checklist";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface TaskAction {
  id: string;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

export interface WorkflowTask {
  id: string;
  workflow_id: string;
  run_id: string;
  node_id: string;
  title: string;
  description: string | null;
  assignee_role: string | null;
  form_schema: FormField[];
  form_key?: string | null;
  context?: Record<string, any> | null;
  actions: TaskAction[];
  status: string;
  vehicle_id: string | null;
  driver_id: string | null;
  due_at: string | null;
  created_at: string;
  workflows?: { name: string; nodes?: any[] } | null;
}
