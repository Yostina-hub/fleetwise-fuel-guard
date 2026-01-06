import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Download,
  Calendar,
  Search,
  FileSpreadsheet,
  Loader2,
  Truck,
  Users,
  MapPin,
  Route,
  Fuel,
  Wrench,
  DollarSign,
  BarChart3,
  Bell,
  ClipboardList,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useReportData } from "@/hooks/useReportData";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// Report components
import { ReportKPICards } from "@/components/reports/ReportKPICards";
import { ReportsQuickStats } from "@/components/reports/ReportsQuickStats";
import { ReportsQuickActions } from "@/components/reports/ReportsQuickActions";
import { ReportsInsightsCard } from "@/components/reports/ReportsInsightsCard";
import { ReportsTrendChart } from "@/components/reports/ReportsTrendChart";
import { SpeedingEventsTable } from "@/components/reports/SpeedingEventsTable";
import { DriverEventsTable } from "@/components/reports/DriverEventsTable";
import { GeofenceEventsTable } from "@/components/reports/GeofenceEventsTable";
import { IncidentsTable } from "@/components/reports/IncidentsTable";
import { TripsTable } from "@/components/reports/TripsTable";
import { FuelTransactionsTable } from "@/components/reports/FuelTransactionsTable";
import { FuelEventsTable } from "@/components/reports/FuelEventsTable";
import { FuelTheftTable } from "@/components/reports/FuelTheftTable";
import { AlertsTable } from "@/components/reports/AlertsTable";
import { MaintenanceTable } from "@/components/reports/MaintenanceTable";
import { WorkOrdersTable } from "@/components/reports/WorkOrdersTable";
import { CostsTable } from "@/components/reports/CostsTable";
import { DriverScoresTable } from "@/components/reports/DriverScoresTable";
import { DispatchTable } from "@/components/reports/DispatchTable";
import { InspectionsTable } from "@/components/reports/InspectionsTable";
import { VehicleUtilizationTable } from "@/components/reports/VehicleUtilizationTable";
import { IdleTimeTable } from "@/components/reports/IdleTimeTable";
import { DriverComplianceTable } from "@/components/reports/DriverComplianceTable";
import { DocumentExpiryTable } from "@/components/reports/DocumentExpiryTable";
import { StopStatisticsTable } from "@/components/reports/StopStatisticsTable";
import { IgnitionStatisticsTable } from "@/components/reports/IgnitionStatisticsTable";
import { MileageStatisticsTable } from "@/components/reports/MileageStatisticsTable";
import { SpeedReportTable } from "@/components/reports/SpeedReportTable";
import { TotalMileageTable } from "@/components/reports/TotalMileageTable";
import { FuelSpeedometerTable } from "@/components/reports/FuelSpeedometerTable";
import { RefuelingReportTable } from "@/components/reports/RefuelingReportTable";
import { FuelDrainReportTable } from "@/components/reports/FuelDrainReportTable";
import { AlarmStatisticsTable } from "@/components/reports/AlarmStatisticsTable";

