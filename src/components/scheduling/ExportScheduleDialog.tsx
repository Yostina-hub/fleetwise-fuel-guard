import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
      toast({
        title: "Date Range Required",
        description: "Please select a date range for the export.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      // Simplified query to avoid TypeScript issues
      const response = await (supabase as any)
        .from("trip_requests")
        .select("*")
        .gte("start_date", dateRange.from.toISOString())
        .lte("start_date", dateRange.to.toISOString())
        .order("start_date", { ascending: true });

      if (response.error) throw response.error;
      const trips = response.data || [];

      if (exportFormat === "csv") {
        exportToCSV(trips);
      } else {
        exportToPDF(trips);
      }

      toast({
        title: "Export Successful",
        description: `Schedule exported as ${exportFormat.toUpperCase()}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export schedule data.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (trips: any[]) => {
    const headers = [
      "Request #",
      "Purpose",
      "Status",
      "Start Date",
      "End Date",
      "Passengers",
      "Destination",
    ];

    const rows = trips.map((trip) => [
      trip.request_number || "",
      trip.purpose || "",
      trip.status || "",
      trip.start_date ? format(new Date(trip.start_date), "yyyy-MM-dd HH:mm") : "",
      trip.end_date ? format(new Date(trip.end_date), "yyyy-MM-dd HH:mm") : "",
      trip.passengers || 0,
      trip.destination || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet-schedule-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = (trips: any[]) => {
    // Simple HTML-based PDF export (can be enhanced with a library like jsPDF)
    const htmlContent = `
      <html>
        <head>
          <title>Fleet Schedule Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Fleet Schedule Report</h1>
          <p>Generated: ${format(new Date(), "PPP")}</p>
          <p>Period: ${format(dateRange.from!, "PPP")} - ${format(dateRange.to!, "PPP")}</p>
          <table>
            <thead>
              <tr>
                <th>Request #</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Passengers</th>
              </tr>
            </thead>
            <tbody>
              ${trips
                .map(
                  (trip) => `
                <tr>
                  <td>${trip.request_number || ""}</td>
                  <td>${trip.purpose || ""}</td>
                  <td>${trip.status || ""}</td>
                  <td>${trip.start_date ? format(new Date(trip.start_date), "PPP p") : ""}</td>
                  <td>${trip.passengers || 0}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

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
          <DialogDescription>
            Export your fleet schedule in CSV or PDF format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">
                  CSV (Excel compatible)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                  PDF (Print friendly)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal flex-1 min-w-[140px]",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal flex-1 min-w-[140px]",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    disabled={(date) => dateRange.from ? date < dateRange.from : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
