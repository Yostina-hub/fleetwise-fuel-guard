import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Car, Truck, Shield, FileText, DollarSign, AlertTriangle, Clock,
  CheckCircle, Calendar, Fuel, Gauge, MapPin, User, Building2,
  Wrench, Camera, Info, Search, ChevronRight, Key, Thermometer,
  Weight, Box, Zap, Radio, Hash, ArrowLeft,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Expiry Alert Card ---
const ExpiryAlertCard = ({ label, date, icon: Icon }: { label: string; date: string | null | undefined; icon: any }) => {
  if (!date) return null;
  const days = differenceInDays(parseISO(date), new Date());
  const isExpired = days < 0;
  const isUrgent = days >= 0 && days <= 30;
  const isWarning = days > 30 && days <= 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border",
        isExpired && "border-destructive/40 bg-destructive/5",
        isUrgent && "border-warning/40 bg-warning/5",
        isWarning && "border-yellow-500/20 bg-yellow-500/5",
        !isExpired && !isUrgent && !isWarning && "border-success/20 bg-success/5"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        isExpired ? "bg-destructive/10" : isUrgent ? "bg-warning/10" : "bg-success/10"
      )}>
        <Icon className={cn("w-5 h-5", isExpired ? "text-destructive" : isUrgent ? "text-warning" : "text-success")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{format(parseISO(date), "MMM d, yyyy")}</p>
      </div>
      <div className="text-right">
        {isExpired ? (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Expired {Math.abs(days)}d ago</Badge>
        ) : isUrgent ? (
          <Badge className="bg-warning/10 text-warning border-warning/20 gap-1"><Clock className="w-3 h-3" />{days}d left</Badge>
        ) : (
          <Badge className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle className="w-3 h-3" />{days}d left</Badge>
        )}
      </div>
    </motion.div>
  );
};

// --- Info Field ---
const InfoField = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
  <div className="flex items-start gap-2 py-2">
    {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value || "—"}</p>
    </div>
  </div>
);

