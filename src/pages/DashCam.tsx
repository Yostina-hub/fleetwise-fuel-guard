import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Video, AlertTriangle, Eye, Search, Brain, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const DashCam = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["dash-cam-events", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("dash_cam_events")
        .select("*, vehicles(plate_number, make, model), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("event_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const filtered = events.filter((e: any) => {
    const matchSearch = !search || e.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      e.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "all" || e.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  const stats = {
    total: events.length,
    critical: events.filter((e: any) => e.severity === "critical").length,
    aiDetected: events.filter((e: any) => e.ai_detected).length,
    unreviewed: events.filter((e: any) => e.status === "new").length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dash Cam Management</h1>
            <p className="text-muted-foreground">Monitor camera events, AI-detected incidents & video playback</p>
          </div>
          <Button><Camera className="h-4 w-4 mr-2" /> Configure Cameras</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Video className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Events</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.critical}</p><p className="text-sm text-muted-foreground">Critical Events</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Brain className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.aiDetected}</p><p className="text-sm text-muted-foreground">AI Detected</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Eye className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.unreviewed}</p><p className="text-sm text-muted-foreground">Pending Review</p></div></div></CardContent></Card>
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
                  <TableHead>Time</TableHead><TableHead>Vehicle</TableHead><TableHead>Event</TableHead><TableHead>Severity</TableHead><TableHead>AI</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
                  filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No dash cam events recorded yet</TableCell></TableRow> :
                  filtered.map((ev: any) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-sm">{format(new Date(ev.event_time), "MMM dd, HH:mm")}</TableCell>
                      <TableCell className="font-medium">{ev.vehicles?.plate_number || "—"}</TableCell>
                      <TableCell className="capitalize">{ev.event_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell><Badge variant={severityColor(ev.severity)}>{ev.severity}</Badge></TableCell>
                      <TableCell>{ev.ai_detected ? <Badge variant="outline" className="text-blue-600"><Brain className="h-3 w-3 mr-1" />AI</Badge> : "—"}</TableCell>
                      <TableCell><Badge variant={ev.status === "new" ? "default" : "secondary"}>{ev.status}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="ghost"><Play className="h-4 w-4" /></Button></TableCell>
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
                  <div key={i} className="relative aspect-video bg-black rounded-lg flex items-center justify-center border border-border overflow-hidden group">
                    <div className="text-center text-muted-foreground"><Camera className="h-12 w-12 mx-auto mb-2 text-white/30" /><p className="text-white/50">Camera Feed {i}</p><p className="text-xs text-white/30">RTSP stream • Waiting for connection</p></div>
                    <div className="absolute top-2 left-2 flex items-center gap-1"><Badge variant="outline" className="text-xs bg-black/50 text-white border-white/20">● LIVE</Badge></div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-white/70 hover:text-white bg-black/30"><Play className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                <p className="font-medium">Streaming Protocol Support</p>
                <p className="text-muted-foreground text-xs mt-1">Supports RTSP, WebRTC, and HLS protocols. Configure camera endpoints in Fleet → Device Management to enable live streaming.</p>
              </div>
            </CardContent></Card>

            {/* Voice Communication Panel */}
            <Card><CardHeader><CardTitle>Push-to-Talk (PTT) Voice Communication</CardTitle></CardHeader><CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium text-sm">Two-Way Audio</p>
                  <p className="text-xs text-muted-foreground mt-1">Talk to driver through dash cam speaker</p>
                  <Button size="sm" className="mt-2" variant="outline">Connect</Button>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center mb-2">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                  <p className="font-medium text-sm">Emergency Broadcast</p>
                  <p className="text-xs text-muted-foreground mt-1">Send alert to all active drivers</p>
                  <Button size="sm" className="mt-2" variant="destructive">Broadcast</Button>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                    <Eye className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="font-medium text-sm">Group PTT Channel</p>
                  <p className="text-xs text-muted-foreground mt-1">Fleet-wide push-to-talk channel</p>
                  <Button size="sm" className="mt-2" variant="outline">Join Channel</Button>
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card><CardHeader><CardTitle>AI Event Detection</CardTitle></CardHeader><CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold flex items-center gap-2"><Brain className="h-5 w-5" /> AI-Powered Detection</h3>
                  <p className="text-sm text-muted-foreground mt-1">Automatic detection of: drowsy driving, phone usage, smoking, tailgating, lane departure, collision events, and unauthorized driver identification.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Drowsiness", "Phone Usage", "Tailgating", "Lane Departure", "Collision", "Smoking", "Unauth. Driver", "Seatbelt"].map(t => (
                    <Card key={t}><CardContent className="p-4 text-center"><p className="text-sm font-medium">{t}</p><p className="text-2xl font-bold mt-1">{events.filter((e: any) => e.ai_labels && JSON.stringify(e.ai_labels).toLowerCase().includes(t.toLowerCase())).length}</p></CardContent></Card>
                  ))}
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DashCam;
