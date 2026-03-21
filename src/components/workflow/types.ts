import { Node, Edge } from "@xyflow/react";

// Node categories for the palette
export type NodeCategory = 
  | "triggers"
  | "conditions"
  | "actions"
  | "fleet"
  | "notifications"
  | "data"
  | "timing"
  | "sensors"
  | "safety_hardware";

// Custom node data types
export interface WorkflowNodeData {
  label: string;
  description?: string;
  icon?: string;
  category: NodeCategory;
  nodeType: string;
  config?: Record<string, any>;
  status?: "idle" | "running" | "success" | "error";
  isConfigured?: boolean;
}

export type WorkflowNode = Node<WorkflowNodeData & Record<string, unknown>>;
export type WorkflowEdge = Edge;

// Palette items
export interface PaletteItem {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: NodeCategory;
  defaultConfig?: Record<string, any>;
}

// Workflow DB model
export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: string;
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
  status: "draft" | "active" | "paused" | "archived";
  version: number;
  trigger_type?: string;
  trigger_config?: Record<string, any>;
  is_template: boolean;
  last_run_at?: string;
  run_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Palette definition
export const PALETTE_ITEMS: PaletteItem[] = [
  // Triggers
  { type: "trigger_schedule", label: "Scheduled Trigger", description: "Run at specific times or intervals", icon: "⏰", category: "triggers" },
  { type: "trigger_event", label: "Event Trigger", description: "React to fleet events in real-time", icon: "⚡", category: "triggers" },
  { type: "trigger_geofence", label: "Geofence Trigger", description: "Fires when vehicle enters/exits zone", icon: "📍", category: "triggers" },
  { type: "trigger_alert", label: "Alert Trigger", description: "Triggered by system alerts", icon: "🚨", category: "triggers" },
  { type: "trigger_webhook", label: "Webhook Trigger", description: "External HTTP webhook listener", icon: "🌐", category: "triggers" },
  
  // Conditions
  { type: "condition_if", label: "If / Else", description: "Branch based on conditions", icon: "🔀", category: "conditions" },
  { type: "condition_switch", label: "Switch Case", description: "Multi-path branching logic", icon: "🔃", category: "conditions" },
  { type: "condition_filter", label: "Data Filter", description: "Filter items matching criteria", icon: "🔍", category: "conditions" },
  { type: "condition_threshold", label: "Threshold Check", description: "Check if value crosses threshold", icon: "📊", category: "conditions" },
  
  // Fleet Actions
  { type: "fleet_assign_driver", label: "Assign Driver", description: "Auto-assign driver to vehicle/trip", icon: "👤", category: "fleet" },
  { type: "fleet_create_trip", label: "Create Trip", description: "Generate a new trip request", icon: "🗺️", category: "fleet" },
  { type: "fleet_update_vehicle", label: "Update Vehicle", description: "Modify vehicle status/data", icon: "🚛", category: "fleet" },
  { type: "fleet_maintenance", label: "Schedule Maintenance", description: "Create maintenance work order", icon: "🔧", category: "fleet" },
  { type: "fleet_fuel_check", label: "Fuel Level Check", description: "Monitor fuel consumption anomalies", icon: "⛽", category: "fleet" },
  { type: "fleet_speed_limit", label: "Speed Limit Action", description: "Send speed governor command", icon: "🏎️", category: "fleet" },
  
  // Notifications
  { type: "notify_email", label: "Send Email", description: "Send email to recipients", icon: "📧", category: "notifications" },
  { type: "notify_sms", label: "Send SMS", description: "Send SMS notification", icon: "📱", category: "notifications" },
  { type: "notify_push", label: "Push Notification", description: "In-app push notification", icon: "🔔", category: "notifications" },
  { type: "notify_slack", label: "Slack Message", description: "Post to Slack channel", icon: "💬", category: "notifications" },
  
  // Data Operations
  { type: "data_transform", label: "Transform Data", description: "Map, filter, or reshape data", icon: "🔄", category: "data" },
  { type: "data_aggregate", label: "Aggregate", description: "Sum, average, count operations", icon: "📈", category: "data" },
  { type: "data_lookup", label: "Database Lookup", description: "Query database for records", icon: "🗄️", category: "data" },
  { type: "data_api_call", label: "API Call", description: "Make external HTTP request", icon: "🔗", category: "data" },
  
  // Timing
  { type: "timing_delay", label: "Delay", description: "Wait for specified duration", icon: "⏳", category: "timing" },
  { type: "timing_schedule", label: "Wait Until", description: "Pause until specific time", icon: "📅", category: "timing" },
  { type: "timing_debounce", label: "Debounce", description: "Prevent rapid re-triggering", icon: "🛑", category: "timing" },
];

export const CATEGORY_LABELS: Record<NodeCategory, { label: string; color: string }> = {
  triggers: { label: "Triggers", color: "hsl(var(--chart-1))" },
  conditions: { label: "Conditions", color: "hsl(var(--chart-2))" },
  actions: { label: "Actions", color: "hsl(var(--chart-3))" },
  fleet: { label: "Fleet Operations", color: "hsl(var(--chart-4))" },
  notifications: { label: "Notifications", color: "hsl(var(--chart-5))" },
  data: { label: "Data & Integration", color: "hsl(var(--primary))" },
  timing: { label: "Timing & Delays", color: "hsl(var(--muted-foreground))" },
};
