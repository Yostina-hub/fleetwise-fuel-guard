import { useState, useMemo } from "react";
import { FileText, Plus, Search, MoreHorizontal, Star, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Truck, Users, MapPin, Fuel, Route, Wrench, ClipboardList, DollarSign, Bell, FileCheck, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReportConfigDialog, ReportConfig } from "./ReportConfigDialog";

interface ReportDefinition {
  id: string;
  category: string;
  subId: string;
  name: string;
  description: string;
  isFavorite?: boolean;
}

interface ReportCatalogProps {
  reports: ReportDefinition[];
  favoriteReports: string[];
  onSelectReport: (category: string, subId: string) => void;
  onToggleFavorite: (reportId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Category configuration with icons and labels
const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Truck; color: string }> = {
  vehicle: { label: "Vehicle Reports", icon: Truck, color: "text-blue-500" },
  driver: { label: "Driver Reports", icon: Users, color: "text-green-500" },
  location: { label: "Location Reports", icon: MapPin, color: "text-purple-500" },
  fuel: { label: "Fuel Reports", icon: Fuel, color: "text-orange-500" },
  trips: { label: "Trip Reports", icon: Route, color: "text-cyan-500" },
  device: { label: "Device Reports", icon: Laptop, color: "text-slate-500" },
  maintenance: { label: "Maintenance Reports", icon: Wrench, color: "text-yellow-600" },
  dispatch: { label: "Dispatch Reports", icon: ClipboardList, color: "text-indigo-500" },
  costs: { label: "Cost Reports", icon: DollarSign, color: "text-emerald-500" },
  alerts: { label: "Alert Reports", icon: Bell, color: "text-red-500" },
  compliance: { label: "Compliance Reports", icon: FileCheck, color: "text-teal-500" },
};

// All available report types with descriptions
export const REPORT_DEFINITIONS: ReportDefinition[] = [
  // Vehicle Reports
  { id: "vehicle-summary", category: "vehicle", subId: "summary", name: "Vehicle Summary", description: "Overview of all fleet vehicles with status and specifications" },
  { id: "vehicle-utilization", category: "vehicle", subId: "utilization", name: "Vehicle Utilization", description: "Detailed usage analysis showing trips, distance, and operational time" },
  { id: "vehicle-geofence", category: "vehicle", subId: "geofence", name: "Zone Visitation Report", description: "Shows asset visitation in and out of zones and their total duration" },
  { id: "vehicle-odometer-hours", category: "vehicle", subId: "odometer_hours", name: "Odometer & Working Hours Report", description: "Report shows assets working hours & odometer readings" },
  { id: "vehicle-asset-activation", category: "vehicle", subId: "asset_activation", name: "Asset Activation Report", description: "Asset activation report with detailed status tracking" },
  { id: "vehicle-asset-deactivation", category: "vehicle", subId: "asset_deactivation", name: "Asset Deactivation Report", description: "A report showing when an asset will expire or be deactivated" },
  { id: "vehicle-attached-asset", category: "vehicle", subId: "attached_asset", name: "Attached Asset Report", description: "Shows telemetry for beacons, driver ids, and attached accessories" },
  
  // Driver Reports
  { id: "driver-summary", category: "driver", subId: "summary", name: "Driver Summary", description: "Complete driver roster with license and safety information" },
  { id: "driver-scores", category: "driver", subId: "scores", name: "Driver Behavior Scores", description: "Eco-driving report listing drivers and assets with driving scores" },
  { id: "driver-compliance", category: "driver", subId: "compliance", name: "Driver Compliance", description: "License expiry and medical certificate compliance status" },
  { id: "driver-speeding", category: "driver", subId: "speeding", name: "Driver Speeding Events", description: "Lists all speeding violations by driver with severity levels" },
  { id: "driver-harsh", category: "driver", subId: "harsh_events", name: "Harsh Events Report", description: "Lists violations including harsh braking, cornering, acceleration and keep-in/no-go alerts" },
  { id: "driver-incidents", category: "driver", subId: "incidents", name: "Driver Incidents", description: "Incident reports and accidents involving drivers" },
  { id: "driver-fatigue", category: "driver", subId: "fatigue", name: "Driver Fatigue Report", description: "A report with driver fatigue telemetry and detection data" },
  { id: "driver-continuous-driving", category: "driver", subId: "continuous_driving", name: "Continuous Driving Violation Report", description: "Shows drivers trip listing report filtered by continuous driving violations" },
  { id: "driver-daily-violations", category: "driver", subId: "daily_violations", name: "Daily Violations Count Report", description: "Summarizes the number of violations that occurred daily" },
  
  // Location Reports
  { id: "location-geofence", category: "location", subId: "geofence", name: "Geofence Events", description: "Entry and exit events for all defined geofences" },
  { id: "location-speeding", category: "location", subId: "speeding", name: "Speeding by Location", description: "Speed violations mapped to specific locations" },
  { id: "location-zone-traversal", category: "location", subId: "zone_traversal", name: "Zone Traversal Summary", description: "Analysis of the time an asset (vehicle, equipment) spent in zones" },
  { id: "location-zone-traversal-custom", category: "location", subId: "zone_traversal_custom", name: "Zone Traversal Report", description: "Heavily customized zone traversal report with detailed metrics" },
  { id: "location-retroactive-zone", category: "location", subId: "retroactive_zone", name: "Retroactive Asset-In-Zone Activity", description: "Draw a temporary zone, select an asset, and query historical zone activity" },
  { id: "location-ignition-zone", category: "location", subId: "ignition_zone", name: "Ignition Status Zone Report", description: "Ignition status zone report showing engine state by location" },
  
  // Fuel Reports
  { id: "fuel-summary", category: "fuel", subId: "summary", name: "Fuel Summary Report", description: "Summarized fuel report with consumption analysis" },
  { id: "fuel-transactions", category: "fuel", subId: "transactions", name: "Fuel Transactions", description: "All fuel purchase transactions with cost analysis" },
  { id: "fuel-events", category: "fuel", subId: "events", name: "Fuel Fill/Drain Events", description: "Detected refueling and drain events from sensors" },
  { id: "fuel-theft", category: "fuel", subId: "theft", name: "Fuel Theft Cases", description: "Suspected fuel theft incidents with evidence" },
  { id: "fuel-mileage", category: "fuel", subId: "mileage_fuel", name: "Daily Mileage & Fuel", description: "Daily breakdown of distance traveled and fuel consumed" },
  { id: "fuel-speedometer", category: "fuel", subId: "fuel_speedometer", name: "Fuel Mileage Speedometer", description: "Fuel efficiency metrics with speedometer data" },
  { id: "fuel-refueling", category: "fuel", subId: "refueling", name: "Refueling Report", description: "Detailed refueling events with location and volume" },
  { id: "fuel-drain", category: "fuel", subId: "fuel_drain", name: "Fuel Drain Report", description: "Fuel level drops with analysis and alerts" },
  
  // Trip Reports
  { id: "trips-all", category: "trips", subId: "all_trips", name: "Trip Listing Report", description: "Lists the trips for selected assets and date range" },
  { id: "trips-zones", category: "trips", subId: "zones_traversal", name: "Trips & Zones Traversal Report", description: "Trips & zones traversal report with combined analysis" },
  { id: "trips-idle", category: "trips", subId: "idle_time", name: "Excessive Idle Report", description: "Lists any excessive idle events with duration" },
  { id: "trips-idle-duration", category: "trips", subId: "idle_duration", name: "Idle Duration Summary Report", description: "This report provides a summary of vehicle idling activity" },
  { id: "trips-stop", category: "trips", subId: "stop_statistics", name: "Stoppage Report", description: "Lists the stoppages for selected assets within date range" },
  { id: "trips-ignition", category: "trips", subId: "ignition", name: "Ignition Statistics", description: "Engine on/off events with timing analysis" },
  { id: "trips-mileage", category: "trips", subId: "mileage", name: "Mileage Statistics", description: "Distance covered analysis by vehicle and period" },
  { id: "trips-total-mileage", category: "trips", subId: "total_mileage", name: "Total Mileage Report", description: "Aggregated mileage totals for fleet analysis" },
  { id: "trips-daily-mileage", category: "trips", subId: "daily_mileage", name: "Daily Odometer Report", description: "Records the odometer reading of a vehicle at the end of each day" },
  { id: "trips-daily-working-hours", category: "trips", subId: "daily_working_hours", name: "Daily Working Hours Report", description: "Daily working hours report with operational time tracking" },
  { id: "trips-daily-top-speed", category: "trips", subId: "daily_top_speed", name: "Daily Top Speed Report", description: "Records the fastest speed achieved during a certain period" },
  { id: "trips-speed", category: "trips", subId: "speed_report", name: "Speed Report Graph", description: "A graph that displays general speed patterns" },
  { id: "trips-speed-episodes", category: "trips", subId: "speed_episodes", name: "Speed Episodes Report", description: "Derives speed episodes from provided threshold values" },
  { id: "trips-restricted", category: "trips", subId: "restricted_hours", name: "Restricted Hours Trip Report", description: "Report displaying trip records that fall outside a specified date range" },
  { id: "trips-work-mode", category: "trips", subId: "work_mode", name: "Work Mode Report", description: "A summarized work mode details report" },
  
  // Device Reports
  { id: "device-summary", category: "device", subId: "summary", name: "Device Summary Report", description: "Compares the initial readings of odometer and time spent by devices" },
  { id: "device-obd-telemetry", category: "device", subId: "obd_telemetry", name: "OBD Telemetry Report", description: "A telemetry report for CANBUS only devices" },
  { id: "device-active", category: "device", subId: "active_devices", name: "Active Devices Report", description: "A report showing devices that were reporting during selected period" },
  { id: "device-offline", category: "device", subId: "offline", name: "Devices Offline - Power Disconnects", description: "Devices offline with power disconnect flags" },
  { id: "device-gprs-commands", category: "device", subId: "gprs_commands", name: "GPRS Commands Report", description: "Shows sent commands history to devices" },
  { id: "device-canbus", category: "device", subId: "canbus", name: "Latest CANbus Data Report", description: "A summary report displaying the most recent CANbus data readings" },
  { id: "device-specific-event", category: "device", subId: "specific_event", name: "Specific Event Report", description: "A report showing details about specific events" },
  
  // Maintenance Reports
  { id: "maint-schedules", category: "maintenance", subId: "schedules", name: "Maintenance Due Report", description: "Upcoming maintenance reminder report" },
  { id: "maint-work-orders", category: "maintenance", subId: "work_orders", name: "Work Orders Report", description: "All work orders with status and cost breakdown" },
  { id: "maint-inspections", category: "maintenance", subId: "inspections", name: "Inspections Report", description: "Vehicle inspection records and findings" },
  { id: "maint-history", category: "maintenance", subId: "history", name: "Maintenance History Report", description: "Shows maintenance items and details history" },
  
  // Dispatch Reports
  { id: "dispatch-jobs", category: "dispatch", subId: "jobs", name: "Dispatch Jobs Report", description: "All dispatch jobs with SLA performance metrics" },
  
  // Cost Reports
  { id: "costs-all", category: "costs", subId: "all_costs", name: "Vehicle Costs Report", description: "Comprehensive cost analysis by vehicle and category" },
  
  // Alert Reports
  { id: "alerts-all", category: "alerts", subId: "all_alerts", name: "All Alarms Report", description: "Generate historical reports of all or specific alerts" },
  { id: "alerts-sos", category: "alerts", subId: "sos", name: "SOS Alarm Report", description: "Emergency SOS alert records and responses" },
  { id: "alerts-overspeed", category: "alerts", subId: "overspeed", name: "Overspeed Alarm Report", description: "Lists any device and road-speed overspeed events" },
  { id: "alerts-fatigue", category: "alerts", subId: "fatigue", name: "Fatigue Alarm Report", description: "Driver fatigue detection alerts" },
  { id: "alerts-battery", category: "alerts", subId: "low_battery", name: "Battery Low Status", description: "A report showing battery charge status below threshold" },
  { id: "alerts-power", category: "alerts", subId: "power_outage", name: "Power Outage Report", description: "Device power disconnection alerts" },
  { id: "alerts-vibration", category: "alerts", subId: "vibration", name: "Vibration/Impact Report", description: "Lists any impact events if supported by hardware" },
  { id: "alerts-door", category: "alerts", subId: "door", name: "Door Open Alarm Report", description: "Unauthorized door access alerts" },
  { id: "alerts-ignition", category: "alerts", subId: "ignition_alarm", name: "Ignition Alarm Report", description: "Unauthorized ignition events" },
  { id: "alerts-movement", category: "alerts", subId: "movement", name: "Movement Alarm Report", description: "Unauthorized vehicle movement alerts" },
  
  // Compliance Reports
  { id: "compliance-driver", category: "compliance", subId: "driver_compliance", name: "Driver Compliance Report", description: "Driver license and certification status" },
  { id: "compliance-docs", category: "compliance", subId: "document_expiry", name: "Document Expiry Report", description: "Expiring documents requiring attention" },
  { id: "compliance-ntsa", category: "compliance", subId: "ntsa_technicians", name: "NTSA Technicians Report", description: "Shows fitting history of NTSA technicians" },
];

export const ReportCatalog = ({
  reports,
  favoriteReports,
  onSelectReport,
  onToggleFavorite,
  searchQuery,
  onSearchChange,
}: ReportCatalogProps) => {
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [carouselPage, setCarouselPage] = useState(0);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(CATEGORY_CONFIG));
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  
  const filteredReports = useMemo(() => {
    return reports.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reports, searchQuery]);
  
