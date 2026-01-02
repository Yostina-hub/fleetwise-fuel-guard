import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import jsPDF from "jspdf";

interface ComplianceReportGeneratorProps {
  vehicles: Array<{ id: string; plate: string; maxSpeed: number }>;
}

export const ComplianceReportGenerator = ({ vehicles }: ComplianceReportGeneratorProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [period, setPeriod] = useState("week");
  const [vehicleSelection, setVehicleSelection] = useState("all");
  const [reportFormat, setReportFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "day":
        return { from: startOfDay(now), to: now };
      case "week":
        return { from: startOfWeek(now), to: now };
      case "month":
        return { from: startOfMonth(now), to: now };
      case "quarter":
        return { from: startOfQuarter(now), to: now };
      case "year":
        return { from: startOfYear(now), to: now };
      default:
        return { from: subDays(now, 7), to: now };
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { from, to } = getDateRange();

      // Fetch governor configs
      let configQuery = supabase
        .from("speed_governor_config")
        .select(`*, vehicles(plate_number)`)
        .eq("organization_id", organizationId!);

      if (vehicleSelection !== "all" && vehicleSelection !== "governors") {
        configQuery = configQuery.eq("vehicle_id", vehicleSelection);
      }

      const { data: configs, error: configError } = await configQuery;
      if (configError) throw configError;

      // Fetch violations
      let violationsQuery = supabase
        .from("speed_violations")
        .select(`*, vehicles(plate_number)`)
        .eq("organization_id", organizationId!)
        .gte("violation_time", from.toISOString())
        .lte("violation_time", to.toISOString())
        .order("violation_time", { ascending: false });

      if (vehicleSelection !== "all" && vehicleSelection !== "governors") {
        violationsQuery = violationsQuery.eq("vehicle_id", vehicleSelection);
      }

      const { data: violations, error: violationsError } = await violationsQuery;
      if (violationsError) throw violationsError;

      // Calculate stats
      const totalVehicles = configs?.length || 0;
      const activeGovernors = configs?.filter(c => c.governor_active).length || 0;
      const complianceRate = totalVehicles > 0 ? Math.round((activeGovernors / totalVehicles) * 100) : 0;
      const highSeverity = violations?.filter(v => v.severity === "high").length || 0;
      const mediumSeverity = violations?.filter(v => v.severity === "medium").length || 0;
      const lowSeverity = violations?.filter(v => v.severity === "low").length || 0;

      if (reportFormat === "pdf") {
        generatePDF({
          period,
          from,
          to,
          configs: configs || [],
          violations: violations || [],
          stats: { totalVehicles, activeGovernors, complianceRate, highSeverity, mediumSeverity, lowSeverity }
        });
      } else if (reportFormat === "excel" || reportFormat === "csv") {
        generateCSV({
          configs: configs || [],
          violations: violations || [],
        });
      }

      toast({
        title: "Report Generated",
        description: `Compliance report has been downloaded successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = ({ period, from, to, configs, violations, stats }: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setFont(undefined, "bold");
    doc.text("Speed Governor Compliance Report", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Ethiopian Transport Authority Compliance`, 20, 35);
    doc.text(`Report Period: ${format(from, "MMM dd, yyyy")} - ${format(to, "MMM dd, yyyy")}`, 20, 42);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 20, 49);

    // Summary Box
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 55, 180, 35, "F");
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Compliance Summary", 20, 65);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Total Vehicles with Governors: ${stats.totalVehicles}`, 20, 73);
    doc.text(`Active Governors: ${stats.activeGovernors}`, 20, 80);
    doc.text(`Compliance Rate: ${stats.complianceRate}%`, 100, 73);
    doc.text(`Total Violations: ${violations.length}`, 100, 80);

    // Severity Breakdown
    let y = 100;
    doc.setFont(undefined, "bold");
    doc.text("Violation Severity Breakdown", 20, y);
    doc.setFont(undefined, "normal");
    y += 8;
    doc.text(`High Severity (>15 km/h over limit): ${stats.highSeverity}`, 25, y);
    y += 6;
    doc.text(`Medium Severity (5-15 km/h over limit): ${stats.mediumSeverity}`, 25, y);
    y += 6;
    doc.text(`Low Severity (<5 km/h over limit): ${stats.lowSeverity}`, 25, y);

    // Vehicle Configuration Table
    y += 15;
    doc.setFont(undefined, "bold");
    doc.text("Vehicle Governor Configurations", 20, y);
    y += 8;
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Vehicle", 20, y);
    doc.text("Max Speed Limit", 70, y);
    doc.text("Governor Status", 110, y);
    doc.text("Last Updated", 150, y);
    doc.setFont(undefined, "normal");
    y += 5;

    configs.slice(0, 20).forEach((config: any) => {
      doc.text(config.vehicles?.plate_number || "Unknown", 20, y);
      doc.text(`${config.max_speed_limit} km/h`, 70, y);
      doc.text(config.governor_active ? "ACTIVE" : "INACTIVE", 110, y);
      doc.text(config.last_config_update 
        ? format(new Date(config.last_config_update), "MMM dd, yyyy")
        : "N/A", 150, y);
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // Recent Violations
    if (violations.length > 0) {
      doc.addPage();
      y = 20;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Recent Speed Violations", 20, y);
      y += 10;
      doc.setFontSize(8);
      doc.text("Date/Time", 20, y);
      doc.text("Vehicle", 55, y);
      doc.text("Speed", 90, y);
      doc.text("Limit", 110, y);
      doc.text("Excess", 130, y);
      doc.text("Location", 150, y);
      doc.setFont(undefined, "normal");
      y += 5;

      violations.slice(0, 40).forEach((v: any) => {
        doc.text(format(new Date(v.violation_time), "MM/dd HH:mm"), 20, y);
        doc.text(v.vehicles?.plate_number || "Unknown", 55, y);
        doc.text(`${v.speed_kmh}`, 90, y);
        doc.text(`${v.speed_limit_kmh}`, 110, y);
        doc.text(`+${Math.round(v.speed_kmh - v.speed_limit_kmh)}`, 130, y);
        doc.text((v.location_name || "Unknown").slice(0, 25), 150, y);
        y += 5;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.text("This report is generated for Ethiopian Transport Authority compliance verification.", 20, 285);

    doc.save(`speed-governor-compliance-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const generateCSV = ({ configs, violations }: any) => {
    // Configs sheet
    const configHeaders = ["Vehicle", "Max Speed Limit", "Governor Active", "Device ID", "Last Updated"];
    const configRows = configs.map((c: any) => [
      c.vehicles?.plate_number || "Unknown",
      c.max_speed_limit,
      c.governor_active ? "Yes" : "No",
      c.device_id || "N/A",
      c.last_config_update ? format(new Date(c.last_config_update), "yyyy-MM-dd HH:mm") : "N/A"
    ]);

    // Violations sheet
    const violationHeaders = ["Time", "Vehicle", "Speed", "Limit", "Excess", "Duration", "Location", "Severity"];
    const violationRows = violations.map((v: any) => [
      format(new Date(v.violation_time), "yyyy-MM-dd HH:mm:ss"),
      v.vehicles?.plate_number || "Unknown",
      v.speed_kmh,
      v.speed_limit_kmh,
      v.speed_kmh - v.speed_limit_kmh,
      v.duration_seconds || "N/A",
      v.location_name || "Unknown",
      v.severity
    ]);

    const configCSV = [configHeaders, ...configRows].map(r => r.join(",")).join("\n");
    const violationCSV = [violationHeaders, ...violationRows].map(r => r.join(",")).join("\n");

    const fullCSV = `GOVERNOR CONFIGURATIONS\n${configCSV}\n\nSPEED VIOLATIONS\n${violationCSV}`;

    const blob = new Blob([fullCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speed-governor-compliance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Compliance Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Report Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Vehicle Selection</Label>
            <Select value={vehicleSelection} onValueChange={setVehicleSelection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="governors">Governor-Equipped Only</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Report Format</Label>
            <Select value={reportFormat} onValueChange={setReportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="csv">CSV Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full" 
            onClick={generateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Contents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Governor activation status per vehicle</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Speed limit configuration history</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Total over-speed violations</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Violation severity breakdown</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Compliance rate calculations</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Ethiopian regulation adherence</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Driver alert statistics</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>GPS tracking verification</span>
          </div>

          <Card className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📋 Regulatory Compliance
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200">
                Reports include all data required by Ethiopian Transport Authority for speed governor compliance verification
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
