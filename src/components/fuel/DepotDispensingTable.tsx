import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { FuelDepot, FuelDepotDispensing } from "@/hooks/useFuelDepots";

const ITEMS_PER_PAGE = 10;

interface DepotDispensingTableProps {
  dispensingLogs: FuelDepotDispensing[];
  depots: FuelDepot[];
  getVehiclePlate: (vehicleId?: string) => string;
  getDriverName: (driverId?: string) => string;
  formatFuel: (value: number) => string;
  formatDistance: (value: number) => string;
}

export default function DepotDispensingTable({
  dispensingLogs,
  depots,
  getVehiclePlate,
  getDriverName,
  formatFuel,
  formatDistance,
}: DepotDispensingTableProps) {
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    dispensingLogs.length, 
    ITEMS_PER_PAGE
  );
  const paginatedLogs = dispensingLogs.slice(startIndex, endIndex);

  const exportDispensingCSV = () => {
    const headers = ["Date/Time", "Depot", "Vehicle", "Driver", "Liters", "Odometer", "Pump", "Stock Before", "Stock After"];
    const rows = dispensingLogs.map(log => [
      format(new Date(log.dispensed_at), "yyyy-MM-dd HH:mm"),
      depots.find(d => d.id === log.depot_id)?.name || "Unknown",
      getVehiclePlate(log.vehicle_id || undefined),
      getDriverName(log.driver_id || undefined),
      log.liters_dispensed,
      log.odometer_km || "",
      log.pump_number || "",
      log.stock_before_liters || "",
      log.stock_after_liters || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispensing-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dispensing logs exported");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Dispensing</CardTitle>
        <Button size="sm" variant="outline" className="gap-2" onClick={exportDispensingCSV} aria-label="Export dispensing logs to CSV">
          <Download className="w-4 h-4" aria-hidden="true" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Date/Time</TableHead>
              <TableHead className="min-w-[100px]">Depot</TableHead>
              <TableHead className="min-w-[100px]">Vehicle</TableHead>
              <TableHead className="min-w-[120px]">Driver</TableHead>
              <TableHead className="min-w-[80px]">Liters</TableHead>
              <TableHead className="min-w-[100px]">Odometer</TableHead>
              <TableHead className="min-w-[80px]">Pump</TableHead>
              <TableHead className="min-w-[100px]">Stock Before</TableHead>
              <TableHead className="min-w-[100px]">Stock After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No dispensing records yet
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.dispensed_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell>
                    <span className="truncate block max-w-[100px]" title={depots.find(d => d.id === log.depot_id)?.name}>
                      {depots.find(d => d.id === log.depot_id)?.name || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="truncate block max-w-[100px]" title={getVehiclePlate(log.vehicle_id || undefined)}>
                      {getVehiclePlate(log.vehicle_id || undefined)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="truncate block max-w-[120px]" title={getDriverName(log.driver_id || undefined)}>
                      {getDriverName(log.driver_id || undefined)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{formatFuel(log.liters_dispensed)}</TableCell>
                  <TableCell>{log.odometer_km ? formatDistance(log.odometer_km) : '-'}</TableCell>
                  <TableCell>{log.pump_number || '-'}</TableCell>
                  <TableCell>{log.stock_before_liters ? formatFuel(log.stock_before_liters) : '-'}</TableCell>
                  <TableCell>{log.stock_after_liters ? formatFuel(log.stock_after_liters) : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalItems={dispensingLogs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
}
