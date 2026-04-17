import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, CheckCircle, XCircle, Clock, Search, Plus, Sticker } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { ScheduleInspectionDialog } from "@/components/inspections/ScheduleInspectionDialog";
import { cn } from "@/lib/utils";

import { useTranslation } from 'react-i18next';

const TYPE_CHIPS = [
  { value: "all", label: "All" },
  { value: "annual", label: "Annual" },
  { value: "pre_trip", label: "Pre-Trip" },
  { value: "post_trip", label: "Post-Trip" },
  { value: "internal", label: "Internal" },
  { value: "roadworthiness", label: "Roadworthiness" },
  { value: "routine", label: "Routine" },
];

const VehicleInspections = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("annual");

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["vehicle-inspections", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*, vehicles(plate_number, make, model), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("inspection_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const stats = {
    total: inspections.length,
    passed: inspections.filter((i: any) => i.overall_result === "pass").length,
    failed: inspections.filter((i: any) => i.overall_result === "fail").length,
    upcoming: inspections.filter((i: any) => i.status === "scheduled").length,
  };

  const filtered = inspections.filter((i: any) => {
    const matchSearch = !search || i.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.sticker_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || i.inspection_type === typeFilter;
    return matchSearch && matchType;
  });

  const resultColor = (r: string) => {
    switch (r) { case "pass": return "default"; case "fail": return "destructive"; default: return "outline"; }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.vehicle_inspections.title', 'Vehicle Inspections')}</h1><p className="text-muted-foreground">{t('pages.vehicle_inspections.description', 'Manage inspection schedules, stickers, and compliance certifications')}</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Schedule Inspection</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ClipboardCheck className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Inspections</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.passed}</p><p className="text-sm text-muted-foreground">Passed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.failed}</p><p className="text-sm text-muted-foreground">Failed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.upcoming}</p><p className="text-sm text-muted-foreground">Scheduled</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Inspections</TabsTrigger>
            <TabsTrigger value="stickers">Sticker Management</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by plate or sticker #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('common.allTypes', 'All Types')}</SelectItem><SelectItem value="routine">Routine</SelectItem><SelectItem value="annual">Annual</SelectItem><SelectItem value="pre_trip">Pre-Trip</SelectItem><SelectItem value="roadworthiness">Roadworthiness</SelectItem></SelectContent></Select>
            </div>
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.vehicle', 'Vehicle')}</TableHead><TableHead>{t('common.type', 'Type')}</TableHead><TableHead>Inspector</TableHead><TableHead>Sticker #</TableHead><TableHead>Next Due</TableHead><TableHead>Result</TableHead><TableHead>{t('common.status', 'Status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">{t('common.loading', 'Loading...')}</TableCell></TableRow> :
                filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No inspections recorded yet</TableCell></TableRow> :
                filtered.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{format(new Date(i.inspection_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{i.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell className="capitalize">{i.inspection_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell>{i.inspector_name || "—"}</TableCell>
                    <TableCell className="font-mono">{i.sticker_number || "—"}</TableCell>
                    <TableCell>{i.next_due_date ? format(new Date(i.next_due_date), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell><Badge variant={resultColor(i.overall_result)}>{i.overall_result}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>

          <TabsContent value="stickers">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sticker className="h-5 w-5" /> Inspection Sticker Tracker</CardTitle></CardHeader><CardContent>
              <div className="space-y-3">
                {inspections.filter((i: any) => i.sticker_number).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No stickers recorded. Add sticker numbers during inspections.</p>
                ) : (
                  <Table><TableHeader><TableRow><TableHead>{t('common.vehicle', 'Vehicle')}</TableHead><TableHead>Sticker #</TableHead><TableHead>{t('documents.issued', 'Issued')}</TableHead><TableHead>{t('common.expires', 'Expires')}</TableHead><TableHead>{t('common.status', 'Status')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {inspections.filter((i: any) => i.sticker_number).map((i: any) => {
                      const expired = i.sticker_expiry && new Date(i.sticker_expiry) < new Date();
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.vehicles?.plate_number}</TableCell>
                          <TableCell className="font-mono">{i.sticker_number}</TableCell>
                          <TableCell>{format(new Date(i.inspection_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{i.sticker_expiry ? format(new Date(i.sticker_expiry), "MMM dd, yyyy") : "—"}</TableCell>
                          <TableCell><Badge variant={expired ? "destructive" : "default"}>{expired ? "Expired" : "Valid"}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody></Table>
                )}
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default VehicleInspections;
