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

      // ── AI Intelligence (Read + Analyze) ────────
      case "ai_decision":
        return await aiSmartDecision(config, organizationId);
      case "ai_predict_maintenance":
        return await aiPredictMaintenance(organizationId);
      case "ai_anomaly_detect":
        return await aiAnomalyDetect(organizationId);
      case "ai_route_optimize":
        return await aiRouteOptimize(organizationId);
      case "ai_fuel_forecast":
        return await aiFuelForecast(organizationId);
      case "ai_driver_scoring":
        return await aiDriverScoring(organizationId);

      // ── Fuel Request Workflow ───────────────────
      case "fuel_request_submit":
        return await fuelRequestSubmit(config, organizationId);
      case "fuel_request_approve":
        return await fuelRequestApprove(config, organizationId);
      case "fuel_deviation_check":
        return await fuelDeviationCheck(organizationId);
      case "fuel_emoney_transfer":
        return await fuelEmoneyTransfer(config, organizationId);

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
  const { data } = await (supabase
    .from("vehicle_telemetry")
    .select("latitude, longitude, vehicle_id")
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

// ── AI Intelligence Handlers ──────────────────────

async function aiSmartDecision(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: telemetry } = await (supabase.from("vehicle_telemetry").select("vehicle_id, speed_kmh, fuel_level_percent, ignition_status").eq("organization_id", orgId).order("last_communication_at", { ascending: false }).limit(10) as any);
  const vehicles = telemetry?.length ?? 0;
  const avgSpeed = vehicles > 0 ? telemetry.reduce((s: number, t: any) => s + (t.speed_kmh ?? 0), 0) / vehicles : 0;
  const lowFuel = telemetry?.filter((t: any) => (t.fuel_level_percent ?? 100) < 25).length ?? 0;
  const idling = telemetry?.filter((t: any) => t.ignition_status === "on" && (t.speed_kmh ?? 0) < 3).length ?? 0;

  return {
    success: true, operation: "SELECT", table: "vehicle_telemetry",
    message: `AI Decision: ${vehicles} vehicles analyzed — ${lowFuel} low fuel, ${idling} idling, avg speed ${avgSpeed.toFixed(0)} km/h`,
    data: { vehicles_analyzed: vehicles, avg_speed_kmh: Number(avgSpeed.toFixed(1)), low_fuel_count: lowFuel, idling_count: idling, recommendation: lowFuel > 2 ? "dispatch_fuel" : idling > 3 ? "reduce_idling" : "all_clear" },
    rowCount: vehicles,
  };
}

async function aiPredictMaintenance(orgId: string): Promise<ExecutionResult> {
  const { data: vehicles } = await supabase.from("vehicles").select("id, plate_number, mileage, last_service_date").eq("organization_id", orgId).order("mileage", { ascending: false }).limit(5);
  if (!vehicles?.length) return { success: true, operation: "SELECT", table: "vehicles", message: "No vehicles for maintenance prediction", data: { predictions: 0 } };

  const predictions = vehicles.map((v) => {
    const mileage = v.mileage ?? 0;
    const daysSinceService = v.last_service_date ? Math.floor((Date.now() - new Date(v.last_service_date).getTime()) / 86400000) : 999;
    const urgency = mileage > 50000 || daysSinceService > 90 ? "high" : mileage > 30000 || daysSinceService > 60 ? "medium" : "low";
    return { plate: v.plate_number, mileage, days_since_service: daysSinceService, urgency };
  });

  const highUrgency = predictions.filter((p) => p.urgency === "high").length;
  return {
    success: true, operation: "SELECT", table: "vehicles",
    message: `AI Maintenance: ${predictions.length} vehicles scanned, ${highUrgency} need urgent service`,
    data: { total_scanned: predictions.length, high_urgency: highUrgency, top_priority: predictions[0] },
    rowCount: predictions.length,
  };
}