const Reports = () => {
  const [activeReportTab, setActiveReportTab] = useState("vehicle");
  const [activeSubTab, setActiveSubTab] = useState("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const queryClient = useQueryClient();
  
  // Convert string dates to Date objects for the hook
  const dateRange = useMemo(() => ({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }), [startDate, endDate]);

  const { 
    metrics, 
    trips, 
    driverEvents, 
    geofenceEvents, 
    incidents, 
    speedViolations,
    fuelTransactions,
    fuelEvents,
    fuelTheftCases,
    alerts,
    maintenanceSchedules,
    workOrders,
    vehicleCosts,
    driverScores,
    dispatchJobs,
    vehicleInspections,
    documents,
    loading 
  } = useReportData(dateRange);

  // Main report tabs with icons
  const mainTabs = [
    { id: "vehicle", label: "Vehicle", icon: Truck },
    { id: "driver", label: "Driver", icon: Users },
    { id: "location", label: "Location", icon: MapPin },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "trips", label: "Trips", icon: Route },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "dispatch", label: "Dispatch", icon: ClipboardList },
    { id: "costs", label: "Costs", icon: DollarSign },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "compliance", label: "Compliance", icon: FileText },
  ];

  // Sub-tabs based on main tab - memoized to prevent hook order issues
  const subTabs = useMemo(() => {
    switch (activeReportTab) {
      case "vehicle":
        return [
          { id: "summary", label: "Summary" },
          { id: "utilization", label: "Utilization" },
          { id: "geofence", label: "Geofence Events" },
        ];
      case "driver":
        return [
          { id: "summary", label: "Summary" },
          { id: "scores", label: "Behavior Scores" },
          { id: "compliance", label: "Compliance" },
          { id: "speeding", label: "Speeding" },
          { id: "harsh_events", label: "Harsh Events" },
          { id: "incidents", label: "Incidents" },
        ];
      case "location":
        return [
          { id: "geofence", label: "Geofence Events" },
          { id: "speeding", label: "Speeding by Location" },
        ];
      case "fuel":
        return [
          { id: "transactions", label: "Transactions" },
          { id: "events", label: "Fill/Drain Events" },
          { id: "theft", label: "Theft Cases" },
          { id: "mileage_fuel", label: "Daily Mileage & Fuel" },
          { id: "fuel_speedometer", label: "Fuel Mileage Speedometer" },
          { id: "refueling", label: "Refueling Report" },
          { id: "fuel_drain", label: "Fuel Drain Report" },
        ];
      case "trips":
        return [
          { id: "all_trips", label: "All Trips" },
          { id: "idle_time", label: "Idle Time Analysis" },
          { id: "stop_statistics", label: "Stop Statistics" },
          { id: "ignition", label: "Ignition Statistics" },
          { id: "mileage", label: "Mileage Statistics" },
          { id: "total_mileage", label: "Total Mileage" },
          { id: "speed_report", label: "Speed Report" },
        ];
      case "maintenance":
        return [
          { id: "schedules", label: "Schedules" },
          { id: "work_orders", label: "Work Orders" },
          { id: "inspections", label: "Inspections" },
        ];
      case "dispatch":
        return [
          { id: "jobs", label: "All Jobs" },
        ];
      case "costs":
        return [
          { id: "all_costs", label: "All Costs" },
        ];
      case "alerts":
        return [
          { id: "all_alerts", label: "All Alarms" },
          { id: "sos", label: "SOS Alarms" },
          { id: "overspeed", label: "Overspeed Alarms" },
          { id: "fatigue", label: "Fatigue Alarms" },
          { id: "low_battery", label: "Low Battery" },
          { id: "power_outage", label: "Power Outage" },
          { id: "vibration", label: "Vibration Alarms" },
          { id: "door", label: "Door Open Alarms" },
          { id: "ignition_alarm", label: "Ignition Alarms" },
          { id: "movement", label: "Movement Alarms" },
        ];
      case "compliance":
        return [
          { id: "driver_compliance", label: "Driver Compliance" },
          { id: "document_expiry", label: "Document Expiry" },
        ];
      default:
        return [];
    }
  }, [activeReportTab]);

  // Get sub-tabs for a specific tab (used in click handler)
  const getSubTabsForTab = (tabId: string) => {
    switch (tabId) {
      case "vehicle":
        return [{ id: "summary", label: "Summary" }, { id: "utilization", label: "Utilization" }, { id: "geofence", label: "Geofence Events" }];
      case "driver":
        return [{ id: "summary", label: "Summary" }, { id: "scores", label: "Behavior Scores" }, { id: "compliance", label: "Compliance" }, { id: "speeding", label: "Speeding" }, { id: "harsh_events", label: "Harsh Events" }, { id: "incidents", label: "Incidents" }];
      case "location":
        return [{ id: "geofence", label: "Geofence Events" }, { id: "speeding", label: "Speeding by Location" }];
      case "fuel":
        return [{ id: "transactions", label: "Transactions" }, { id: "events", label: "Fill/Drain Events" }, { id: "theft", label: "Theft Cases" }, { id: "mileage_fuel", label: "Daily Mileage & Fuel" }, { id: "fuel_speedometer", label: "Fuel Mileage Speedometer" }, { id: "refueling", label: "Refueling Report" }, { id: "fuel_drain", label: "Fuel Drain Report" }];
      case "trips":
        return [{ id: "all_trips", label: "All Trips" }, { id: "idle_time", label: "Idle Time Analysis" }, { id: "stop_statistics", label: "Stop Statistics" }, { id: "ignition", label: "Ignition Statistics" }, { id: "mileage", label: "Mileage Statistics" }, { id: "total_mileage", label: "Total Mileage" }, { id: "speed_report", label: "Speed Report" }];
      case "maintenance":
        return [{ id: "schedules", label: "Schedules" }, { id: "work_orders", label: "Work Orders" }, { id: "inspections", label: "Inspections" }];
      case "dispatch":
        return [{ id: "jobs", label: "All Jobs" }];
      case "costs":
        return [{ id: "all_costs", label: "All Costs" }];
      case "alerts":
        return [{ id: "all_alerts", label: "All Alarms" }, { id: "sos", label: "SOS Alarms" }, { id: "overspeed", label: "Overspeed Alarms" }, { id: "fatigue", label: "Fatigue Alarms" }, { id: "low_battery", label: "Low Battery" }, { id: "power_outage", label: "Power Outage" }, { id: "vibration", label: "Vibration Alarms" }, { id: "door", label: "Door Open Alarms" }, { id: "ignition_alarm", label: "Ignition Alarms" }, { id: "movement", label: "Movement Alarms" }];
      case "compliance":
        return [{ id: "driver_compliance", label: "Driver Compliance" }, { id: "document_expiry", label: "Document Expiry" }];
      default:
        return [];
    }
  };

  // Filter data based on search
  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles;
    return vehicles.filter(v => 
      v.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vehicles, searchQuery]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;
    return drivers.filter(d => 
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [drivers, searchQuery]);

  // Get current export data based on active tab/subtab
  const getExportData = (): { data: Record<string, any>[]; filename: string; columns: { key: string; label: string; width?: number }[]; title: string } => {
    switch (activeReportTab) {
      case "vehicle":
        switch (activeSubTab) {
          case "utilization":
            return {
              data: trips.map(t => ({
                vehicle: t.vehicle?.plate_number || "Unknown",
                date: format(new Date(t.start_time), "yyyy-MM-dd"),
                distance_km: t.distance_km || 0,
                duration_min: t.duration_minutes || 0,
                fuel_consumed_l: t.fuel_consumed_liters || 0,
                idle_time_min: t.idle_time_minutes || 0,
                status: t.status || "-",
              })),
              filename: "vehicle_utilization_report",
              columns: [
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "date", label: "Date", width: 35 },
                { key: "distance_km", label: "Distance (km)", width: 35 },
                { key: "duration_min", label: "Duration (min)", width: 35 },
                { key: "fuel_consumed_l", label: "Fuel (L)", width: 30 },
                { key: "idle_time_min", label: "Idle (min)", width: 30 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Vehicle Utilization Report",
            };
          case "geofence":
            return {
              data: geofenceEvents.map(e => ({
                time: format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
                vehicle: e.vehicle?.plate_number || "Unknown",
                geofence: e.geofence?.name || "Unknown",
                event_type: e.event_type || "-",
                dwell_time_min: e.dwell_time_minutes || "-",
              })),
              filename: "geofence_events_report",
              columns: [
                { key: "time", label: "Time", width: 50 },
                { key: "vehicle", label: "Vehicle", width: 45 },
                { key: "geofence", label: "Geofence", width: 55 },
                { key: "event_type", label: "Event", width: 40 },
                { key: "dwell_time_min", label: "Dwell (min)", width: 35 },
              ],
              title: "Geofence Events Report",
            };
          default:
            return {
              data: filteredVehicles.map(v => ({
                plate_number: v.plate_number || "-",
                make: v.make || "-",
                model: v.model || "-",
                year: v.year || "-",
                status: v.status || "-",
                odometer_km: v.odometer_km || 0,
                fuel_type: v.fuel_type || "-",
              })),
              filename: "vehicle_summary_report",
              columns: [
                { key: "plate_number", label: "Plate", width: 40 },
                { key: "make", label: "Make", width: 35 },
                { key: "model", label: "Model", width: 35 },
                { key: "year", label: "Year", width: 25 },
                { key: "status", label: "Status", width: 30 },
                { key: "odometer_km", label: "Odometer", width: 35 },
                { key: "fuel_type", label: "Fuel", width: 30 },
              ],
              title: "Vehicle Summary Report",
            };
        }

      case "driver":
        switch (activeSubTab) {
          case "scores":
            return {
              data: driverScores.map(s => ({
                driver: s.driver ? `${s.driver.first_name} ${s.driver.last_name}` : "Unknown",
                overall_score: s.overall_score || 0,
                speeding_score: s.speeding_score || 0,
                braking_score: s.braking_score || 0,
                acceleration_score: s.acceleration_score || 0,
                idle_score: s.idle_score || 0,
                safety_rating: s.safety_rating || "-",
                trend: s.trend || "-",
              })),
              filename: "driver_scores_report",
              columns: [
                { key: "driver", label: "Driver", width: 50 },
                { key: "overall_score", label: "Overall", width: 25 },
                { key: "speeding_score", label: "Speed", width: 25 },
                { key: "braking_score", label: "Brake", width: 25 },
                { key: "acceleration_score", label: "Accel", width: 25 },
                { key: "idle_score", label: "Idle", width: 25 },
                { key: "safety_rating", label: "Rating", width: 30 },
                { key: "trend", label: "Trend", width: 25 },
              ],
              title: "Driver Behavior Scores Report",
            };
          case "compliance":
            return {
              data: drivers.map(d => ({
                name: `${d.first_name} ${d.last_name}`,
                employee_id: d.employee_id || "-",
                license_number: d.license_number || "-",
                license_expiry: d.license_expiry ? format(new Date(d.license_expiry), "yyyy-MM-dd") : "-",
                medical_expiry: d.medical_certificate_expiry ? format(new Date(d.medical_certificate_expiry), "yyyy-MM-dd") : "-",
                status: d.status || "-",
              })),
              filename: "driver_compliance_report",
              columns: [
                { key: "name", label: "Name", width: 50 },
                { key: "employee_id", label: "Employee ID", width: 40 },
                { key: "license_number", label: "License", width: 45 },
                { key: "license_expiry", label: "License Exp", width: 35 },
                { key: "medical_expiry", label: "Medical Exp", width: 35 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Driver Compliance Report",
            };
          case "speeding":
            return {
              data: speedViolations.map(v => ({
                time: format(new Date(v.violation_time), "yyyy-MM-dd HH:mm"),
                driver: v.driver ? `${v.driver.first_name} ${v.driver.last_name}` : "Unknown",
                vehicle: v.vehicle?.plate_number || "Unknown",
                speed_kmh: v.speed_kmh || 0,
                limit_kmh: v.speed_limit_kmh || 0,
                over_by: (v.speed_kmh || 0) - (v.speed_limit_kmh || 0),
                severity: v.severity || "-",
                location: v.location_name || "-",
              })),
              filename: "speeding_violations_report",
              columns: [
                { key: "time", label: "Time", width: 40 },
                { key: "driver", label: "Driver", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "speed_kmh", label: "Speed", width: 25 },
                { key: "limit_kmh", label: "Limit", width: 25 },
                { key: "over_by", label: "Over By", width: 25 },
                { key: "severity", label: "Severity", width: 30 },
              ],
              title: "Speeding Violations Report",
            };
          case "harsh_events":
            return {
              data: driverEvents.map(e => ({
                time: format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
                driver: e.driver ? `${e.driver.first_name} ${e.driver.last_name}` : "Unknown",
                vehicle: e.vehicle?.plate_number || "Unknown",
                event_type: e.event_type || "-",
                severity: e.severity || "-",
                speed_kmh: e.speed_kmh || "-",
                address: e.address || "-",
              })),
              filename: "harsh_events_report",
              columns: [
                { key: "time", label: "Time", width: 40 },
                { key: "driver", label: "Driver", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "event_type", label: "Event", width: 35 },
                { key: "severity", label: "Severity", width: 30 },
                { key: "speed_kmh", label: "Speed", width: 25 },
              ],
              title: "Harsh Driving Events Report",
            };
          case "incidents":
            return {
              data: incidents.map(i => ({
                time: format(new Date(i.incident_time), "yyyy-MM-dd HH:mm"),
                incident_number: i.incident_number || "-",
                driver: i.driver ? `${i.driver.first_name} ${i.driver.last_name}` : "Unknown",
                vehicle: i.vehicle?.plate_number || "Unknown",
                severity: i.severity || "-",
                status: i.status || "-",
                location: i.location || "-",
                estimated_cost: i.estimated_cost || 0,
              })),
              filename: "incidents_report",
              columns: [
                { key: "time", label: "Time", width: 35 },
                { key: "incident_number", label: "Incident #", width: 35 },
                { key: "driver", label: "Driver", width: 40 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "severity", label: "Severity", width: 30 },
                { key: "status", label: "Status", width: 30 },
                { key: "estimated_cost", label: "Est. Cost", width: 30 },
              ],
              title: "Incidents Report",
            };
          default:
            return {
              data: filteredDrivers.map(d => ({
                name: `${d.first_name} ${d.last_name}`,
                employee_id: d.employee_id || "-",
                license_number: d.license_number || "-",
                phone: d.phone || "-",
                status: d.status || "-",
                safety_score: d.safety_score || "-",
                total_trips: d.total_trips || 0,
                total_distance_km: d.total_distance_km || 0,
              })),
              filename: "driver_summary_report",
              columns: [
                { key: "name", label: "Name", width: 45 },
                { key: "employee_id", label: "Emp ID", width: 30 },
                { key: "license_number", label: "License", width: 35 },
                { key: "status", label: "Status", width: 30 },
                { key: "safety_score", label: "Safety", width: 25 },
                { key: "total_trips", label: "Trips", width: 25 },
                { key: "total_distance_km", label: "Distance", width: 35 },
              ],
              title: "Driver Summary Report",
            };
        }

      case "location":
        switch (activeSubTab) {
          case "speeding":
            return {
              data: speedViolations.map(v => ({
                time: format(new Date(v.violation_time), "yyyy-MM-dd HH:mm"),
                location: v.location_name || "Unknown",
                vehicle: v.vehicle?.plate_number || "Unknown",
                driver: v.driver ? `${v.driver.first_name} ${v.driver.last_name}` : "Unknown",
                speed_kmh: v.speed_kmh || 0,
                limit_kmh: v.speed_limit_kmh || 0,
                severity: v.severity || "-",
              })),
              filename: "speeding_by_location_report",
              columns: [
                { key: "time", label: "Time", width: 40 },
                { key: "location", label: "Location", width: 60 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "speed_kmh", label: "Speed", width: 25 },
                { key: "limit_kmh", label: "Limit", width: 25 },
                { key: "severity", label: "Severity", width: 30 },
              ],
              title: "Speeding by Location Report",
            };
          default:
            return {
              data: geofenceEvents.map(e => ({
                time: format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
                geofence: e.geofence?.name || "Unknown",
                category: e.geofence?.category || "-",
                vehicle: e.vehicle?.plate_number || "Unknown",
                event_type: e.event_type || "-",
                dwell_time_min: e.dwell_time_minutes || "-",
              })),
              filename: "geofence_events_report",
              columns: [
                { key: "time", label: "Time", width: 45 },
                { key: "geofence", label: "Geofence", width: 50 },
                { key: "category", label: "Category", width: 35 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "event_type", label: "Event", width: 30 },
                { key: "dwell_time_min", label: "Dwell (min)", width: 30 },
              ],
              title: "Geofence Events Report",
            };
        }

      case "fuel":
        switch (activeSubTab) {
          case "events":
            return {
              data: (fuelEvents || []).map(e => ({
                time: format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
                vehicle: e.vehicle?.plate_number || "Unknown",
                event_type: e.event_type || "-",
                fuel_before_l: e.fuel_before_liters?.toFixed(1) || "-",
                fuel_after_l: e.fuel_after_liters?.toFixed(1) || "-",
                change_l: e.fuel_change_liters?.toFixed(1) || "-",
                status: e.status || "-",
              })),
              filename: "fuel_events_report",
              columns: [
                { key: "time", label: "Time", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "event_type", label: "Type", width: 30 },
                { key: "fuel_before_l", label: "Before (L)", width: 30 },
                { key: "fuel_after_l", label: "After (L)", width: 30 },
                { key: "change_l", label: "Change (L)", width: 30 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Fuel Events Report",
            };
          case "theft":
            return {
              data: (fuelTheftCases || []).map(c => ({
                detected_at: format(new Date(c.detected_at), "yyyy-MM-dd HH:mm"),
                vehicle: c.vehicle?.plate_number || "Unknown",
                case_number: c.case_number || "-",
                estimated_value: c.estimated_value || 0,
                status: c.status || "-",
                investigation_notes: c.investigation_notes || "-",
              })),
              filename: "fuel_theft_report",
              columns: [
                { key: "detected_at", label: "Detected", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "case_number", label: "Case #", width: 35 },
                { key: "estimated_value", label: "Value", width: 30 },
                { key: "status", label: "Status", width: 35 },
                { key: "investigation_notes", label: "Notes", width: 50 },
              ],
              title: "Fuel Theft Cases Report",
            };
          case "mileage_fuel":
            return {
              data: trips.map(t => ({
                date: format(new Date(t.start_time), "yyyy-MM-dd"),
                vehicle: t.vehicle?.plate_number || "Unknown",
                distance_km: t.distance_km || 0,
                fuel_l: t.fuel_consumed_liters || 0,
                consumption: t.distance_km && t.fuel_consumed_liters 
                  ? ((t.fuel_consumed_liters / t.distance_km) * 100).toFixed(2) 
                  : "0",
              })),
              filename: "daily_mileage_fuel_report",
              columns: [
                { key: "date", label: "Date", width: 40 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "distance_km", label: "Mileage (km)", width: 35 },
                { key: "fuel_l", label: "Fuel (L)", width: 30 },
                { key: "consumption", label: "L/100km", width: 30 },
              ],
              title: "Daily Mileage & Fuel Report",
            };
          case "fuel_speedometer":
            return {
              data: trips.map(t => ({
                date: format(new Date(t.start_time), "yyyy-MM-dd"),
                vehicle: t.vehicle?.plate_number || "Unknown",
                distance_km: t.distance_km || 0,
                fuel_l: t.fuel_consumed_liters || 0,
                avg_speed: t.distance_km && t.duration_minutes 
                  ? ((t.distance_km / t.duration_minutes) * 60).toFixed(1) 
                  : "0",
                consumption: t.distance_km && t.fuel_consumed_liters 
                  ? ((t.fuel_consumed_liters / t.distance_km) * 100).toFixed(2) 
                  : "0",
              })),
              filename: "fuel_speedometer_report",
              columns: [
                { key: "date", label: "Date", width: 40 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "distance_km", label: "Mileage (km)", width: 35 },
                { key: "fuel_l", label: "Fuel (L)", width: 30 },
                { key: "avg_speed", label: "Avg Speed", width: 30 },
                { key: "consumption", label: "L/100km", width: 30 },
              ],
              title: "Fuel Mileage Speedometer Report",
            };
          case "refueling":
            const refuelEvents = (fuelEvents || []).filter(e => e.event_type === 'refuel');
            return {
              data: refuelEvents.map(e => ({
                time: format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
                vehicle: e.vehicle?.plate_number || "Unknown",
                fuel_before_l: e.fuel_before_liters?.toFixed(1) || "-",
                fuel_after_l: e.fuel_after_liters?.toFixed(1) || "-",
                added_l: e.fuel_change_liters?.toFixed(1) || "-",
                location: e.location_name || "-",
              })),
              filename: "refueling_report",
              columns: [
                { key: "time", label: "Time", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "fuel_before_l", label: "Before (L)", width: 30 },
                { key: "fuel_after_l", label: "After (L)", width: 30 },
                { key: "added_l", label: "Added (L)", width: 30 },
                { key: "location", label: "Location", width: 50 },
              ],
              title: "Refueling Report",
            };
          case "fuel_drain":
            const drainEvents = (fuelEvents || []).filter(e => 
              e.event_type === 'drain' || e.event_type === 'theft' || 
              (e.fuel_change_liters && e.fuel_change_liters < -5)
            );
            return {
              data: drainEvents.map(e => ({
                time: format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
                vehicle: e.vehicle?.plate_number || "Unknown",
                fuel_before_l: e.fuel_before_liters?.toFixed(1) || "-",
                fuel_after_l: e.fuel_after_liters?.toFixed(1) || "-",
                drained_l: Math.abs(e.fuel_change_liters || 0).toFixed(1),
                location: e.location_name || "-",
                status: e.status || "-",
              })),
              filename: "fuel_drain_report",
              columns: [
                { key: "time", label: "Time", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "fuel_before_l", label: "Before (L)", width: 30 },
                { key: "fuel_after_l", label: "After (L)", width: 30 },
                { key: "drained_l", label: "Drained (L)", width: 30 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Fuel Drain Report",
            };
          default:
            return {
              data: fuelTransactions.map(t => ({
                date: format(new Date(t.transaction_date), "yyyy-MM-dd HH:mm"),
                vehicle: t.vehicle?.plate_number || "Unknown",
                liters: t.fuel_amount_liters || 0,
                cost: t.fuel_cost || 0,
                price_per_l: t.fuel_price_per_liter || 0,
                location: t.location_name || "-",
              })),
              filename: "fuel_transactions_report",
              columns: [
                { key: "date", label: "Date", width: 40 },
                { key: "vehicle", label: "Vehicle", width: 40 },
                { key: "liters", label: "Liters", width: 30 },
                { key: "cost", label: "Cost", width: 35 },
                { key: "price_per_l", label: "Price/L", width: 30 },
                { key: "location", label: "Location", width: 55 },
              ],
              title: "Fuel Transactions Report",
            };
        }

      case "trips":
        switch (activeSubTab) {
          case "idle_time":
            const tripsWithIdle = trips.filter(t => (t.idle_time_minutes || 0) > 0);
            return {
              data: tripsWithIdle.map(t => ({
                date: format(new Date(t.start_time), "yyyy-MM-dd"),
                vehicle: t.vehicle?.plate_number || "Unknown",
                driver: t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : "Unknown",
                duration_min: t.duration_minutes || 0,
                idle_time_min: t.idle_time_minutes || 0,
                idle_percent: t.duration_minutes ? ((t.idle_time_minutes || 0) / t.duration_minutes * 100).toFixed(1) : "0",
                distance_km: t.distance_km || 0,
              })),
              filename: "idle_time_report",
              columns: [
                { key: "date", label: "Date", width: 35 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "driver", label: "Driver", width: 45 },
                { key: "duration_min", label: "Trip (min)", width: 30 },
                { key: "idle_time_min", label: "Idle (min)", width: 30 },
                { key: "idle_percent", label: "Idle %", width: 25 },
                { key: "distance_km", label: "Distance", width: 30 },
              ],
              title: "Idle Time Analysis Report",
            };
          case "stop_statistics":
            const stopTrips = trips.filter(t => t.idle_time_minutes && t.idle_time_minutes > 2);
            return {
              data: stopTrips.map(t => ({
                vehicle: t.vehicle?.plate_number || "Unknown",
                start_time: format(new Date(t.start_time), "yyyy-MM-dd HH:mm:ss"),
                end_time: t.end_time ? format(new Date(t.end_time), "yyyy-MM-dd HH:mm:ss") : "-",
                stop_time_min: t.idle_time_minutes || 0,
                location: "-",
              })),
              filename: "stop_statistics_report",
              columns: [
                { key: "vehicle", label: "Device", width: 40 },
                { key: "start_time", label: "Starting Time", width: 45 },
                { key: "end_time", label: "End Time", width: 45 },
                { key: "stop_time_min", label: "Stop Time (min)", width: 35 },
                { key: "location", label: "Location", width: 60 },
              ],
              title: "Stop Statistics Report",
            };
          case "ignition":
            return {
              data: trips.map(t => ({
                vehicle: t.vehicle?.plate_number || "Unknown",
                date: format(new Date(t.start_time), "yyyy-MM-dd HH:mm:ss"),
                ignition_on: format(new Date(t.start_time), "HH:mm:ss"),
                ignition_off: t.end_time ? format(new Date(t.end_time), "HH:mm:ss") : "-",
                duration_min: t.duration_minutes || 0,
                distance_km: t.distance_km || 0,
              })),
              filename: "ignition_statistics_report",
              columns: [
                { key: "vehicle", label: "Device", width: 40 },
                { key: "date", label: "Date", width: 45 },
                { key: "ignition_on", label: "Ignition On", width: 35 },
                { key: "ignition_off", label: "Ignition Off", width: 35 },
                { key: "duration_min", label: "Duration (min)", width: 35 },
                { key: "distance_km", label: "Distance (km)", width: 35 },
              ],
              title: "Ignition Statistics Report",
            };
          case "mileage":
            return {
              data: trips.map(t => ({
                vehicle: t.vehicle?.plate_number || "Unknown",
                date: format(new Date(t.start_time), "yyyy-MM-dd HH:mm:ss"),
                distance_km: t.distance_km || 0,
                fuel_consumption: t.distance_km && t.fuel_consumed_liters 
                  ? ((t.fuel_consumed_liters / t.distance_km) * 100).toFixed(1) 
                  : "0",
                fuel_amount: t.fuel_consumed_liters || 0,
              })),
              filename: "mileage_statistics_report",
              columns: [
                { key: "vehicle", label: "Device", width: 40 },
                { key: "date", label: "Date", width: 45 },
                { key: "distance_km", label: "Distance (km)", width: 35 },
                { key: "fuel_consumption", label: "Consumption (L/100km)", width: 45 },
                { key: "fuel_amount", label: "Fuel (L)", width: 30 },
              ],
              title: "Mileage Statistics Report",
            };
          case "speed_report":
            return {
              data: speedViolations.map(v => ({
                time: format(new Date(v.violation_time), "yyyy-MM-dd HH:mm:ss"),
                vehicle: v.vehicle?.plate_number || "Unknown",
                driver: v.driver ? `${v.driver.first_name} ${v.driver.last_name}` : "Unknown",
                speed_kmh: v.speed_kmh || 0,
                limit_kmh: v.speed_limit_kmh || 0,
                over_by: (v.speed_kmh || 0) - (v.speed_limit_kmh || 0),
                severity: v.severity || "-",
                location: v.location_name || "-",
              })),
              filename: "speed_report",
              columns: [
                { key: "time", label: "Time", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "driver", label: "Driver", width: 40 },
                { key: "speed_kmh", label: "Speed", width: 25 },
                { key: "limit_kmh", label: "Limit", width: 25 },
                { key: "over_by", label: "Over By", width: 25 },
                { key: "severity", label: "Severity", width: 30 },
              ],
              title: "Speed Report",
            };
          case "total_mileage":
            // Aggregate mileage by vehicle
            const vehicleMileage = trips.reduce((acc, t) => {
              const plate = t.vehicle?.plate_number || "Unknown";
              if (!acc[plate]) {
                acc[plate] = { distance: 0, trips: 0, fuel: 0 };
              }
              acc[plate].distance += t.distance_km || 0;
              acc[plate].trips += 1;
              acc[plate].fuel += t.fuel_consumed_liters || 0;
              return acc;
            }, {} as Record<string, { distance: number; trips: number; fuel: number }>);
            return {
              data: Object.entries(vehicleMileage).map(([plate, data]) => ({
                vehicle: plate,
                total_distance_km: data.distance.toFixed(1),
                total_trips: data.trips,
                total_fuel_l: data.fuel.toFixed(1),
                avg_per_trip: data.trips ? (data.distance / data.trips).toFixed(1) : "0",
              })),
              filename: "total_mileage_report",
              columns: [
                { key: "vehicle", label: "Vehicle", width: 45 },
                { key: "total_distance_km", label: "Total Distance (km)", width: 45 },
                { key: "total_trips", label: "Trips", width: 30 },
                { key: "total_fuel_l", label: "Fuel (L)", width: 35 },
                { key: "avg_per_trip", label: "Avg/Trip (km)", width: 40 },
              ],
              title: "Total Mileage Report",
            };
          default:
            return {
              data: trips.map(t => ({
                start_time: format(new Date(t.start_time), "yyyy-MM-dd HH:mm"),
                end_time: t.end_time ? format(new Date(t.end_time), "HH:mm") : "-",
                vehicle: t.vehicle?.plate_number || "Unknown",
                driver: t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : "Unknown",
                distance_km: t.distance_km || 0,
                duration_min: t.duration_minutes || 0,
                fuel_l: t.fuel_consumed_liters || 0,
                status: t.status || "-",
              })),
              filename: "trips_report",
              columns: [
                { key: "start_time", label: "Start", width: 40 },
                { key: "end_time", label: "End", width: 25 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "driver", label: "Driver", width: 40 },
                { key: "distance_km", label: "Distance", width: 30 },
                { key: "duration_min", label: "Duration", width: 30 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Trips Report",
            };
        }

      case "maintenance":
        switch (activeSubTab) {
          case "work_orders":
            return {
              data: workOrders.map(w => ({
                work_order: w.work_order_number || "-",
                vehicle: w.vehicle?.plate_number || "Unknown",
                service: w.service_description || "-",
                status: w.status || "-",
                priority: w.priority || "-",
                parts_cost: w.parts_cost || 0,
                labor_cost: w.labor_cost || 0,
                total_cost: w.total_cost || 0,
              })),
              filename: "work_orders_report",
              columns: [
                { key: "work_order", label: "WO #", width: 35 },
                { key: "vehicle", label: "Vehicle", width: 35 },
                { key: "service", label: "Service", width: 50 },
                { key: "status", label: "Status", width: 30 },
                { key: "priority", label: "Priority", width: 25 },
                { key: "total_cost", label: "Total Cost", width: 30 },
              ],
              title: "Work Orders Report",
            };
          case "inspections":
            return {
              data: vehicleInspections.map(i => ({
                date: format(new Date(i.inspection_date), "yyyy-MM-dd"),
                vehicle: i.vehicle?.plate_number || "Unknown",
                type: i.inspection_type || "-",
                certified_safe: i.certified_safe ? "Yes" : "No",
                odometer: i.odometer_km || "-",
              })),
              filename: "inspections_report",
              columns: [
                { key: "date", label: "Date", width: 45 },
                { key: "vehicle", label: "Vehicle", width: 50 },
                { key: "type", label: "Type", width: 50 },
                { key: "certified_safe", label: "Safe", width: 35 },
                { key: "odometer", label: "Odometer", width: 45 },
              ],
              title: "Vehicle Inspections Report",
            };
          default:
            return {
              data: maintenanceSchedules.map(m => ({
                vehicle: m.vehicle?.plate_number || "Unknown",
                service_type: m.service_type || "-",
                interval: `${m.interval_value || 0} ${m.interval_type || ""}`,
                last_service: m.last_service_date ? format(new Date(m.last_service_date), "yyyy-MM-dd") : "-",
                last_hours: m.last_service_hours || "-",
                status: m.is_active ? "Active" : "Inactive",
              })),
              filename: "maintenance_schedules_report",
              columns: [
                { key: "vehicle", label: "Vehicle", width: 50 },
                { key: "service_type", label: "Service Type", width: 55 },
                { key: "interval", label: "Interval", width: 40 },
                { key: "last_service", label: "Last Service", width: 45 },
                { key: "last_hours", label: "Hours", width: 35 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Maintenance Schedules Report",
            };
        }

      case "dispatch":
        return {
          data: dispatchJobs.map(j => ({
            job_number: j.job_number || "-",
            customer: j.customer_name || "-",
            vehicle: j.vehicle?.plate_number || "Unknown",
            driver: j.driver ? `${j.driver.first_name} ${j.driver.last_name}` : "Unknown",
            pickup: j.pickup_location_name || "-",
            dropoff: j.dropoff_location_name || "-",
            status: j.status || "-",
            sla_met: j.sla_met ? "Yes" : j.sla_met === false ? "No" : "-",
          })),
          filename: "dispatch_jobs_report",
          columns: [
            { key: "job_number", label: "Job #", width: 30 },
            { key: "customer", label: "Customer", width: 40 },
            { key: "vehicle", label: "Vehicle", width: 30 },
            { key: "driver", label: "Driver", width: 40 },
            { key: "pickup", label: "Pickup", width: 40 },
            { key: "status", label: "Status", width: 30 },
            { key: "sla_met", label: "SLA", width: 20 },
          ],
          title: "Dispatch Jobs Report",
        };

      case "costs":
        return {
          data: vehicleCosts.map(c => ({
            date: format(new Date(c.cost_date), "yyyy-MM-dd"),
            vehicle: c.vehicle?.plate_number || "Unknown",
            cost_type: c.cost_type || "-",
            category: c.category || "-",
            description: c.description || "-",
            amount: c.amount || 0,
            odometer: c.odometer_km || "-",
          })),
          filename: "vehicle_costs_report",
          columns: [
            { key: "date", label: "Date", width: 35 },
            { key: "vehicle", label: "Vehicle", width: 35 },
            { key: "cost_type", label: "Type", width: 35 },
            { key: "category", label: "Category", width: 35 },
            { key: "description", label: "Description", width: 50 },
            { key: "amount", label: "Amount", width: 30 },
          ],
          title: "Vehicle Costs Report",
        };

      case "alerts":
        // Filter alerts based on sub-tab
        const getFilteredAlerts = () => {
          const typeMap: Record<string, string[]> = {
            sos: ['sos', 'emergency', 'panic'],
            overspeed: ['overspeed', 'speeding', 'speed_violation'],
            fatigue: ['fatigue', 'drowsy', 'driver_fatigue'],
            low_battery: ['low_battery', 'battery_low'],
            power_outage: ['power_outage', 'power_cut', 'power_off'],
            vibration: ['vibration', 'shock', 'impact'],
            door_open: ['door_open', 'door', 'door_alarm'],
            ignition: ['ignition_on', 'ignition_off', 'ignition'],
            movement: ['movement', 'tow', 'unauthorized_movement'],
          };
          
          if (activeSubTab === 'all_alarms') return alerts;
          const types = typeMap[activeSubTab] || [];
          if (types.length === 0) return alerts;
          return alerts.filter(a => 
            types.some(t => a.alert_type?.toLowerCase().includes(t))
          );
        };
        
        const filteredAlerts = getFilteredAlerts();
        const subTabTitleMap: Record<string, string> = {
          all_alarms: 'All Alarms',
          sos: 'SOS Alarms',
          overspeed: 'Overspeed Alarms',
          fatigue: 'Fatigue Alarms',
          low_battery: 'Low Battery Alarms',
          power_outage: 'Power Outage Alarms',
          vibration: 'Vibration Alarms',
          door_open: 'Door Open Alarms',
          ignition: 'Ignition Alarms',
          movement: 'Movement Alarms',
        };
        
        return {
          data: filteredAlerts.map(a => ({
            time: format(new Date(a.alert_time), "yyyy-MM-dd HH:mm"),
            title: a.title || "-",
            type: a.alert_type || "-",
            severity: a.severity || "-",
            vehicle: a.vehicle?.plate_number || "-",
            driver: a.driver ? `${a.driver.first_name} ${a.driver.last_name}` : "-",
            status: a.status || "-",
            location: a.location_name || "-",
          })),
          filename: `${activeSubTab || 'alerts'}_report`,
          columns: [
            { key: "time", label: "Time", width: 40 },
            { key: "title", label: "Title", width: 50 },
            { key: "type", label: "Type", width: 30 },
            { key: "severity", label: "Severity", width: 25 },
            { key: "vehicle", label: "Vehicle", width: 30 },
            { key: "status", label: "Status", width: 30 },
          ],
          title: subTabTitleMap[activeSubTab] || "Alerts Report",
        };

      case "compliance":
        switch (activeSubTab) {
          case "document_expiry":
            return {
              data: documents.map(d => ({
                document_type: d.document_type || "-",
                file_name: d.file_name || "-",
                entity_type: d.entity_type || "-",
                expiry_date: d.expiry_date ? format(new Date(d.expiry_date), "yyyy-MM-dd") : "-",
                is_verified: d.is_verified ? "Yes" : "No",
              })),
              filename: "document_expiry_report",
              columns: [
                { key: "document_type", label: "Type", width: 45 },
                { key: "file_name", label: "Document", width: 60 },
                { key: "entity_type", label: "Entity", width: 35 },
                { key: "expiry_date", label: "Expiry Date", width: 40 },
                { key: "is_verified", label: "Verified", width: 30 },
              ],
              title: "Document Expiry Report",
            };
          default:
            return {
              data: drivers.map(d => ({
                name: `${d.first_name} ${d.last_name}`,
                employee_id: d.employee_id || "-",
                license_number: d.license_number || "-",
                license_expiry: d.license_expiry ? format(new Date(d.license_expiry), "yyyy-MM-dd") : "-",
                medical_expiry: d.medical_certificate_expiry ? format(new Date(d.medical_certificate_expiry), "yyyy-MM-dd") : "-",
                status: d.status || "-",
              })),
              filename: "driver_compliance_report",
              columns: [
                { key: "name", label: "Name", width: 50 },
                { key: "employee_id", label: "Employee ID", width: 40 },
                { key: "license_number", label: "License", width: 45 },
                { key: "license_expiry", label: "License Exp", width: 35 },
                { key: "medical_expiry", label: "Medical Exp", width: 35 },
                { key: "status", label: "Status", width: 30 },
              ],
              title: "Driver Compliance Report",
            };
        }

      default:
        return {
          data: [],
          filename: "report",
          columns: [],
          title: "Report",
        };
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const { data, filename } = getExportData();
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(data, filename);
    toast.success("Report exported to CSV");
  };

  const handleExportPDF = () => {
    const { data, filename, columns, title } = getExportData();
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToPDF(title, data, columns, filename);
    toast.success("Report exported to PDF");
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['driver-events'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    toast.success("Refreshing report data...");
  };

  // Render content based on active tabs
  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      );
    }

    switch (activeReportTab) {
      case "vehicle":
        switch (activeSubTab) {
          case "utilization":
            return <VehicleUtilizationTable trips={trips} />;
          case "geofence":
            return <GeofenceEventsTable events={geofenceEvents} />;
          default:
            return <VehicleSummaryTable vehicles={filteredVehicles} />;
        }
      case "driver":
        switch (activeSubTab) {
          case "scores":
            return <DriverScoresTable scores={driverScores} />;
          case "compliance":
            return <DriverComplianceTable drivers={drivers} />;
          case "speeding":
            return <SpeedingEventsTable violations={speedViolations} />;
          case "harsh_events":
            return <DriverEventsTable events={driverEvents} eventType="all" title="All Harsh Events" />;
          case "incidents":
            return <IncidentsTable incidents={incidents} />;
          default:
            return <DriverSummaryTable drivers={filteredDrivers} />;
        }
      case "location":
        switch (activeSubTab) {
          case "speeding":
            return <SpeedingEventsTable violations={speedViolations} />;
          default:
            return <GeofenceEventsTable events={geofenceEvents} />;
        }
      case "fuel":
        switch (activeSubTab) {
          case "events":
            return <FuelEventsTable events={fuelEvents} />;
          case "theft":
            return <FuelTheftTable cases={fuelTheftCases} />;
          case "mileage_fuel":
            return <MileageStatisticsTable trips={trips} />;
          case "fuel_speedometer":
            return <FuelSpeedometerTable trips={trips} />;
          case "refueling":
            return <RefuelingReportTable events={fuelEvents} />;
          case "fuel_drain":
            return <FuelDrainReportTable events={fuelEvents} />;
          default:
            return <FuelTransactionsTable transactions={fuelTransactions} />;
        }
      case "trips":
        switch (activeSubTab) {
          case "idle_time":
            return <IdleTimeTable trips={trips} />;
          case "stop_statistics":
            return <StopStatisticsTable trips={trips} />;
          case "ignition":
            return <IgnitionStatisticsTable trips={trips} />;
          case "mileage":
            return <MileageStatisticsTable trips={trips} />;
          case "total_mileage":
            return <TotalMileageTable trips={trips} />;
          case "speed_report":
            return <SpeedReportTable violations={speedViolations} />;
          default:
            return <TripsTable trips={trips} />;
        }
      case "maintenance":
        switch (activeSubTab) {
          case "work_orders":
            return <WorkOrdersTable workOrders={workOrders} />;
          case "inspections":
            return <InspectionsTable inspections={vehicleInspections} />;
          default:
            return <MaintenanceTable schedules={maintenanceSchedules} />;
        }
      case "dispatch":
        return <DispatchTable jobs={dispatchJobs} />;
      case "costs":
        return <CostsTable costs={vehicleCosts} />;
      case "alerts":
        switch (activeSubTab) {
          case "sos":
            return <AlarmStatisticsTable alerts={alerts} filterType="sos" title="SOS Alarm Statistics" />;
          case "overspeed":
            return <AlarmStatisticsTable alerts={alerts} filterType="overspeed" title="Overspeed Alarm Statistics" />;
          case "fatigue":
            return <AlarmStatisticsTable alerts={alerts} filterType="fatigue" title="Fatigue Alarm Statistics" />;
          case "low_battery":
            return <AlarmStatisticsTable alerts={alerts} filterType="low_battery" title="Low Battery Alarm Statistics" />;
          case "power_outage":
            return <AlarmStatisticsTable alerts={alerts} filterType="power_outage" title="Power Outage Alarm Statistics" />;
          case "vibration":
            return <AlarmStatisticsTable alerts={alerts} filterType="vibration" title="Vibration Alarm Statistics" />;
          case "door":
            return <AlarmStatisticsTable alerts={alerts} filterType="door" title="Door Open Alarm Statistics" />;
          case "ignition_alarm":
            return <AlarmStatisticsTable alerts={alerts} filterType="ignition" title="Ignition Alarm Statistics" />;
          case "movement":
            return <AlarmStatisticsTable alerts={alerts} filterType="movement" title="Movement Alarm Statistics" />;
          default:
            return <AlarmStatisticsTable alerts={alerts} title="All Alarm Statistics" />;
        }
      case "compliance":
        switch (activeSubTab) {
          case "document_expiry":
            return <DocumentExpiryTable documents={documents} />;
          default:
            return <DriverComplianceTable drivers={drivers} />;
        }
      default:
        return <VehicleSummaryTable vehicles={filteredVehicles} />;
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive fleet analytics and operational insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-10 h-10 text-primary/20" />
          </div>
        </div>

        {/* Quick Stats */}
        <ReportsQuickStats 
          metrics={metrics} 
          vehicleCount={vehicles.length} 
          driverCount={drivers.length} 
        />

        {/* Main Report Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveReportTab(tab.id);
                  const newSubTabs = getSubTabsForTab(tab.id);
                  setActiveSubTab(newSubTabs[0]?.id || "summary");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                  activeReportTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Sub Tabs */}
        {subTabs.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full transition-all",
                  activeSubTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Date Range & Export */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background">
                <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">End Date</label>
              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background">
                <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="w-4 h-4" aria-hidden="true" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* KPI Cards */}
        <ReportKPICards metrics={metrics} activeTab={activeReportTab} />

        {/* Quick Actions, Insights & Trend Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ReportsQuickActions
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onRefresh={handleRefresh}
            isLoading={loading}
          />
          <ReportsInsightsCard metrics={metrics} />
          <ReportsTrendChart 
            trips={trips} 
            driverEvents={driverEvents} 
            activeTab={activeReportTab} 
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Data Table */}
        {renderContent()}
      </div>
    </Layout>
  );
};

// Vehicle Summary Table Component
const VehicleSummaryTable = ({ vehicles }: { vehicles: any[] }) => {
  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Vehicles Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No vehicles match your search criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="w-5 h-5 text-primary" />
          Vehicle Summary ({vehicles.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Make/Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Odometer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fuel Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.plate_number || "Unknown"}</td>
                  <td className="px-4 py-3">{v.make} {v.model}</td>
                  <td className="px-4 py-3">{v.year || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      v.status === "active" ? "bg-green-500/20 text-green-500" :
                      v.status === "maintenance" ? "bg-yellow-500/20 text-yellow-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{v.odometer_km ? `${v.odometer_km.toLocaleString()} km` : "-"}</td>
                  <td className="px-4 py-3 capitalize">{v.fuel_type || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Driver Summary Table Component
const DriverSummaryTable = ({ drivers }: { drivers: any[] }) => {
  if (drivers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Drivers Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No drivers match your search criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Driver Summary ({drivers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Safety Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Trips</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.first_name} {d.last_name}</td>
                  <td className="px-4 py-3">{d.employee_id || "-"}</td>
                  <td className="px-4 py-3">{d.license_number || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      d.status === "active" ? "bg-green-500/20 text-green-500" :
                      d.status === "on_leave" ? "bg-amber-500/20 text-amber-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "font-medium",
                      (d.safety_score || 0) >= 90 ? "text-green-500" :
                      (d.safety_score || 0) >= 70 ? "text-amber-500" :
                      "text-red-500"
                    )}>
                      {d.safety_score || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.total_trips || 0}</td>
                  <td className="px-4 py-3">{d.total_distance_km ? `${d.total_distance_km.toLocaleString()} km` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Reports;
