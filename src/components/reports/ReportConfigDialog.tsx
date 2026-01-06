import { useState, useMemo, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportTimePeriodSelect, TimePeriodOption, getDateRangeFromPeriod } from "./ReportTimePeriodSelect";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface Asset {
  id: string;
  name: string;
  type: string;
}

interface ReportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  onGenerate: (config: ReportConfig) => void;
}

export interface ReportConfig {
  timePeriod: TimePeriodOption;
  dateRange: { from: Date; to: Date };
  assetType: string;
  selectedAssets: string[];
  violationTypes?: string[];
}

const ASSET_TYPES = [
  { value: "all", label: "All Assets" },
  { value: "vehicle", label: "Vehicles" },
  { value: "truck", label: "Trucks" },
  { value: "equipment", label: "Equipment" },
];

const VIOLATION_TYPES = [
  { value: "speeding", label: "Speeding" },
  { value: "harsh_braking", label: "Harsh Braking" },
  { value: "harsh_acceleration", label: "Harsh Acceleration" },
  { value: "harsh_cornering", label: "Harsh Cornering" },
  { value: "geofence", label: "Geofence Violation" },
  { value: "idle", label: "Excessive Idle" },
];

export const ReportConfigDialog = ({
  open,
  onOpenChange,
  reportName,
  onGenerate,
}: ReportConfigDialogProps) => {
  const { organizationId } = useOrganization();
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>("last_7_days");
  const [dateRange, setDateRange] = useState(getDateRangeFromPeriod("last_7_days"));
  const [assetType, setAssetType] = useState("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

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

  // Reset selections when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedAssets([]);
      setAssetSearch("");
      setAssetType("all");
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

  const handleViolationToggle = (violation: string) => {
    setSelectedViolations(prev => 
      prev.includes(violation)
        ? prev.filter(v => v !== violation)
        : [...prev, violation]
    );
  };

  const handleGenerate = () => {
    onGenerate({
      timePeriod,
      dateRange,
      assetType,
      selectedAssets,
      violationTypes: selectedViolations,
    });
    onOpenChange(false);
  };

  const isSelectAllChecked = selectedAssets.length === filteredAssets.length && filteredAssets.length > 0;
  const isSelectAllIndeterminate = selectedAssets.length > 0 && selectedAssets.length < filteredAssets.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-primary text-primary-foreground">
          <DialogTitle className="text-lg font-semibold uppercase tracking-wide flex items-center justify-between">
            {reportName}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Asset Selection */}
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
                  <ScrollArea className="h-48">
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

              {/* Violation Types (conditional) */}
              {reportName.toLowerCase().includes("violation") && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-primary">Select Violation Type/s</Label>
                  <Select>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Select violations">
                        {selectedViolations.length > 0 
                          ? `${selectedViolations.length} selected`
                          : "Select violations"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {VIOLATION_TYPES.map(type => (
                        <div
                          key={type.value}
                          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded"
                          onClick={(e) => {
                            e.preventDefault();
                            handleViolationToggle(type.value);
                          }}
                        >
                          <Checkbox checked={selectedViolations.includes(type.value)} />
                          <span className="text-sm">{type.label}</span>
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Right Column: Time Period */}
            <div className="space-y-4">
              <ReportTimePeriodSelect
                value={timePeriod}
                onChange={setTimePeriod}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-border/50">
            <Button
              onClick={handleGenerate}
              className="px-8 shadow-md shadow-primary/20"
              disabled={selectedAssets.length === 0}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
