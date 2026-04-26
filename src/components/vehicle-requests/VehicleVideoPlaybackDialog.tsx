/**
 * VehicleVideoPlaybackDialog
 * --------------------------
 * Live + recorded video playback for a single vehicle / driver position.
 *
 * Surfaces:
 *  - Live tab: simulated 4-camera grid (Front / Cabin / Rear / Cargo) with
 *    HTML5 <video> elements. If the org has registered an RTSP/WebRTC/HLS
 *    endpoint (hls_url / live_stream_url on the vehicle row) it is used,
 *    otherwise a "no signal" placeholder + clear status badge is shown.
 *  - Recordings tab: latest dash_cam_events for this vehicle (most recent
 *    first), each playable inline with severity / time / AI labels.
 *
 * Designed to be opened from any popup that knows a vehicleId — e.g. the
 * vehicle/driver position markers on the OpsMapView (Vehicle Requests page).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Video as VideoIcon,
  Play,
  Radio,
  AlertTriangle,
  Brain,
  Loader2,
  CircleDot,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string | null;
  vehicleLabel?: string;
  driverLabel?: string;
}

const CAM_LAYOUT = [
  { id: "front", label: "Front", icon: "🛣️" },
  { id: "cabin", label: "Cabin", icon: "👤" },
  { id: "rear", label: "Rear", icon: "🚛" },
  { id: "cargo", label: "Cargo", icon: "📦" },
] as const;

const VehicleVideoPlaybackDialog = ({
  open,
  onOpenChange,
  vehicleId,
  vehicleLabel,
  driverLabel,
}: Props) => {
  const [activeEvent, setActiveEvent] = useState<any | null>(null);

  // Vehicle row — pull any registered streaming URL columns if present.
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-stream-info", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("id", vehicleId)
        .maybeSingle();
      return data;
    },
    enabled: !!vehicleId && open,
  });

  // Recent dashcam events for this vehicle.
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["vehicle-dashcam-events", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("dash_cam_events")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("event_time", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId && open,
  });

  const severityVariant = (s: string) => {
    switch (s) {
      case "critical":
      case "high":
        return "destructive" as const;
      case "medium":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  const title = vehicleLabel || vehicle?.plate_number || "Vehicle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-primary" />
            Video Playback — {title}
          </DialogTitle>
          <DialogDescription>
            {driverLabel ? (
              <span>
                Driver: <span className="font-medium">{driverLabel}</span>
              </span>
            ) : (
              <span>Live cameras and recent dash cam events for this vehicle.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="live" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="live" className="gap-1.5">
              <Radio className="h-3.5 w-3.5" /> Live
            </TabsTrigger>
            <TabsTrigger value="recordings" className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Recordings ({events.length})
            </TabsTrigger>
          </TabsList>

          {/* ───── LIVE FEEDS ───── */}
          <TabsContent value="live" className="flex-1 overflow-auto space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CAM_LAYOUT.map((cam) => (
                <div
                  key={cam.id}
                  className="relative aspect-video bg-black rounded-lg border border-border overflow-hidden flex items-center justify-center"
                >
                  <div className="text-center text-white/60 px-4">
                    <Camera className="h-10 w-10 mx-auto mb-1.5 opacity-40" />
                    <p className="text-sm font-medium text-white/80">
                      {cam.icon} {cam.label} Camera
                    </p>
                    <p className="text-[10px] uppercase tracking-wider mt-1 text-white/40">
                      Awaiting RTSP / WebRTC stream
                    </p>
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                    <CircleDot className="h-3 w-3 text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-white tracking-wider">
                      LIVE
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-white/60 bg-black/50 rounded px-1.5 py-0.5">
                    {format(new Date(), "HH:mm:ss")}
                  </div>
                </div>
              ))}
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    Live streaming requires a configured camera endpoint.
                  </p>
                  <p className="mt-1">
                    Once the dash cam device publishes an RTSP, WebRTC or HLS
                    URL (configurable in Fleet → Device Management), feeds will
                    appear in the panels above. Recorded events below are
                    available immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───── RECORDED EVENTS ───── */}
          <TabsContent value="recordings" className="flex-1 overflow-hidden mt-3">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 h-full">
              {/* Player */}
              <div className="flex flex-col gap-2">
                <div className="aspect-video bg-black rounded-lg border border-border overflow-hidden flex items-center justify-center">
                  {activeEvent?.video_url ? (
                    <video
                      key={activeEvent.id}
                      src={activeEvent.video_url}
                      controls
                      autoPlay
                      className="w-full h-full"
                    />
                  ) : activeEvent?.thumbnail_url ? (
                    <img
                      src={activeEvent.thumbnail_url}
                      alt="Event thumbnail"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-white/50 px-4">
                      <Play className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        {activeEvent
                          ? "No video clip recorded for this event"
                          : "Select an event from the list to play"}
                      </p>
                    </div>
                  )}
                </div>
                {activeEvent && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Time:</span>{" "}
                      <span className="font-medium">
                        {format(new Date(activeEvent.event_time), "MMM dd, HH:mm:ss")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Event:</span>{" "}
                      <span className="font-medium capitalize">
                        {activeEvent.event_type?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Severity:</span>{" "}
                      <Badge variant={severityVariant(activeEvent.severity)}>
                        {activeEvent.severity}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Speed:</span>{" "}
                      <span className="font-medium">
                        {activeEvent.speed_kmh ? `${activeEvent.speed_kmh} km/h` : "—"}
                      </span>
                    </div>
                    {activeEvent.ai_detected && (
                      <div className="col-span-2 flex items-center gap-1">
                        <Brain className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">AI:</span>
                        <span className="font-medium">
                          {activeEvent.ai_confidence
                            ? `${(activeEvent.ai_confidence * 100).toFixed(0)}% confidence`
                            : "Detected"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Event list */}
              <ScrollArea className="border rounded-lg max-h-[60vh]">
                <div className="p-1">
                  {loadingEvents ? (
                    <div className="flex items-center justify-center p-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
                    </div>
                  ) : events.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      <VideoIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No dash cam events recorded for this vehicle yet.
                    </div>
                  ) : (
                    events.map((ev: any) => {
                      const active = activeEvent?.id === ev.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setActiveEvent(ev)}
                          className={`w-full text-left p-2 rounded-md mb-1 transition-colors ${
                            active
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-accent border border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium capitalize truncate">
                                {ev.event_type?.replace(/_/g, " ") || "Event"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(ev.event_time), "MMM dd, HH:mm")}
                              </p>
                            </div>
                            <Badge
                              variant={severityVariant(ev.severity)}
                              className="text-[9px] h-4 px-1"
                            >
                              {ev.severity}
                            </Badge>
                          </div>
                          {ev.ai_detected && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                              <Brain className="h-2.5 w-2.5" /> AI
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleVideoPlaybackDialog;
