import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Video, AlertTriangle, Eye, Search, Brain, Play, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const DashCam = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["dash-cam-events", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("dash_cam_events")
        .select("*, vehicles(plate_number, make, model), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("event_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase.from("dash_cam_events").update({
        status, notes: notes || null, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dash-cam-events"] });
      setSelectedEvent(null);
      setReviewNotes("");
      toast.success("Event reviewed");
    },
  });

  const bulkReviewMutation = useMutation({
    mutationFn: async (status: string) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await supabase.from("dash_cam_events").update({
          status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
        }).eq("id", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dash-cam-events"] });
      setSelectedIds(new Set());
      toast.success("Bulk review completed");
    },
  });

  const filtered = events.filter((e: any) => {
    const matchSearch = !search || e.event_type?.toLowerCase().includes(search.toLowerCase()) || e.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "all" || e.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  const severityColor = (s: string) => {
    switch (s) { case "critical": case "high": return "destructive"; case "medium": return "default"; default: return "secondary"; }
  };

  const stats = {
    total: events.length,
    critical: events.filter((e: any) => e.severity === "critical").length,
    aiDetected: events.filter((e: any) => e.ai_detected).length,
    unreviewed: events.filter((e: any) => e.status === "new" || !e.status).length,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e: any) => e.id)));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('dashCam.title')}</h1>
            <p className="text-muted-foreground">{t('dashCam.events')}</p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline">{selectedIds.size} selected</Badge>
              <Button size="sm" variant="outline" onClick={() => bulkReviewMutation.mutate("approved")} disabled={bulkReviewMutation.isPending}>
                <CheckCircle className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkReviewMutation.mutate("dismissed")} disabled={bulkReviewMutation.isPending}>
                <XCircle className="h-3 w-3 mr-1" /> Dismiss
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Video className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Events</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.critical}</p><p className="text-sm text-muted-foreground">Critical</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Brain className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.aiDetected}</p><p className="text-sm text-muted-foreground">AI Detected</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Eye className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{stats.unreviewed}</p><p className="text-sm text-muted-foreground">Pending Review</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Event Log</TabsTrigger>
            <TabsTrigger value="live">Live Feed</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by event or plate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Severity</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Time</TableHead><TableHead>{t('common.vehicle', 'Vehicle')}</TableHead><TableHead>{t('common.driver', 'Driver')}</TableHead><TableHead>Event</TableHead><TableHead>Severity</TableHead><TableHead>AI</TableHead><TableHead>{t('common.status', 'Status')}</TableHead><TableHead>{t('common.actions', 'Actions')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">{t('common.loading', 'Loading...')}<TableCell></TableRow> :
                  filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No dash cam events recorded yet</TableCell></TableRow> :
                  filtered.map((ev: any) => (
                    <TableRow key={ev.id} className={ev.severity === "critical" ? "bg-destructive/5" : ""}>
                      <TableCell><Checkbox checked={selectedIds.has(ev.id)} onCheckedChange={() => toggleSelect(ev.id)} /></TableCell>
                      <TableCell className="text-sm">{format(new Date(ev.event_time), "MMM dd, HH:mm")}</TableCell>
                      <TableCell className="font-medium">{ev.vehicles?.plate_number || "—"}</TableCell>
                      <TableCell className="text-sm">{ev.drivers ? `${ev.drivers.first_name} ${ev.drivers.last_name}` : "—"}</TableCell>
                      <TableCell className="capitalize">{ev.event_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell><Badge variant={severityColor(ev.severity)}>{ev.severity}</Badge></TableCell>
                      <TableCell>{ev.ai_detected ? <Badge variant="outline"><Brain className="h-3 w-3 mr-1" />AI</Badge> : "—"}</TableCell>
                      <TableCell><Badge variant={ev.status === "approved" ? "default" : ev.status === "dismissed" ? "secondary" : "outline"}>{ev.status || "new"}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedEvent(ev); setReviewNotes(ev.notes || ""); }}>
                          <Play className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <Card><CardHeader><CardTitle>Live Camera Feeds (RTSP/WebRTC)</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="relative aspect-video bg-black rounded-lg flex items-center justify-center border border-border overflow-hidden">
                    <div className="text-center"><Camera className="h-12 w-12 mx-auto mb-2 opacity-30" style={{ color: "white" }} /><p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Camera Feed {i}</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>RTSP stream • Waiting for connection</p></div>
                    <div className="absolute top-2 left-2"><Badge variant="outline" className="text-xs">● LIVE</Badge></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-accent rounded-lg border text-sm">
                <p className="font-medium">Streaming Protocol Support</p>
                <p className="text-muted-foreground text-xs mt-1">Supports RTSP, WebRTC, and HLS protocols. Configure camera endpoints in Fleet → Device Management.</p>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card><CardHeader><CardTitle>AI Event Detection Summary</CardTitle></CardHeader><CardContent>
              <div className="p-4 bg-accent rounded-lg border mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Brain className="h-5 w-5" /> AI-Powered Detection</h3>
                <p className="text-sm text-muted-foreground mt-1">Automatic detection of: drowsy driving, phone usage, smoking, tailgating, lane departure, collision events, and unauthorized drivers.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Drowsiness", "Phone Usage", "Tailgating", "Lane Departure", "Collision", "Smoking", "Unauth. Driver", "Seatbelt"].map(t => (
                  <Card key={t}><CardContent className="p-4 text-center"><p className="text-sm font-medium">{t}</p><p className="text-2xl font-bold mt-1">{events.filter((e: any) => e.ai_labels && JSON.stringify(e.ai_labels).toLowerCase().includes(t.toLowerCase())).length}</p></CardContent></Card>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Review Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Event Review — {selectedEvent?.event_type?.replace(/_/g, " ")}</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center border">
                {selectedEvent.video_url ? (
                  <video src={selectedEvent.video_url} controls className="w-full h-full rounded-lg" />
                ) : selectedEvent.thumbnail_url ? (
                  <img src={selectedEvent.thumbnail_url} alt="Event thumbnail" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center"><Camera className="h-16 w-16 mx-auto mb-2 opacity-30" style={{ color: "white" }} /><p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>No video available</p></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{selectedEvent.vehicles?.plate_number || "—"}</span></div>
                <div><span className="text-muted-foreground">Driver:</span> <span className="font-medium">{selectedEvent.drivers ? `${selectedEvent.drivers.first_name} ${selectedEvent.drivers.last_name}` : "—"}</span></div>
                <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{format(new Date(selectedEvent.event_time), "MMM dd, yyyy HH:mm:ss")}</span></div>
                <div><span className="text-muted-foreground">Severity:</span> <Badge variant={severityColor(selectedEvent.severity)}>{selectedEvent.severity}</Badge></div>
                <div><span className="text-muted-foreground">Speed:</span> <span className="font-medium">{selectedEvent.speed_kmh ? `${selectedEvent.speed_kmh} km/h` : "—"}</span></div>
                <div><span className="text-muted-foreground">AI Confidence:</span> <span className="font-medium">{selectedEvent.ai_confidence ? `${(selectedEvent.ai_confidence * 100).toFixed(0)}%` : "—"}</span></div>
                {selectedEvent.ai_labels && (
                  <div className="col-span-2"><span className="text-muted-foreground">AI Labels:</span> <span className="font-medium">{JSON.stringify(selectedEvent.ai_labels)}</span></div>
                )}
              </div>

              <div><Label>Review Notes</Label><Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review notes..." rows={3} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button variant="destructive" onClick={() => reviewMutation.mutate({ id: selectedEvent?.id, status: "dismissed", notes: reviewNotes })} disabled={reviewMutation.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> Dismiss
            </Button>
            <Button onClick={() => reviewMutation.mutate({ id: selectedEvent?.id, status: "approved", notes: reviewNotes })} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DashCam;
