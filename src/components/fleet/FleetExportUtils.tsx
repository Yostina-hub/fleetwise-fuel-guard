import { useToast } from "@/hooks/use-toast";

interface ExportableVehicle {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: string;
  fuel: number;
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
    v.fuel.toString(),
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

  return { handleExport };
}
