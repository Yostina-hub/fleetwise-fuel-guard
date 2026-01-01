import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Download,
  Calendar,
  Search,
  TrendingUp,
  TrendingDown,
  Settings2,
  ChevronRight,
  Info,
  FileSpreadsheet,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import {
  exportToCSV,
  exportToPDF,
  formatFleetReportData,
  formatFuelReportData,
} from "@/lib/exportUtils";

const Reports = () => {
  const [activeReportTab, setActiveReportTab] = useState("vehicle");
  const [activeSubTab, setActiveSubTab] = useState("fuel");
  const [searchQuery, setSearchQuery] = useState("");
  const [makeFilter, setMakeFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { vehicles } = useVehicles();
  const { fuelEvents } = useFuelEvents();

  // Get unique makes and models
  const makes = useMemo(() => {
    const uniqueMakes = [...new Set(vehicles.map(v => v.make).filter(Boolean))];
    return uniqueMakes;
  }, [vehicles]);

  const models = useMemo(() => {
    const uniqueModels = [...new Set(vehicles.map(v => v.model).filter(Boolean))];
    return uniqueModels;
  }, [vehicles]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const filteredVehicles = vehicles.filter(v => {
      if (makeFilter !== "all" && v.make !== makeFilter) return false;
      if (modelFilter !== "all" && v.model !== modelFilter) return false;
      if (searchQuery && !v.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    const totalDistance = filteredVehicles.reduce((sum, v) => sum + (v.odometer_km || 0), 0);
    const totalFuelConsumed = fuelEvents
      .filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters || 0), 0);
    
    const efficiency = totalDistance > 0 && totalFuelConsumed > 0 
      ? (totalDistance / totalFuelConsumed).toFixed(1) 
      : "0";

    // Estimate idle fuel cost (demo calculation)
    const idleFuelCost = Math.round(filteredVehicles.length * 2.5);

    return {
      distanceKm: Math.round(totalDistance),
      distanceMiles: Math.round(totalDistance * 0.621371),
      fuelLiters: Math.round(totalFuelConsumed),
      fuelGallons: Math.round(totalFuelConsumed * 0.264172),
      efficiencyKmpl: parseFloat(efficiency),
      efficiencyMpg: (parseFloat(efficiency) * 2.35215).toFixed(1),
      idleFuelCost,
      // Trend changes (demo values)
      distanceChange: 77,
      fuelChange: 6,
      efficiencyChange: 0.50,
      costChange: 4,
    };
  }, [vehicles, fuelEvents, makeFilter, modelFilter, searchQuery]);

  // Vehicle data for table
  const vehicleTableData = useMemo(() => {
    return vehicles
      .filter(v => {
        if (makeFilter !== "all" && v.make !== makeFilter) return false;
        if (modelFilter !== "all" && v.model !== modelFilter) return false;
        if (searchQuery && !v.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map(v => {
        const vehicleFuelEvents = fuelEvents.filter(e => e.vehicle_id === v.id);
        const fuelConsumed = vehicleFuelEvents
          .filter(e => e.event_type === 'refuel')
          .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters || 0), 0);
        
        const distance = v.odometer_km || 0;
        const efficiency = distance > 0 && fuelConsumed > 0 ? (distance / fuelConsumed) : 0;
        const idleFuelConsumed = fuelConsumed * 0.1; // Estimate 10% idle
        const idleFuelCost = idleFuelConsumed * 1.2; // $1.2 per liter

        return {
          id: v.id,
          plateNumber: v.plate_number || 'Unknown',
          year: v.year || '-',
          make: v.make || '-',
          model: v.model || '-',
          distanceMiles: Math.round(distance * 0.621371),
          fuelConsumedGal: (fuelConsumed * 0.264172).toFixed(1),
          efficiencyMpg: (efficiency * 2.35215).toFixed(1),
          idleFuelConsumedGal: (idleFuelConsumed * 0.264172).toFixed(1),
          idleFuelCost: idleFuelCost > 0 ? `$${idleFuelCost.toFixed(2)}` : '-',
        };
      });
  }, [vehicles, fuelEvents, makeFilter, modelFilter, searchQuery]);

  const reportSubTabs = [
    { id: "speeding", label: "Speeding Events" },
    { id: "seatbelt", label: "Seat Belt Violations" },
    { id: "harsh", label: "Harsh Events" },
    { id: "idling", label: "Excessive Idling Time" },
    { id: "fuel", label: "Fuel" },
    { id: "summary", label: "Vehicle Summary" },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
        </div>

        {/* Main Report Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveReportTab("vehicle")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeReportTab === "vehicle"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Vehicle Reports
            </button>
            <button
              onClick={() => setActiveReportTab("driver")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeReportTab === "driver"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Driver Reports
            </button>
            <button
              onClick={() => setActiveReportTab("charge")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeReportTab === "charge"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Charge Insights
            </button>
            <button
              onClick={() => setActiveReportTab("location")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeReportTab === "location"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Location Reports
            </button>
          </nav>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-4 flex-wrap">
          {reportSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-1 py-1 text-sm transition-colors ${
                activeSubTab === tab.id
                  ? "text-foreground border-b-2 border-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range & Export */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
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
              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
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
                <Download className="w-4 h-4" />
                EXPORT
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const data = formatFleetReportData(vehicles, fuelEvents);
                  exportToCSV(data, "fleet_report");
                  toast.success("Fleet report exported to CSV");
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const data = formatFleetReportData(vehicles, fuelEvents);
                  exportToPDF(
                    "Fleet Report",
                    data,
                    [
                      { key: "plate_number", label: "Vehicle", width: 30 },
                      { key: "make", label: "Make", width: 25 },
                      { key: "model", label: "Model", width: 25 },
                      { key: "status", label: "Status", width: 25 },
                      { key: "distance_km", label: "Distance (km)", width: 35 },
                      { key: "fuel_consumed_l", label: "Fuel (L)", width: 30 },
                      { key: "efficiency_kmpl", label: "Efficiency", width: 30 },
                      { key: "fuel_type", label: "Fuel Type", width: 30 },
                    ],
                    "fleet_report"
                  );
                  toast.success("Fleet report exported to PDF");
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Distance Driven (MI)
              </div>
              <div className="text-3xl font-bold">{summaryMetrics.distanceMiles.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success">+{summaryMetrics.distanceChange}</span>
                <span className="text-muted-foreground">increase since last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Fuel Consumed (GAL)
              </div>
              <div className="text-3xl font-bold">{summaryMetrics.fuelGallons}</div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success">+{summaryMetrics.fuelChange}</span>
                <span className="text-muted-foreground">increase since last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Efficiency (MPG)
              </div>
              <div className="text-3xl font-bold">{summaryMetrics.efficiencyMpg}</div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success">{summaryMetrics.efficiencyChange}</span>
                <span className="text-muted-foreground">improvement since last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Idle Fuel Cost ($)
                </div>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">${summaryMetrics.idleFuelCost}</div>
                <span className="text-xs text-muted-foreground">Gasoline: Current: $5/gallon</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-destructive">${summaryMetrics.costChange}</span>
                <span className="text-muted-foreground">worse than last week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={makeFilter} onValueChange={setMakeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Make" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {makes.map((make) => (
                <SelectItem key={make} value={make || "unknown"}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models.map((model) => (
                <SelectItem key={model} value={model || "unknown"}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon">
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">VEHICLE ↕</TableHead>
                  <TableHead>YEAR ↕</TableHead>
                  <TableHead>MAKE ↕</TableHead>
                  <TableHead>MODEL ↕</TableHead>
                  <TableHead>DISTANCE DRIVEN (MI) ↕</TableHead>
                  <TableHead>FUEL CONSUMED (GAL) ↕</TableHead>
                  <TableHead>EFFICIENCY (MPG) ↕</TableHead>
                  <TableHead>IDLE FUEL CONSUMED (GAL) ↕</TableHead>
                  <TableHead>IDLE FUEL COST ($) ↕</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleTableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No vehicles found
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicleTableData.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <button className="text-primary hover:underline flex items-center gap-1">
                          {vehicle.plateNumber}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>{vehicle.make}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.distanceMiles} mi</TableCell>
                      <TableCell>{vehicle.fuelConsumedGal}</TableCell>
                      <TableCell>{vehicle.efficiencyMpg} mpg</TableCell>
                      <TableCell>{vehicle.idleFuelConsumedGal}</TableCell>
                      <TableCell>{vehicle.idleFuelCost}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
