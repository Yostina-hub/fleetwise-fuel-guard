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
  | "safety_hardware"
  | "ai_intelligence";

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
  { type: "trigger_sensor", label: "Sensor Trigger", description: "Triggered by hardware sensor reading", icon: "📡", category: "triggers" },
  
  // Conditions
  { type: "condition_if", label: "If / Else", description: "Branch based on conditions", icon: "🔀", category: "conditions" },
  { type: "condition_switch", label: "Switch Case", description: "Multi-path branching logic", icon: "🔃", category: "conditions" },
  { type: "condition_filter", label: "Data Filter", description: "Filter items matching criteria", icon: "🔍", category: "conditions" },
  { type: "condition_threshold", label: "Threshold Check", description: "Check if value crosses threshold", icon: "📊", category: "conditions" },
  { type: "condition_geo_proximity", label: "Geo Proximity", description: "Check distance to a location", icon: "🎯", category: "conditions" },
  
  // Fleet Actions
  { type: "fleet_assign_driver", label: "Assign Driver", description: "Auto-assign driver to vehicle/trip", icon: "👤", category: "fleet" },
  { type: "fleet_create_trip", label: "Create Trip", description: "Generate a new trip request", icon: "🗺️", category: "fleet" },
  { type: "fleet_update_vehicle", label: "Update Vehicle", description: "Modify vehicle status/data", icon: "🚛", category: "fleet" },
  { type: "fleet_maintenance", label: "Schedule Maintenance", description: "Create maintenance work order", icon: "🔧", category: "fleet" },
  { type: "fleet_fuel_check", label: "Fuel Level Check", description: "Monitor fuel consumption anomalies", icon: "⛽", category: "fleet" },
  { type: "fleet_speed_limit", label: "Speed Limit Action", description: "Send speed governor command", icon: "🏎️", category: "fleet" },
  { type: "fleet_driver_handover", label: "Driver Handover", description: "Manage driver shift change protocol", icon: "🤝", category: "fleet" },
  { type: "fleet_route_optimize", label: "Route Optimizer", description: "Calculate optimal route via API", icon: "🛤️", category: "fleet" },
  { type: "fleet_request_approval", label: "Request Approval", description: "Submit fleet request for approval", icon: "✅", category: "fleet" },
  { type: "human_task", label: "Human Task", description: "Pause workflow until a user completes the assigned step", icon: "🧑‍💼", category: "actions" },
  { type: "approval", label: "Approval Step", description: "Pause until an authorized role approves or rejects", icon: "🛡️", category: "actions" },
  { type: "fleet_immobilize", label: "Immobilize Vehicle", description: "Remote engine kill command", icon: "🔒", category: "fleet" },
  
  // Notifications
  { type: "notify_email", label: "Send Email", description: "Send email to recipients", icon: "📧", category: "notifications" },
  { type: "notify_sms", label: "Send SMS", description: "Send SMS notification", icon: "📱", category: "notifications" },
  { type: "notify_push", label: "Push Notification", description: "In-app push notification", icon: "🔔", category: "notifications" },
  { type: "notify_slack", label: "Slack Message", description: "Post to Slack channel", icon: "💬", category: "notifications" },
  { type: "notify_escalation", label: "Escalation Chain", description: "Multi-tier alert escalation", icon: "📢", category: "notifications" },
  
  // Data Operations
  { type: "data_transform", label: "Transform Data", description: "Map, filter, or reshape data", icon: "🔄", category: "data" },
  { type: "data_aggregate", label: "Aggregate", description: "Sum, average, count operations", icon: "📈", category: "data" },
  { type: "data_lookup", label: "Database Lookup", description: "Query database for records", icon: "🗄️", category: "data" },
  { type: "data_api_call", label: "API Call", description: "Make external HTTP request", icon: "🔗", category: "data" },
  { type: "data_log_history", label: "Log to History", description: "Record event in history table", icon: "📋", category: "data" },
  
  // Timing
  { type: "timing_delay", label: "Delay", description: "Wait for specified duration", icon: "⏳", category: "timing" },
  { type: "timing_schedule", label: "Wait Until", description: "Pause until specific time", icon: "📅", category: "timing" },
  { type: "timing_debounce", label: "Debounce", description: "Prevent rapid re-triggering", icon: "🛑", category: "timing" },
  
  // Sensors (Hardware Integration)
  { type: "sensor_temperature", label: "Temperature Sensor", description: "Read cold chain / engine temperature", icon: "🌡️", category: "sensors" },
  { type: "sensor_fuel_level", label: "Fuel Level Sensor", description: "Capacitive/ultrasonic fuel reading", icon: "⛽", category: "sensors" },
  { type: "sensor_load_weight", label: "Load/Weight Sensor", description: "Axle load or cargo weight reading", icon: "⚖️", category: "sensors" },
  { type: "sensor_shock", label: "Shock/Impact Sensor", description: "Accelerometer impact detection", icon: "💥", category: "sensors" },
  { type: "sensor_door", label: "Door Sensor", description: "Cargo door open/close state", icon: "🚪", category: "sensors" },
  { type: "sensor_tilt", label: "Tilt Sensor", description: "Vehicle rollover detection", icon: "↗️", category: "sensors" },
  
  // Safety Hardware
  { type: "hw_dashcam", label: "Dashcam Trigger", description: "AI dashcam event or live stream", icon: "📹", category: "safety_hardware" },
  { type: "hw_alcohol", label: "Alcohol Detector", description: "Breathalyzer interlock reading", icon: "🍺", category: "safety_hardware" },
  { type: "hw_rfid", label: "RFID/iButton Auth", description: "Driver authentication via RFID", icon: "🪪", category: "safety_hardware" },
  { type: "hw_panic_button", label: "Panic Button", description: "Physical emergency panic button", icon: "🔴", category: "safety_hardware" },
  { type: "hw_tamper_detect", label: "Tamper Detection", description: "GPS antenna/power tamper alert", icon: "⚠️", category: "safety_hardware" },
  { type: "hw_ev_charger", label: "EV Charger", description: "EV charging station integration", icon: "🔋", category: "safety_hardware" },
  
  // AI Intelligence
  { type: "ai_decision", label: "AI Smart Decision", description: "AI-powered conditional logic based on fleet data patterns", icon: "🧠", category: "ai_intelligence" },
  { type: "ai_predict_maintenance", label: "AI Predictive Maintenance", description: "Predict maintenance needs from sensor data & history", icon: "🔮", category: "ai_intelligence" },
  { type: "ai_anomaly_detect", label: "AI Anomaly Detection", description: "Detect unusual patterns in fuel, speed, routes", icon: "🔍", category: "ai_intelligence" },
  { type: "ai_route_optimize", label: "AI Route Optimizer", description: "Optimize routes using traffic, weather, load data", icon: "🛣️", category: "ai_intelligence" },
  { type: "ai_fuel_forecast", label: "AI Fuel Forecast", description: "Predict fuel consumption and cost projections", icon: "📊", category: "ai_intelligence" },
  { type: "ai_driver_scoring", label: "AI Driver Scoring", description: "Real-time driver behavior analysis and scoring", icon: "⭐", category: "ai_intelligence" },
];

export const CATEGORY_LABELS: Record<NodeCategory, { label: string; color: string }> = {
  triggers: { label: "Triggers", color: "hsl(var(--chart-1))" },
  conditions: { label: "Conditions", color: "hsl(var(--chart-2))" },
  actions: { label: "Actions", color: "hsl(var(--chart-3))" },
  fleet: { label: "Fleet Operations", color: "hsl(var(--chart-4))" },
  notifications: { label: "Notifications", color: "hsl(var(--chart-5))" },
  data: { label: "Data & Integration", color: "hsl(var(--primary))" },
  timing: { label: "Timing & Delays", color: "hsl(var(--muted-foreground))" },
  sensors: { label: "Sensors & IoT", color: "#06b6d4" },
  safety_hardware: { label: "Safety Hardware", color: "#dc2626" },
  ai_intelligence: { label: "AI Intelligence", color: "#8b5cf6" },
};