const VehicleProfile = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [filterOwnership, setFilterOwnership] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all vehicles for the selector
  const { data: vehicles = [], isLoading: loadingList } = useQuery({
    queryKey: ["vehicle-profile-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, year, status, ownership_type, vehicle_type, insurance_expiry, registration_expiry, permit_expiry, rental_end_date")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch selected vehicle full profile
  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ["vehicle-profile-detail", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name, phone, avatar_url, license_number),
          depot:depots!vehicles_depot_id_fkey(id, name, address),
          owner:vehicle_owners!vehicles_owner_id_fkey(id, full_name, owner_type, phone, email, region, zone, woreda)
        `)
        .eq("id", selectedId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedId,
  });

  // Fetch insurance for selected vehicle
  const { data: insurances = [] } = useQuery({
    queryKey: ["vehicle-insurance", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .select("*")
        .eq("vehicle_id", selectedId!)
        .order("expiry_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedId,
  });

  // Filter vehicles
  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      const matchSearch = !search || v.plate_number?.toLowerCase().includes(search.toLowerCase()) || v.make?.toLowerCase().includes(search.toLowerCase()) || v.model?.toLowerCase().includes(search.toLowerCase());
      const matchOwnership = filterOwnership === "all" || v.ownership_type === filterOwnership;
      return matchSearch && matchOwnership;
    });
  }, [vehicles, search, filterOwnership]);

  // Expiry alerts summary
  const expiryAlerts = useMemo(() => {
    const alerts: { vehicleId: string; plate: string; type: string; date: string; days: number }[] = [];
    vehicles.forEach(v => {
      const checkDate = (type: string, date: string | null) => {
        if (!date) return;
        const days = differenceInDays(parseISO(date), new Date());
        if (days <= 90) alerts.push({ vehicleId: v.id, plate: v.plate_number, type, date, days });
      };
      checkDate("Insurance", v.insurance_expiry);
      checkDate("Registration", v.registration_expiry);
      checkDate("Permit", v.permit_expiry);
      checkDate("Rental Contract", v.rental_end_date);
    });
    return alerts.sort((a, b) => a.days - b.days);
  }, [vehicles]);

  const selectVehicle = (id: string) => setSearchParams({ id });

  const v = vehicle as any;
  const isRental = v?.ownership_type === "rented" || v?.ownership_type === "leased";

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Vehicle List */}
        <div className="w-80 border-r flex flex-col bg-background shrink-0">
          <div className="p-3 border-b space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2"><Car className="w-5 h-5 text-primary" />Vehicle Profiles</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search plate, make..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterOwnership} onValueChange={setFilterOwnership}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ownership</SelectItem>
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="leased">Leased</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Alerts Summary */}
          {expiryAlerts.length > 0 && (
            <div className="p-2 border-b bg-destructive/5">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1 px-1 mb-1">
                <AlertTriangle className="w-3 h-3" />{expiryAlerts.filter(a => a.days < 0).length} Expired · {expiryAlerts.filter(a => a.days >= 0 && a.days <= 30).length} Expiring Soon
              </p>
            </div>
          )}

          <ScrollArea className="flex-1">
            {loadingList ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 mx-2 my-1 rounded-lg" />)
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No vehicles found</p>
            ) : (
              filtered.map(v => {
                const hasExpiry = [v.insurance_expiry, v.registration_expiry, v.permit_expiry, v.rental_end_date]
                  .some(d => d && differenceInDays(parseISO(d), new Date()) <= 30);
                return (
                  <button
                    key={v.id}
                    onClick={() => selectVehicle(v.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/30",
                      selectedId === v.id && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {v.vehicle_type === "truck" ? <Truck className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{v.plate_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.make} {v.model} · {v.year}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant="outline" className={cn("text-[10px] capitalize",
                        v.ownership_type === "rented" && "border-blue-500/30 text-blue-600",
                        v.ownership_type === "owned" && "border-success/30 text-success",
                      )}>{v.ownership_type || "owned"}</Badge>
                      {hasExpiry && <AlertTriangle className="w-3 h-3 text-warning" />}
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Vehicle Detail */}
        <div className="flex-1 overflow-auto">
          {!selectedId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Car className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a vehicle</p>
                <p className="text-sm">Choose a vehicle from the list to view its full profile</p>
              </div>
            </div>
          ) : loadingVehicle ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-24 rounded-xl" />
              <div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
            </div>
          ) : v ? (
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    {v.vehicle_type === "truck" ? <Truck className="w-7 h-7 text-primary" /> : <Car className="w-7 h-7 text-primary" />}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{v.plate_number}</h1>
                    <p className="text-muted-foreground">{v.make} {v.model} · {v.year} · {v.color || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("capitalize",
                    v.status === "active" && "border-success/30 text-success bg-success/5",
                    v.status === "maintenance" && "border-warning/30 text-warning bg-warning/5",
                    v.status === "inactive" && "border-destructive/30 text-destructive bg-destructive/5",
                  )}>{v.status}</Badge>
                  <Badge variant="outline" className={cn("capitalize",
                    isRental ? "border-blue-500/30 text-blue-600 bg-blue-50/50" : "border-success/30 text-success bg-success/5"
                  )}>{v.ownership_type || "owned"}</Badge>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="overview" className="gap-1 text-xs"><Info className="w-3 h-3" />Overview</TabsTrigger>
                  <TabsTrigger value="specifications" className="gap-1 text-xs"><Gauge className="w-3 h-3" />Specs</TabsTrigger>
                  <TabsTrigger value="ownership" className="gap-1 text-xs"><Key className="w-3 h-3" />Ownership</TabsTrigger>
                  <TabsTrigger value="insurance" className="gap-1 text-xs"><Shield className="w-3 h-3" />Insurance</TabsTrigger>
                  <TabsTrigger value="compliance" className="gap-1 text-xs"><FileText className="w-3 h-3" />Compliance</TabsTrigger>
                  <TabsTrigger value="financials" className="gap-1 text-xs"><DollarSign className="w-3 h-3" />Financials</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Expiry Alerts */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" />Expiry Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ExpiryAlertCard label="Insurance Expiry" date={v.insurance_expiry} icon={Shield} />
                      <ExpiryAlertCard label="Registration Expiry" date={v.registration_expiry} icon={FileText} />
                      <ExpiryAlertCard label="Permit Expiry" date={v.permit_expiry} icon={Key} />
                      {isRental && <ExpiryAlertCard label="Rental Contract End" date={v.rental_end_date} icon={Building2} />}
                      {![v.insurance_expiry, v.registration_expiry, v.permit_expiry, isRental && v.rental_end_date].filter(Boolean).length && (
                        <p className="text-sm text-muted-foreground py-4 text-center">No expiry dates configured</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Odometer</p>
                          <p className="font-semibold">{v.odometer_km ? `${v.odometer_km.toLocaleString()} km` : "—"}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Engine Hours</p>
                          <p className="font-semibold">{v.engine_hours ? `${v.engine_hours.toLocaleString()} hrs` : "—"}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-3">
                      <div className="flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-warning" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tank Capacity</p>
                          <p className="font-semibold">{v.tank_capacity_liters ? `${v.tank_capacity_liters} L` : "—"}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-xs text-muted-foreground">Driver</p>
                          <p className="font-semibold text-sm truncate">
                            {v.assigned_driver ? `${v.assigned_driver.first_name} ${v.assigned_driver.last_name}` : "Unassigned"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* General Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle Identity</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-x-4">
                        <InfoField label="VIN" value={v.vin} icon={Hash} />
                        <InfoField label="Plate Number" value={v.plate_number} icon={Car} />
                        <InfoField label="Make" value={v.make} icon={Car} />
                        <InfoField label="Model" value={v.model} />
                        <InfoField label="Year" value={v.year} icon={Calendar} />
                        <InfoField label="Color" value={v.color} />
                        <InfoField label="Vehicle Type" value={v.vehicle_type} icon={Truck} />
                        <InfoField label="Category" value={v.vehicle_category} />
                        <InfoField label="Group" value={v.vehicle_group} />
                        <InfoField label="Lifecycle Stage" value={v.lifecycle_stage} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Assignment & Location</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-x-4">
                        <InfoField label="Depot" value={v.depot?.name} icon={Building2} />
                        <InfoField label="Depot Address" value={v.depot?.address} icon={MapPin} />
                        <InfoField label="Assigned Driver" value={v.assigned_driver ? `${v.assigned_driver.first_name} ${v.assigned_driver.last_name}` : null} icon={User} />
                        <InfoField label="Driver Phone" value={v.assigned_driver?.phone} />
                        <InfoField label="Route Type" value={v.route_type} />
                        <InfoField label="GPS Device" value={v.gps_device_id} icon={Radio} />
                        <InfoField label="GPS Installed" value={v.gps_installed ? "Yes" : "No"} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* SPECIFICATIONS TAB */}
                <TabsContent value="specifications" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Engine & Fuel</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-x-4">
                        <InfoField label="Fuel Type" value={v.fuel_type} icon={Fuel} />
                        <InfoField label="Tank Capacity" value={v.tank_capacity_liters ? `${v.tank_capacity_liters} L` : null} />
                        <InfoField label="Drive Type" value={v.drive_type} icon={Zap} />
                        <InfoField label="Engine Hours" value={v.engine_hours ? `${v.engine_hours} hrs` : null} icon={Clock} />
                        <InfoField label="Odometer" value={v.odometer_km ? `${v.odometer_km.toLocaleString()} km` : null} icon={Gauge} />
                        <InfoField label="Temperature Control" value={v.temperature_control} icon={Thermometer} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Capacity & Dimensions</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-x-4">
                        <InfoField label="Payload Capacity" value={v.capacity_kg ? `${v.capacity_kg} kg` : null} icon={Weight} />
                        <InfoField label="Volume Capacity" value={v.capacity_volume ? `${v.capacity_volume} m³` : null} icon={Box} />
                        <InfoField label="Commercial Permit" value={v.commercial_permit ? "Yes" : "No"} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Speed Governor</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-x-4">
                        <InfoField label="Speed Cutoff" value={v.speed_cutoff_enabled ? "Enabled" : "Disabled"} />
                        <InfoField label="Cutoff Limit" value={v.speed_cutoff_limit_kmh ? `${v.speed_cutoff_limit_kmh} km/h` : null} />
                        <InfoField label="Grace Period" value={v.speed_cutoff_grace_seconds ? `${v.speed_cutoff_grace_seconds}s` : null} />
                        <InfoField label="Bypass Alert" value={v.speed_governor_bypass_alert ? "Enabled" : "Disabled"} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Photos</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {["photo_front_url", "photo_back_url", "photo_left_url", "photo_right_url"].map(key => (
                            <div key={key} className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                              {v[key] ? (
                                <img src={v[key]} alt={key} className="w-full h-full object-cover" />
                              ) : (
                                <Camera className="w-6 h-6 text-muted-foreground/40" />
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* OWNERSHIP TAB */}
                <TabsContent value="ownership" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {isRental ? <Building2 className="w-4 h-4 text-blue-500" /> : <Key className="w-4 h-4 text-success" />}
                        {isRental ? "Rental / Lease Details" : "Ownership Details"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                      <InfoField label="Ownership Type" value={v.ownership_type || "owned"} icon={Key} />
                      {isRental ? (
                        <>
                          <InfoField label="Rental Provider" value={v.rental_provider} icon={Building2} />
                          <InfoField label="Contract Number" value={v.rental_contract_number} icon={FileText} />
                          <InfoField label="Start Date" value={v.rental_start_date ? format(parseISO(v.rental_start_date), "MMM d, yyyy") : null} icon={Calendar} />
                          <InfoField label="End Date" value={v.rental_end_date ? format(parseISO(v.rental_end_date), "MMM d, yyyy") : null} icon={Calendar} />
                          <InfoField label="Daily Rate" value={v.rental_daily_rate ? `${v.rental_daily_rate.toLocaleString()} ETB` : null} icon={DollarSign} />
                          {v.rental_end_date && (
                            <div className="col-span-full mt-2">
                              <ExpiryAlertCard label="Rental Contract Expiry" date={v.rental_end_date} icon={Building2} />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <InfoField label="Acquisition Date" value={v.acquisition_date ? format(parseISO(v.acquisition_date), "MMM d, yyyy") : null} icon={Calendar} />
                          <InfoField label="Acquisition Cost" value={v.acquisition_cost ? `${v.acquisition_cost.toLocaleString()} ETB` : null} icon={DollarSign} />
                          <InfoField label="Current Value" value={v.current_value ? `${v.current_value.toLocaleString()} ETB` : null} icon={DollarSign} />
                          <InfoField label="Depreciation Rate" value={v.depreciation_rate ? `${v.depreciation_rate}%` : null} />
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Owner Information */}
                  {v.owner && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Owner Information</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                        <InfoField label="Owner Name" value={v.owner.full_name} icon={User} />
                        <InfoField label="Owner Type" value={v.owner.owner_type} />
                        <InfoField label="Phone" value={v.owner.phone} />
                        <InfoField label="Email" value={v.owner.email} />
                        <InfoField label="Region" value={v.owner.region} icon={MapPin} />
                        <InfoField label="Zone / Woreda" value={[v.owner.zone, v.owner.woreda].filter(Boolean).join(" / ")} />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* INSURANCE TAB */}
                <TabsContent value="insurance" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Insurance Policy (Vehicle)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                      <InfoField label="Policy Number" value={v.insurance_policy_no} icon={FileText} />
                      <InfoField label="Insurance Expiry" value={v.insurance_expiry ? format(parseISO(v.insurance_expiry), "MMM d, yyyy") : null} icon={Calendar} />
                      {v.insurance_expiry && (
                        <div className="flex items-center"><LicenseExpiryBadge expiryDate={v.insurance_expiry} /></div>
                      )}
                    </CardContent>
                  </Card>

                  {insurances.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Insurance Records ({insurances.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {insurances.map((ins: any) => (
                          <div key={ins.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                            <Shield className="w-5 h-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Policy</p>
                                <p className="text-sm font-medium">{ins.policy_number}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Provider</p>
                                <p className="text-sm font-medium">{ins.provider}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Type</p>
                                <p className="text-sm font-medium capitalize">{ins.insurance_type || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Premium</p>
                                <p className="text-sm font-medium">{ins.premium_amount ? `${ins.premium_amount.toLocaleString()} ETB` : "—"}</p>
                              </div>
                            </div>
                            <LicenseExpiryBadge expiryDate={ins.expiry_date} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* COMPLIANCE TAB */}
                <TabsContent value="compliance" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Registration & Permits</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                        <InfoField label="Registration Cert No." value={v.registration_cert_no} icon={FileText} />
                        <InfoField label="Registration Expiry" value={v.registration_expiry ? format(parseISO(v.registration_expiry), "MMM d, yyyy") : null} icon={Calendar} />
                        <div className="flex items-center"><LicenseExpiryBadge expiryDate={v.registration_expiry} /></div>
                        <InfoField label="Commercial Permit" value={v.commercial_permit ? "Yes" : "No"} icon={Key} />
                        <InfoField label="Permit Expiry" value={v.permit_expiry ? format(parseISO(v.permit_expiry), "MMM d, yyyy") : null} icon={Calendar} />
                        <div className="flex items-center"><LicenseExpiryBadge expiryDate={v.permit_expiry} /></div>
                      </div>
                      <Separator />
                      <ExpiryAlertCard label="Registration" date={v.registration_expiry} icon={FileText} />
                      <ExpiryAlertCard label="Permit" date={v.permit_expiry} icon={Key} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: "Owner Certificate", url: v.owner_certificate_url },
                        { label: "Insurance Certificate", url: v.insurance_cert_url },
                        { label: "Tax Clearance", url: v.tax_clearance_url },
                      ].map(doc => (
                        <div key={doc.label} className="p-3 rounded-lg border bg-muted/20 flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">{doc.label}</p>
                            {doc.url ? (
                              <a href={doc.url} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">View Document</a>
                            ) : (
                              <p className="text-sm text-muted-foreground">Not uploaded</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* FINANCIALS TAB */}
                <TabsContent value="financials" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Summary</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-x-4">
                        <InfoField label="Acquisition Cost" value={v.acquisition_cost ? `${v.acquisition_cost.toLocaleString()} ETB` : null} icon={DollarSign} />
                        <InfoField label="Current Value" value={v.current_value ? `${v.current_value.toLocaleString()} ETB` : null} icon={DollarSign} />
                        <InfoField label="Depreciation Rate" value={v.depreciation_rate ? `${v.depreciation_rate}%/yr` : null} />
                        <InfoField label="Total Maintenance Cost" value={v.total_maintenance_cost ? `${v.total_maintenance_cost.toLocaleString()} ETB` : null} icon={Wrench} />
                        <InfoField label="Total Fuel Cost" value={v.total_fuel_cost ? `${v.total_fuel_cost.toLocaleString()} ETB` : null} icon={Fuel} />
                        <InfoField label="Total Downtime" value={v.total_downtime_hours ? `${v.total_downtime_hours} hrs` : null} icon={Clock} />
                      </CardContent>
                    </Card>
                    {isRental && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Rental Costs</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-4">
                          <InfoField label="Daily Rate" value={v.rental_daily_rate ? `${v.rental_daily_rate.toLocaleString()} ETB` : null} icon={DollarSign} />
                          <InfoField label="Provider" value={v.rental_provider} icon={Building2} />
                          <InfoField label="Contract Start" value={v.rental_start_date ? format(parseISO(v.rental_start_date), "MMM d, yyyy") : null} />
                          <InfoField label="Contract End" value={v.rental_end_date ? format(parseISO(v.rental_end_date), "MMM d, yyyy") : null} />
                          {v.rental_start_date && v.rental_end_date && v.rental_daily_rate && (
                            <InfoField label="Est. Total Cost"
                              value={`${(differenceInDays(parseISO(v.rental_end_date), parseISO(v.rental_start_date)) * v.rental_daily_rate).toLocaleString()} ETB`}
                              icon={DollarSign}
                            />
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Notes */}
              {v.notes && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{v.notes}</p></CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default VehicleProfile;
