import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, CheckCircle2, AlertCircle, MapPin, FileText, Truck, Wrench, ClipboardCheck, CreditCard, Inbox } from "lucide-react";

interface Props {
  requestId: string;
}

const actionIcon = (action: string) => {
  if (action.includes("delivered")) return Truck;
  if (action.includes("received")) return Inbox;
  if (action.includes("inspection")) return ClipboardCheck;
  if (action.includes("po_") || action.includes("pdr")) return FileText;
  if (action.includes("payment")) return CreditCard;
  if (action.includes("rejected")) return AlertCircle;
  if (action.includes("submitted") || action.includes("created")) return FileText;
  return Wrench;
};

const actionTone = (action: string) => {
  if (action.includes("rejected") || action.includes("fail")) return "text-destructive bg-destructive/10";
  if (action.includes("accepted") || action.includes("pass") || action.includes("received")) return "text-success bg-success/10";
  if (action.includes("delivered") || action.includes("submitted")) return "text-primary bg-primary/10";
  return "text-warning bg-warning/10";
};

const MaintenanceWorkflowTimeline = ({ requestId }: Props) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["maintenance-workflow-events", requestId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("maintenance_workflow_events")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">No workflow activity yet.</div>;
  }

  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden="true" />
      {events.map((evt: any) => {
        const Icon = actionIcon(evt.action);
        const tone = actionTone(evt.action);
        const geo = evt.metadata?.geofence_verified;
        return (
          <div key={evt.id} className="relative">
            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${tone} ring-2 ring-background`}>
              <Icon className="w-3 h-3" />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium capitalize">
                  {evt.action.replace(/_/g, " ")}
                </span>
                {evt.step_number && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    Step {evt.step_number}
                  </span>
                )}
                {geo === true && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> Geofence verified
                  </span>
                )}
                {geo === false && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> Outside geofence
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {evt.actor_name || "System"}
                {evt.actor_role && <span className="opacity-60"> · {evt.actor_role}</span>}
                <span className="opacity-60"> · {format(new Date(evt.created_at), "MMM dd, HH:mm")}</span>
              </div>
              {evt.notes && <p className="text-xs mt-1 text-foreground/80">{evt.notes}</p>}
              {evt.metadata?.distance_m !== undefined && evt.metadata?.distance_m !== null && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Distance from supplier: {Math.round(evt.metadata.distance_m)} m
                </p>
              )}
              {evt.from_stage && evt.to_stage && evt.from_stage !== evt.to_stage && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {evt.from_stage} → <span className="text-foreground">{evt.to_stage}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MaintenanceWorkflowTimeline;
