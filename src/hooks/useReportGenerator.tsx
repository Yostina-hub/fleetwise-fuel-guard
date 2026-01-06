import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format } from "date-fns";

export interface ReportColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "currency" | "percentage" | "badge" | "duration";
  format?: (value: any, row?: any) => string;
}

export interface ReportGeneratorConfig {
  reportId: string;
  category: string;
  subId: string;
  organizationId: string;
  dateRange: { from: Date; to: Date };
  selectedAssets: string[];
  violationTypes?: string[];
}

export interface ReportGeneratorResult {
  data: Record<string, any>[];
  columns: ReportColumn[];
  summary: Record<string, { label: string; value: string | number; trend?: number; icon?: string }>;
  chartData?: any[];
}

// Define columns for each report type
const REPORT_COLUMNS: Record<string, ReportColumn[]> = {
  // Vehicle Reports
  "vehicle-summary": [
    { key: "plate_number", label: "Plate Number" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "year", label: "Year", type: "number" },
    { key: "vehicle_type", label: "Type", type: "badge" },
    { key: "status", label: "Status", type: "badge" },
    { key: "fuel_type", label: "Fuel Type" },
    { key: "current_mileage", label: "Mileage (km)", type: "number" },
  ],
  "vehicle-utilization": [
    { key: "plate_number", label: "Vehicle" },
    { key: "total_trips", label: "Total Trips", type: "number" },
    { key: "total_distance", label: "Distance (km)", type: "number" },
    { key: "total_duration", label: "Duration", type: "duration" },
    { key: "utilization_rate", label: "Utilization %", type: "percentage" },
    { key: "avg_speed", label: "Avg Speed (km/h)", type: "number" },
  ],
  
  // Driver Reports
  "driver-summary": [
    { key: "full_name", label: "Driver Name" },
    { key: "employee_id", label: "Employee ID" },
    { key: "license_number", label: "License Number" },
    { key: "license_class", label: "Class" },
    { key: "license_expiry", label: "License Expiry", type: "date" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status", type: "badge" },
    { key: "safety_score", label: "Safety Score", type: "number" },
  ],
  "driver-scores": [
    { key: "driver_name", label: "Driver" },
    { key: "overall_score", label: "Overall Score", type: "number" },
    { key: "speeding_score", label: "Speeding", type: "number" },
    { key: "braking_score", label: "Braking", type: "number" },
    { key: "acceleration_score", label: "Acceleration", type: "number" },
    { key: "idle_score", label: "Idle", type: "number" },
    { key: "safety_rating", label: "Rating", type: "badge" },
    { key: "trend", label: "Trend", type: "badge" },
  ],
  "driver-speeding": [
    { key: "driver_name", label: "Driver" },
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "event_time", label: "Time", type: "date" },
    { key: "speed_kmh", label: "Speed (km/h)", type: "number" },
    { key: "speed_limit_kmh", label: "Limit (km/h)", type: "number" },
    { key: "over_limit", label: "Over Limit", type: "number" },
    { key: "severity", label: "Severity", type: "badge" },
    { key: "address", label: "Location" },
  ],
  
  // Fuel Reports
  "fuel-summary": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "total_fuel", label: "Total Fuel (L)", type: "number" },
    { key: "total_cost", label: "Total Cost", type: "currency" },
    { key: "avg_efficiency", label: "Efficiency (km/L)", type: "number" },
    { key: "fill_count", label: "Fill Events", type: "number" },
    { key: "distance_covered", label: "Distance (km)", type: "number" },
  ],
  "fuel-transactions": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "transaction_date", label: "Date", type: "date" },
    { key: "liters", label: "Liters", type: "number" },
    { key: "price_per_liter", label: "Price/L", type: "currency" },
    { key: "total_amount", label: "Total", type: "currency" },
    { key: "odometer_km", label: "Odometer", type: "number" },
    { key: "fuel_type", label: "Fuel Type" },
    { key: "station_name", label: "Station" },
  ],
  "fuel-theft": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "detected_at", label: "Detected At", type: "date" },
    { key: "fuel_lost_liters", label: "Fuel Lost (L)", type: "number" },
    { key: "estimated_value", label: "Est. Value", type: "currency" },
    { key: "location_name", label: "Location" },
    { key: "status", label: "Status", type: "badge" },
    { key: "confidence_score", label: "Confidence %", type: "percentage" },
  ],
  
  // Trip Reports
  "trips-all": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "driver_name", label: "Driver" },
    { key: "start_time", label: "Start Time", type: "date" },
    { key: "end_time", label: "End Time", type: "date" },
    { key: "duration", label: "Duration", type: "duration" },
    { key: "distance_km", label: "Distance (km)", type: "number" },
    { key: "start_location", label: "Start Location" },
    { key: "end_location", label: "End Location" },
    { key: "max_speed", label: "Max Speed (km/h)", type: "number" },
  ],
  "trips-idle": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "driver_name", label: "Driver" },
    { key: "idle_start", label: "Start Time", type: "date" },
    { key: "idle_duration", label: "Duration", type: "duration" },
    { key: "location", label: "Location" },
    { key: "fuel_wasted", label: "Fuel Wasted (L)", type: "number" },
    { key: "cost", label: "Cost", type: "currency" },
  ],
  
  // Alert Reports
  "alerts-all": [
    { key: "title", label: "Alert Title" },
    { key: "alert_type", label: "Type", type: "badge" },
    { key: "severity", label: "Severity", type: "badge" },
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "driver_name", label: "Driver" },
    { key: "alert_time", label: "Time", type: "date" },
    { key: "location_name", label: "Location" },
    { key: "status", label: "Status", type: "badge" },
  ],
  "alerts-overspeed": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "driver_name", label: "Driver" },
    { key: "alert_time", label: "Time", type: "date" },
    { key: "speed_recorded", label: "Speed (km/h)", type: "number" },
    { key: "speed_limit", label: "Limit (km/h)", type: "number" },
    { key: "excess_speed", label: "Excess (km/h)", type: "number" },
    { key: "duration", label: "Duration", type: "duration" },
    { key: "location", label: "Location" },
  ],
  
  // Geofence Reports
  "location-geofence": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "geofence_name", label: "Zone" },
    { key: "event_type", label: "Event", type: "badge" },
    { key: "event_time", label: "Time", type: "date" },
    { key: "dwell_time", label: "Dwell Time", type: "duration" },
    { key: "speed_at_event", label: "Speed (km/h)", type: "number" },
  ],
  
  // Maintenance Reports
  "maint-schedules": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "maintenance_type", label: "Type" },
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "due_mileage", label: "Due Mileage", type: "number" },
    { key: "current_mileage", label: "Current Mileage", type: "number" },
    { key: "days_until_due", label: "Days Until Due", type: "number" },
    { key: "priority", label: "Priority", type: "badge" },
    { key: "status", label: "Status", type: "badge" },
  ],
  "maint-work-orders": [
    { key: "work_order_number", label: "WO #" },
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "work_type", label: "Type" },
    { key: "description", label: "Description" },
    { key: "scheduled_date", label: "Scheduled", type: "date" },
    { key: "completed_date", label: "Completed", type: "date" },
    { key: "total_cost", label: "Cost", type: "currency" },
    { key: "status", label: "Status", type: "badge" },
  ],
  
  // Cost Reports
  "costs-all": [
    { key: "vehicle_plate", label: "Vehicle" },
    { key: "cost_type", label: "Type", type: "badge" },
    { key: "description", label: "Description" },
    { key: "cost_date", label: "Date", type: "date" },
    { key: "amount", label: "Amount", type: "currency" },
    { key: "vendor", label: "Vendor" },
    { key: "odometer_at_cost", label: "Odometer", type: "number" },
  ],
};