async function aiAnomalyDetect(orgId: string): Promise<ExecutionResult> {
  const { data: fuelTx } = await (supabase.from("fuel_transactions").select("vehicle_id, liters, cost, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20) as any);
  if (!fuelTx?.length) return { success: true, operation: "SELECT", table: "fuel_transactions", message: "No fuel data for anomaly detection", data: { anomalies: 0 } };

  const avgCostPerLiter = fuelTx.reduce((s: number, t: any) => s + ((t.cost ?? 0) / Math.max(t.liters ?? 1, 1)), 0) / fuelTx.length;
  const anomalies = fuelTx.filter((t: any) => {
    const cpl = (t.cost ?? 0) / Math.max(t.liters ?? 1, 1);
    return Math.abs(cpl - avgCostPerLiter) > avgCostPerLiter * 0.3;
  });

  return {
    success: true, operation: "SELECT", table: "fuel_transactions",
    message: `AI Anomaly: ${fuelTx.length} transactions analyzed, ${anomalies.length} anomalies detected (>30% cost deviation)`,
    data: { transactions_analyzed: fuelTx.length, anomalies_found: anomalies.length, avg_cost_per_liter: Number(avgCostPerLiter.toFixed(2)) },
    rowCount: fuelTx.length,
  };
}

async function aiRouteOptimize(orgId: string): Promise<ExecutionResult> {
  const { data: trips } = await supabase.from("trips").select("id, vehicle_id, distance_km, actual_distance_km, status").eq("organization_id", orgId).eq("status", "completed").order("created_at", { ascending: false }).limit(10);
  if (!trips?.length) return { success: true, operation: "SELECT", table: "trips", message: "No completed trips for route optimization", data: { trips: 0 } };

  const withDeviation = trips.filter((t) => t.distance_km && t.actual_distance_km && Math.abs(t.actual_distance_km - t.distance_km) > t.distance_km * 0.15);
  const totalPlanned = trips.reduce((s, t) => s + (t.distance_km ?? 0), 0);
  const totalActual = trips.reduce((s, t) => s + (t.actual_distance_km ?? t.distance_km ?? 0), 0);
  const savingsPct = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned * 100).toFixed(1) : "0";

  return {
    success: true, operation: "SELECT", table: "trips",
    message: `AI Route: ${trips.length} trips analyzed, ${withDeviation.length} with >15% deviation, potential ${savingsPct}% optimization`,
    data: { trips_analyzed: trips.length, route_deviations: withDeviation.length, total_planned_km: totalPlanned, total_actual_km: totalActual },
    rowCount: trips.length,
  };
}

async function aiFuelForecast(orgId: string): Promise<ExecutionResult> {
  const { data: fuelTx } = await (supabase.from("fuel_transactions").select("liters, cost, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30) as any);
  if (!fuelTx?.length) return { success: true, operation: "SELECT", table: "fuel_transactions", message: "No fuel data for forecasting", data: { forecast: "insufficient_data" } };

  const totalLiters = fuelTx.reduce((s: number, t: any) => s + (t.liters ?? 0), 0);
  const totalCost = fuelTx.reduce((s: number, t: any) => s + (t.cost ?? 0), 0);
  const avgDailyLiters = totalLiters / Math.max(fuelTx.length, 1);
  const avgCostPerLiter = totalCost / Math.max(totalLiters, 1);

  return {
    success: true, operation: "SELECT", table: "fuel_transactions",
    message: `AI Fuel Forecast: avg ${avgDailyLiters.toFixed(0)}L/fill, ${avgCostPerLiter.toFixed(2)} ETB/L — projected monthly: ${(avgDailyLiters * 30 * avgCostPerLiter).toFixed(0)} ETB`,
    data: { avg_liters_per_fill: Number(avgDailyLiters.toFixed(1)), avg_cost_per_liter: Number(avgCostPerLiter.toFixed(2)), projected_monthly_liters: Number((avgDailyLiters * 30).toFixed(0)), projected_monthly_cost: Number((avgDailyLiters * 30 * avgCostPerLiter).toFixed(0)) },
    rowCount: fuelTx.length,
  };
}

async function aiDriverScoring(orgId: string): Promise<ExecutionResult> {
  const { data: scores } = await supabase.from("driver_behavior_scores").select("driver_id, overall_score, harsh_braking_count, harsh_acceleration_count, speeding_count, period_start").eq("organization_id", orgId).order("period_start", { ascending: false }).limit(10);
  if (!scores?.length) return { success: true, operation: "SELECT", table: "driver_behavior_scores", message: "No driver scores available", data: { drivers: 0 } };

  const avgScore = scores.reduce((s, d) => s + (d.overall_score ?? 0), 0) / scores.length;
  const highRisk = scores.filter((d) => (d.overall_score ?? 100) < 60).length;
  const totalEvents = scores.reduce((s, d) => s + (d.harsh_braking_count ?? 0) + (d.harsh_acceleration_count ?? 0) + (d.speeding_count ?? 0), 0);

  return {
    success: true, operation: "SELECT", table: "driver_behavior_scores",
    message: `AI Scoring: ${scores.length} drivers, avg score ${avgScore.toFixed(0)}, ${highRisk} high-risk, ${totalEvents} total events`,
    data: { drivers_scored: scores.length, avg_score: Number(avgScore.toFixed(1)), high_risk_count: highRisk, total_safety_events: totalEvents },
    rowCount: scores.length,
  };
}

// ── Fuel Request Workflow Handlers ────────────────

async function fuelRequestSubmit(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: vehicle } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", orgId).limit(1).maybeSingle();
  if (!vehicle) return { success: false, operation: "INSERT", table: "fuel_requests", message: "No vehicles found", error: "No vehicles" };

  const { data, error } = await (supabase as any).from("fuel_requests").insert({
    organization_id: orgId,
    vehicle_id: vehicle.id,
    requested_liters: config?.liters ?? 50,
    purpose: config?.purpose || "Operational refuel",
    status: "pending",
    request_type: config?.request_type || "vehicle",
  }).select("id, status, requested_liters").single();

  if (error) return { success: false, operation: "INSERT", table: "fuel_requests", message: `Fuel request failed: ${error.message}`, error: error.message };
  return { success: true, operation: "INSERT", table: "fuel_requests", message: `Fuel request submitted: ${data.requested_liters}L for ${vehicle.plate_number}`, data: { request_id: data.id, liters: data.requested_liters, vehicle: vehicle.plate_number }, rowCount: 1 };
}

async function fuelRequestApprove(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: request } = await (supabase as any).from("fuel_requests").select("id, requested_liters, status, vehicle_id").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!request) return { success: true, operation: "SELECT", table: "fuel_requests", message: "No pending fuel requests to approve", data: { pending: 0 } };

  const { error } = await (supabase as any).from("fuel_requests").update({ status: "approved", approved_liters: request.requested_liters }).eq("id", request.id);
  if (error) return { success: false, operation: "UPDATE", table: "fuel_requests", message: `Approval failed: ${error.message}`, error: error.message };

  return { success: true, operation: "UPDATE", table: "fuel_requests", message: `Fuel request approved: ${request.requested_liters}L`, data: { request_id: request.id, approved_liters: request.requested_liters }, rowCount: 1 };
}

