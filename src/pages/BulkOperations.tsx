import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const BulkOperations = () => {
  const { organizationId } = useOrganization();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["bulk-jobs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("bulk_jobs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const completed = jobs.filter((j: any) => j.status === "completed");
  const failed = jobs.filter((j: any) => j.status === "failed");

  const statusColor = (s: string) => {
    switch (s) { case "completed": return "default"; case "processing": return "secondary"; case "failed": return "destructive"; case "pending": return "outline"; default: return "outline"; }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Bulk Operations</h1><p className="text-muted-foreground">Import and export data in bulk — vehicles, drivers, fuel records</p></div>
          <div className="flex gap-2">
            <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
            <Button><Upload className="h-4 w-4 mr-2" /> Import</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Upload className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{jobs.length}</p><p className="text-sm text-muted-foreground">Total Jobs</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{completed.length}</p><p className="text-sm text-muted-foreground">Completed</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{jobs.filter((j: any) => j.status === "processing").length}</p><p className="text-sm text-muted-foreground">Processing</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{failed.length}</p><p className="text-sm text-muted-foreground">Failed</p></div></div></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Job History</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Entity</TableHead><TableHead>Format</TableHead><TableHead>Total</TableHead><TableHead>Processed</TableHead><TableHead>Failed</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
              jobs.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No bulk jobs yet</TableCell></TableRow> :
              jobs.map((j: any) => (
                <TableRow key={j.id}>
                  <TableCell>{format(new Date(j.created_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell className="capitalize">{j.job_type}</TableCell>
                  <TableCell className="capitalize">{j.entity_type}</TableCell>
                  <TableCell className="uppercase">{j.format}</TableCell>
                  <TableCell>{j.total_records || "—"}</TableCell>
                  <TableCell>{j.processed_records || 0}</TableCell>
                  <TableCell className={j.failed_records ? "text-destructive" : ""}>{j.failed_records || 0}</TableCell>
                  <TableCell><Badge variant={statusColor(j.status)}>{j.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
};

export default BulkOperations;
