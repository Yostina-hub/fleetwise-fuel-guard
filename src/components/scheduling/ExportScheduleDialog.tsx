import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportScheduleDialog = ({ open, onOpenChange }: ExportScheduleDialogProps) => {
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({ title: "Date Range Required", description: "Please select a date range.", variant: "destructive" });
      return;
    }

    setExporting(true);
    try {
      const { data: trips, error } = await supabase
        .from("trip_requests")
        .select(`
          *,
          pickup_geofence:pickup_geofence_id(name),
          drop_geofence:drop_geofence_id(name)
        `)
        .gte("pickup_at", dateRange.from.toISOString())
        .lte("pickup_at", dateRange.to.toISOString())
        .order("pickup_at", { ascending: true });

      if (error) throw error;

      if (exportFormat === "csv") {
        exportToCSV(trips || []);
      } else {
        exportToPDF(trips || []);
      }

      toast({ title: "Export Successful", description: `Schedule exported as ${exportFormat.toUpperCase()}` });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Export error:", error);
      toast({ title: "Export Failed", description: error.message || "Failed to export.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (trips: any[]) => {
    const headers = ["Request #", "Purpose", "Status", "Priority", "Pickup At", "Return At", "Passengers", "Pickup Location", "Drop Location"];
    const rows = trips.map((trip) => [
      trip.request_number || "",
      trip.purpose || "",
      trip.status || "",
      trip.priority || "normal",
      trip.pickup_at ? format(new Date(trip.pickup_at), "yyyy-MM-dd HH:mm") : "",
      trip.return_at ? format(new Date(trip.return_at), "yyyy-MM-dd HH:mm") : "",
      trip.passenger_count || 1,
      trip.pickup_geofence?.name || "",
      trip.drop_geofence?.name || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-schedule-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = (trips: any[]) => {
    const htmlContent = `
      <html><head><title>Trip Schedule Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; } table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f4f4f4; }
      </style></head><body>
      <h1>Trip Schedule Report</h1>
      <p>Generated: ${format(new Date(), "PPP")}</p>
      <p>Period: ${format(dateRange.from!, "PPP")} – ${format(dateRange.to!, "PPP")}</p>
      <table><thead><tr>
        <th>Request #</th><th>Purpose</th><th>Status</th><th>Pickup</th><th>Return</th><th>Passengers</th><th>Route</th>
      </tr></thead><tbody>
      ${trips.map((t) => `<tr>
        <td>${t.request_number || ""}</td>
        <td>${t.purpose || ""}</td>
        <td>${t.status || ""}</td>
        <td>${t.pickup_at ? format(new Date(t.pickup_at), "PPP p") : ""}</td>
        <td>${t.return_at ? format(new Date(t.return_at), "PPP p") : ""}</td>
        <td>${t.passenger_count || 1}</td>
        <td>${t.pickup_geofence?.name || "—"} → ${t.drop_geofence?.name || "—"}</td>
      </tr>`).join("")}
      </tbody></table></body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Schedule</DialogTitle>
          <DialogDescription>Export your trip schedule in CSV or PDF format</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">CSV (Excel compatible)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">PDF (Print friendly)</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal flex-1 min-w-[140px]", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange({ ...dateRange, from: date })} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal flex-1 min-w-[140px]", !dateRange.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange({ ...dateRange, to: date })} disabled={(date) => dateRange.from ? date < dateRange.from : false} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
