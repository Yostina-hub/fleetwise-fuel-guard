import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, CheckCircle, Clock, XCircle, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const FuelRequests = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["fuel-requests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("fuel_requests")
        .select("*, vehicles(plate_number, make, model), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "default";
      case "fulfilled": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "pending").length,
    approved: requests.filter((r: any) => r.status === "approved").length,
    totalLiters: requests.filter((r: any) => r.status === "fulfilled").reduce((s: number, r: any) => s + (r.liters_approved || 0), 0),
  };

  const filtered = requests.filter((r: any) =>
    !search || r.request_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.fuel_requests.title', 'Fuel Request & Clearance')}</h1><p className="text-muted-foreground">{t('pages.fuel_requests.description', 'Manage fuel request approvals and dispensing workflows')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> New Request</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Fuel className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Requests</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-sm text-muted-foreground">Pending Approval</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.approved}</p><p className="text-sm text-muted-foreground">Approved</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Fuel className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.totalLiters.toLocaleString()}L</p><p className="text-sm text-muted-foreground">Dispensed</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          {["all", "pending", "approved"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by request # or plate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
              <Card>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Request #</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Fuel Type</TableHead><TableHead>Liters</TableHead><TableHead>Est. Cost</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
                    (tab === "all" ? filtered : filtered.filter((r: any) => r.status === tab)).length === 0 ?
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No fuel requests found</TableCell></TableRow> :
                    (tab === "all" ? filtered : filtered.filter((r: any) => r.status === tab)).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                        <TableCell>{r.vehicles?.plate_number || "—"}</TableCell>
                        <TableCell>{r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : "—"}</TableCell>
                        <TableCell className="capitalize">{r.fuel_type}</TableCell>
                        <TableCell>{r.liters_requested}L</TableCell>
                        <TableCell>{r.estimated_cost ? `$${r.estimated_cost.toFixed(2)}` : "—"}</TableCell>
                        <TableCell><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(r.created_at), "MMM dd, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default FuelRequests;
