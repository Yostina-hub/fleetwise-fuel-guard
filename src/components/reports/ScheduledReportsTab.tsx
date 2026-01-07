import { useState, useEffect } from "react";
import { FileText, Plus, Search, MoreHorizontal, Clock, Trash2, Edit, Ban, Copy, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScheduleReportDialog } from "./ScheduleReportDialog";
import { REPORT_DEFINITIONS } from "./ReportCatalog";

interface ScheduledReport {
  id: string;
  report_id: string;
  report_name: string;
  report_description: string | null;
  category: string;
  sub_id: string;
  schedule_rate: string;
  is_active: boolean;
  export_format: string;
  recipients: string[];
  created_at: string;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface ScheduledReportsTabProps {
  onAddReport: () => void;
}

export const ScheduledReportsTab = ({ onAddReport }: ScheduledReportsTabProps) => {
  const { organizationId } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Fetch scheduled reports
  useEffect(() => {
    if (!organizationId) return;

    const fetchScheduledReports = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("scheduled_reports")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setScheduledReports((data || []) as ScheduledReport[]);
      } catch (error) {
        console.error("Error fetching scheduled reports:", error);
        toast.error("Failed to load scheduled reports");
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledReports();
  }, [organizationId]);

  const filteredReports = scheduledReports.filter(report =>
    report.report_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleActive = async (report: ScheduledReport) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .update({ is_active: !report.is_active })
        .eq("id", report.id);

      if (error) throw error;

      setScheduledReports(prev =>
        prev.map(r => r.id === report.id ? { ...r, is_active: !r.is_active } : r)
      );
      toast.success(`Report ${report.is_active ? "paused" : "activated"}`);
    } catch (error) {
      console.error("Error toggling report:", error);
      toast.error("Failed to update report status");
    }
  };

  const handleDeleteReport = async (report: ScheduledReport) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", report.id);

      if (error) throw error;

      setScheduledReports(prev => prev.filter(r => r.id !== report.id));
      toast.success("Report deleted successfully");
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  const handleDuplicateReport = async (report: ScheduledReport) => {
    try {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .insert({
          organization_id: organizationId,
          report_id: report.report_id,
          report_name: `${report.report_name} (Copy)`,
          report_description: report.report_description,
          category: report.category,
          sub_id: report.sub_id,
          schedule_rate: report.schedule_rate,
          export_format: report.export_format,
          recipients: report.recipients,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setScheduledReports(prev => [data as ScheduledReport, ...prev]);
      toast.success("Report duplicated successfully");
    } catch (error) {
      console.error("Error duplicating report:", error);
      toast.error("Failed to duplicate report");
    }
  };

  const handleShowResults = (report: ScheduledReport) => {
    toast.info(`Generating ${report.report_name}...`);
    // This would trigger report generation
  };

  const handleEditReport = (report: ScheduledReport) => {
    // Find the report definition
    const reportDef = REPORT_DEFINITIONS.find(r => r.id === report.report_id);
    if (reportDef) {
      setSelectedReport(reportDef);
      setEditDialogOpen(true);
    }
  };

  const getScheduleLabel = (rate: string) => {
    switch (rate) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      default: return rate;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Add Report */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Reports"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>
        </div>
        
        <Button onClick={onAddReport} className="gap-2 shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" />
          Add Report
        </Button>
      </div>

      {/* Scheduled Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No scheduled reports</p>
          <p className="text-sm">
            {searchQuery 
              ? "Try adjusting your search" 
              : "Schedule a report to see it here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredReports.map((report) => (
            <Card
              key={report.id}
              className={cn(
                "transition-all hover:shadow-md hover:border-primary/30",
                !report.is_active && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-full bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wide">
                        {report.report_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getScheduleLabel(report.schedule_rate)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {report.export_format}
                        </Badge>
                        {!report.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            Paused
                          </Badge>
                        )}
                        {report.recipients.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {report.recipients.length} recipient{report.recipients.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-5 h-5 text-primary" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleEditReport(report)} className="gap-3 py-2.5">
                        <Edit className="w-4 h-4" />
                        <span className="font-medium">EDIT REPORT</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(report)} className="gap-3 py-2.5">
                        <Ban className="w-4 h-4" />
                        <span className="font-medium">{report.is_active ? "SET AS INACTIVE" : "SET AS ACTIVE"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateReport(report)} className="gap-3 py-2.5">
                        <Copy className="w-4 h-4" />
                        <span className="font-medium">DUPLICATE</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShowResults(report)} className="gap-3 py-2.5">
                        <BarChart3 className="w-4 h-4" />
                        <span className="font-medium">SHOW RESULTS</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteReport(report)}
                        className="gap-3 py-2.5 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium">DELETE</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Schedule Dialog */}
      <ScheduleReportDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        report={selectedReport}
      />
    </div>
  );
};
