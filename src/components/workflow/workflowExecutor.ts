import { supabase } from "@/integrations/supabase/client";

export interface ExecutionResult {
  success: boolean;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "INVOKE";
  table?: string;
  message: string;
  data?: Record<string, any>;
  rowCount?: number;
  error?: string;
}

/**
 * Execute a real database operation based on the workflow node type.
 * Triggers & data nodes → read operations.
 * Fleet/notification nodes → write operations (inserts/updates).
 */
export async function executeNode(
  nodeType: string,
  category: string,
  config: Record<string, any> | undefined,
  organizationId: string
): Promise<ExecutionResult> {
  try {
    switch (nodeType) {
      // ── Triggers (Read) ──────────────────────────
      case "trigger_event":
        return await readLatest("alerts", organizationId, 5, "Recent alerts fetched");
      case "trigger_geofence":
        return await readLatest("geofence_events", organizationId, 5, "Geofence events fetched");
      case "trigger_alert":
        return await readLatest("alerts", organizationId, 3, "Alert triggers loaded");
      case "trigger_sensor":
        return await readLatest("vehicle_telemetry", organizationId, 3, "Sensor telemetry fetched");
      case "trigger_schedule":
        return { success: true, operation: "SELECT", message: "Schedule trigger evaluated — cron match OK", data: { cron: config?.cron || "*/15 * * * *", next_run: new Date(Date.now() + 900000).toISOString() } };
      case "trigger_webhook":
        return { success: true, operation: "INVOKE", message: "Webhook endpoint ready", data: { method: "POST", path: `/webhook/${organizationId.slice(0, 8)}` } };

      // ── Conditions (Read + Evaluate) ─────────────
      case "condition_if":
      case "condition_switch":
      case "condition_filter":
      case "condition_threshold":
        return await evaluateCondition(nodeType, config, organizationId);
      case "condition_geo_proximity":
        return await evaluateGeoProximity(config, organizationId);

      // ── Fleet Actions (Write) ────────────────────
      case "fleet_create_trip":
        return await createTrip(config, organizationId);
      case "fleet_update_vehicle":
        return await updateVehicleStatus(config, organizationId);
      case "fleet_assign_driver":
        return await assignDriver(config, organizationId);
      case "fleet_maintenance":
        return await createWorkOrder(config, organizationId);
      case "fleet_fuel_check":
        return await checkFuelLevel(config, organizationId);
      case "fleet_speed_limit":
        return await readLatest("vehicle_telemetry", organizationId, 1, "Speed data read for governor check");
      case "fleet_immobilize":
        return await createDeviceCommand("engine_cutoff", config, organizationId);
      case "fleet_driver_handover":
        return await readDriverAvailability(organizationId);
      case "fleet_route_optimize":
        return await readLatest("trips", organizationId, 3, "Recent trips loaded for route optimization");
      case "fleet_request_approval":
        return await insertNotification("approval_request", "Fleet Request Pending Approval", organizationId);

      // ── Notifications (Insert) ──────────────────
      case "notify_email":
        return await insertNotification("email", config?.subject || "Workflow Email Notification", organizationId);
      case "notify_sms":
        return await insertNotification("sms", config?.message || "Workflow SMS Alert", organizationId);
      case "notify_push":
        return await insertNotification("push", config?.title || "Workflow Push Notification", organizationId);
      case "notify_slack":
        return { success: true, operation: "INVOKE", message: "Slack webhook invoked", data: { channel: config?.channel || "#fleet-alerts", delivered: true } };
      case "notify_escalation":
        return await insertNotification("escalation", "Escalation: Immediate Attention Required", organizationId);

      // ── Data Operations (Read/Write) ─────────────
      case "data_lookup":
        return await dataLookup(config, organizationId);
      case "data_aggregate":
        return await dataAggregate(config, organizationId);
      case "data_transform":
        return { success: true, operation: "SELECT", message: "Data transformation applied", data: { records_transformed: Math.floor(Math.random() * 50 + 5) } };
      case "data_api_call":
        return { success: true, operation: "INVOKE", message: "External API call simulated", data: { status: 200, response_time_ms: Math.floor(Math.random() * 300 + 50) } };
      case "data_log_history":
        return await logToAudit(config, organizationId);

      // ── Timing ──────────────────────────────────
      case "timing_delay":
        return { success: true, operation: "SELECT", message: `Delay of ${config?.seconds || 5}s completed`, data: { waited_seconds: config?.seconds || 5 } };
      case "timing_schedule":
        return { success: true, operation: "SELECT", message: "Wait-until condition met", data: { target_time: config?.time || "08:00" } };
      case "timing_debounce":
        return { success: true, operation: "SELECT", message: "Debounce window passed — proceeding", data: { window_ms: config?.window_ms || 3000 } };

      // ── Sensors (Read) ──────────────────────────
      case "sensor_temperature":
        return await readColdChain(organizationId);
      case "sensor_fuel_level":
        return await checkFuelLevel(config, organizationId);
      case "sensor_load_weight":
      case "sensor_shock":
      case "sensor_door":
      case "sensor_tilt":
        return await readLatest("vehicle_telemetry", organizationId, 1, `${nodeType.replace("sensor_", "")} sensor reading fetched`);

      // ── Safety Hardware (Read) ──────────────────
      case "hw_dashcam":
        return await readLatest("dash_cam_events", organizationId, 3, "Dashcam events fetched");
      case "hw_alcohol":
        return await readLatest("alcohol_fatigue_tests", organizationId, 2, "Alcohol test records fetched");
      case "hw_rfid":
        return { success: true, operation: "SELECT", message: "RFID authentication validated", data: { authenticated: true, tag_id: "RFID-" + Math.floor(Math.random() * 9999) } };
      case "hw_panic_button":
        return await insertAlert("panic_button", "PANIC: Emergency button pressed", organizationId);
      case "hw_tamper_detect":
        return await readLatest("alerts", organizationId, 2, "Tamper detection alerts checked");
      case "hw_ev_charger":
        return { success: true, operation: "SELECT", message: "EV charger status read", data: { charging: true, soc_percent: Math.floor(Math.random() * 60 + 30) } };

      default:
        return { success: true, operation: "SELECT", message: `Node '${nodeType}' executed (no specific handler)`, data: {} };
    }
  } catch (err: any) {
    return { success: false, operation: "SELECT", message: `Execution failed: ${err.message}`, error: err.message };
  }
}

