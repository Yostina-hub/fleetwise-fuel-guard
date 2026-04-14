import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wine, Eye, CheckCircle, XCircle, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const AlcoholFatigueDetection = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["alcohol-fatigue-tests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("alcohol_fatigue_tests")
        .select("*, drivers(first_name, last_name), vehicles(plate_number)")
        .eq("organization_id", organizationId)
        .order("test_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const stats = {
    total: tests.length,
    passed: tests.filter((t: any) => t.pass === true).length,
    failed: tests.filter((t: any) => t.pass === false).length,
    alcohol: tests.filter((t: any) => t.test_type === "alcohol").length,
    fatigue: tests.filter((t: any) => t.test_type === "fatigue").length,
  };

  const filtered = tests.filter((t: any) => {
    const matchSearch = !search || t.drivers?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.drivers?.last_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.test_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">{t('pages.alcohol_fatigue_detection.title', 'Alcohol & Fatigue Detection')}</h1><p className="text-muted-foreground">{t('pages.alcohol_fatigue_detection.description', 'Pre-trip and random testing compliance for driver safety')}</p></div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wine className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Tests</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.passed}</p><p className="text-sm text-muted-foreground">Passed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.failed}</p><p className="text-sm text-muted-foreground">Failed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wine className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">{stats.alcohol}</p><p className="text-sm text-muted-foreground">Alcohol Tests</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Eye className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.fatigue}</p><p className="text-sm text-muted-foreground">Fatigue Tests</p></div></div></CardContent></Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by driver name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('common.allTypes', 'All Types')}</SelectItem><SelectItem value="alcohol">Alcohol</SelectItem><SelectItem value="fatigue">Fatigue</SelectItem></SelectContent></Select>
        </div>

        <Tabs defaultValue="results">
          <TabsList><TabsTrigger value="results">Test Results</TabsTrigger><TabsTrigger value="failures">Failures & Actions</TabsTrigger></TabsList>

          <TabsContent value="results">
            <Card><Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.driver', 'Driver')}</TableHead><TableHead>{t('common.type', 'Type')}</TableHead><TableHead>Reading</TableHead><TableHead>Threshold</TableHead><TableHead>{t('devices.device', 'Device')}</TableHead><TableHead>Result</TableHead><TableHead>Tested By</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">{t('common.loading', 'Loading...')}</TableCell></TableRow> :
                filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No test records yet</TableCell></TableRow> :
                filtered.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.test_date), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="font-medium">{t.drivers ? `${t.drivers.first_name} ${t.drivers.last_name}` : "—"}</TableCell>
                    <TableCell><Badge variant={t.test_type === "alcohol" ? "outline" : "secondary"} className="capitalize">{t.test_type}</Badge></TableCell>
                    <TableCell className="font-mono">{t.reading_value !== null ? `${t.reading_value} ${t.unit || ""}` : "—"}</TableCell>
                    <TableCell className="font-mono">{t.threshold_value !== null ? `${t.threshold_value} ${t.unit || ""}` : "—"}</TableCell>
                    <TableCell className="text-sm">{t.device_name || "—"}</TableCell>
                    <TableCell><Badge variant={t.pass ? "default" : "destructive"}>{t.pass ? "Pass" : "Fail"}</Badge></TableCell>
                    <TableCell>{t.tested_by || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>

          <TabsContent value="failures">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Failed Tests & Actions Taken</CardTitle></CardHeader><CardContent>
              {tests.filter((t: any) => t.pass === false).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No failed tests recorded</p>
              ) : (
                <Table><TableHeader><TableRow><TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.driver', 'Driver')}</TableHead><TableHead>{t('common.type', 'Type')}</TableHead><TableHead>Reading</TableHead><TableHead>Action Taken</TableHead></TableRow></TableHeader>
                <TableBody>{tests.filter((t: any) => t.pass === false).map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.test_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{t.drivers ? `${t.drivers.first_name} ${t.drivers.last_name}` : "—"}</TableCell>
                    <TableCell className="capitalize">{t.test_type}</TableCell>
                    <TableCell className="text-destructive font-bold">{t.reading_value} {t.unit}</TableCell>
                    <TableCell>{t.action_taken || "Pending review"}</TableCell>
                  </TableRow>
                ))}</TableBody></Table>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AlcoholFatigueDetection;