  // Group reports by category
  const groupedReports = useMemo(() => {
    const groups: Record<string, ReportDefinition[]> = {};
    filteredReports.forEach(report => {
      if (!groups[report.category]) {
        groups[report.category] = [];
      }
      groups[report.category].push(report);
    });
    return groups;
  }, [filteredReports]);
  
  const favoriteReportsList = useMemo(() => 
    filteredReports.filter(r => favoriteReports.includes(r.id)),
    [filteredReports, favoriteReports]
  );

  const carouselReports = reports.slice(
    carouselPage * itemsPerPage,
    (carouselPage + 1) * itemsPerPage
  );

  const handleReportClick = (report: ReportDefinition) => {
    setSelectedReport(report);
    setConfigDialogOpen(true);
  };

  const handleGenerateReport = (config: ReportConfig) => {
    if (selectedReport) {
      onSelectReport(selectedReport.category, selectedReport.subId);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const expandAll = () => setExpandedCategories(Object.keys(CATEGORY_CONFIG));
  const collapseAll = () => setExpandedCategories([]);

  return (
    <div className="space-y-4">
      {/* Header with Search and Add Report */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
              Collapse All
            </Button>
          </div>
        </div>
        
        <Dialog open={addReportOpen} onOpenChange={setAddReportOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" />
              Add Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 bg-primary text-primary-foreground">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Star className="w-5 h-5" />
                ADD TO FAVORITES
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative px-6 py-8">
              {/* Carousel Navigation */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg"
                onClick={() => setCarouselPage(p => Math.max(0, p - 1))}
                disabled={carouselPage === 0}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg"
                onClick={() => setCarouselPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={carouselPage >= totalPages - 1}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              
              {/* Report Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-8">
                {carouselReports.map((report) => (
                  <Card 
                    key={report.id}
                    className={cn(
                      "group hover:shadow-lg transition-all duration-200 cursor-pointer border-2",
                      favoriteReports.includes(report.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border/50 hover:border-primary/50"
                    )}
                  >
                    <CardContent className="p-4 text-center space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                          {report.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
                          {report.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={favoriteReports.includes(report.id) ? "secondary" : "default"}
                        className="w-full text-xs"
                        onClick={() => onToggleFavorite(report.id)}
                      >
                        {favoriteReports.includes(report.id) ? "Remove" : "Add to favorites"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pagination Dots */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselPage(i)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      carouselPage === i 
                        ? "bg-primary w-6" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Favorites Section */}
      {favoriteReportsList.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Star className="w-4 h-4 fill-current" />
              Favorite Reports ({favoriteReportsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {favoriteReportsList.map((report) => {
                const config = CATEGORY_CONFIG[report.category];
                const Icon = config?.icon || FileText;
                return (
                  <div
                    key={report.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-pointer group border border-border/50"
                    onClick={() => handleReportClick(report)}
                  >
                    <div className={cn("p-2 rounded-lg bg-primary/10", config?.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{report.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{report.category}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(report.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Categorized Report List */}
      <div className="space-y-3">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const categoryReports = groupedReports[category] || [];
          if (categoryReports.length === 0) return null;
          
          const Icon = config.icon;
          const isExpanded = expandedCategories.includes(category);
          
          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <Card className="border-border/50 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-muted/50", config.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-base">{config.label}</span>
                        <Badge variant="secondary" className="ml-2">
                          {categoryReports.length}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="p-0 border-t border-border/50">
                    <div className="divide-y divide-border/30">
                      {categoryReports.map((report) => (
                        <div
                          key={report.id}
                          className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => handleReportClick(report)}
                        >
                          <div className={cn("p-2 rounded-lg bg-muted/50 shrink-0", config.color)}>
                            <FileText className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">
                                {report.name}
                              </h4>
                              {favoriteReports.includes(report.id) && (
                                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {report.description}
                            </p>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleReportClick(report);
                              }}>
                                Configure & Generate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(report.id);
                              }}>
                                {favoriteReports.includes(report.id) ? "Remove from Favorites" : "Add to Favorites"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
        
        {Object.keys(groupedReports).length === 0 && (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No Reports Found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Configuration Dialog */}
      <ReportConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        reportName={selectedReport?.name || "Report"}
        onGenerate={handleGenerateReport}
      />
    </div>
  );
};
