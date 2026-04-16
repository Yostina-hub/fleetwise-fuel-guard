import type { WorkflowNode, WorkflowEdge } from "./types";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "safety" | "maintenance" | "fuel" | "compliance" | "operations" | "alerts" | "cold_chain" | "sensors" | "ev_charging";
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedSavings: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const TEMPLATES: WorkflowTemplate[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. OVERSPEED ALERT & DRIVER COACHING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // 2. DALASI PANIC BUTTON + DRIVER HANDOVER (1:1 & 1:Many Auth)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_driver_handover_auth",
    name: "Driver Handover & Panic Authorization",
    description: "Complete driver shift handover with RFID/iButton 1:1 authentication, vehicle condition checklist, one-to-many fleet broadcast on panic, and authorized handoff logging.",
    category: "operations",
    icon: "🤝",
    difficulty: "advanced",
    estimatedSavings: "~90% unauthorized use prevention",
    tags: ["handover", "RFID", "panic", "authentication", "authorization", "one-to-many", "shift-change"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "RFID Tag Scanned", description: "Driver scans RFID/iButton to start shift", icon: "🪪", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "rfid_scan" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 200 }, data: { label: "Verify Driver Identity", description: "1:1 match RFID tag to authorized driver database", icon: "🪪", category: "safety_hardware", nodeType: "hw_rfid", config: { mode: "one_to_one", table: "drivers" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 370 }, data: { label: "Driver Authorized?", description: "Is this driver authorized for this vehicle?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "auth.match", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 150, y: 540 }, data: { label: "Log Previous Driver Out", description: "End shift for outgoing driver, record odometer/fuel", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "driver_handovers", action: "checkout" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 150, y: 700 }, data: { label: "Vehicle Condition Check", description: "Auto-capture: fuel level, odometer, damage photos", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "condition_snapshot" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 150, y: 860 }, data: { label: "Enable Engine Start", description: "Unlock immobilizer for authorized driver", icon: "🔓", category: "fleet", nodeType: "fleet_immobilize", config: { action: "unlock" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 150, y: 1020 }, data: { label: "Notify Fleet Manager", description: "Handover confirmed notification", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "✅ Handover: {{driver.name}} took {{vehicle.name}} from {{prev_driver.name}}" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 650, y: 540 }, data: { label: "Block Engine Start", description: "Keep immobilizer active - unauthorized", icon: "🔒", category: "fleet", nodeType: "fleet_immobilize", config: { action: "lock" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 650, y: 700 }, data: { label: "🚨 Broadcast Alert (1:Many)", description: "Alert ALL fleet managers + security team simultaneously", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "one_to_many", recipients: ["fleet_managers", "security", "operations"], template: "🚨 UNAUTHORIZED: Unknown RFID scanned on {{vehicle.name}} at {{location}}" }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 650, y: 860 }, data: { label: "Trigger Dashcam Snapshot", description: "Capture photo of unauthorized person", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "capture_snapshot", camera: "interior" }, status: "idle", isConfigured: true } },
      { id: "a9", type: "action", position: { x: 650, y: 1020 }, data: { label: "Create Security Incident", description: "Open investigation case with evidence", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "security_incidents", severity: "critical" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "c1", target: "a6", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e8", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e9", source: "a7", target: "a8", type: "smoothstep", animated: true },
      { id: "e10", source: "a8", target: "a9", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. COLD CHAIN MONITORING FOR SHIPMENTS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_cold_chain_monitoring",
    name: "Cold Chain Temperature Control",
    description: "Monitors refrigerated vehicle temperature zones in real-time. Multi-zone support with breach alerts, door-open correlation, cargo spoilage prediction, and compliance logging for pharma/food shipments.",
    category: "cold_chain",
    icon: "❄️",
    difficulty: "advanced",
    estimatedSavings: "~$50K/yr spoilage prevention",
    tags: ["cold-chain", "temperature", "refrigeration", "pharma", "food", "compliance", "door-sensor"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Temperature Reading", description: "Temp sensor reports every 30 seconds", icon: "🌡️", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "temperature", interval: 30 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Temp in Safe Range?", description: "Check if temperature is between -25°C and +8°C", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "sensor.temperature_c", operator: "between", rightOperand: "-25,8" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 150, y: 400 }, data: { label: "Breach Duration > 5min?", description: "Has temp been out of range for 5+ minutes?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "breach.duration_minutes", operator: "greater_than", rightOperand: "5" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 50, y: 580 }, data: { label: "Check Door Sensor", description: "Was cargo door opened during breach?", icon: "🚪", category: "sensors", nodeType: "sensor_door", config: { action: "check_state" }, status: "idle", isConfigured: true } },
      { id: "c3", type: "condition", position: { x: 50, y: 750 }, data: { label: "Door Open?", description: "Correlate temp breach with door state", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "door.state", operator: "equals", rightOperand: "open" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: -100, y: 920 }, data: { label: "Alert: Close Door!", description: "Urgent push to driver to close cargo door", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "🚪❄️ DOOR OPEN! Temperature rising in {{vehicle.name}}. Close cargo door immediately!" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 200, y: 920 }, data: { label: "Compressor Malfunction Alert", description: "Notify maintenance - possible compressor failure", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "maintenance_team", template: "🔧 Refrigeration unit issue: {{vehicle.name}} temp at {{temp}}°C" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 350, y: 580 }, data: { label: "Calculate Spoilage Risk", description: "AI prediction: time until cargo spoilage", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "spoilage_prediction", model: "time_temp_integral" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 350, y: 750 }, data: { label: "Alert Dispatch: Reroute", description: "Notify dispatch to reroute to nearest cold storage", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { recipients: "dispatch", template: "⚠️ COLD CHAIN BREACH: {{vehicle.name}} needs reroute. Spoilage in {{minutes_until_spoil}}min" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 650, y: 400 }, data: { label: "Log Compliance Record", description: "HACCP/GDP compliance temperature log", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "cold_chain_logs", compliance: "HACCP" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 650, y: 220 }, data: { label: "Update Live Dashboard", description: "Real-time temp update on fleet dashboard", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "update_live_temp" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "c2", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e3", source: "c2", target: "a1", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a1", target: "c3", type: "smoothstep", animated: true },
      { id: "e5", source: "c3", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e6", source: "c3", target: "a3", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "c2", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e8", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e9", source: "c1", target: "a6", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e10", source: "c1", target: "a7", sourceHandle: "true", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. LOAD SENSOR & WEIGHT COMPLIANCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_load_sensor",
    name: "Load Sensor & Weight Compliance",
    description: "Monitors axle load sensors to prevent overloading, auto-calculate weight distribution, enforce legal limits, and trigger weigh station bypass or alerts.",
    category: "sensors",
    icon: "⚖️",
    difficulty: "intermediate",
    estimatedSavings: "~$30K/yr in fines avoided",
    tags: ["load", "weight", "axle", "overload", "compliance", "sensor"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Load Change Detected", description: "Axle load sensor detects weight change > 50kg", icon: "⚖️", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "load_weight", threshold_kg: 50 }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Calculate Total Load", description: "Sum all axle readings for GVW", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "calculate_gvw", fields: ["axle_1_kg", "axle_2_kg", "axle_3_kg"] }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 380 }, data: { label: "Over Legal Limit?", description: "GVW exceeds vehicle's registered max weight", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "vehicle.gvw_kg", operator: "greater_than", rightOperand: "vehicle.max_gvw_kg" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 150, y: 560 }, data: { label: "🚨 Block Departure", description: "Prevent vehicle from leaving depot", icon: "🔒", category: "fleet", nodeType: "fleet_immobilize", config: { action: "lock", reason: "overweight" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 150, y: 720 }, data: { label: "Alert Loading Team", description: "Notify warehouse to reduce load", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { recipients: "warehouse_team", template: "⚖️ OVERLOAD: {{vehicle.name}} at {{gvw}}kg (limit: {{max_gvw}}kg). Remove {{excess}}kg" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 150, y: 880 }, data: { label: "Log Weight Violation", description: "Record for compliance audit trail", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "weight_violations" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 650, y: 560 }, data: { label: "Weight Distribution OK?", description: "Check if load is evenly distributed across axles", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "axle.imbalance_percent", operator: "less_than", rightOperand: "15" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 650, y: 720 }, data: { label: "Approve Departure", description: "Weight OK - log and release vehicle", icon: "✅", category: "fleet", nodeType: "fleet_request_approval", config: { action: "auto_approve" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 500, y: 720 }, data: { label: "Warn: Uneven Load", description: "Alert driver about uneven weight distribution", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "⚠️ Uneven load detected. Front: {{front_kg}}kg, Rear: {{rear_kg}}kg. Please redistribute." }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "c1", target: "c2", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "c2", target: "a5", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e8", source: "c2", target: "a6", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. GPS/DEVICE TAMPERING DETECTION
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_tamper_detection",
    name: "GPS Tampering & Anti-Theft",
    description: "Detects GPS antenna disconnection, power line cutting, signal jamming, SIM card removal, and device relocation. Multi-layer evidence capture with instant immobilization.",
    category: "safety",
    icon: "⚠️",
    difficulty: "advanced",
    estimatedSavings: "~95% tamper detection rate",
    tags: ["tampering", "anti-theft", "GPS", "jamming", "security"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Tamper Event", description: "Device detects tampering (power cut, antenna, vibration)", icon: "⚠️", category: "triggers", nodeType: "trigger_alert", config: { alertType: "tamper" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Tamper Type?", description: "Identify type of tampering detected", icon: "🔃", category: "conditions", nodeType: "condition_switch", config: { field: "tamper.type", cases: ["power_cut", "antenna_disconnect", "signal_jam", "sim_removal"] }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 100, y: 400 }, data: { label: "Backup Battery Mode", description: "Switch to internal battery, keep transmitting", icon: "🔋", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "enable_backup_battery" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 100, y: 560 }, data: { label: "High-Freq GPS Burst", description: "Send GPS coordinates every 3 seconds", icon: "📡", category: "sensors", nodeType: "sensor_shock", config: { tracking_interval: 3 }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 400, y: 400 }, data: { label: "🚨 Immobilize Vehicle", description: "Cut engine immediately", icon: "🔒", category: "fleet", nodeType: "fleet_immobilize", config: { action: "lock", immediate: true }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 560 }, data: { label: "Alert: ALL Channels", description: "SMS + Push + Email + Slack simultaneously", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "all_channels", recipients: ["owner", "security", "police_liaison"], template: "🚨 TAMPER ALERT: {{vehicle.name}} - {{tamper.type}} at {{location}}" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 700, y: 400 }, data: { label: "Capture Dashcam Evidence", description: "Record 60s video from all cameras", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "record_clip", duration: 60, cameras: "all" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 700, y: 560 }, data: { label: "Log Incident + Evidence", description: "Create tamper investigation with all evidence", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "tamper_incidents", attach: ["gps_trail", "dashcam_clip"] }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 400, y: 720 }, data: { label: "Notify Nearest Patrol", description: "Dispatch security to last known location", icon: "🗺️", category: "fleet", nodeType: "fleet_create_trip", config: { type: "security_dispatch", target: "last_known_location" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "c1", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e8", source: "a4", target: "a7", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. ROUTE OPTIMIZATION ENGINE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_route_optimization",
    name: "AI Route Optimization Engine",
    description: "Multi-stop route optimization with traffic prediction, fuel cost calculation, delivery time windows, and dynamic re-routing when conditions change.",
    category: "operations",
    icon: "🛤️",
    difficulty: "advanced",
    estimatedSavings: "~30% fuel savings, 25% time savings",
    tags: ["route", "optimization", "traffic", "multi-stop", "AI", "fuel-savings"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "New Dispatch Created", description: "Dispatch job with multiple stops is created", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "dispatch_created" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Fetch All Stops", description: "Get pickup/dropoff locations with time windows", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "dispatch_jobs", fields: ["stops", "time_windows", "priorities"] }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 370 }, data: { label: "Get Live Traffic Data", description: "Fetch real-time traffic from routing API", icon: "🔗", category: "data", nodeType: "data_api_call", config: { method: "GET", url: "traffic_api/conditions" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 400, y: 530 }, data: { label: "AI Route Calculation", description: "TSP solver with traffic + time windows + vehicle capacity", icon: "🛤️", category: "fleet", nodeType: "fleet_route_optimize", config: { algorithm: "genetic_tsp", factors: ["traffic", "fuel", "time_windows", "vehicle_capacity"] }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 690 }, data: { label: "Calculate Fuel Cost", description: "Estimate fuel consumption for optimized route", icon: "⛽", category: "fleet", nodeType: "fleet_fuel_check", config: { calculation: "route_fuel_estimate" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 200, y: 850 }, data: { label: "Send Route to Driver", description: "Push optimized route with turn-by-turn", icon: "📱", category: "notifications", nodeType: "notify_push", config: { template: "🗺️ Optimized route ready: {{stops}} stops, {{distance_km}}km, ETA: {{eta}}" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 600, y: 850 }, data: { label: "Monitor Route Adherence", description: "Track deviation from planned route", icon: "📍", category: "triggers", nodeType: "trigger_geofence", config: { mode: "corridor", deviation_threshold_m: 500 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 600, y: 1020 }, data: { label: "Deviated > 500m?", description: "Has driver deviated from optimized route?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "route.deviation_m", operator: "greater_than", rightOperand: "500" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 600, y: 1190 }, data: { label: "Re-Calculate Route", description: "Dynamic re-optimization from current position", icon: "🔄", category: "fleet", nodeType: "fleet_route_optimize", config: { mode: "recalculate", from: "current_position" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e5", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a6", type: "smoothstep", animated: true },
      { id: "e7", source: "a6", target: "c1", type: "smoothstep", animated: true },
      { id: "e8", source: "c1", target: "a7", sourceHandle: "true", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. FUEL LEVEL LIVE CONTROL & ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_fuel_live_control",
    name: "Fuel Level Live Control & Analytics",
    description: "Continuous fuel level monitoring with live dashboard updates, consumption rate analysis, refuel detection, drain alerts, and predictive range calculation.",
    category: "fuel",
    icon: "⛽",
    difficulty: "intermediate",
    estimatedSavings: "~20% fuel cost optimization",
    tags: ["fuel", "live", "monitoring", "consumption", "analytics", "range"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Fuel Telemetry Update", description: "Fuel sensor reports level every 60 seconds", icon: "⛽", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "fuel_level", interval: 60 }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Calculate Consumption Rate", description: "L/100km based on rolling 30-min window", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "fuel_consumption_rate", window: "30min" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 370 }, data: { label: "Update Live Dashboard", description: "Real-time fuel gauge on fleet map", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "update_realtime_gauge" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 200, y: 530 }, data: { label: "Fuel < 15%?", description: "Low fuel warning threshold", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "fuel.level_percent", operator: "less_than", rightOperand: "15" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 50, y: 700 }, data: { label: "Calculate Range", description: "Predict km remaining at current consumption", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "predict_range_km" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 50, y: 860 }, data: { label: "Find Nearest Station", description: "Locate approved fuel stations within range", icon: "🎯", category: "conditions", nodeType: "condition_geo_proximity", config: { target: "approved_fuel_stations", radius_km: 20 }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 50, y: 1020 }, data: { label: "Alert Driver: Refuel", description: "Push notification with station directions", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "⛽ Low fuel ({{level}}%). Nearest station: {{station.name}} - {{distance}}km away" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 600, y: 530 }, data: { label: "Sudden Drop > 10%?", description: "Detect rapid fuel decrease (possible theft/leak)", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "fuel.drop_rate_percent", operator: "greater_than", rightOperand: "10" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 600, y: 700 }, data: { label: "🚨 Theft/Leak Alert", description: "Immediate alert with GPS coordinates", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "all_channels", template: "🚨 FUEL ANOMALY: {{vehicle.name}} lost {{drop}}% in {{minutes}}min at {{location}}" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 600, y: 860 }, data: { label: "Log Fuel Event", description: "Record with GPS, timestamp, driver, amount", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "fuel_events" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "c1", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "a2", target: "c2", type: "smoothstep", animated: true },
      { id: "e8", source: "c2", target: "a6", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e9", source: "a6", target: "a7", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. ADVANCED FUEL THEFT - SIPHONING, DRAIN, CARD FRAUD
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_fuel_theft_advanced",
    name: "Fuel Theft: Siphon, Drain & Card Fraud",
    description: "Multi-layer fuel theft detection: siphoning (slow drain while parked), rapid drain, fuel card mismatch, phantom refuels, and overnight fuel disappearance with full evidence chain.",
    category: "fuel",
    icon: "🕵️",
    difficulty: "advanced",
    estimatedSavings: "~$15K/yr per 100 vehicles",
    tags: ["fuel", "theft", "siphoning", "drain", "fraud", "card", "overnight"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Fuel Level Change", description: "Any fuel level change > 2% detected", icon: "⛽", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "fuel_level", threshold: 2 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Increase or Decrease?", description: "Is fuel level going up or down?", icon: "🔃", category: "conditions", nodeType: "condition_switch", config: { field: "fuel.direction", cases: ["increase", "decrease"] }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 150, y: 400 }, data: { label: "Vehicle Moving?", description: "Is the vehicle in motion during fuel drop?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "vehicle.speed_kmh", operator: "greater_than", rightOperand: "5" }, status: "idle", isConfigured: true } },
      { id: "c3", type: "condition", position: { x: 50, y: 580 }, data: { label: "Drop Rate Normal?", description: "Is consumption rate within expected range?", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "fuel.consumption_l_100km", operator: "less_than", rightOperand: "vehicle.expected_consumption * 1.5" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: -50, y: 760 }, data: { label: "Flag Abnormal Consumption", description: "Possible leak or tampered fuel line", icon: "🚨", category: "fleet", nodeType: "fleet_update_vehicle", config: { flag: "abnormal_fuel_consumption" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 250, y: 580 }, data: { label: "🚨 Siphoning Alert", description: "Fuel dropping while parked - siphoning suspected", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "all_channels", template: "🕵️ SIPHONING: {{vehicle.name}} losing fuel while parked at {{location}}" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 250, y: 740 }, data: { label: "Capture Evidence", description: "GPS + Dashcam + Fuel chart snapshot", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "record_clip", duration: 120 }, status: "idle", isConfigured: true } },
      { id: "c4", type: "condition", position: { x: 650, y: 400 }, data: { label: "Fuel Card Used?", description: "Was a fuel card transaction recorded?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "fuel_card.transaction", operator: "exists" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 500, y: 580 }, data: { label: "Cross-Match Receipt", description: "Compare fuel card liters vs sensor increase", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "match_card_vs_sensor" }, status: "idle", isConfigured: true } },
      { id: "c5", type: "condition", position: { x: 500, y: 740 }, data: { label: "Mismatch > 20%?", description: "Card says 50L but sensor shows only 30L", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "fuel.card_vs_sensor_diff_percent", operator: "greater_than", rightOperand: "20" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 500, y: 900 }, data: { label: "🚨 Card Fraud Alert", description: "Possible fuel card skimming or phantom refuel", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "finance,security", template: "💳 FUEL CARD FRAUD: {{vehicle.name}} - Card: {{card_liters}}L vs Sensor: {{sensor_liters}}L" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 750, y: 580 }, data: { label: "Log Normal Refuel", description: "Record legitimate refueling event", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "fuel_events", type: "refuel" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "c2", type: "smoothstep", animated: true },
      { id: "e3", source: "c2", target: "c3", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "c3", target: "a1", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e5", source: "c2", target: "a2", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e6", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e7", source: "c1", target: "c4", type: "smoothstep", animated: true },
      { id: "e8", source: "c4", target: "a4", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e9", source: "a4", target: "c5", type: "smoothstep", animated: true },
      { id: "e10", source: "c5", target: "a5", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e11", source: "c4", target: "a6", sourceHandle: "false", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. GEOFENCE START/STOP NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_geofence_notifications",
    name: "Geofence Start/Stop Notifications",
    description: "Automated notifications when vehicles enter or exit work zones, depots, customer sites, restricted areas. Track dwell time, working hours, and site attendance.",
    category: "operations",
    icon: "📍",
    difficulty: "beginner",
    estimatedSavings: "~100% site attendance visibility",
    tags: ["geofence", "enter", "exit", "notification", "dwell-time", "attendance"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 300, y: 50 }, data: { label: "Enter Geofence", description: "Vehicle enters any defined zone", icon: "📍", category: "triggers", nodeType: "trigger_geofence", config: { eventType: "enter" }, status: "idle", isConfigured: true } },
      { id: "t2", type: "trigger", position: { x: 600, y: 50 }, data: { label: "Exit Geofence", description: "Vehicle leaves any defined zone", icon: "📍", category: "triggers", nodeType: "trigger_geofence", config: { eventType: "exit" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 300, y: 220 }, data: { label: "Log Arrival Time", description: "Record entry timestamp + GPS", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "geofence_events", event: "arrival" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 300, y: 380 }, data: { label: "Notify: Work Started", description: "Alert manager that vehicle arrived at site", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { recipients: "site_manager", template: "✅ {{vehicle.name}} arrived at {{zone.name}} ({{driver.name}})" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 300, y: 540 }, data: { label: "Start Dwell Timer", description: "Begin tracking time spent in zone", icon: "⏳", category: "timing", nodeType: "timing_delay", config: { mode: "start_timer" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 220 }, data: { label: "Calculate Dwell Time", description: "Total time spent at this geofence", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "calculate_dwell_time" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 380 }, data: { label: "Notify: Work Stopped", description: "Alert manager that vehicle left site", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { recipients: "site_manager", template: "🚗 {{vehicle.name}} left {{zone.name}} after {{dwell_time}}min ({{driver.name}})" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 600, y: 540 }, data: { label: "Log Departure + Report", description: "Record exit with dwell time summary", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "geofence_events", event: "departure" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "t2", target: "a4", type: "smoothstep", animated: true },
      { id: "e5", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e6", source: "a5", target: "a6", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. DASHCAM AI EVENT TRIGGER & LIVE STREAM
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_dashcam_ai",
    name: "Dashcam AI Event & Live Stream",
    description: "AI-powered dashcam detects events (drowsiness, phone use, tailgating, collision). Auto-records clips, enables live streaming, and integrates with driver scoring.",
    category: "safety",
    icon: "📹",
    difficulty: "advanced",
    estimatedSavings: "~50% accident liability reduction",
    tags: ["dashcam", "AI", "live-stream", "drowsiness", "phone", "collision", "recording"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Dashcam AI Event", description: "AI detects unsafe behavior via camera", icon: "📹", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "dashcam_ai" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Event Severity?", description: "Classify event: drowsiness, phone, tailgating, crash", icon: "🔃", category: "conditions", nodeType: "condition_switch", config: { field: "dashcam.event_type", cases: ["drowsiness", "phone_use", "tailgating", "forward_collision"] }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 100, y: 400 }, data: { label: "🚨 Collision Detected", description: "Immediate alert - possible crash", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "all_channels", template: "💥 COLLISION: {{vehicle.name}} at {{location}} - Live stream activated" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 100, y: 560 }, data: { label: "Start Live Stream", description: "Enable real-time video feed to control room", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "start_live_stream", cameras: ["front", "interior"] }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 350, y: 400 }, data: { label: "Audio Warning: Wake Up!", description: "Play loud in-cab alert for drowsiness", icon: "🔊", category: "notifications", nodeType: "notify_push", config: { type: "audio_alert", sound: "wake_up_alarm" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 400 }, data: { label: "Record 30s Clip", description: "Save 15s before + 15s after event", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "record_clip", pre_buffer: 15, post_buffer: 15 }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 560 }, data: { label: "Upload to Cloud", description: "Store clip with metadata for review", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { action: "upload_clip", storage: "dashcam_clips" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 400, y: 720 }, data: { label: "Update Driver Score", description: "Deduct safety points based on event severity", icon: "📈", category: "data", nodeType: "data_aggregate", config: { table: "driver_behavior_scores", operation: "deduct_points" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 400, y: 880 }, data: { label: "Schedule Review", description: "Create review task for fleet safety officer", icon: "👤", category: "fleet", nodeType: "fleet_assign_driver", config: { action: "create_review_task" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "c1", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e8", source: "a6", target: "a7", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 11. ALCOHOL DETECTOR INTERLOCK
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_alcohol_detector",
    name: "Alcohol Detector Interlock System",
    description: "Breathalyzer interlock workflow: pre-trip testing, random re-tests, BAC threshold enforcement, engine lockout, photo evidence, and compliance reporting.",
    category: "compliance",
    icon: "🍺",
    difficulty: "intermediate",
    estimatedSavings: "~99% DUI prevention",
    tags: ["alcohol", "breathalyzer", "interlock", "BAC", "compliance", "safety"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Ignition Start Attempt", description: "Driver turns key - breathalyzer test required", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "ignition_attempt" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Request Breath Test", description: "Prompt driver to blow into breathalyzer", icon: "🍺", category: "safety_hardware", nodeType: "hw_alcohol", config: { action: "request_test", timeout_seconds: 60 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 380 }, data: { label: "Test Completed?", description: "Did driver provide breath sample?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "test.completed", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 200, y: 550 }, data: { label: "BAC < 0.02%?", description: "Below legal limit for commercial drivers", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "test.bac_percent", operator: "less_than", rightOperand: "0.02" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 50, y: 720 }, data: { label: "✅ Allow Engine Start", description: "Unlock immobilizer - driver is sober", icon: "🔓", category: "fleet", nodeType: "fleet_immobilize", config: { action: "unlock" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 50, y: 880 }, data: { label: "Schedule Random Re-Test", description: "Random re-test during trip (30-90 min)", icon: "⏰", category: "timing", nodeType: "timing_delay", config: { duration: "random(30,90)", durationUnit: "minutes" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 350, y: 720 }, data: { label: "🚫 Block Engine", description: "Keep vehicle immobilized - DUI positive", icon: "🔒", category: "fleet", nodeType: "fleet_immobilize", config: { action: "lock", reason: "positive_bac" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 350, y: 880 }, data: { label: "Capture Driver Photo", description: "Camera photo for evidence chain", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "capture_snapshot", camera: "interior" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 350, y: 1040 }, data: { label: "🚨 Alert Management", description: "Critical DUI alert to all stakeholders", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "all_channels", template: "🍺 DUI POSITIVE: {{driver.name}} in {{vehicle.name}} - BAC: {{bac}}% - Engine locked" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 600, y: 550 }, data: { label: "Test Refused - Lock", description: "Refusal treated as positive result", icon: "🔒", category: "fleet", nodeType: "fleet_immobilize", config: { action: "lock", reason: "test_refused" }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 600, y: 720 }, data: { label: "Log Compliance Record", description: "Record all test results for audit", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "alcohol_test_logs" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "c2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "c2", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e5", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e8", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e9", source: "c1", target: "a7", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e10", source: "a6", target: "a8", type: "smoothstep", animated: true },
      { id: "e11", source: "a7", target: "a8", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 12. MAINTENANCE WORKFLOWS (Multi-Type)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_maintenance_lifecycle",
    name: "Complete Maintenance Lifecycle",
    description: "Full maintenance workflow: scheduled PM → inspection → work order → parts procurement → technician assignment → completion → quality check → vehicle release. Covers preventive, corrective, and emergency maintenance types.",
    category: "maintenance",
    icon: "🔧",
    difficulty: "advanced",
    estimatedSavings: "~40% downtime reduction",
    tags: ["maintenance", "preventive", "corrective", "emergency", "work-order", "parts", "lifecycle"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Maintenance Due", description: "Schedule triggered by mileage, date, or condition", icon: "⏰", category: "triggers", nodeType: "trigger_schedule", config: { sources: ["mileage", "calendar", "condition_based"] }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Maintenance Type?", description: "Preventive, Corrective, or Emergency?", icon: "🔃", category: "conditions", nodeType: "condition_switch", config: { field: "maintenance.type", cases: ["preventive", "corrective", "emergency"] }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 150, y: 400 }, data: { label: "Create Work Order", description: "Auto-generate WO with service checklist", icon: "🔧", category: "fleet", nodeType: "fleet_maintenance", config: { autoAssign: true }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 150, y: 560 }, data: { label: "Check Parts Inventory", description: "Verify required parts availability", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "inventory_items" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 150, y: 720 }, data: { label: "Parts Available?", description: "Are all required parts in stock?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "parts.all_available", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 50, y: 900 }, data: { label: "Assign Technician", description: "Auto-assign based on skill + availability", icon: "👤", category: "fleet", nodeType: "fleet_assign_driver", config: { role: "technician", matchSkill: true }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 300, y: 900 }, data: { label: "Order Parts", description: "Auto-generate purchase order for missing parts", icon: "🔗", category: "data", nodeType: "data_api_call", config: { method: "POST", url: "procurement/order" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 50, y: 1060 }, data: { label: "Notify Technician", description: "Push work order details to assigned tech", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "🔧 New WO: {{wo.number}} - {{vehicle.name}} - {{service.type}}" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 50, y: 1220 }, data: { label: "Quality Check", description: "Post-service inspection verification", icon: "✅", category: "fleet", nodeType: "fleet_request_approval", config: { approver: "quality_inspector" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 50, y: 1380 }, data: { label: "Release Vehicle", description: "Update status to 'active', reset schedule", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { status: "active", action: "reset_maintenance_schedule" }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 650, y: 400 }, data: { label: "🚨 Emergency: Immediate WO", description: "Skip scheduling, create critical priority WO", icon: "🔧", category: "fleet", nodeType: "fleet_maintenance", config: { priority: "critical", immediate: true }, status: "idle", isConfigured: true } },
      { id: "a9", type: "action", position: { x: 650, y: 560 }, data: { label: "Pull Vehicle from Service", description: "Immediately deactivate vehicle from fleet", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { status: "in_maintenance" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "c2", type: "smoothstep", animated: true },
      { id: "e5", source: "c2", target: "a3", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "a3", target: "a5", type: "smoothstep", animated: true },
      { id: "e8", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e9", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e10", source: "c1", target: "a8", type: "smoothstep", animated: true },
      { id: "e11", source: "a8", target: "a9", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 13. FLEET OPERATIONS COMPREHENSIVE WORKFLOW
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_fleet_operations",
    name: "Fleet Operations Command Center",
    description: "End-to-end fleet operations: daily vehicle checkout, trip assignment, real-time monitoring, incident handling, end-of-day checkout, and performance scoring.",
    category: "operations",
    icon: "🏢",
    difficulty: "advanced",
    estimatedSavings: "~50% operational efficiency gain",
    tags: ["operations", "checkout", "monitoring", "incident", "performance", "command-center"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Shift Start (6 AM)", description: "Daily fleet operations kick-off", icon: "⏰", category: "triggers", nodeType: "trigger_schedule", config: { cron: "0 6 * * *" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Generate Vehicle Assignments", description: "Match drivers to vehicles based on schedule", icon: "👤", category: "fleet", nodeType: "fleet_assign_driver", config: { mode: "daily_assignment" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 400, y: 370 }, data: { label: "Pre-Trip Inspection Check", description: "Verify all assigned vehicles passed inspection", icon: "✅", category: "fleet", nodeType: "fleet_request_approval", config: { type: "pre_trip_inspection" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 400, y: 530 }, data: { label: "Dispatch All Trips", description: "Release trip assignments to drivers", icon: "🗺️", category: "fleet", nodeType: "fleet_create_trip", config: { mode: "batch_dispatch" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 200, y: 690 }, data: { label: "Monitor Fleet Live", description: "Real-time tracking, alerts, geofence triggers", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "live_fleet_dashboard" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 600, y: 690 }, data: { label: "Handle Incidents", description: "Auto-process incoming alerts and events", icon: "🚨", category: "triggers", nodeType: "trigger_alert", config: { alertType: "any" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 400, y: 850 }, data: { label: "End-of-Day Reports", description: "Compile daily fleet performance KPIs", icon: "📊", category: "data", nodeType: "data_transform", config: { transform: "daily_fleet_kpis" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 400, y: 1010 }, data: { label: "Email Daily Summary", description: "Send comprehensive report to management", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "management", template: "daily_operations_report" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a5", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a6", type: "smoothstep", animated: true },
      { id: "e7", source: "a6", target: "a7", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 14. FUEL OPERATIONS (Procurement to Consumption)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_fuel_operations",
    name: "Fuel Operations & Procurement",
    description: "Complete fuel lifecycle: procurement authorization, approved stations only, card reconciliation, consumption benchmarking, and monthly cost allocation per vehicle/department.",
    category: "fuel",
    icon: "🛢️",
    difficulty: "advanced",
    estimatedSavings: "~25% fuel cost control",
    tags: ["fuel", "procurement", "authorization", "card", "reconciliation", "budget"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Fuel Request Submitted", description: "Driver or system requests fuel authorization", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "fuel_request" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Budget Available?", description: "Check department/vehicle fuel budget", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "vehicle.fuel_budget_remaining", operator: "greater_than", rightOperand: "0" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 200, y: 400 }, data: { label: "Approve Fuel Request", description: "Generate fuel authorization code", icon: "✅", category: "fleet", nodeType: "fleet_request_approval", config: { action: "approve_fuel" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 200, y: 560 }, data: { label: "At Approved Station?", description: "Is vehicle at an approved fuel station?", icon: "🎯", category: "conditions", nodeType: "condition_geo_proximity", config: { target: "approved_fuel_stations", radius_m: 200 }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 50, y: 740 }, data: { label: "Enable Fuel Card", description: "Activate fuel card for this transaction", icon: "💳", category: "data", nodeType: "data_api_call", config: { method: "POST", url: "fuel_card/activate" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 350, y: 740 }, data: { label: "🚫 Reject: Wrong Station", description: "Block fuel card - not at approved station", icon: "🔒", category: "notifications", nodeType: "notify_push", config: { template: "⛽ Fuel denied: {{station.name}} is not approved. Nearest: {{nearest_approved.name}}" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 400 }, data: { label: "🚫 Budget Exceeded", description: "Reject - monthly fuel budget depleted", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "fleet_manager", template: "⛽ Budget exceeded: {{vehicle.name}} needs approval override" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 50, y: 900 }, data: { label: "Log Transaction", description: "Record fuel purchase with receipt verification", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "fuel_transactions" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 50, y: 1060 }, data: { label: "Update Budget Allocation", description: "Deduct from vehicle/department budget", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "deduct_fuel_budget" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "c2", type: "smoothstep", animated: true },
      { id: "e4", source: "c2", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e5", source: "c2", target: "a3", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e6", source: "c1", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "a2", target: "a5", type: "smoothstep", animated: true },
      { id: "e8", source: "a5", target: "a6", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 15. ACCIDENT DETECTION VIA SHOCK SENSOR + HISTORY
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_accident_detection",
    name: "Accident Detection & Response (Shock Sensor)",
    description: "Multi-G accelerometer detects impacts, classifies severity (minor bump → major collision), auto-calls emergency, captures 360° dashcam, starts live tracking, creates accident history with full evidence chain.",
    category: "safety",
    icon: "💥",
    difficulty: "advanced",
    estimatedSavings: "Critical: lives saved, ~60% faster response",
    tags: ["accident", "shock", "collision", "emergency", "accelerometer", "history", "evidence"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Shock Sensor Alert", description: "Accelerometer detects impact > 2G", icon: "💥", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "accelerometer", threshold_g: 2.0 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "Impact Severity?", description: "Classify: Minor (2-4G), Moderate (4-8G), Severe (8G+)", icon: "🔃", category: "conditions", nodeType: "condition_switch", config: { field: "impact.g_force", cases: ["minor_2_4g", "moderate_4_8g", "severe_8g_plus"] }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 100, y: 420 }, data: { label: "🚨 Emergency Protocol", description: "Auto-call emergency services + send GPS", icon: "🔗", category: "data", nodeType: "data_api_call", config: { method: "POST", url: "emergency_services/crash_report", data: ["gps", "vehicle_info", "g_force"] }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 100, y: 590 }, data: { label: "Record All Cameras", description: "30s pre-impact + continuous post-impact recording", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "crash_record", pre_buffer: 30, cameras: "all_360" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 100, y: 760 }, data: { label: "Start Live Stream", description: "Open live video feed to control room", icon: "📹", category: "safety_hardware", nodeType: "hw_dashcam", config: { action: "start_live_stream" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 400, y: 420 }, data: { label: "High-Freq GPS Tracking", description: "GPS every 2 seconds for rescue teams", icon: "📡", category: "fleet", nodeType: "fleet_update_vehicle", config: { tracking_interval: 2, mode: "emergency" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 400, y: 590 }, data: { label: "Alert All Stakeholders", description: "SMS + Push + Email to managers, family contact", icon: "📢", category: "notifications", nodeType: "notify_escalation", config: { mode: "all_channels", recipients: ["emergency", "fleet_manager", "driver_family"], template: "💥 ACCIDENT: {{vehicle.name}} - Impact: {{g_force}}G at {{location}} - {{driver.name}}" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 700, y: 420 }, data: { label: "Log to Accident History", description: "Create detailed accident record with evidence", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "accident_history", fields: ["g_force", "gps", "speed", "dashcam_clips", "vehicle_damage_estimate"] }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 700, y: 590 }, data: { label: "Pull Vehicle from Fleet", description: "Mark vehicle as 'accident - out of service'", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { status: "accident", flags: ["out_of_service", "pending_inspection"] }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 400, y: 760 }, data: { label: "Dispatch Nearest Vehicle", description: "Send closest fleet vehicle to crash site", icon: "🗺️", category: "fleet", nodeType: "fleet_create_trip", config: { type: "emergency_response", target: "accident_location" }, status: "idle", isConfigured: true } },
      { id: "a9", type: "action", position: { x: 700, y: 760 }, data: { label: "Insurance Report Auto-Gen", description: "Generate preliminary insurance claim with evidence", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "generate_insurance_report" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e5", source: "c1", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "c1", target: "a6", type: "smoothstep", animated: true },
      { id: "e8", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e9", source: "a5", target: "a8", type: "smoothstep", animated: true },
      { id: "e10", source: "a7", target: "a9", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 16. FLEET REQUEST WORKFLOW (Full Approval Chain)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_fleet_request",
    name: "Fleet Request & Approval Workflow",
    description: "Complete fleet request lifecycle: vehicle request → manager approval → availability check → assignment → usage tracking → return inspection → damage assessment → billing.",
    category: "operations",
    icon: "📝",
    difficulty: "advanced",
    estimatedSavings: "~70% faster fleet request processing",
    tags: ["request", "approval", "assignment", "return", "inspection", "billing", "workflow"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Fleet Request Submitted", description: "Employee/department requests a vehicle", icon: "⚡", category: "triggers", nodeType: "trigger_event", config: { eventType: "fleet_request" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 400, y: 210 }, data: { label: "Validate Request", description: "Check requestor permissions, license, training", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "validate_fleet_request" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 380 }, data: { label: "Auto-Approvable?", description: "Within pre-approved limits? (< 3 days, local use)", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "request.auto_approve_eligible", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 200, y: 550 }, data: { label: "Auto-Approve", description: "Instant approval within pre-set limits", icon: "✅", category: "fleet", nodeType: "fleet_request_approval", config: { action: "auto_approve" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 600, y: 550 }, data: { label: "Route to Manager", description: "Send for manager approval with details", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "department_manager", template: "📝 Fleet request: {{requestor.name}} needs {{vehicle_type}} for {{duration}} days" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 600, y: 710 }, data: { label: "Wait for Approval", description: "Pause until manager approves/rejects", icon: "⏳", category: "timing", nodeType: "timing_delay", config: { mode: "wait_for_event", event: "approval_decision" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 400, y: 710 }, data: { label: "Find Available Vehicle", description: "Match vehicle type, location, maintenance status", icon: "🗄️", category: "data", nodeType: "data_lookup", config: { table: "vehicles", filter: "available", match: ["type", "location", "capacity"] }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 400, y: 870 }, data: { label: "Assign Vehicle + Keys", description: "Reserve vehicle, generate digital key/PIN", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "assign_to_requestor" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 400, y: 1030 }, data: { label: "Notify Requestor", description: "Send assignment details + pickup instructions", icon: "📱", category: "notifications", nodeType: "notify_sms", config: { template: "✅ Vehicle assigned: {{vehicle.name}} - Pickup at {{depot.name}} - PIN: {{access_pin}}" }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 400, y: 1190 }, data: { label: "Track Usage", description: "Monitor distance, fuel, geofence compliance during use", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "track_request_usage" }, status: "idle", isConfigured: true } },
      { id: "a9", type: "action", position: { x: 400, y: 1350 }, data: { label: "Return Inspection", description: "Compare pre/post condition, damage assessment", icon: "🔧", category: "fleet", nodeType: "fleet_maintenance", config: { type: "return_inspection" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e5", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e6", source: "a2", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e8", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e9", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e10", source: "a7", target: "a8", type: "smoothstep", animated: true },
      { id: "e11", source: "a8", target: "a9", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 17. EV CHARGING & FUEL STANDARD CLEARANCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_ev_charging",
    name: "EV Charging & Energy Management",
    description: "Electric vehicle fleet management: battery monitoring, smart charging scheduling (off-peak rates), range anxiety prevention, charging station routing, and energy cost optimization vs ICE fleet comparison.",
    category: "ev_charging",
    icon: "🔋",
    difficulty: "advanced",
    estimatedSavings: "~40% energy cost vs ICE fleet",
    tags: ["EV", "electric", "charging", "battery", "range", "energy", "smart-charging"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Battery Level Update", description: "EV battery SOC reported via CAN bus", icon: "🔋", category: "triggers", nodeType: "trigger_sensor", config: { sensorType: "ev_battery_soc", interval: 120 }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 400, y: 220 }, data: { label: "SOC < 20%?", description: "Battery state of charge below 20%", icon: "📊", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "battery.soc_percent", operator: "less_than", rightOperand: "20" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 150, y: 400 }, data: { label: "Calculate Remaining Range", description: "Estimate km left based on driving pattern", icon: "🔄", category: "data", nodeType: "data_transform", config: { transform: "ev_range_prediction" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 150, y: 560 }, data: { label: "Find Nearest Charger", description: "Locate available charging stations in range", icon: "🎯", category: "conditions", nodeType: "condition_geo_proximity", config: { target: "ev_charging_stations", radius_km: 30 }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 150, y: 730 }, data: { label: "Fast Charger Available?", description: "Is DC fast charger within range?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "charger.type", operator: "equals", rightOperand: "DC_fast" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 50, y: 900 }, data: { label: "Route to Fast Charger", description: "Navigate to DC fast charger", icon: "🛤️", category: "fleet", nodeType: "fleet_route_optimize", config: { destination: "nearest_dc_fast" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: 300, y: 900 }, data: { label: "Alert: Charge at Next Stop", description: "No fast charger - plan charging at destination", icon: "🔔", category: "notifications", nodeType: "notify_push", config: { template: "🔋 Low battery ({{soc}}%). Plan charging at {{destination}}. Range: {{range_km}}km" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 650, y: 400 }, data: { label: "Smart Charge Scheduling", description: "Schedule charging during off-peak electricity rates", icon: "🔋", category: "safety_hardware", nodeType: "hw_ev_charger", config: { mode: "smart_schedule", prefer: "off_peak" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 650, y: 560 }, data: { label: "Log Energy Consumption", description: "Record kWh used, cost per km, CO2 saved", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "ev_energy_logs", fields: ["kwh", "cost", "co2_saved"] }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: 650, y: 720 }, data: { label: "Compare vs ICE Cost", description: "Generate EV vs diesel cost comparison", icon: "📈", category: "data", nodeType: "data_aggregate", config: { operation: "ev_vs_ice_cost_comparison" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", type: "smoothstep", animated: true },
      { id: "e2", source: "c1", target: "a1", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e3", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e4", source: "a2", target: "c2", type: "smoothstep", animated: true },
      { id: "e5", source: "c2", target: "a3", sourceHandle: "true", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e7", source: "c1", target: "a5", sourceHandle: "false", type: "smoothstep", animated: true },
      { id: "e8", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e9", source: "a6", target: "a7", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 18. PREDICTIVE MAINTENANCE (Enhanced)
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // 19. SOS EMERGENCY RESPONSE CHAIN
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // 20. DRIVER FATIGUE PREVENTION
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // 21. END-OF-DAY FLEET SUMMARY
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_eod_summary",
    name: "End-of-Day Fleet Summary",
    description: "Automatically compiles daily fleet KPIs and emails a beautiful report.",
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
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "a3", type: "smoothstep", animated: true },
      { id: "e4", source: "a3", target: "a4", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 22. IDLE TIME COST OPTIMIZER
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_idle_optimization",
    name: "Idle Time Cost Optimizer",
    description: "Tracks excessive idling, calculates fuel waste in real-time, sends progressive warnings.",
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

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT TYPE 1: ACCIDENT MAINTENANCE — NOT COVERED BY INSURANCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_incident_not_covered",
    name: "Incident: Not Covered by Insurance",
    description: "Vehicle accident maintenance workflow when damage is NOT covered by insurance. Driver reports → fleet analyzes → negligence check → consolidate info → check contract agreements → procurement → supplier selection → repair follow-up → delivery confirmation.",
    category: "maintenance",
    icon: "🔧",
    difficulty: "advanced",
    estimatedSavings: "~40% faster repair turnaround",
    tags: ["accident", "maintenance", "uninsured", "procurement", "negligence", "repair", "incident"],
    nodes: [
      // Driver lane
      { id: "t1", type: "trigger", position: { x: 80, y: 50 }, data: { label: "Driver Reports Accident", description: "Driver reports vehicle accident via written document to immediate supervisor", icon: "📝", category: "triggers", nodeType: "trigger_event", config: { eventType: "accident_report_submitted" }, status: "idle", isConfigured: true } },
      // Fleet Operation Section
      { id: "a1", type: "action", position: { x: 80, y: 220 }, data: { label: "Analyze Document & Accident", description: "Fleet Operation Section reviews the accident report and supporting documents", icon: "🔍", category: "data", nodeType: "data_lookup", config: { table: "accident_claims", action: "review" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 80, y: 400 }, data: { label: "Driver Negligence?", description: "Check if driver negligence caused the accident", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "investigation.negligence", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a2", type: "action", position: { x: 380, y: 400 }, data: { label: "Employee Discipline Procedure", description: "Initiate employee disciplinary action for negligent driver", icon: "⚠️", category: "notifications", nodeType: "notify_email", config: { recipients: "hr_department", template: "discipline_action" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 80, y: 570 }, data: { label: "Consolidate Information", description: "State that accident is not covered by insurance and compile maintenance requirements", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "consolidate_uninsured" }, status: "idle", isConfigured: true } },
      // Fleet Maintenance Section
      { id: "c2", type: "condition", position: { x: 80, y: 740 }, data: { label: "Existing Contract Agreement?", description: "Check if damaged parts can be maintained under an existing contract", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "contract.exists", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a4", type: "action", position: { x: -220, y: 740 }, data: { label: "Manage via Contract (FMG-FMG 05)", description: "Request vehicle maintenance under existing contract agreement", icon: "📄", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "contract_maintenance" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 80, y: 910 }, data: { label: "Request Maintenance Procurement", description: "No existing contract — initiate procurement for maintenance service", icon: "🛒", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "procurement_request" }, status: "idle", isConfigured: true } },
      // Sourcing Department
      { id: "a6", type: "action", position: { x: -220, y: 910 }, data: { label: "Supplier Shortlist (SCM-SPR 01)", description: "Create shortlist of qualified suppliers/partners", icon: "📊", category: "data", nodeType: "data_aggregate", config: { operation: "supplier_shortlist" }, status: "idle", isConfigured: true } },
      { id: "a7", type: "action", position: { x: -220, y: 1080 }, data: { label: "Procurement Management (SCM-PRO 01)", description: "Manage procurement — RFQ, evaluation, and selection", icon: "💰", category: "data", nodeType: "data_aggregate", config: { operation: "procurement_manage" }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 80, y: 1080 }, data: { label: "Notify Selected Supplier", description: "Notify selected supplier/partner of the awarded job", icon: "📧", category: "notifications", nodeType: "notify_email", config: { recipients: "selected_supplier", template: "maintenance_award" }, status: "idle", isConfigured: true } },
      { id: "a9", type: "action", position: { x: 380, y: 1080 }, data: { label: "Follow-up Maintenance per PO", description: "Track and follow up on maintenance execution per purchase order", icon: "🔧", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "maintenance_followup" }, status: "idle", isConfigured: true } },
      { id: "c3", type: "condition", position: { x: 380, y: 910 }, data: { label: "Repair Complete?", description: "Verify if the repair work is complete", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "repair.status", operator: "equals", rightOperand: "complete" }, status: "idle", isConfigured: true } },
      { id: "a10", type: "action", position: { x: 380, y: 740 }, data: { label: "Confirm to SCD", description: "Provide completion confirmation to Supply Chain Department", icon: "✅", category: "data", nodeType: "data_log_history", config: { table: "maintenance_records", action: "completion_confirm" }, status: "idle", isConfigured: true } },
      { id: "a11", type: "action", position: { x: 380, y: 570 }, data: { label: "Service Delivery Confirmation (SCM-PRO 05)", description: "Final service/work delivery confirmation — PO or contract closeout", icon: "📦", category: "data", nodeType: "data_log_history", config: { table: "procurement_records", action: "delivery_confirmed" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "c1", type: "smoothstep", animated: true },
      { id: "e3", source: "c1", target: "a2", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e4", source: "c1", target: "a3", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e5", source: "a3", target: "c2", type: "smoothstep", animated: true },
      { id: "e6", source: "c2", target: "a4", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e7", source: "c2", target: "a5", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e8", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e9", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e10", source: "a7", target: "a8", type: "smoothstep", animated: true },
      { id: "e11", source: "a8", target: "a9", type: "smoothstep", animated: true },
      { id: "e12", source: "a9", target: "c3", type: "smoothstep", animated: true },
      { id: "e13", source: "c3", target: "a9", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e14", source: "c3", target: "a10", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e15", source: "a10", target: "a11", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT TYPE 2: ETHIO TELECOM FAULT ON THIRD PARTY
  // ═══════════════════════════════════════════════════════════════
  // INCIDENT TYPE 2: ETHIO TELECOM'S FAULT ON THIRD PARTY
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_incident_et_fault_third_party",
    name: "Incident: ET Fault on Third Party",
    description: "Ethio Telecom vehicle/driver at fault causing damage to third party. Driver reports to police → fills claim notification with fleet inspector → fleet reviews completeness → sends claim documents → insurance management completes form & sends to insurer → insurance coverage check → deal with third party → inform finance → send notification to fleet management.",
    category: "maintenance",
    icon: "🛡️",
    difficulty: "advanced",
    estimatedSavings: "~30% faster claim resolution",
    tags: ["accident", "insurance", "third-party", "fault", "settlement", "claim", "incident"],
    nodes: [
      // Driver lane
      { id: "t1", type: "trigger", position: { x: 300, y: 50 }, data: { label: "1- Report to Police & Obtain Report", description: "Driver reports to police and obtains police report", icon: "🚔", category: "triggers", nodeType: "trigger_event", config: { eventType: "accident_report_et_fault" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 300, y: 200 }, data: { label: "2- Complete Claim Notification Form", description: "Complete claim notification form with Fleet Inspector & report accident to Fleet Operation (Internal Claim Notification Form, Email, Phone)", icon: "📝", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "fill_claim_form" }, status: "idle", isConfigured: true } },
      // Fleet Operation lane
      { id: "a2", type: "action", position: { x: 300, y: 370 }, data: { label: "3- Review Claim for Completeness", description: "Fleet Operation Section reviews the claim notification for completeness", icon: "🔍", category: "data", nodeType: "data_lookup", config: { table: "accident_claims", action: "review_completeness" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 300, y: 530 }, data: { label: "Complete/Correct?", description: "Is the claim notification complete and correct?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "claim.is_complete", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a3", type: "action", position: { x: 100, y: 690 }, data: { label: "4- Send the Claim Documents", description: "Fleet Operation sends claim documents to Insurance Management", icon: "📤", category: "notifications", nodeType: "notify_email", config: { recipients: "insurance_management", template: "claim_documents" }, status: "idle", isConfigured: true } },
      // Insurance Management lane
      { id: "a4", type: "action", position: { x: 100, y: 860 }, data: { label: "5- Complete & Send to Insurance Co.", description: "Insurance Management completes claim form and sends documents to insurance company (Claim Notification Form)", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "submit_to_insurer" }, status: "idle", isConfigured: true } },
      // Insurance Company lane
      { id: "c2", type: "condition", position: { x: 100, y: 1030 }, data: { label: "Within Insurance Coverage?", description: "Is the damage within the scope of insurance coverage?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "claim.within_coverage", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 100, y: 1200 }, data: { label: "6- Deal with the Third Party", description: "Insurance company deals directly with the third party for settlement", icon: "🤝", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "deal_with_third_party" }, status: "idle", isConfigured: true } },
      // Within limit check
      { id: "c3", type: "condition", position: { x: 400, y: 1200 }, data: { label: "Within the Limit?", description: "Is the claim amount within the coverage limit?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "claim.within_limit", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      // Insurance Management - Finance path
      { id: "a6", type: "action", position: { x: 400, y: 860 }, data: { label: "7- Inform Finance to Settle", description: "Inform finance to settle payment with necessary documents", icon: "💰", category: "notifications", nodeType: "notify_email", config: { recipients: "finance_department", template: "settle_payment" }, status: "idle", isConfigured: true } },
      // Account Payable
      { id: "a7", type: "action", position: { x: 600, y: 690 }, data: { label: "FAM-APY 01 Account Payable", description: "Account Payable and Disbursement Section processes payment", icon: "🏦", category: "data", nodeType: "data_aggregate", config: { operation: "process_payment" }, status: "idle", isConfigured: true } },
      // Final notification
      { id: "a8", type: "action", position: { x: 600, y: 860 }, data: { label: "8- Send Notification to Fleet Mgmt", description: "Send notification letter to concerned Fleet Operation Management", icon: "📨", category: "notifications", nodeType: "notify_email", config: { recipients: "fleet_management", template: "case_notification" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "c1", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a2", sourceHandle: "false", type: "smoothstep", animated: true, label: "No (Return)" },
      { id: "e5", source: "c1", target: "a3", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e6", source: "a3", target: "a4", type: "smoothstep", animated: true },
      { id: "e7", source: "a4", target: "c2", type: "smoothstep", animated: true },
      { id: "e8", source: "c2", target: "a5", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e9", source: "c2", target: "c3", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e10", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e11", source: "c3", target: "a8", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes (End)" },
      { id: "e12", source: "c3", target: "a6", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e13", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e14", source: "a7", target: "a8", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // INCIDENT TYPE 3: THIRD PARTY DAMAGE ON ETHIO TELECOM VEHICLE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_incident_third_party_damages_et",
    name: "Incident: Third Party Damages ET Vehicle",
    description: "Third party damages Ethio Telecom vehicle. Driver reports to police → fills claim notification → insurance management analyzes → coverage check → request quotation from third-party garage → select least price → send vehicle to winner garage → receive & maintain vehicle → follow up → report completion → check maintenance quality → return/collect vehicle → provide receipt to insurance → request compensation → sign copy → collect agreed amount → inform finance → update/archive → legal representation if needed.",
    category: "maintenance",
    icon: "🚗",
    difficulty: "advanced",
    estimatedSavings: "~50% cost recovery rate",
    tags: ["accident", "insurance", "third-party", "damage", "recovery", "claim", "incident", "legal"],
    nodes: [
      // Fleet Operation / Driver lane
      { id: "t1", type: "trigger", position: { x: 200, y: 50 }, data: { label: "1- Driver Reports to Police", description: "Driver reports to police and obtains police report", icon: "🚔", category: "triggers", nodeType: "trigger_event", config: { eventType: "accident_report_tp_fault" }, status: "idle", isConfigured: true } },
      { id: "a1", type: "action", position: { x: 200, y: 200 }, data: { label: "2- Fill Claim Notification", description: "Fill the claim notification with fleet inspector and send the accident report (Internal Claim Notification Form, Email, Phone)", icon: "📝", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "fill_claim_form" }, status: "idle", isConfigured: true } },
      // Insurance Management lane
      { id: "a2", type: "action", position: { x: 200, y: 370 }, data: { label: "3- Analyze Claim Notification", description: "Insurance Management analyzes the claim notification", icon: "🔍", category: "data", nodeType: "data_lookup", config: { table: "accident_claims", action: "analyze_claim" }, status: "idle", isConfigured: true } },
      { id: "c1", type: "condition", position: { x: 200, y: 530 }, data: { label: "Covered by Insurance Policy?", description: "Is the damage covered by an insurance policy?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "claim.covered_by_insurance", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      // NOT covered path → FMG-FMG 18
      { id: "a3", type: "action", position: { x: -100, y: 530 }, data: { label: "FMG-FMG 18: Not Covered", description: "Vehicle Accident Maintenance Management not Covered by Insurance (redirect to not-covered workflow)", icon: "🔄", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "redirect_not_covered" }, status: "idle", isConfigured: true } },
      // Covered path → Fleet Management / Sourcing
      { id: "a4", type: "action", position: { x: 200, y: 700 }, data: { label: "4- Request Quotation from Garage", description: "Request quotation from garage recommended by third party or its insurer & customer garage", icon: "📋", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "request_quotation" }, status: "idle", isConfigured: true } },
      { id: "a5", type: "action", position: { x: 500, y: 700 }, data: { label: "5- Select Least Price Quotation", description: "Select the least price from quotation and send to be communicated (Email)", icon: "💲", category: "data", nodeType: "data_aggregate", config: { operation: "select_least_price" }, status: "idle", isConfigured: true } },
      { id: "a6", type: "action", position: { x: 500, y: 530 }, data: { label: "SCM-Pro 05: Service/Work Delivery", description: "SCM-Pro 05 Service or Work Delivery Confirmation (PO or Contract) Process", icon: "📄", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "service_delivery_confirmation" }, status: "idle", isConfigured: true } },
      // Winner garage
      { id: "a7", type: "action", position: { x: 700, y: 370 }, data: { label: "6a- Inform Winner Garage", description: "Inform the winner garage to conduct the repair with the Third Party/Insurance Company", icon: "🏭", category: "notifications", nodeType: "notify_email", config: { recipients: "winner_garage", template: "repair_order" }, status: "idle", isConfigured: true } },
      { id: "a8", type: "action", position: { x: 700, y: 200 }, data: { label: "7- Send Vehicle to Winner Garage", description: "Fleet Operation sends vehicle to winner/supplier garage with approved Work Order", icon: "🚛", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "send_to_garage" }, status: "idle", isConfigured: true } },
      // Selected Supplier Garage lane
      { id: "a9", type: "action", position: { x: 500, y: 200 }, data: { label: "8- Receive & Maintain Vehicle", description: "Receive the vehicle and maintain as per Work Order and agreement", icon: "🔧", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "perform_maintenance" }, status: "idle", isConfigured: true } },
      // Fleet Maintenance follow-up
      { id: "a10", type: "action", position: { x: 350, y: 870 }, data: { label: "9- Follow Up the Maintenance", description: "Fleet Maintenance Section follows up on the maintenance progress", icon: "👀", category: "data", nodeType: "data_lookup", config: { table: "maintenance_tasks", action: "follow_up" }, status: "idle", isConfigured: true } },
      { id: "a11", type: "action", position: { x: 500, y: 870 }, data: { label: "10- Report Maintenance Complete", description: "Report maintenance completed and request for payment", icon: "✅", category: "data", nodeType: "data_log_history", config: { table: "maintenance_tasks", action: "report_complete" }, status: "idle", isConfigured: true } },
      { id: "c2", type: "condition", position: { x: 500, y: 1040 }, data: { label: "Maintenance OK per WO?", description: "Check if the maintenance is performed as per Work Order", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "maintenance.quality_ok", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a12", type: "action", position: { x: 700, y: 1040 }, data: { label: "12- Return Vehicle to Garage", description: "Return the vehicle to garage for rework (not OK)", icon: "🔄", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "return_to_garage" }, status: "idle", isConfigured: true } },
      // Collect vehicle
      { id: "a13", type: "action", position: { x: 200, y: 1040 }, data: { label: "14- Collect Maintained Vehicle", description: "Collect the maintained vehicle & recovery/salvage from garage and return to third party", icon: "🚗", category: "fleet", nodeType: "fleet_update_vehicle", config: { action: "collect_vehicle" }, status: "idle", isConfigured: true } },
      // Provide receipt
      { id: "a14", type: "action", position: { x: 200, y: 1210 }, data: { label: "6b- Provide Pro Forma Invoice", description: "Provide required original pro forma invoice to Insurance Management Section", icon: "🧾", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "provide_invoice" }, status: "idle", isConfigured: true } },
      // Disbursement lane
      { id: "a15", type: "action", position: { x: 200, y: 1380 }, data: { label: "13a- Provide Original Receipt", description: "Provide original payment receipt to Insurance Management Section/Regional Facilities", icon: "🧾", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "provide_receipt" }, status: "idle", isConfigured: true } },
      // Insurance Management - Compensation
      { id: "a16", type: "action", position: { x: 500, y: 1210 }, data: { label: "16- Request Claim Compensation", description: "Request claim compensation from third party or its insurer", icon: "💰", category: "notifications", nodeType: "notify_email", config: { recipients: "third_party_insurer", template: "claim_compensation" }, status: "idle", isConfigured: true } },
      { id: "c3", type: "condition", position: { x: 500, y: 1380 }, data: { label: "Agreed?", description: "Has the third party/insurer agreed to the compensation amount?", icon: "🔀", category: "conditions", nodeType: "condition_if", config: { leftOperand: "compensation.agreed", operator: "equals", rightOperand: "true" }, status: "idle", isConfigured: true } },
      { id: "a17", type: "action", position: { x: 300, y: 1550 }, data: { label: "15- Sign Copy of Receipt", description: "Sign on copy of receipt and collect original", icon: "✍️", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "sign_receipt" }, status: "idle", isConfigured: true } },
      { id: "a18", type: "action", position: { x: 300, y: 1720 }, data: { label: "17- Inform Finance to Collect", description: "Inform finance to collect agreed amount", icon: "🏦", category: "notifications", nodeType: "notify_email", config: { recipients: "finance_department", template: "collect_amount" }, status: "idle", isConfigured: true } },
      { id: "a19", type: "action", position: { x: 500, y: 1550 }, data: { label: "18- Collect Agreed Amount", description: "Collect agreed amount from third party/insurer", icon: "💵", category: "data", nodeType: "data_aggregate", config: { operation: "collect_payment" }, status: "idle", isConfigured: true } },
      // Fleet Management - Collect vehicle & salvage
      { id: "a20", type: "action", position: { x: 700, y: 1210 }, data: { label: "13b- Inform to Collect Vehicle", description: "Inform to collect the maintained vehicle & salvage", icon: "📞", category: "notifications", nodeType: "notify_email", config: { recipients: "fleet_management", template: "collect_vehicle" }, status: "idle", isConfigured: true } },
      // Legal Division
      { id: "a21", type: "action", position: { x: 700, y: 1550 }, data: { label: "SER-LGM 06: Legal Representation", description: "Represent ET as a Plaintiff (legal recovery path when not agreed)", icon: "⚖️", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "legal_representation" }, status: "idle", isConfigured: true } },
      { id: "a22", type: "action", position: { x: 700, y: 1720 }, data: { label: "20- Inform Result to Insurance Mgmt", description: "Inform the legal result to Insurance Management Section", icon: "📨", category: "notifications", nodeType: "notify_email", config: { recipients: "insurance_management", template: "legal_result" }, status: "idle", isConfigured: true } },
      // Archive
      { id: "a23", type: "action", position: { x: 500, y: 1720 }, data: { label: "19- Update/Archive Document", description: "Update and archive all case documents", icon: "📦", category: "data", nodeType: "data_log_history", config: { table: "accident_claims", action: "archive_case" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", type: "smoothstep", animated: true },
      { id: "e2", source: "a1", target: "a2", type: "smoothstep", animated: true },
      { id: "e3", source: "a2", target: "c1", type: "smoothstep", animated: true },
      { id: "e4", source: "c1", target: "a3", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e5", source: "c1", target: "a4", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e6", source: "a4", target: "a5", type: "smoothstep", animated: true },
      { id: "e7", source: "a5", target: "a6", type: "smoothstep", animated: true },
      { id: "e8", source: "a6", target: "a7", type: "smoothstep", animated: true },
      { id: "e9", source: "a7", target: "a8", type: "smoothstep", animated: true },
      { id: "e10", source: "a8", target: "a9", type: "smoothstep", animated: true },
      { id: "e11", source: "a9", target: "a10", type: "smoothstep", animated: true },
      { id: "e12", source: "a10", target: "a11", type: "smoothstep", animated: true },
      { id: "e13", source: "a11", target: "c2", type: "smoothstep", animated: true },
      { id: "e14", source: "c2", target: "a12", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e15", source: "a12", target: "a9", type: "smoothstep", animated: true },
      { id: "e16", source: "c2", target: "a13", sourceHandle: "true", type: "smoothstep", animated: true, label: "OK" },
      { id: "e17", source: "a13", target: "a14", type: "smoothstep", animated: true },
      { id: "e18", source: "a14", target: "a15", type: "smoothstep", animated: true },
      { id: "e19", source: "a15", target: "a16", type: "smoothstep", animated: true },
      { id: "e20", source: "a16", target: "c3", type: "smoothstep", animated: true },
      { id: "e21", source: "c3", target: "a17", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "e22", source: "a17", target: "a18", type: "smoothstep", animated: true },
      { id: "e23", source: "a18", target: "a19", type: "smoothstep", animated: true },
      { id: "e24", source: "a19", target: "a23", type: "smoothstep", animated: true },
      { id: "e25", source: "c3", target: "a21", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "e26", source: "a21", target: "a22", type: "smoothstep", animated: true },
      { id: "e27", source: "a22", target: "a23", type: "smoothstep", animated: true },
      { id: "e28", source: "a13", target: "a20", type: "smoothstep", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // FUEL REQUEST & CLEARANCE WORKFLOW
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tpl_fuel_request_clearance",
    name: "Fuel Request & Clearance Workflow",
    description: "End-to-end fuel request lifecycle: auto-trigger on low fuel, request submission (vehicle/generator), delegation-based approval, fuel work order creation, e-money transfer to driver wallet, dispensing with deviation detection, and clearance with justification workflow.",
    category: "fuel",
    icon: "⛽",
    difficulty: "advanced",
    estimatedSavings: "~25% fuel cost reduction",
    tags: ["fuel", "clearance", "approval", "e-money", "deviation", "work-order", "delegation", "generator", "wallet"],
    nodes: [
      // Trigger: Low fuel or manual request
      { id: "ft1", type: "trigger", position: { x: 400, y: 50 }, data: { label: "Fuel Level Low / Manual Request", description: "Auto-triggers when fuel drops below configurable km/L threshold, or driver/ops submits manual request", icon: "⛽", category: "triggers", nodeType: "trigger_event", config: { eventType: "fuel_level_low", threshold_km_per_liter: 5 }, status: "idle", isConfigured: true } },

      // Condition: Vehicle or Generator?
      { id: "fc1", type: "condition", position: { x: 400, y: 200 }, data: { label: "Vehicle or Generator?", description: "Route based on request type", icon: "🔀", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "request.request_type", operator: "equals", rightOperand: "vehicle" }, status: "idle", isConfigured: true } },

      // Vehicle path: Generate clearance report
      { id: "fa1", type: "action", position: { x: 150, y: 350 }, data: { label: "Generate Clearance Report", description: "Pull previous refill history, odometer, efficiency data for this vehicle", icon: "📋", category: "data", nodeType: "data_lookup", config: { table: "fuel_requests", filter: "vehicle_id, status=fulfilled", limit: 5 }, status: "idle", isConfigured: true } },

      // Generator path
      { id: "fa2", type: "action", position: { x: 650, y: 350 }, data: { label: "Check Generator Status", description: "Verify generator is active and get current fuel level", icon: "🔋", category: "data", nodeType: "data_lookup", config: { table: "generators", filter: "status=active" }, status: "idle", isConfigured: true } },

      // Merge: Submit fuel request
      { id: "fa3", type: "action", position: { x: 400, y: 500 }, data: { label: "Submit Fuel Request", description: "Create fuel request with type, liters, cost estimate, station, and clearance data", icon: "📝", category: "data", nodeType: "data_transform", config: { action: "insert", table: "fuel_requests", include_clearance: true }, status: "idle", isConfigured: true } },

      // Route to approval
      { id: "fa4", type: "action", position: { x: 400, y: 650 }, data: { label: "Route to Delegation Approval", description: "Route request to fleet_manager or operations_manager based on cost threshold via delegation matrix", icon: "🔄", category: "fleet", nodeType: "fleet_assign_driver", config: { rpc: "route_fuel_request_approval", delegation_scope: "fuel_requests" }, status: "idle", isConfigured: true } },

      // Approval decision
      { id: "fc2", type: "condition", position: { x: 400, y: 800 }, data: { label: "Approved?", description: "Check if all required approvers have approved", icon: "✅", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "request.status", operator: "equals", rightOperand: "approved" }, status: "idle", isConfigured: true } },

      // Rejected path
      { id: "fa5", type: "action", position: { x: 700, y: 950 }, data: { label: "Notify Rejection", description: "Send rejection notification with reason to requester", icon: "❌", category: "notifications", nodeType: "notify_push", config: { recipients: "requester", template: "Fuel request {{request_number}} rejected: {{rejected_reason}}" }, status: "idle", isConfigured: true } },

      // Approved: Create work order
      { id: "fa6", type: "action", position: { x: 200, y: 950 }, data: { label: "Create Fuel Work Order", description: "Auto-generate FWO with approved amount. Triggers DB function create_fuel_work_order_on_approval", icon: "📄", category: "data", nodeType: "data_transform", config: { table: "fuel_work_orders", trigger: "auto_on_approval" }, status: "idle", isConfigured: true } },

      // Approve work order per delegation
      { id: "fa7", type: "action", position: { x: 200, y: 1100 }, data: { label: "WO Delegation Approval", description: "Work order approved as per delegation matrix", icon: "✅", category: "fleet", nodeType: "fleet_assign_driver", config: { delegation_scope: "fuel_work_orders" }, status: "idle", isConfigured: true } },

      // Initiate e-money
      { id: "fa8", type: "action", position: { x: 200, y: 1250 }, data: { label: "Initiate E-Money Transfer", description: "Initiate electronic money transfer to driver or on-site fuel admin", icon: "💳", category: "actions", nodeType: "integration_webhook", config: { action: "emoney_initiate", amount_source: "estimated_cost" }, status: "idle", isConfigured: true } },

      // Approve e-money
      { id: "fa9", type: "action", position: { x: 200, y: 1400 }, data: { label: "E-Money Approval (Delegation)", description: "E-money transfer approved by authorized delegate", icon: "🔐", category: "fleet", nodeType: "fleet_assign_driver", config: { delegation_scope: "emoney_transfer" }, status: "idle", isConfigured: true } },

      // Transfer to wallet
      { id: "fa10", type: "action", position: { x: 200, y: 1550 }, data: { label: "Transfer to Driver Wallet", description: "E-money transferred to driver's wallet account for fuel purchase", icon: "👛", category: "actions", nodeType: "integration_webhook", config: { action: "wallet_transfer", target: "driver_wallet" }, status: "idle", isConfigured: true } },

      // Show nearby stations
      { id: "fa11", type: "action", position: { x: 200, y: 1700 }, data: { label: "Show Nearby Stations", description: "Display approved fuel stations with availability on driver's app", icon: "🗺️", category: "notifications", nodeType: "notify_push", config: { recipients: "driver", template: "Your fuel request is ready. View nearby stations.", include_map: true }, status: "idle", isConfigured: true } },

      // Record dispensing
      { id: "fa12", type: "action", position: { x: 200, y: 1850 }, data: { label: "Record Fuel Dispensing", description: "Driver/station records actual liters dispensed and cost. Transaction visible to fleet & fuel management", icon: "⛽", category: "data", nodeType: "data_transform", config: { action: "update", table: "fuel_requests", fields: ["actual_liters", "actual_cost", "status=fulfilled"] }, status: "idle", isConfigured: true } },

      // Deviation check
      { id: "fc3", type: "condition", position: { x: 200, y: 2000 }, data: { label: "Deviation > 5%?", description: "Auto-detect if actual vs approved differs by more than 5%. Triggered by detect_fuel_deviation DB function", icon: "⚠️", category: "conditions", nodeType: "condition_threshold", config: { leftOperand: "abs(deviation_percent)", operator: "greater_than", rightOperand: "5" }, status: "idle", isConfigured: true } },

      // No deviation: Clear
      { id: "fa13", type: "action", position: { x: 450, y: 2150 }, data: { label: "Auto-Clear Transaction", description: "No significant deviation — clearance status set to 'cleared'", icon: "✅", category: "data", nodeType: "data_transform", config: { action: "update", table: "fuel_requests", clearance_status: "cleared" }, status: "idle", isConfigured: true } },

      // Deviation detected: Request justification
      { id: "fa14", type: "action", position: { x: 50, y: 2150 }, data: { label: "Request Justification", description: "Send justification request to fleet operations team for the deviation", icon: "📨", category: "notifications", nodeType: "notify_email", config: { recipients: "fleet_operations", template: "Fuel deviation of {{deviation_percent}}% detected on {{request_number}}. Justification required." }, status: "idle", isConfigured: true } },

      // Review justification
      { id: "fa15", type: "action", position: { x: 50, y: 2300 }, data: { label: "Review & Resolve", description: "Fuel management team reviews justification and completes or escalates", icon: "🔍", category: "fleet", nodeType: "fleet_assign_driver", config: { action: "review_justification", escalation: "fuel_management" }, status: "idle", isConfigured: true } },

      // End
      { id: "fa16", type: "action", position: { x: 250, y: 2450 }, data: { label: "Workflow Complete", description: "Fuel request lifecycle complete — all clearance data archived", icon: "🏁", category: "data", nodeType: "data_aggregate", config: { action: "archive", table: "fuel_requests" }, status: "idle", isConfigured: true } },
    ],
    edges: [
      { id: "fe1", source: "ft1", target: "fc1", type: "smoothstep", animated: true },
      { id: "fe2", source: "fc1", target: "fa1", sourceHandle: "true", type: "smoothstep", animated: true, label: "Vehicle" },
      { id: "fe3", source: "fc1", target: "fa2", sourceHandle: "false", type: "smoothstep", animated: true, label: "Generator" },
      { id: "fe4", source: "fa1", target: "fa3", type: "smoothstep", animated: true },
      { id: "fe5", source: "fa2", target: "fa3", type: "smoothstep", animated: true },
      { id: "fe6", source: "fa3", target: "fa4", type: "smoothstep", animated: true },
      { id: "fe7", source: "fa4", target: "fc2", type: "smoothstep", animated: true },
      { id: "fe8", source: "fc2", target: "fa6", sourceHandle: "true", type: "smoothstep", animated: true, label: "Yes" },
      { id: "fe9", source: "fc2", target: "fa5", sourceHandle: "false", type: "smoothstep", animated: true, label: "No" },
      { id: "fe10", source: "fa6", target: "fa7", type: "smoothstep", animated: true },
      { id: "fe11", source: "fa7", target: "fa8", type: "smoothstep", animated: true },
      { id: "fe12", source: "fa8", target: "fa9", type: "smoothstep", animated: true },
      { id: "fe13", source: "fa9", target: "fa10", type: "smoothstep", animated: true },
      { id: "fe14", source: "fa10", target: "fa11", type: "smoothstep", animated: true },
      { id: "fe15", source: "fa11", target: "fa12", type: "smoothstep", animated: true },
      { id: "fe16", source: "fa12", target: "fc3", type: "smoothstep", animated: true },
      { id: "fe17", source: "fc3", target: "fa14", sourceHandle: "true", type: "smoothstep", animated: true, label: "Deviation" },
      { id: "fe18", source: "fc3", target: "fa13", sourceHandle: "false", type: "smoothstep", animated: true, label: "OK" },
      { id: "fe19", source: "fa14", target: "fa15", type: "smoothstep", animated: true },
      { id: "fe20", source: "fa15", target: "fa16", type: "smoothstep", animated: true },
      { id: "fe21", source: "fa13", target: "fa16", type: "smoothstep", animated: true },
      { id: "fe22", source: "fa5", target: "fa16", type: "smoothstep", animated: true },
    ],
  },
];

export default TEMPLATES;
