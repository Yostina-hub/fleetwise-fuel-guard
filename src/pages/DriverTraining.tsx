import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, CheckCircle, Clock, AlertTriangle, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const DriverTraining = () => {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");

  const { data: training = [], isLoading } = useQuery({
    queryKey: ["driver-training", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("driver_training")
        .select("*, drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const completed = training.filter((t: any) => t.status === "completed");
  const expiringSoon = training.filter((t: any) => {
    if (!t.expiry_date) return false;
    const diff = new Date(t.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  const statusColor = (s: string) => {
    switch (s) { case "completed": return "default"; case "in_progress": return "secondary"; case "expired": return "destructive"; default: return "outline"; }
  };

  const filtered = training.filter((t: any) => !search || t.certification_name?.toLowerCase().includes(search.toLowerCase()) || t.drivers?.first_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Driver Training & Certification</h1><p className="text-muted-foreground">Track certifications, training programs, and compliance requirements</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add Training</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{training.length}</p><p className="text-sm text-muted-foreground">Total Records</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{completed.length}</p><p className="text-sm text-muted-foreground">Completed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{expiringSoon.length}</p><p className="text-sm text-muted-foreground">Expiring Soon</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{training.filter((t: any) => t.status === "expired").length}</p><p className="text-sm text-muted-foreground">Expired</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by certification or driver..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Driver</TableHead><TableHead>Certification</TableHead><TableHead>Type</TableHead><TableHead>Provider</TableHead><TableHead>Completed</TableHead><TableHead>Expires</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No training records</TableCell></TableRow> :
            filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.drivers ? `${t.drivers.first_name} ${t.drivers.last_name}` : "—"}</TableCell>
                <TableCell>{t.certification_name}</TableCell>
                <TableCell className="capitalize">{t.training_type}</TableCell>
                <TableCell>{t.provider || "—"}</TableCell>
                <TableCell>{t.completion_date ? format(new Date(t.completion_date), "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell>{t.expiry_date ? format(new Date(t.expiry_date), "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell>{t.score !== null ? `${t.score}%` : "—"}</TableCell>
                <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>
      </div>
    </Layout>
  );
};

export default DriverTraining;
