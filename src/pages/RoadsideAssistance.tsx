import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Wrench, MapPin, Clock, Plus, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const RoadsideAssistance = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["roadside-assistance", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("roadside_assistance_requests")
        .select("*, vehicles(plate_number, make, model), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const stats = {
    total: requests.length,
    active: requests.filter((r: any) => ["requested", "dispatched", "en_route"].includes(r.status)).length,
    resolved: requests.filter((r: any) => r.status === "resolved").length,
    avgResponse: requests.filter((r: any) => r.provider_eta_minutes).length > 0
      ? Math.round(requests.reduce((s: number, r: any) => s + (r.provider_eta_minutes || 0), 0) / requests.filter((r: any) => r.provider_eta_minutes).length)
      : 0,
  };

  const statusColor = (s: string) => {
    switch (s) { case "requested": return "outline"; case "dispatched": return "default"; case "resolved": return "secondary"; default: return "outline"; }
  };

  const filtered = requests.filter((r: any) =>
    !search || r.request_number?.toLowerCase().includes(search.toLowerCase()) || r.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Roadside Assistance</h1><p className="text-muted-foreground">Manage breakdown requests, tow services & emergency response</p></div>
          <Button variant="destructive"><Plus className="h-4 w-4 mr-2" /> Emergency Request</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Phone className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Requests</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-sm text-muted-foreground">Active Now</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wrench className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.resolved}</p><p className="text-sm text-muted-foreground">Resolved</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.avgResponse}m</p><p className="text-sm text-muted-foreground">Avg. ETA</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by request # or plate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Request #</TableHead><TableHead>Vehicle</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Provider</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assistance requests</TableCell></TableRow> :
            filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                <TableCell>{r.vehicles?.plate_number || "—"}</TableCell>
                <TableCell className="capitalize">{r.breakdown_type?.replace(/_/g, " ")}</TableCell>
                <TableCell className="max-w-[150px] truncate">{r.location_name || (r.lat ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : "—")}</TableCell>
                <TableCell>{r.service_provider || "—"}</TableCell>
                <TableCell><Badge variant={r.priority === "high" ? "destructive" : "outline"}>{r.priority}</Badge></TableCell>
                <TableCell><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                <TableCell className="text-sm">{format(new Date(r.requested_at), "MMM dd, HH:mm")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default RoadsideAssistance;
