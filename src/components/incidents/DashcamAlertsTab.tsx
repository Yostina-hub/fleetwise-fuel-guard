import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Link2, Video, AlertTriangle, Eye, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { friendlyToastError } from "@/lib/errorMessages";

const severityColors: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground",
};

const DashcamAlertsTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedDashcamId, setSelectedDashcamId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [previewEvent, setPreviewEvent] = useState<any>(null);

  // Fetch dashcam events with their auto-linked alerts
  const { data: dashcamEvents = [], isLoading } = useQuery({
    queryKey: ["dashcam-alerts-tab", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("dash_cam_events")
        .select("*")
        .eq("organization_id", organizationId)
        .order("event_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch existing links
  const { data: links = [] } = useQuery({
    queryKey: ["dashcam-alert-links", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("alert_dashcam_links")
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch unlinked alerts for manual linking
  const { data: availableAlerts = [] } = useQuery({
    queryKey: ["unlinked-alerts", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, severity, alert_time")
        .eq("organization_id", organizationId)
        .order("alert_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && linkDialogOpen,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDashcamId || !selectedAlertId || !organizationId) throw new Error("Missing data");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("alert_dashcam_links").insert({
        organization_id: organizationId,
        alert_id: selectedAlertId,
        dashcam_event_id: selectedDashcamId,
        link_type: 'manual',
        linked_by: user?.id || null,
        notes: linkNotes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Linked", description: "Dashcam event linked to alert." });
      queryClient.invalidateQueries({ queryKey: ["dashcam-alert-links"] });
      setLinkDialogOpen(false);
      setSelectedDashcamId(null);
      setSelectedAlertId("");
      setLinkNotes("");
    },
    onError: (err: any) => {
      friendlyToastError(err);
    },
  });

  const getLinksForEvent = (eventId: string) => (links as any[]).filter((l: any) => l.dashcam_event_id === eventId);

  const autoLinkedCount = (links as any[]).filter((l: any) => l.link_type === 'auto').length;
  const manualLinkedCount = (links as any[]).filter((l: any) => l.link_type === 'manual').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Camera className="w-5 h-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Events</p><p className="text-2xl font-bold">{dashcamEvents.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="w-5 h-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">Critical Events</p><p className="text-2xl font-bold">{dashcamEvents.filter((e: any) => e.severity === 'critical').length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><Link2 className="w-5 h-5 text-success" /></div>
            <div><p className="text-sm text-muted-foreground">Auto-Linked</p><p className="text-2xl font-bold">{autoLinkedCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50"><Link2 className="w-5 h-5 text-accent-foreground" /></div>
            <div><p className="text-sm text-muted-foreground">Manual Links</p><p className="text-2xl font-bold">{manualLinkedCount}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Dashcam Events & Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>Linked Alerts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : dashcamEvents.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No dashcam events</TableCell></TableRow>
              ) : dashcamEvents.map((event: any) => {
                const eventLinks = getLinksForEvent(event.id);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">{format(new Date(event.event_time), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(event.event_type || '').replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", severityColors[event.severity] || severityColors.low)}>
                        {event.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{event.speed_kmh != null ? `${event.speed_kmh} km/h` : '—'}</TableCell>
                    <TableCell>
                      {event.ai_detected ? (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                          AI {event.ai_confidence ? `${Math.round(event.ai_confidence * 100)}%` : '✓'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {eventLinks.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-success" />
                          <span className="text-xs">{eventLinks.length} alert{eventLinks.length > 1 ? 's' : ''}</span>
                          {eventLinks.some((l: any) => l.link_type === 'auto') && (
                            <Badge variant="outline" className="text-[9px] px-1">auto</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">none</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {event.video_url && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewEvent(event)}>
                            <Video className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setSelectedDashcamId(event.id); setLinkDialogOpen(true); }}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewEvent(event)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manual Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Dashcam Event to Alert</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Alert</Label>
              <Select value={selectedAlertId} onValueChange={setSelectedAlertId}>
                <SelectTrigger><SelectValue placeholder="Choose alert..." /></SelectTrigger>
                <SelectContent>
                  {availableAlerts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      [{a.severity}] {a.title} — {format(new Date(a.alert_time), "MMM d, HH:mm")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={linkNotes} onChange={e => setLinkNotes(e.target.value)} placeholder="Why are you linking this?" />
            </div>
            <Button onClick={() => linkMutation.mutate()} disabled={!selectedAlertId || linkMutation.isPending} className="w-full">
              <Link2 className="w-4 h-4 mr-1" /> Link Event to Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewEvent} onOpenChange={open => { if (!open) setPreviewEvent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Dashcam Event Details</DialogTitle></DialogHeader>
          {previewEvent && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {(previewEvent.event_type || '').replace(/_/g, ' ')}</div>
                <div><span className="text-muted-foreground">Severity:</span> <Badge className={cn("text-xs", severityColors[previewEvent.severity])}>{previewEvent.severity}</Badge></div>
                <div><span className="text-muted-foreground">Time:</span> {format(new Date(previewEvent.event_time), "MMM d, yyyy HH:mm:ss")}</div>
                <div><span className="text-muted-foreground">Speed:</span> {previewEvent.speed_kmh ?? '—'} km/h</div>
                {previewEvent.lat && <div><span className="text-muted-foreground">Location:</span> {previewEvent.lat.toFixed(4)}, {previewEvent.lng?.toFixed(4)}</div>}
                {previewEvent.ai_detected && <div><span className="text-muted-foreground">AI Confidence:</span> {Math.round((previewEvent.ai_confidence || 0) * 100)}%</div>}
              </div>
              {previewEvent.thumbnail_url && (
                <img src={previewEvent.thumbnail_url} alt="Dashcam thumbnail" className="w-full rounded-lg border" />
              )}
              {previewEvent.video_url && (
                <a href={previewEvent.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> View Full Video
                </a>
              )}
              {previewEvent.notes && <p className="text-sm text-muted-foreground">{previewEvent.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashcamAlertsTab;