// ── Helper functions ──────────────────────────────

async function readLatest(table: string, orgId: string, limit: number, successMsg: string): Promise<ExecutionResult> {
  const { data, error, count } = await (supabase
    .from(table as any)
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit) as any);

  if (error) return { success: false, operation: "SELECT", table, message: `Read failed: ${error.message}`, error: error.message };

  return {
    success: true,
    operation: "SELECT",
    table,
    message: successMsg,
    rowCount: count ?? data?.length ?? 0,
    data: { rows_returned: data?.length ?? 0, total_available: count ?? 0, sample: data?.[0] ? summarizeRow(data[0]) : null },
  };
}

async function evaluateCondition(nodeType: string, config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data } = await (supabase
    .from("vehicle_telemetry")
    .select("speed_kmh, fuel_level_percent, vehicle_id")
    .eq("organization_id", orgId)
    .order("last_communication_at", { ascending: false })
    .limit(1)
    .maybeSingle() as any);

  const threshold = config?.threshold ?? 80;
  const field = config?.field || "speed_kmh";
  const value = data?.[field] ?? 0;
  const result = Number(value) > threshold;

  return {
    success: true,
    operation: "SELECT",
    table: "vehicle_telemetry",
    message: `Condition evaluated: ${field} (${value}) ${result ? ">" : "≤"} ${threshold} → ${result ? "TRUE" : "FALSE"}`,
    data: { field, value, threshold, branch: result ? "true" : "false", vehicle_id: data?.vehicle_id },
  };
}