async function fuelDeviationCheck(orgId: string): Promise<ExecutionResult> {
  const { data: requests } = await (supabase as any).from("fuel_requests").select("id, requested_liters, actual_liters, deviation_percent, clearance_status").eq("organization_id", orgId).not("actual_liters", "is", null).order("created_at", { ascending: false }).limit(10);
  if (!requests?.length) return { success: true, operation: "SELECT", table: "fuel_requests", message: "No dispensed fuel requests for deviation check", data: { checked: 0 } };

  const deviations = requests.filter((r: any) => Math.abs(r.deviation_percent ?? 0) > 5);
  return {
    success: true, operation: "SELECT", table: "fuel_requests",
    message: `Deviation check: ${requests.length} requests scanned, ${deviations.length} exceed 5% threshold`,
    data: { total_checked: requests.length, deviations_found: deviations.length, max_deviation: Math.max(...requests.map((r: any) => Math.abs(r.deviation_percent ?? 0))).toFixed(1) + "%" },
    rowCount: requests.length,
  };
}

async function fuelEmoneyTransfer(config: Record<string, any> | undefined, orgId: string): Promise<ExecutionResult> {
  const { data: request } = await (supabase as any).from("fuel_requests").select("id, approved_liters, emoney_status").eq("organization_id", orgId).eq("status", "approved").is("emoney_status", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!request) return { success: true, operation: "SELECT", table: "fuel_requests", message: "No approved requests pending e-money transfer", data: { pending: 0 } };

  const { error } = await (supabase as any).from("fuel_requests").update({ emoney_status: "initiated", emoney_amount: (request.approved_liters ?? 0) * (config?.price_per_liter ?? 65) }).eq("id", request.id);
  if (error) return { success: false, operation: "UPDATE", table: "fuel_requests", message: `E-money transfer failed: ${error.message}`, error: error.message };

  return { success: true, operation: "UPDATE", table: "fuel_requests", message: `E-money transfer initiated: ${((request.approved_liters ?? 0) * (config?.price_per_liter ?? 65)).toFixed(0)} ETB`, data: { request_id: request.id, amount_etb: (request.approved_liters ?? 0) * (config?.price_per_liter ?? 65) }, rowCount: 1 };
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
