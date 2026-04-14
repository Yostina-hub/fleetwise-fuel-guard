import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const DriverLogbook = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["driver-logbooks", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("driver_logbooks")
        .select("*, drivers(first_name, last_name), vehicles(plate_number)")
        .eq("organization_id", organizationId)
        .order("log_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const stats = {
    total: logs.length,
    compliant: logs.filter((l: any) => l.compliance_status === "compliant").length,
    violations: logs.filter((l: any) => l.compliance_status === "violation").length,
    avgDriving: logs.length > 0 ? (logs.reduce((s: number, l: any) => s + (l.driving_hours || 0), 0) / logs.length).toFixed(1) : "0",
  };

  const filtered = logs.filter((l: any) =>
    !search || l.drivers?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.drivers?.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">{t('pages.driver_logbook.title', 'Driver Logbook')}</h1><p className="text-muted-foreground">{t('pages.driver_logbook.description', 'Track duty hours, rest periods, and compliance with driving regulations')}</p></div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BookOpen className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Log Entries</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.compliant}</p><p className="text-sm text-muted-foreground">Compliant</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.violations}</p><p className="text-sm text-muted-foreground">Violations</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.avgDriving}h</p><p className="text-sm text-muted-foreground">Avg Drive/Day</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="logs">
          <TabsList><TabsTrigger value="logs">All Logs</TabsTrigger><TabsTrigger value="violations">Violations</TabsTrigger></TabsList>

          <TabsContent value="logs" className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by driver name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.driver', 'Driver')}</TableHead><TableHead>{t('common.vehicle', 'Vehicle')}</TableHead><TableHead>Driving</TableHead><TableHead>Rest</TableHead><TableHead>Breaks</TableHead><TableHead>Distance</TableHead><TableHead>{t('common.status', 'Status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">{t('common.loading', 'Loading...')}<TableCell></TableRow> :
                filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No logbook entries yet</TableCell></TableRow> :
                filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{format(new Date(l.log_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{l.drivers ? `${l.drivers.first_name} ${l.drivers.last_name}` : "—"}</TableCell>
                    <TableCell>{l.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell>{l.driving_hours?.toFixed(1)}h</TableCell>
                    <TableCell>{l.rest_hours?.toFixed(1)}h</TableCell>
                    <TableCell>{l.break_count} ({l.total_break_minutes}m)</TableCell>
                    <TableCell>{l.distance_km?.toFixed(0)} km</TableCell>
                    <TableCell><Badge variant={l.compliance_status === "compliant" ? "secondary" : "destructive"}>{l.compliance_status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>

          <TabsContent value="violations">
            <Card><CardHeader><CardTitle>HOS Violations</CardTitle></CardHeader><CardContent>
              {stats.violations === 0 ? <p className="text-muted-foreground text-center py-8">{t('pages.driver_logbook.description', 'No violations recorded')}</p> :
              <Table><TableHeader><TableRow><TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.driver', 'Driver')}</TableHead><TableHead>Driving Hours</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.filter((l: any) => l.compliance_status === "violation").map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{format(new Date(l.log_date), "MMM dd")}</TableCell>
                  <TableCell>{l.drivers ? `${l.drivers.first_name} ${l.drivers.last_name}` : "—"}</TableCell>
                  <TableCell className="text-destructive font-bold">{l.driving_hours?.toFixed(1)}h</TableCell>
                  <TableCell>{l.violations ? JSON.stringify(l.violations) : "Exceeded daily limit"}</TableCell>
                </TableRow>
              ))}</TableBody></Table>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DriverLogbook;