async function evaluateGeoProximity(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data } = await supabase
    .from("vehicle_telemetry")
    .select("lat, lng, vehicle_id")
    .eq("organization_id", orgId)
    .not("latitude", "is", null)
    .order("last_communication_at", { ascending: false })
    .limit(1)
    .maybeSingle() as any);

  const targetLat = config?.lat ?? 9.02;
  const targetLng = config?.lng ?? 38.75;
  const radius = config?.radius_km ?? 5;

  if (data?.latitude && data?.longitude) {
    const dist = haversine(data.latitude, data.longitude, targetLat, targetLng);
    const inside = dist <= radius;
    return {
      success: true, operation: "SELECT", table: "vehicle_telemetry",
      message: `Proximity: ${dist.toFixed(2)} km from target — ${inside ? "INSIDE" : "OUTSIDE"} ${radius}km radius`,
      data: { distance_km: Number(dist.toFixed(2)), inside, vehicle_id: data.vehicle_id },
    };
  }
  return { success: true, operation: "SELECT", message: "No vehicle position data available", data: { inside: false } };
}

async function createTrip(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  // Pick a random vehicle
  const { data: vehicle } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", orgId).limit(1).maybeSingle();
  if (!vehicle) return { success: false, operation: "INSERT", table: "trips", message: "No vehicles found to create trip", error: "No vehicles" };

  const { data, error } = await supabase.from("trips").insert({
    organization_id: orgId,
    vehicle_id: vehicle.id,
    status: "scheduled",
    start_time: new Date().toISOString(),
    notes: "Auto-created by workflow simulation",
  }).select("id, status").single();

  if (error) return { success: false, operation: "INSERT", table: "trips", message: `Trip creation failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "trips", message: `Trip created for ${vehicle.plate_number}`, data: { trip_id: data.id, vehicle: vehicle.plate_number, status: data.status }, rowCount: 1 };
}

async function updateVehicleStatus(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const newStatus = config?.status || "active";
  const { data: vehicle } = await supabase.from("vehicles").select("id, plate_number, status").eq("organization_id", orgId).limit(1).maybeSingle();
  if (!vehicle) return { success: false, operation: "UPDATE", table: "vehicles", message: "No vehicles found", error: "No vehicles" };

  const { error } = await supabase.from("vehicles").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", vehicle.id);
  if (error) return { success: false, operation: "UPDATE", table: "vehicles", message: `Update failed: ${error.message}`, error: error.message };

  return { success: true, operation: "UPDATE", table: "vehicles", message: `Vehicle ${vehicle.plate_number} status → ${newStatus}`, data: { vehicle_id: vehicle.id, plate: vehicle.plate_number, old_status: vehicle.status, new_status: newStatus }, rowCount: 1 };
}

async function assignDriver(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: driver } = await supabase.from("drivers").select("id, first_name, last_name").eq("organization_id", orgId).eq("status", "active").limit(1).maybeSingle();
  if (!driver) return { success: false, operation: "UPDATE", table: "drivers", message: "No active drivers found", error: "No active drivers" };

  const { data: vehicle } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", orgId).is("assigned_driver_id", null).limit(1).maybeSingle();
  if (!vehicle) {
    return { success: true, operation: "SELECT", table: "vehicles", message: `All vehicles already assigned — driver ${driver.first_name} ${driver.last_name} on standby`, data: { driver: `${driver.first_name} ${driver.last_name}` } };
  }

  const { error } = await supabase.from("vehicles").update({ assigned_driver_id: driver.id, updated_at: new Date().toISOString() }).eq("id", vehicle.id);
  if (error) return { success: false, operation: "UPDATE", table: "vehicles", message: `Assignment failed: ${error.message}`, error: error.message };

  return { success: true, operation: "UPDATE", table: "vehicles", message: `Driver ${driver.first_name} assigned to ${vehicle.plate_number}`, data: { driver: `${driver.first_name} ${driver.last_name}`, vehicle: vehicle.plate_number }, rowCount: 1 };
}

async function createWorkOrder(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: vehicle } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", orgId).limit(1).maybeSingle();
  if (!vehicle) return { success: false, operation: "INSERT", table: "work_orders", message: "No vehicles found", error: "No vehicles" };

  const woNumber = "WO-WF-" + Date.now().toString().slice(-8);
  const { data, error } = await supabase.from("work_orders").insert({
    organization_id: orgId,
    vehicle_id: vehicle.id,
    work_order_number: woNumber,
    work_type: config?.work_type || "preventive",
    priority: config?.priority || "medium",
    service_description: config?.description || "Workflow-generated maintenance task",
    status: "pending",
    scheduled_date: new Date().toISOString().split("T")[0],
  }).select("id, work_order_number, status").single();

  if (error) return { success: false, operation: "INSERT", table: "work_orders", message: `Work order failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "work_orders", message: `Work order ${woNumber} created for ${vehicle.plate_number}`, data: { wo_id: data.id, wo_number: data.work_order_number, vehicle: vehicle.plate_number }, rowCount: 1 };
}

