import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useState } from "react";

interface ExportableVehicle {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: string;
  fuel: number | null;
  odometer: number;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
}

export function exportToCSV(vehicles: ExportableVehicle[], filename: string = "fleet-export") {
  const headers = [
    "Plate Number",
    "Make",
    "Model",
    "Year",
    "Status",
    "Vehicle Type",
    "Fuel Type",
    "Odometer (km)",
    "Fuel Level (%)",
    "Assigned Driver"
  ];

  const rows = vehicles.map(v => [
    v.plate,
    v.make,
    v.model,
    v.year.toString(),
    v.status,
    v.vehicleType || "",
    v.fuelType || "",
    v.odometer.toString(),
    v.fuel?.toString() || "",
    v.assignedDriver || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useFleetExport() {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const [exporting, setExporting] = useState(false);

  // Export selected vehicles only
  const handleExport = (vehicles: ExportableVehicle[], selectedOnly: boolean = false) => {
    if (vehicles.length === 0) {
      toast({
        title: "No Data",
        description: "No vehicles to export",
        variant: "destructive"
      });
      return;
    }

    try {
      exportToCSV(vehicles, selectedOnly ? "fleet-selected" : "fleet-all");
      toast({
        title: "Export Successful",
        description: `Exported ${vehicles.length} vehicle(s) to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  // Export ALL vehicles from database (bypasses pagination)
  const handleExportAll = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization not found",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    try {
      // Fetch all vehicles in batches of 1000
      const allVehicles: ExportableVehicle[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*, assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name)")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = data.map((v: any) => ({
            id: v.plate_number,
            vehicleId: v.id,
            plate: v.plate_number,
            make: v.make || "Unknown",
            model: v.model || "",
            year: v.year || new Date().getFullYear(),
            status: v.status || "inactive",
            fuel: null,
            odometer: v.odometer_km || 0,
            vehicleType: v.vehicle_type || "",
            fuelType: v.fuel_type || "",
            assignedDriver: v.assigned_driver 
              ? `${v.assigned_driver.first_name} ${v.assigned_driver.last_name}` 
              : "",
          }));
          allVehicles.push(...formatted);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (allVehicles.length === 0) {
        toast({
          title: "No Data",
          description: "No vehicles to export",
          variant: "destructive"
        });
        return;
      }

      exportToCSV(allVehicles, "fleet-complete");
      toast({
        title: "Export Successful",
        description: `Exported all ${allVehicles.length} vehicle(s) to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  return { handleExport, handleExportAll, exporting };
}
