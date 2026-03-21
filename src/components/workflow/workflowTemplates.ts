import type { WorkflowNode, WorkflowEdge } from "./types";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "safety" | "maintenance" | "fuel" | "compliance" | "operations" | "alerts";
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedSavings: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const TEMPLATES: WorkflowTemplate[] = [
  // 1. Overspeed Alert & Driver Coaching
  {
    id: "tpl_overspeed_coaching",
    name: "Overspeed Alert & Driver Coaching",
    description: "Detects speeding events in real-time, logs them, notifies the fleet manager, and schedules a coaching session for the driver.",
    category: "safety",
    icon: "🏎️",
    difficulty: "beginner",
    estimatedSavings: "~18% accident reduction",
    tags: ["speeding", "safety", "coaching", "real-time"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Speed Event Detected", description: "Fires when any vehicle exceeds speed limit", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "speed_violation" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 200 }, data: { label: "Speed > 120 km/h?", description: "Check if speed exceeds critical threshold", icon: "🔀", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "event.speed_kmh", operator: "greater_than", rightOperand: "120" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 200, y: 380 }, data: { label: "Log Critical Event", description: "Record critical speeding incident", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "driver_events", severity: "critical" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 530 }, data: { label: "Alert Fleet Manager", description: "Send push + email to fleet manager", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { recipients: "fleet_manager", template: "🚨 {{driver.name}} exceeded 120 km/h in {{vehicle.name}}" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 680 }, data: { label: "Schedule Coaching", description: "Auto-create coaching session for driver", icon: "👤", category: "fleet", nodeType: "fleet_assign_driver", config: { autoAssign: true, action: "schedule_coaching" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 380 }, data: { label: "Log Warning Event", description: "Record warning-level speeding", icon: "📈", category: "data", nodeType: "data_aggregate", config: { table: "driver_events", severity: "warning" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 530 }, data: { label: "SMS to Driver", description: "Send speed warning SMS directly to driver", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { template: "⚠️ Slow down! You are exceeding the speed limit. Current: {{event.speed_kmh}} km/h" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "c1", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
    ],
  },

  // 2. Predictive Maintenance Scheduler
  {
    id: "tpl_predictive_maintenance",
    name: "Predictive Maintenance Scheduler",
    description: "Monitors vehicle mileage and engine hours, auto-schedules maintenance before breakdowns, and manages parts inventory.",
    category: "maintenance",
    icon: "🔧",
    difficulty: "advanced",
    estimatedSavings: "~35% downtime reduction",
    tags: ["maintenance", "predictive", "parts", "scheduling"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Daily Mileage Check", description: "Runs every day at 6 AM", icon: "⏰", category: "triggers", nodeType: "trigger_schedule", config: { cron: "0 6 * * *" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Fetch Vehicle Data", description: "Get all vehicles with telemetry", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "vehicles" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 350 }, data: { label: "Calculate Wear Scores", description: "AI-based wear prediction from telemetry", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "wear_prediction" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 500 }, data: { label: "Maintenance Due?", description: "Check if wear score exceeds threshold", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "wear_score", operator: "greater_than", rightOperand: "85" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 680 }, data: { label: "Create Work Order", description: "Generate maintenance work order", icon: "🔧", category: "fleet", nodeType: "fleet_maintenance", config: { priority: "high", autoAssign: true }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 200, y: 830 }, data: { label: "Check Parts Stock", description: "Verify required parts availability", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "inventory_items" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 200, y: 980 }, data: { label: "Notify Maintenance Team", description: "Email maintenance schedule to team", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "maintenance_team" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 600, y: 680 }, data: { label: "Log Health Report", description: "Store vehicle health snapshot", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "store_snapshot" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "c1", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "c1", target: "a6", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },

  // 3. Fuel Theft Detection
  {
    id: "tpl_fuel_theft",
    name: "Fuel Theft Detection & Response",
    description: "Monitors fuel level drops, cross-references with fuel station proximity, and triggers investigation if theft is suspected.",
    category: "fuel",
    icon: "⛽",
    difficulty: "advanced",
    estimatedSavings: "~$12K/yr per 100 vehicles",
    tags: ["fuel", "theft", "geofence", "investigation"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Fuel Level Drop", description: "Triggered by sudden fuel drop > 10%", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "fuel_drop", threshold: 10 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 200 }, data: { label: "Near Fuel Station?", description: "Is the vehicle near an approved fuel station?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "vehicle.near_fuel_station", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 200, y: 380 }, data: { label: "Engine Running?", description: "Was the engine running during fuel drop?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "vehicle.ignition", operator: "equals", rightOperand: "off" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 100, y: 560 }, data: { label: "Flag Theft Suspected", description: "Create fuel theft investigation case", icon: "🚨", category: "fleet", nodeType: "fleet_update_vehicle", config: { flag: "fuel_theft_suspected" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 100, y: 710 }, data: { label: "Alert Security Team", description: "Immediate SMS + push to security", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { recipients: "security_team", template: "🚨 FUEL THEFT SUSPECTED: {{vehicle.name}} at {{vehicle.location}}" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 100, y: 860 }, data: { label: "Lock Vehicle", description: "Send immobilizer command", icon: "🏎️", category: "fleet", nodeType: "fleet_speed_limit", config: { action: "immobilize" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 560 }, data: { label: "Log Anomaly", description: "Record as anomalous fuel event", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "log_anomaly" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 380 }, data: { label: "Match Fuel Receipt", description: "Cross-check with fuel card transaction", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "match_fuel_receipt" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "c2", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e3", source: "c2", target: "a1", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e5", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "c1", target: "a5", sourceHandle: "true", type: "smoothstep", animated: true },
    ],
  },

  // 4. Geofence-Based Auto-Dispatch
  {
    id: "tpl_geofence_dispatch",
    name: "Geofence Auto-Dispatch",
    description: "When a vehicle enters a customer zone, automatically assigns the next delivery job and notifies the customer with ETA.",
    category: "operations",
    icon: "📍",
    difficulty: "intermediate",
    estimatedSavings: "~25% faster dispatching",
    tags: ["geofence", "dispatch", "customer", "ETA"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Enter Customer Zone", description: "Vehicle enters customer geofence", icon: "📍", category: "triggers", nodeType: "trigger_geofence", config: { eventType: "enter" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Lookup Pending Jobs", description: "Find pending dispatch jobs for this zone", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "dispatch_jobs", filter: "pending" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 370 }, data: { label: "Jobs Available?", description: "Are there pending jobs in this zone?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "jobs.count", operator: "greater_than", rightOperand: "0" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "Auto-Assign Job", description: "Assign nearest job to this vehicle", icon: "🗺️", category: "fleet", nodeType: "fleet_create_trip", config: { autoAssign: true }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 690 }, data: { label: "Calculate ETA", description: "Get real-time ETA via routing API", icon: "🔗", category: "data", nodeType: "data_api_call", config: { method: "GET", url: "routing_api/eta" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 200, y: 840 }, data: { label: "Notify Customer", description: "SMS customer with driver ETA", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { template: "Your delivery is arriving! Driver {{driver.name}} ETA: {{eta}} minutes" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 540 }, data: { label: "Mark Zone Idle", description: "No pending jobs, log zone status", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "log_idle_zone" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "c1", target: "a5", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },

  // 5. Driver Fatigue Prevention
  {
    id: "tpl_fatigue_prevention",
    name: "Driver Fatigue Prevention",
    description: "Tracks continuous driving time, enforces mandatory breaks per HOS regulations, and escalates if driver ignores warnings.",
    category: "compliance",
    icon: "😴",
    difficulty: "intermediate",
    estimatedSavings: "~40% fatigue incidents reduction",
    tags: ["HOS", "fatigue", "compliance", "breaks"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Every 30 Minutes", description: "Check all active drivers every 30 min", icon: "⏰", category: "triggers", nodeType: "trigger_schedule", config: { cron: "*/30 * * * *" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Get Active Drivers", description: "Fetch all currently driving vehicles", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "drivers", filter: "driving" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 370 }, data: { label: "Driving > 4 hrs?", description: "Has driver been continuous for 4+ hours?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "driver.continuous_hours", operator: "greater_than", rightOperand: "4" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "Send Break Reminder", description: "Push notification to driver to take a break", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "⚠️ You've been driving for {{hours}}h. Please take a 30-min break." }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 690 }, data: { label: "Wait 30 Minutes", description: "Grace period for driver to comply", icon: "⏳", category: "timing", nodeType: "timing_delay", config: { duration: 30, durationUnit: "minutes" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 200, y: 860 }, data: { label: "Still Driving?", description: "Check if driver is still moving after warning", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "driver.status", operator: "equals", rightOperand: "driving" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 100, y: 1040 }, data: { label: "Escalate to Manager", description: "Critical alert to fleet manager", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "fleet_manager", template: "🚨 CRITICAL: {{driver.name}} has been driving {{hours}}h without break" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 350, y: 1040 }, data: { label: "Log Compliance", description: "Record break compliance status", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "log_compliance" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "c2", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e7", source: "c2", target: "a5", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },

  // 6. Vehicle Health Monitoring
  {
    id: "tpl_vehicle_health",
    name: "Real-Time Vehicle Health Monitor",
    description: "Monitors engine temperature, battery voltage, and OBD codes in real-time. Auto-generates alerts and schedules service.",
    category: "maintenance",
    icon: "❤️‍🩹",
    difficulty: "advanced",
    estimatedSavings: "~45% fewer breakdowns",
    tags: ["OBD", "engine", "health", "real-time"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Telemetry Event", description: "Real-time vehicle telemetry data received", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "telemetry_update" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Engine Temp High?", description: "Is engine temperature above 105°C?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "telemetry.engine_temp", operator: "greater_than", rightOperand: "105" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 200, y: 400 }, data: { label: "Emergency Alert", description: "Immediate alert - potential engine failure", icon: "🚨", category: "notifications", nodeType: "notify_push", config: { recipients: "driver,fleet_manager", template: "🔥 ENGINE OVERHEATING: {{vehicle.name}} at {{temp}}°C" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 560 }, data: { label: "Reduce Speed Limit", description: "Send speed governor to 60 km/h", icon: "🏎️", category: "fleet", nodeType: "fleet_speed_limit", config: { limit: 60 }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 720 }, data: { label: "Schedule Emergency Service", description: "Create urgent work order", icon: "🔧", category: "fleet", nodeType: "fleet_maintenance", config: { priority: "critical", autoAssign: true }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 600, y: 400 }, data: { label: "Battery Low?", description: "Is battery voltage below 11.5V?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "telemetry.battery_voltage", operator: "less_than", rightOperand: "11.5" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 580 }, data: { label: "Battery Warning", description: "Notify driver of low battery", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "🔋 Low battery: {{vehicle.name}} at {{voltage}}V" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "c1", target: "c2", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "true", type: "smoothstep", animated: true },
    ],
  },

  // 7. End-of-Day Fleet Summary
  {
    id: "tpl_eod_summary",
    name: "End-of-Day Fleet Summary",
    description: "Automatically compiles daily fleet KPIs - total distance, fuel used, incidents, idle time - and emails a beautiful report.",
    category: "operations",
    icon: "📊",
    difficulty: "beginner",
    estimatedSavings: "~2 hrs/day admin time saved",
    tags: ["reporting", "KPIs", "daily", "summary"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Daily at 11 PM", description: "Fires every day at 11 PM", icon: "⏰", category: "triggers", nodeType: "trigger_schedule", config: { cron: "0 23 * * *" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Aggregate Trip Data", description: "Sum all trips, distance, duration today", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "sum", fields: ["distance_km", "duration", "fuel_used"] }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 360 }, data: { label: "Aggregate Incidents", description: "Count all alerts and events today", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "daily_incident_summary" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 400, y: 520 }, data: { label: "Build Report", description: "Compile data into formatted report", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "build_daily_report" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 680 }, data: { label: "Email to Management", description: "Send daily fleet report via email", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "management", template: "daily_fleet_report" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 400, y: 840 }, data: { label: "Post to Slack", description: "Share summary in #fleet-ops channel", icon: "💬", category: "notifications", nodeType: "notify_slack", config: { channel: "#fleet-ops" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e5", source: "a4", target: "a5", type: "smoothstep", animated: true },
    ],
  },

  // 8. SOS Emergency Response
  {
    id: "tpl_sos_response",
    name: "SOS Emergency Response Chain",
    description: "Multi-tier emergency response: driver SOS → nearby vehicle dispatch → emergency services notification → management escalation.",
    category: "safety",
    icon: "🆘",
    difficulty: "advanced",
    estimatedSavings: "Critical safety compliance",
    tags: ["SOS", "emergency", "safety", "escalation"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "SOS Button Pressed", description: "Driver activates emergency SOS", icon: "🚨", category: "triggers", nodeType: "trigger_alert", config: { alertType: "SOS" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Get GPS Location", description: "Capture exact GPS coordinates", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "vehicle_telemetry", fields: ["lat", "lng", "speed"] }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 370 }, data: { label: "Alert Nearest Vehicle", description: "Find and notify closest fleet vehicle", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { recipients: "nearest_vehicle", template: "🆘 EMERGENCY: {{driver.name}} needs help at {{location}}" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 600, y: 370 }, data: { label: "Notify Emergency Services", description: "Auto-dial emergency services API", icon: "🔗", category: "data", nodeType: "data_api_call", config: { method: "POST", url: "emergency_services/dispatch" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 540 }, data: { label: "Alert All Managers", description: "SMS + Email + Push to all fleet managers", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { recipients: "all_managers", template: "🆘 SOS: {{driver.name}} - {{vehicle.name}} at {{location}}" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 400, y: 700 }, data: { label: "Start Live Tracking", description: "Enable 5-sec GPS interval for rescue tracking", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { tracking_interval: 5 }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 400, y: 860 }, data: { label: "Log Incident", description: "Create full incident report", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "create_incident_report" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "a1", target: "a4", type: "smoothstep", animated: true },
      { id: "e5", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e6", source: "a5", target: "a6", type: "smoothstep", animated: true },
    ],
  },

  // 9. Unauthorized Use / After-Hours Detection
  {
    id: "tpl_unauthorized_use",
    name: "After-Hours Vehicle Use Detection",
    description: "Monitors vehicle movement outside of approved operating hours. Captures evidence and escalates unauthorized use.",
    category: "compliance",
    icon: "🌙",
    difficulty: "intermediate",
    estimatedSavings: "~$8K/yr unauthorized fuel costs",
    tags: ["after-hours", "unauthorized", "compliance", "security"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Ignition On Event", description: "Any vehicle ignition turned on", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "ignition_on" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "After Hours?", description: "Is current time outside 6AM-8PM?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "current_time", operator: "not_in", rightOperand: "06:00-20:00" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 200, y: 400 }, data: { label: "Authorized Trip?", description: "Is there a scheduled after-hours trip?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "trip.authorized", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 100, y: 580 }, data: { label: "Start Evidence Capture", description: "Enable high-frequency GPS + dashcam", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { tracking_interval: 3, dashcam: true }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 100, y: 740 }, data: { label: "Alert Security", description: "Immediate notification to security team", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { recipients: "security_team", template: "🌙 UNAUTHORIZED USE: {{vehicle.name}} started outside hours" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 100, y: 900 }, data: { label: "Create Investigation", description: "Open unauthorized use case", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "create_investigation" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 580 }, data: { label: "Log Authorized Trip", description: "Record authorized after-hours activity", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { operation: "log_authorized" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "c2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e3", source: "c2", target: "a1", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e4", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e5", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "true", type: "smoothstep", animated: true },
    ],
  },

  // 10. Idle Time Optimization
  {
    id: "tpl_idle_optimization",
    name: "Idle Time Cost Optimizer",
    description: "Tracks excessive idling, calculates fuel waste in real-time, sends progressive warnings, and generates cost reports.",
    category: "fuel",
    icon: "💰",
    difficulty: "beginner",
    estimatedSavings: "~$5K/yr per vehicle",
    tags: ["idle", "fuel", "cost", "optimization"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Idle Detected", description: "Vehicle idling for more than 5 minutes", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "idle_start", threshold_minutes: 5 }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Calculate Fuel Waste", description: "Estimate fuel wasted based on engine type", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "calculate_idle_fuel_cost" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 380 }, data: { label: "Idle > 15 min?", description: "Has idling exceeded 15 minutes?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "idle.duration_minutes", operator: "greater_than", rightOperand: "15" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 560 }, data: { label: "Warn Driver", description: "Push notification to stop idling", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "🛑 Your vehicle has been idling for {{minutes}} min. Fuel wasted: ${{cost}}" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 720 }, data: { label: "Notify Manager", description: "Alert fleet manager of excessive idle", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "fleet_manager", template: "idle_alert_report" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 560 }, data: { label: "Log Idle Event", description: "Record idle duration and cost", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "log_idle" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "c1", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },

  // 11. Trip Completion & Invoice
  {
    id: "tpl_trip_invoice",
    name: "Trip Completion & Auto-Invoice",
    description: "When a trip is completed, auto-calculates cost, generates invoice, captures POD, and updates customer billing.",
    category: "operations",
    icon: "🧾",
    difficulty: "intermediate",
    estimatedSavings: "~60% faster billing cycle",
    tags: ["billing", "invoice", "POD", "trip"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Trip Completed", description: "Vehicle arrives at final destination", icon: "📍", category: "triggers", nodeType: "trigger_geofence", config: { eventType: "enter", zone: "destination" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Capture POD", description: "Request proof of delivery from driver", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "📸 Please capture proof of delivery for {{job.number}}" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 370 }, data: { label: "Calculate Trip Cost", description: "Distance × rate + fuel + tolls", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "calculate_trip_cost" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 400, y: 530 }, data: { label: "Generate Invoice", description: "Create invoice with trip details", icon: "🔗", category: "data", nodeType: "data_api_call", config: { method: "POST", url: "billing/create_invoice" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 690 }, data: { label: "Email Invoice", description: "Send invoice to customer", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "customer", template: "invoice_email" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 400, y: 850 }, data: { label: "Update Trip Status", description: "Mark trip as invoiced in system", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "complete_trip" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e5", source: "a4", target: "a5", type: "smoothstep", animated: true },
    ],
  },

  // 12. Harsh Driving Pattern Analysis
  {
    id: "tpl_harsh_driving",
    name: "Harsh Driving Pattern Analysis",
    description: "Aggregates harsh events over a week, identifies repeat offenders, auto-generates risk scores and training plans.",
    category: "safety",
    icon: "📉",
    difficulty: "advanced",
    estimatedSavings: "~22% insurance premium reduction",
    tags: ["harsh driving", "risk", "training", "insurance"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Weekly on Monday", description: "Run analysis every Monday at 7 AM", icon: "⏰", category: "triggers", nodeType: "trigger_schedule", config: { cron: "0 7 * * 1" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Fetch Weekly Events", description: "Get all harsh driving events from past 7 days", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "driver_events", period: "7d" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 360 }, data: { label: "Calculate Risk Scores", description: "AI risk scoring per driver", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "risk_score_calculation" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 530 }, data: { label: "High Risk Driver?", description: "Risk score above 70/100?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "driver.risk_score", operator: "greater_than", rightOperand: "70" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 710 }, data: { label: "Create Training Plan", description: "Auto-generate personalized training module", icon: "👤", category: "fleet", nodeType: "fleet_assign_driver", config: { action: "create_training_plan" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 200, y: 870 }, data: { label: "Notify HR & Safety", description: "Email safety team with risk report", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "safety_team,hr", template: "weekly_risk_report" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 710 }, data: { label: "Update Leaderboard", description: "Refresh driver safety leaderboard", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "update_leaderboard" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "c1", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "c1", target: "a5", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },
];

export default TEMPLATES;
