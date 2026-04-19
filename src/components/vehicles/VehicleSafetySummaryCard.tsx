import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, ChevronRight, CalendarClock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useVehicleSafetySummary } from "@/hooks/useVehicleSafetySummary";
import { cn } from "@/lib/utils";
import SafetyComfortReportDialog from "@/components/safety-comfort/SafetyComfortReportDialog";

interface Props {
  vehicleId: string;
}

export const VehicleSafetySummaryCard = ({ vehicleId }: Props) => {
  const { data, isLoading } = useVehicleSafetySummary(vehicleId);
  const [reportOpen, setReportOpen] = useState(false);
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <div className="border-t px-4 py-3 bg-muted/20">
        <div className="text-xs text-muted-foreground">Loading safety summary…</div>
      </div>
    );
  }

  const hasFlags = (data?.flaggedItems.length ?? 0) > 0;
  const Icon = hasFlags ? ShieldAlert : ShieldCheck;

  return (
    <div className="border-t px-4 py-3 bg-muted/20">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              hasFlags ? "bg-destructive/10" : "bg-success/10"
            )}
          >
            <Icon className={cn("w-5 h-5", hasFlags ? "text-destructive" : "text-success")} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">Safety & Comfort</p>
              {data?.lastReference && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {data.lastReference}
                </Badge>
              )}
              {data?.lastStatus && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-4 px-1.5 capitalize",
                    data.lastStatus === "completed"
                      ? "border-success/40 text-success"
                      : "border-warning/40 text-warning"
                  )}
                >
                  {data.lastStage}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm truncate">
              {data?.lastInspectionAt
                ? `Last inspection ${format(new Date(data.lastInspectionAt), "dd MMM yyyy")}`
                : "No inspections recorded"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Flagged</p>
            <p className={cn("font-bold text-lg leading-none", hasFlags ? "text-destructive" : "text-success")}>
              {data?.flaggedItems.length ?? 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Open</p>
            <p className="font-bold text-lg leading-none text-warning">{data?.totalOpen ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Closed</p>
            <p className="font-bold text-lg leading-none text-muted-foreground">{data?.totalCompleted ?? 0}</p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setReportOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Report
          </Button>
          <Button variant="outline" size="sm" asChild className="h-8 gap-1">
            <Link to="/sop/safety-comfort">
              View
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {hasFlags && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data!.flaggedItems.map(item => (
            <div
              key={item.key}
              className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-medium text-foreground capitalize truncate">{item.label}</p>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize border-destructive/40 text-destructive">
                    {item.status}
                  </Badge>
                </div>
                {item.usability_period && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                    <CalendarClock className="w-3 h-3" />
                    <span className="truncate">{item.usability_period}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SafetyComfortReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        prefill={{ vehicle_id: vehicleId }}
        onSubmitted={() => {
          qc.invalidateQueries({ queryKey: ["vehicle-safety-summary", vehicleId] });
        }}
      />
    </div>
  );
};

export default VehicleSafetySummaryCard;