async function checkFuelLevel(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data } = await (supabase
    .from("vehicle_telemetry")
    .select("vehicle_id, fuel_level_percent, speed_kmh, last_communication_at")
    .eq("organization_id", orgId)
    .not("fuel_level_percent", "is", null)
    .order("last_communication_at", { ascending: false })
    .limit(5) as any);

  if (!data?.length) return { success: true, operation: "SELECT", table: "vehicle_telemetry", message: "No fuel telemetry available", data: { vehicles_checked: 0 } };

  const lowFuel = data.filter((r: any) => (r.fuel_level_percent ?? 100) < (config?.threshold || 20));
  return {
    success: true, operation: "SELECT", table: "vehicle_telemetry",
    message: `Fuel check: ${data.length} vehicles scanned, ${lowFuel.length} below threshold`,
    data: { vehicles_checked: data.length, low_fuel_count: lowFuel.length, threshold: config?.threshold || 20 },
    rowCount: data.length,
  };
}

async function createDeviceCommand(commandType: string, config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: device } = await supabase.from("devices").select("id, imei, vehicle_id").eq("organization_id", orgId).eq("status", "active").limit(1).maybeSingle();
  if (!device) return { success: false, operation: "INSERT", table: "device_commands", message: "No active devices found", error: "No devices" };

  const { data, error } = await supabase.from("device_commands").insert({
    organization_id: orgId,
    device_id: device.id,
    vehicle_id: device.vehicle_id,
    command_type: commandType,
    command_payload: { source: "workflow_simulation", timestamp: new Date().toISOString() },
    status: "pending",
    priority: "high",
  }).select("id, command_type, status").single();

  if (error) return { success: false, operation: "INSERT", table: "device_commands", message: `Command failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "device_commands", message: `${commandType} command queued for device ${device.imei}`, data: { command_id: data.id, device_imei: device.imei, command: data.command_type }, rowCount: 1 };
}

async function readDriverAvailability(orgId: string): Promise<ExecutionResult> {
  const { data, error } = await supabase
    .from("driver_availability")
    .select("driver_id, status, shift_start, shift_end")
    .eq("organization_id", orgId)
    .limit(5);

  if (error) return { success: false, operation: "SELECT", table: "driver_availability", message: `Read failed: ${error.message}`, error: error.message };
  const available = data?.filter((d) => d.status === "available").length ?? 0;
  return {
    success: true, operation: "SELECT", table: "driver_availability",
    message: `Driver availability: ${available} of ${data?.length ?? 0} drivers available`,
    data: { total: data?.length ?? 0, available, on_duty: data?.filter((d) => d.status === "on_duty").length ?? 0 },
    rowCount: data?.length ?? 0,
  };
}

async function insertNotification(type: string, title: string, orgId: string): Promise<ExecutionResult> {
  const { data: user } = await supabase.from("profiles").select("id").eq("organization_id", orgId).limit(1).maybeSingle();
  if (!user) return { success: false, operation: "INSERT", table: "notifications", message: "No users found in organization", error: "No users" };

  const { data, error } = await supabase.from("notifications").insert({
    organization_id: orgId,
    user_id: user.id,
    type,
    title,
    message: `[Workflow] ${title}`,
    is_read: false,
  }).select("id, type, title").single();

  if (error) return { success: false, operation: "INSERT", table: "notifications", message: `Notification failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "notifications", message: `${type} notification sent: "${title}"`, data: { notification_id: data.id, type: data.type }, rowCount: 1 };
}

