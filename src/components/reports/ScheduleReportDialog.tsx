import { useState, useMemo, useEffect } from "react";
import { X, Search, Loader2, Clock, Calendar, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SelectRecipientsDialog } from "./SelectRecipientsDialog";

interface Asset {
  id: string;
  name: string;
  type: string;
}

interface ReportDefinition {
  id: string;
  category: string;
  subId: string;
  name: string;
  description: string;
}

interface ScheduleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportDefinition | null;
}

const ASSET_TYPES = [
  { value: "all", label: "All Assets" },
  { value: "vehicle", label: "Vehicles" },
  { value: "truck", label: "Trucks" },
  { value: "equipment", label: "Equipment" },
];

const SCHEDULE_RATES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const EXPORT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const DATA_PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

export const ScheduleReportDialog = ({
  open,
  onOpenChange,
  report,
}: ScheduleReportDialogProps) => {
  const { organizationId } = useOrganization();
  
  // Form state
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [assetType, setAssetType] = useState("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [dataPeriod, setDataPeriod] = useState("last_7_days");
  const [fromTime, setFromTime] = useState("06:00:00");
  const [toTime, setToTime] = useState("18:00:00");
  
  // Scheduling options
  const [enableScheduling, setEnableScheduling] = useState(true);
  const [scheduleRate, setScheduleRate] = useState("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [startingDate, setStartingDate] = useState<Date>(new Date());
  const [atTime, setAtTime] = useState("09:00:00");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientsDialogOpen, setRecipientsDialogOpen] = useState(false);
  
  // Asset loading
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch vehicles from database when dialog opens
  useEffect(() => {
    if (!open || !organizationId) return;

    const fetchVehicles = async () => {
      setLoadingAssets(true);
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("id, plate_number, vehicle_type")
          .eq("organization_id", organizationId)
          .order("plate_number");

        if (error) throw error;

        const vehicleAssets: Asset[] = (data || []).map((v) => ({
          id: v.id,
          name: v.plate_number || "Unknown",
          type: v.vehicle_type?.toLowerCase() || "vehicle",
        }));

        setAssets(vehicleAssets);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setAssets([]);
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchVehicles();
  }, [open, organizationId]);

  // Pre-fill report name when dialog opens
  useEffect(() => {
    if (open && report) {
      setReportName(report.name);
    }
  }, [open, report]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedAssets([]);
      setAssetSearch("");
      setAssetType("all");
      setRecipients([]);
    }
  }, [open]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesType = assetType === "all" || asset.type === assetType;
      const matchesSearch = asset.name.toLowerCase().includes(assetSearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [assets, assetType, assetSearch]);

  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(a => a.id));
    }
  };

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(prev => prev.filter(r => r !== email));
  };

  const handleRecipientsConfirm = (emails: string[]) => {
    setRecipients(emails);
  };

  const handleSave = async () => {
    if (!report || !organizationId) return;
    
    if (enableScheduling && recipients.length === 0) {
      toast.error("Please add at least one recipient for scheduled reports");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .insert({
          organization_id: organizationId,
          report_id: report.id,
          report_name: reportName || report.name,
          report_description: reportDescription || report.description,
          category: report.category,
          sub_id: report.subId,
          selected_assets: selectedAssets,
          asset_type: assetType,
          data_period: dataPeriod,
          from_time: showTimeFields ? fromTime : null,
          to_time: showTimeFields ? toTime : null,
          is_scheduled: enableScheduling,
          schedule_rate: scheduleRate,
          selected_days: selectedDays,
          starting_date: format(startingDate, "yyyy-MM-dd"),
          at_time: atTime,
          export_format: exportFormat,
          recipients: recipients,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success("Report schedule saved successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const isSelectAllChecked = selectedAssets.length === filteredAssets.length && filteredAssets.length > 0;
  const isSelectAllIndeterminate = selectedAssets.length > 0 && selectedAssets.length < filteredAssets.length;

  const showTimeFields = report?.name?.toLowerCase().includes("restricted") || report?.name?.toLowerCase().includes("hours");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-primary text-primary-foreground">
          <DialogTitle className="text-lg font-semibold uppercase tracking-wide flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Scheduled Reports
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure scheduled report settings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Report Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Report Name</Label>
                  <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Enter report name"
                    className="bg-background/50 border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Report Description</Label>
                  <Textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Enter report description"
                    className="bg-background/50 border-border/50 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Select Report Type</Label>
                  <Input
                    value={report?.name || ""}
                    disabled
                    className="bg-muted/50 border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Show Me Data</Label>
                  <Select value={dataPeriod} onValueChange={setDataPeriod}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_PERIODS.map(period => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showTimeFields && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-primary">Specify Allowed Usage Time</Label>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">From:</Label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={fromTime.substring(0, 5)}
                          onChange={(e) => setFromTime(e.target.value + ":00")}
                          className="bg-background/50 border-border/50"
                        />
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">To:</Label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={toTime.substring(0, 5)}
                          onChange={(e) => setToTime(e.target.value + ":00")}
                          className="bg-background/50 border-border/50"
                        />
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Column: Asset Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Select Asset Type</Label>
                  <Select value={assetType} onValueChange={setAssetType}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="All Assets" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Asset Search & List */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Assets"
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="pl-10 bg-background/50 border-border/50"
                    />
                  </div>

                  <div className="border rounded-lg border-border/50">
                    {/* Select All */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={handleSelectAll}
                    >
                      <Checkbox
                        checked={isSelectAllChecked}
                        ref={(el) => {
                          if (el) (el as any).indeterminate = isSelectAllIndeterminate;
                        }}
                      />
                      <span className="font-medium">Select All</span>
                      {selectedAssets.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {selectedAssets.length} selected
                        </Badge>
                      )}
                    </div>

                    {/* Asset List */}
                    <ScrollArea className="h-64">
                      {loadingAssets ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading vehicles...</span>
                        </div>
                      ) : filteredAssets.length > 0 ? (
                        filteredAssets.map(asset => (
                          <div
                            key={asset.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleAssetToggle(asset.id)}
                          >
                            <Checkbox checked={selectedAssets.includes(asset.id)} />
                            <span className="text-sm">{asset.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No assets found
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Right Column: Scheduling Options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Enable Scheduling</Label>
                  <Select 
                    value={enableScheduling ? "yes" : "no"} 
                    onValueChange={(v) => setEnableScheduling(v === "yes")}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {enableScheduling && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-primary">Schedule Rate</Label>
                      <Select value={scheduleRate} onValueChange={setScheduleRate}>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_RATES.map(rate => (
                            <SelectItem key={rate.value} value={rate.value}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Day Selection */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <div
                            key={day.value}
                            className="flex flex-col items-center gap-1 cursor-pointer"
                            onClick={() => handleDayToggle(day.value)}
                          >
                            <Checkbox checked={selectedDays.includes(day.value)} />
                            <span className="text-xs text-primary">{day.short}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-primary">Starting date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal bg-background/50 border-border/50"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {format(startingDate, "dd MMM yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={startingDate}
                              onSelect={(date) => date && setStartingDate(date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-primary">At time</Label>
                        <div className="relative">
                          <Input
                            type="time"
                            value={atTime.substring(0, 5)}
                            onChange={(e) => setAtTime(e.target.value + ":00")}
                            className="bg-background/50 border-border/50"
                          />
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-primary">Export Format</Label>
                      <Select value={exportFormat} onValueChange={setExportFormat}>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPORT_FORMATS.map(format => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-primary">Select Users</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary gap-2"
                        onClick={() => setRecipientsDialogOpen(true)}
                      >
                        <UserPlus className="w-4 h-4" />
                        Add recipients
                      </Button>

                      {recipients.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {recipients.map(email => (
                            <Badge key={email} variant="secondary" className="gap-1">
                              {email}
                              <X 
                                className="w-3 h-3 cursor-pointer hover:text-destructive" 
                                onClick={() => handleRemoveRecipient(email)} 
                              />
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span className="text-warning">No recipients selected for the report.</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6 pt-4 border-t border-border/50">
              <Button
                onClick={handleSave}
                className="px-8 shadow-md shadow-primary/20"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Recipients Selection Dialog */}
      <SelectRecipientsDialog
        open={recipientsDialogOpen}
        onOpenChange={setRecipientsDialogOpen}
        selectedRecipients={recipients}
        onConfirm={handleRecipientsConfirm}
      />
    </Dialog>
  );
};
