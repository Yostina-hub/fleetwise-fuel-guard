import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, CheckCircle, Clock, AlertTriangle, FileSpreadsheet, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

import { useTranslation } from 'react-i18next';
const ENTITY_TYPES = ["vehicles", "drivers", "fuel_transactions", "maintenance_schedules", "geofences"];
const EXPORT_FORMATS = ["csv", "xlsx"];

const BulkOperations = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [errorDialog, setErrorDialog] = useState<any>(null);
  const [importForm, setImportForm] = useState({ entity_type: "vehicles", format: "csv", file: null as File | null });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["bulk-jobs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("bulk_jobs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const completed = jobs.filter((j: any) => j.status === "completed");
  const failed = jobs.filter((j: any) => j.status === "failed");

  // Create import job (record in DB)
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importForm.file) throw new Error("Please select a file");
      const { error } = await supabase.from("bulk_jobs").insert({
        organization_id: organizationId!,
        created_by: user?.id!,
        job_type: "import",
        entity_type: importForm.entity_type,
        format: importForm.format,
        file_name: importForm.file.name,
        status: "pending",
        total_records: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Import job created. Processing will begin shortly.");
      qc.invalidateQueries({ queryKey: ["bulk-jobs"] });
      setImportOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Create export job
  const exportMutation = useMutation({
    mutationFn: async (params: { entity_type: string; format: string }) => {
      const { error } = await supabase.from("bulk_jobs").insert({
        organization_id: organizationId!,
        created_by: user?.id!,
        job_type: "export",
        entity_type: params.entity_type,
        format: params.format,
        status: "pending",
        total_records: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Export job queued");
      qc.invalidateQueries({ queryKey: ["bulk-jobs"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusBadge = (s: string) => {
    const v = s === "completed" ? "default" : s === "processing" ? "secondary" : s === "failed" ? "destructive" : "outline";
    return <Badge variant={v as any}>{s}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.bulk_operations.title', 'Bulk Operations')}</h1><p className="text-muted-foreground">{t('pages.bulk_operations.description', 'Import and export data in bulk — vehicles, drivers, fuel records')}</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportMutation.mutate({ entity_type: "vehicles", format: "csv" })}><Download className="h-4 w-4 mr-2" /> Quick Export</Button>
            <Button onClick={() => { setImportForm({ entity_type: "vehicles", format: "csv", file: null }); setImportOpen(true); }}><Upload className="h-4 w-4 mr-2" /> Import</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Upload className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{jobs.length}</p><p className="text-sm text-muted-foreground">Total Jobs</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{completed.length}</p><p className="text-sm text-muted-foreground">{t('common.completed', 'Completed')}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{jobs.filter((j: any) => j.status === "processing").length}</p><p className="text-sm text-muted-foreground">Processing</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{failed.length}</p><p className="text-sm text-muted-foreground">Failed</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All Jobs</TabsTrigger><TabsTrigger value="imports">Imports</TabsTrigger><TabsTrigger value="exports">Exports</TabsTrigger></TabsList>

          {["all", "imports", "exports"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card><CardHeader><CardTitle>Job History</CardTitle></CardHeader>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('common.date', 'Date')}</TableHead><TableHead>{t('common.type', 'Type')}</TableHead><TableHead>{t('common.entity', 'Entity')}</TableHead><TableHead>File</TableHead><TableHead>Format</TableHead><TableHead>Progress</TableHead><TableHead>{t('common.status', 'Status')}</TableHead><TableHead className="w-16">Errors</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">{t('common.loading', 'Loading...')}</TableCell></TableRow> :
                    jobs.filter(j => tab === "all" || (tab === "imports" ? j.job_type === "import" : j.job_type === "export")).length === 0 ?
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No jobs</TableCell></TableRow> :
                    jobs.filter((j: any) => tab === "all" || (tab === "imports" ? j.job_type === "import" : j.job_type === "export")).map((j: any) => {
                      const pct = j.total_records ? Math.round(((j.processed_records || 0) / j.total_records) * 100) : 0;
                      return (
                        <TableRow key={j.id}>
                          <TableCell>{format(new Date(j.created_at), "MMM dd, HH:mm")}</TableCell>
                          <TableCell className="capitalize">{j.job_type}</TableCell>
                          <TableCell className="capitalize">{j.entity_type}</TableCell>
                          <TableCell className="text-sm truncate max-w-[150px]">{j.file_name || "—"}</TableCell>
                          <TableCell className="uppercase">{j.format}</TableCell>
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={j.status === "completed" ? 100 : pct} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground">{j.processed_records || 0}/{j.total_records || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(j.status)}</TableCell>
                          <TableCell>
                            {j.failed_records > 0 && (
                              <Button size="icon" variant="ghost" onClick={() => setErrorDialog(j)}><Eye className="h-4 w-4 text-destructive" /></Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Import Data</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Entity Type</Label>
                <Select value={importForm.entity_type} onValueChange={v => setImportForm(p => ({ ...p, entity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e} value={e} className="capitalize">{e.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('common.format', 'Format')}</Label>
                <Select value={importForm.format} onValueChange={v => setImportForm(p => ({ ...p, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPORT_FORMATS.map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.file', 'File')}</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  {importForm.file ? (
                    <p className="text-sm font-medium">{importForm.file.name} ({(importForm.file.size / 1024).toFixed(1)} KB)</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to select CSV or Excel file</p>
                  )}
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { if (e.target.files?.[0]) setImportForm(p => ({ ...p, file: e.target.files![0] })); }} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => importMutation.mutate()} disabled={!importForm.file || importMutation.isPending}>{importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Start Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Error Review Dialog */}
        <Dialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Error Details — {errorDialog?.file_name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <p className="text-sm"><strong>Failed Records:</strong> {errorDialog?.failed_records}</p>
              <p className="text-sm"><strong>Total:</strong> {errorDialog?.total_records}</p>
              {errorDialog?.error_log ? (
                <pre className="bg-muted p-4 rounded text-xs max-h-64 overflow-auto">{JSON.stringify(errorDialog.error_log, null, 2)}</pre>
              ) : (
                <p className="text-muted-foreground text-sm">{t('pages.bulk_operations.description', 'No detailed error log available')}</p>
              )}
            </div>
            <DialogFooter><Button onClick={() => setErrorDialog(null)}>{t('common.close', 'Close')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default BulkOperations;