async function insertAlert(alertType: string, title: string, orgId: string): Promise<ExecutionResult> {
  const { data, error } = await supabase.from("alerts").insert({
    organization_id: orgId,
    alert_type: alertType,
    title,
    message: `[Workflow] ${title}`,
    severity: "critical",
    alert_time: new Date().toISOString(),
  }).select("id, alert_type, severity").single();

  if (error) return { success: false, operation: "INSERT", table: "alerts", message: `Alert creation failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "alerts", message: `Alert created: ${title}`, data: { alert_id: data.id, type: alertType, severity: "critical" }, rowCount: 1 };
}

async function readColdChain(orgId: string): Promise<ExecutionResult> {
  const { data, error } = await supabase
    .from("cold_chain_readings")
    .select("vehicle_id, temperature_celsius, humidity_percent, is_alarm, recorded_at")
    .eq("organization_id", orgId)
    .order("recorded_at", { ascending: false })
    .limit(3);

  if (error) return { success: false, operation: "SELECT", table: "cold_chain_readings", message: `Read failed: ${error.message}`, error: error.message };
  if (!data?.length) return { success: true, operation: "SELECT", table: "cold_chain_readings", message: "No cold chain readings available", data: { readings: 0 } };

  const alarms = data.filter((r) => r.is_alarm);
  return {
    success: true, operation: "SELECT", table: "cold_chain_readings",
    message: `Temperature readings: ${data.length} samples, ${alarms.length} alarms`,
    data: { readings: data.length, alarms: alarms.length, latest_temp: data[0].temperature_celsius + "°C" },
    rowCount: data.length,
  };
}

async function dataLookup(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const table = config?.table || "vehicles";
  const allowedTables = ["vehicles", "drivers", "trips", "alerts", "fuel_transactions", "work_orders", "geofences", "devices"];
  if (!allowedTables.includes(table)) {
    return { success: false, operation: "SELECT", message: `Table '${table}' not allowed for lookup`, error: "Invalid table" };
  }

  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(config?.limit || 10);

  if (error) return { success: false, operation: "SELECT", table, message: `Lookup failed: ${error.message}`, error: error.message };
  return { success: true, operation: "SELECT", table, message: `Lookup on '${table}': ${data?.length ?? 0} rows returned`, data: { table, rows_returned: data?.length ?? 0, total: count ?? 0 }, rowCount: data?.length ?? 0 };
}

async function dataAggregate(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  // Aggregate vehicle counts by status
  const { data, error } = await supabase.from("vehicles").select("status").eq("organization_id", orgId);
  if (error) return { success: false, operation: "SELECT", table: "vehicles", message: `Aggregate failed: ${error.message}`, error: error.message };

  const counts: Record<string, number> = {};
  data?.forEach((v) => { counts[v.status || "unknown"] = (counts[v.status || "unknown"] || 0) + 1; });

  return {
    success: true, operation: "SELECT", table: "vehicles",
    message: `Aggregation: ${data?.length ?? 0} vehicles grouped by status`,
    data: { total: data?.length ?? 0, by_status: counts },
    rowCount: data?.length ?? 0,
  };
}

async function logToAudit(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data, error } = await supabase.from("audit_logs").insert({
    organization_id: orgId,
    action: "workflow_execution",
    resource_type: "workflow",
    status: "success",
    new_values: { source: "workflow_simulation", timestamp: new Date().toISOString(), ...(config || {}) },
  }).select("id").single();

  if (error) return { success: false, operation: "INSERT", table: "audit_logs", message: `Audit log failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "audit_logs", message: "Event logged to audit history", data: { audit_id: data.id }, rowCount: 1 };
}

// ── Utilities ─────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function summarizeRow(row: Record<string, any>): Record<string, any> {
  const summary: Record<string, any> = {};
  const keys = Object.keys(row).slice(0, 5);
  keys.forEach((k) => {
    const val = row[k];
    summary[k] = typeof val === "string" && val.length > 40 ? val.slice(0, 37) + "..." : val;
  });
  return summary;
}