// Default columns for unknown report types
const DEFAULT_COLUMNS: ReportColumn[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status", type: "badge" },
  { key: "date", label: "Date", type: "date" },
];

export const fetchReportData = async (config: ReportGeneratorConfig): Promise<ReportGeneratorResult> => {
  const { category, subId, organizationId, dateRange, selectedAssets } = config;
  const reportKey = `${category}-${subId}`;
  
  const startDate = startOfDay(dateRange.from).toISOString();
  const endDate = endOfDay(dateRange.to).toISOString();
  
  let data: any[] = [];
  let summary: Record<string, { label: string; value: string | number; trend?: number; icon?: string }> = {};
  let chartData: any[] = [];
  
  try {
    switch (category) {
      case "vehicle": {
        if (subId === "summary") {
          const { data: vehicles } = await supabase
            .from("vehicles")
            .select("*")
            .eq("organization_id", organizationId)
            .in("id", selectedAssets.length > 0 ? selectedAssets : [""])
            .order("plate_number");
          
          data = vehicles || [];
          summary = {
            totalVehicles: { label: "Total Vehicles", value: data.length, icon: "🚗" },
            activeVehicles: { label: "Active", value: data.filter(v => v.status === "active").length, icon: "✅" },
            inMaintenance: { label: "In Maintenance", value: data.filter(v => v.status === "maintenance").length, icon: "🔧" },
            avgMileage: { label: "Avg Mileage", value: Math.round(data.reduce((s, v) => s + (v.current_mileage || 0), 0) / (data.length || 1)), icon: "📊" },
          };
        } else if (subId === "utilization") {
          const { data: trips } = await supabase
            .from("trips")
            .select(`*, vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .in("vehicle_id", selectedAssets)
            .gte("start_time", startDate)
            .lte("start_time", endDate);
          
          // Group by vehicle
          const vehicleStats = new Map<string, any>();
          (trips || []).forEach(trip => {
            const vid = trip.vehicle_id;
            if (!vehicleStats.has(vid)) {
              vehicleStats.set(vid, {
                plate_number: trip.vehicle?.plate_number,
                total_trips: 0,
                total_distance: 0,
                total_duration: 0,
              });
            }
            const stats = vehicleStats.get(vid);
            stats.total_trips++;
            stats.total_distance += trip.distance_km || 0;
            stats.total_duration += trip.duration_minutes || 0;
          });
          
          data = Array.from(vehicleStats.values()).map(v => ({
            ...v,
            utilization_rate: Math.round((v.total_duration / (24 * 60 * 7)) * 100), // % of week
            avg_speed: v.total_duration > 0 ? Math.round((v.total_distance / (v.total_duration / 60)) * 10) / 10 : 0,
          }));
          
          summary = {
            totalTrips: { label: "Total Trips", value: trips?.length || 0, icon: "🚗" },
            totalDistance: { label: "Total Distance", value: `${Math.round(data.reduce((s, v) => s + v.total_distance, 0))} km`, icon: "📍" },
            avgUtilization: { label: "Avg Utilization", value: `${Math.round(data.reduce((s, v) => s + v.utilization_rate, 0) / (data.length || 1))}%`, icon: "📈" },
          };
        }
        break;
      }
      
      case "driver": {
        if (subId === "summary") {
          const { data: drivers } = await supabase
            .from("drivers")
            .select("*")
            .eq("organization_id", organizationId)
            .order("first_name");
          
          data = (drivers || []).map(d => ({
            ...d,
            full_name: `${d.first_name} ${d.last_name}`,
          }));
          
          summary = {
            totalDrivers: { label: "Total Drivers", value: data.length, icon: "👥" },
            activeDrivers: { label: "Active", value: data.filter(d => d.status === "active").length, icon: "✅" },
            avgScore: { label: "Avg Safety Score", value: Math.round(data.reduce((s, d) => s + (d.safety_score || 0), 0) / (data.length || 1)), icon: "🏆" },
            expiringLicenses: { label: "Expiring Licenses", value: data.filter(d => d.license_expiry && new Date(d.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length, icon: "⚠️" },
          };
        } else if (subId === "scores") {
          const { data: scores } = await supabase
            .from("driver_behavior_scores")
            .select(`*, vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .order("score_period_end", { ascending: false });
          
          const { data: drivers } = await supabase
            .from("drivers")
            .select("id, first_name, last_name")
            .eq("organization_id", organizationId);
          
          const driverMap = new Map((drivers || []).map(d => [d.id, `${d.first_name} ${d.last_name}`]));
          
          data = (scores || []).map(s => ({
            ...s,
            driver_name: driverMap.get(s.driver_id) || "Unknown",
          }));
          
          summary = {
            avgOverall: { label: "Fleet Avg Score", value: Math.round(data.reduce((s, d) => s + d.overall_score, 0) / (data.length || 1)), icon: "📊" },
            highRisk: { label: "High Risk Drivers", value: data.filter(d => d.overall_score < 60).length, icon: "⚠️" },
            excellent: { label: "Excellent Drivers", value: data.filter(d => d.overall_score >= 90).length, icon: "🌟" },
          };
        } else if (subId === "speeding") {
          const { data: events } = await supabase
            .from("driver_events")
            .select(`*, vehicle:vehicle_id (plate_number), driver:driver_id (first_name, last_name)`)
            .eq("organization_id", organizationId)
            .eq("event_type", "speeding")
            .gte("event_time", startDate)
            .lte("event_time", endDate)
            .order("event_time", { ascending: false });
          
          data = (events || []).map(e => ({
            ...e,
            driver_name: e.driver ? `${e.driver.first_name} ${e.driver.last_name}` : "Unknown",
            vehicle_plate: e.vehicle?.plate_number || "Unknown",
            over_limit: (e.speed_kmh || 0) - (e.speed_limit_kmh || 0),
          }));
          
          summary = {
            totalEvents: { label: "Total Events", value: data.length, icon: "⚡" },
            avgOverLimit: { label: "Avg Over Limit", value: `${Math.round(data.reduce((s, d) => s + d.over_limit, 0) / (data.length || 1))} km/h`, icon: "📈" },
            criticalEvents: { label: "Critical (>30 km/h over)", value: data.filter(d => d.over_limit > 30).length, icon: "🚨" },
          };
        }
        break;
      }
      
      case "fuel": {
        if (subId === "transactions") {
          const { data: transactions } = await supabase
            .from("fuel_transactions")
            .select(`*, vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .in("vehicle_id", selectedAssets)
            .gte("transaction_date", startDate)
            .lte("transaction_date", endDate)
            .order("transaction_date", { ascending: false });
          
          data = (transactions || []).map(t => ({
            ...t,
            vehicle_plate: t.vehicle?.plate_number || "Unknown",
          }));
          
          const totalCost = data.reduce((s, t) => s + (t.total_amount || 0), 0);
          const totalLiters = data.reduce((s, t) => s + (t.liters || 0), 0);
          
          summary = {
            totalTransactions: { label: "Transactions", value: data.length, icon: "⛽" },
            totalLiters: { label: "Total Liters", value: Math.round(totalLiters), icon: "🛢️" },
            totalCost: { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: "💰" },
            avgPrice: { label: "Avg Price/L", value: `$${(totalCost / (totalLiters || 1)).toFixed(2)}`, icon: "📊" },
          };
        } else if (subId === "theft") {
          const { data: theftCases } = await supabase
            .from("fuel_theft_cases")
            .select(`*, vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .gte("detected_at", startDate)
            .lte("detected_at", endDate)
            .order("detected_at", { ascending: false });
          
          data = (theftCases || []).map(t => ({
            ...t,
            vehicle_plate: t.vehicle?.plate_number || "Unknown",
          }));
          
          summary = {
            totalCases: { label: "Total Cases", value: data.length, icon: "🚨" },
            totalLost: { label: "Total Fuel Lost", value: `${data.reduce((s, t) => s + (t.fuel_lost_liters || 0), 0).toFixed(1)} L`, icon: "📉" },
            estimatedLoss: { label: "Estimated Loss", value: `$${data.reduce((s, t) => s + (t.estimated_value || 0), 0).toFixed(2)}`, icon: "💸" },
          };
        }
        break;
      }
      
      case "trips": {
        if (subId === "all_trips") {
          const { data: trips } = await supabase
            .from("trips")
            .select(`*, vehicle:vehicle_id (plate_number), driver:driver_id (first_name, last_name)`)
            .eq("organization_id", organizationId)
            .in("vehicle_id", selectedAssets)
            .gte("start_time", startDate)
            .lte("start_time", endDate)
            .order("start_time", { ascending: false });
          
          data = (trips || []).map(t => ({
            ...t,
            vehicle_plate: t.vehicle?.plate_number || "Unknown",
            driver_name: t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : "Unassigned",
            duration: t.duration_minutes,
          }));
          
          const totalDistance = data.reduce((s, t) => s + (t.distance_km || 0), 0);
          const totalDuration = data.reduce((s, t) => s + (t.duration_minutes || 0), 0);
          
          summary = {
            totalTrips: { label: "Total Trips", value: data.length, icon: "🚗" },
            totalDistance: { label: "Total Distance", value: `${Math.round(totalDistance)} km`, icon: "📍" },
            totalDuration: { label: "Total Duration", value: `${Math.round(totalDuration / 60)}h ${totalDuration % 60}m`, icon: "⏱️" },
            avgDistance: { label: "Avg Distance", value: `${Math.round(totalDistance / (data.length || 1))} km`, icon: "📊" },
          };
        }
        break;
      }
      
      case "alerts": {
        const { data: alerts } = await supabase
          .from("alerts")
          .select(`*, vehicle:vehicle_id (plate_number), driver:driver_id (first_name, last_name)`)
          .eq("organization_id", organizationId)
          .gte("alert_time", startDate)
          .lte("alert_time", endDate)
          .order("alert_time", { ascending: false });
        
        data = (alerts || []).map(a => ({
          ...a,
          vehicle_plate: a.vehicle?.plate_number || "Unknown",
          driver_name: a.driver ? `${a.driver.first_name} ${a.driver.last_name}` : "Unknown",
        }));
        
        summary = {
          totalAlerts: { label: "Total Alerts", value: data.length, icon: "🔔" },
          critical: { label: "Critical", value: data.filter(a => a.severity === "critical").length, icon: "🚨" },
          resolved: { label: "Resolved", value: data.filter(a => a.status === "resolved").length, icon: "✅" },
          pending: { label: "Pending", value: data.filter(a => a.status === "pending" || a.status === "active").length, icon: "⏳" },
        };
        break;
      }
      
      case "maintenance": {
        if (subId === "schedules") {
          const { data: schedules } = await supabase
            .from("maintenance_schedules")
            .select(`*, vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .order("next_due_date");
          
          data = (schedules || []).map((s: any) => ({
            ...s,
            vehicle_plate: s.vehicle?.plate_number || "Unknown",
            current_mileage: 0,
            days_until_due: s.next_due_date ? Math.round((new Date(s.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
            due_date: s.next_due_date,
            due_mileage: s.next_due_mileage || 0,
          }));
          
          const overdue = data.filter(s => s.days_until_due !== null && s.days_until_due < 0);
          const upcoming = data.filter(s => s.days_until_due !== null && s.days_until_due >= 0 && s.days_until_due <= 7);
          
          summary = {
            totalSchedules: { label: "Total Schedules", value: data.length, icon: "📅" },
            overdue: { label: "Overdue", value: overdue.length, icon: "🚨" },
            dueThisWeek: { label: "Due This Week", value: upcoming.length, icon: "⏰" },
          };
        } else if (subId === "work_orders") {
          const { data: workOrders } = await supabase
            .from("work_orders")
            .select(`*, vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .order("created_at", { ascending: false });
          
          data = (workOrders || []).map((w: any) => ({
            ...w,
            vehicle_plate: w.vehicle?.plate_number || "Unknown",
            scheduled_date: w.scheduled_date,
            completed_date: w.completed_date,
          }));
          
          const totalCost = data.reduce((s, w) => s + (w.total_cost || 0), 0);
          
          summary = {
            totalOrders: { label: "Total Work Orders", value: data.length, icon: "🔧" },
            completed: { label: "Completed", value: data.filter(w => w.status === "completed").length, icon: "✅" },
            totalCost: { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: "💰" },
          };
        }
        break;
      }
      
      case "location": {
        if (subId === "geofence") {
          const { data: events } = await supabase
            .from("geofence_events")
            .select(`*, geofence:geofence_id (name), vehicle:vehicle_id (plate_number)`)
            .eq("organization_id", organizationId)
            .gte("event_time", startDate)
            .lte("event_time", endDate)
            .order("event_time", { ascending: false });
          
          data = (events || []).map(e => ({
            ...e,
            vehicle_plate: e.vehicle?.plate_number || "Unknown",
            geofence_name: e.geofence?.name || "Unknown Zone",
          }));
          
          summary = {
            totalEvents: { label: "Total Events", value: data.length, icon: "📍" },
            entries: { label: "Zone Entries", value: data.filter(e => e.event_type === "entry").length, icon: "➡️" },
            exits: { label: "Zone Exits", value: data.filter(e => e.event_type === "exit").length, icon: "⬅️" },
          };
        }
        break;
      }
      
      case "costs": {
        const { data: costs } = await supabase
          .from("vehicle_costs")
          .select(`*, vehicle:vehicle_id (plate_number)`)
          .eq("organization_id", organizationId)
          .gte("cost_date", startDate)
          .lte("cost_date", endDate)
          .order("cost_date", { ascending: false });
        
        data = (costs || []).map(c => ({
          ...c,
          vehicle_plate: c.vehicle?.plate_number || "Unknown",
        }));
        
        const totalAmount = data.reduce((s, c) => s + (c.amount || 0), 0);
        const byType = data.reduce((acc, c) => {
          acc[c.cost_type] = (acc[c.cost_type] || 0) + (c.amount || 0);
          return acc;
        }, {} as Record<string, number>);
        
        summary = {
          totalCosts: { label: "Total Entries", value: data.length, icon: "📋" },
          totalAmount: { label: "Total Amount", value: `$${totalAmount.toFixed(2)}`, icon: "💰" },
          avgPerEntry: { label: "Avg per Entry", value: `$${(totalAmount / (data.length || 1)).toFixed(2)}`, icon: "📊" },
        };
        
        chartData = Object.entries(byType).map(([type, amount]) => ({
          name: type,
          value: amount,
        }));
        break;
      }
      
      default: {
        // Generic fallback - try to fetch from most common tables
        console.log(`Unknown report type: ${category}-${subId}`);
      }
    }
  } catch (error) {
    console.error("Error fetching report data:", error);
  }
  
  const columns = REPORT_COLUMNS[reportKey] || DEFAULT_COLUMNS;
  
  return { data, columns, summary, chartData };
};
