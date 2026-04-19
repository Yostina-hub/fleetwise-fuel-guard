import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Wrench, Clock, Plus, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { NewRoadsideRequestDialog } from "@/components/roadside/NewRoadsideRequestDialog";
import { RoadsideRequestDetailDialog } from "@/components/roadside/RoadsideRequestDetailDialog";

const RoadsideAssistance = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

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
    active: requests.filter((r: any) => ["requested", "dispatched", "en_route", "on_site"].includes(r.status)).length,
    resolved: requests.filter((r: any) => r.status === "resolved").length,
    avgResponse: requests.filter((r: any) => r.provider_eta_minutes).length > 0
      ? Math.round(requests.reduce((s: number, r: any) => s + (r.provider_eta_minutes || 0), 0) / requests.filter((r: any) => r.provider_eta_minutes).length)
      : 0,
  };

  const statusColor = (s: string): "outline" | "default" | "secondary" | "destructive" => {
    switch (s) {
      case "requested": return "outline";
      case "dispatched": case "en_route": case "on_site": return "default";
      case "resolved": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const filtered = requests.filter((r: any) =>
    !search || r.request_number?.toLowerCase().includes(search.toLowerCase()) || r.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("pages.roadside_assistance.title", "Roadside Assistance")}</h1>
            <p className="text-muted-foreground">{t("pages.roadside_assistance.description", "Manage breakdown requests, tow services & emergency response")}</p>
          </div>
          <Button variant="destructive" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Emergency Request
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Phone className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">{t("common.totalRequests", "Total Requests")}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-sm text-muted-foreground">Active Now</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wrench className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.resolved}</p><p className="text-sm text-muted-foreground">Resolved</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.avgResponse}m</p><p className="text-sm text-muted-foreground">Avg. ETA</p></div></div></CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("fuel.searchPlaceholder", "Search by request # or plate...")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.requestNumber", "Request #")}</TableHead>
                <TableHead>{t("common.vehicle", "Vehicle")}</TableHead>
                <TableHead>{t("common.type", "Type")}</TableHead>
                <TableHead>{t("common.location", "Location")}</TableHead>
                <TableHead>{t("insurance.provider", "Provider")}</TableHead>
                <TableHead>{t("common.priority", "Priority")}</TableHead>
                <TableHead>{t("common.status", "Status")}</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">{t("common.loading", "Loading...")}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assistance requests. Click "Emergency Request" to create one.</TableCell></TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell>{r.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell className="capitalize">{r.breakdown_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.location_name || (r.lat ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : "—")}</TableCell>
                    <TableCell>{r.service_provider || "—"}</TableCell>
                    <TableCell><Badge variant={r.priority === "high" || r.priority === "critical" ? "destructive" : "outline"}>{r.priority}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor(r.status)}>{r.status?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(r.requested_at), "MMM dd, HH:mm")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <NewRoadsideRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RoadsideRequestDetailDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} request={selected} />
    </Layout>
  );
};

export default RoadsideAssistance;
