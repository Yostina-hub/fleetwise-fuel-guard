import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Plus, Trash2, Save, Loader2, Star, Share2 } from "lucide-react";
import { REPORT_DEFINITIONS } from "@/components/reports/ReportCatalog";

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "custom", label: "Custom Range" },
];

const CustomReportTemplates = () => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    report_category: "",
    report_type: "",
    date_range_type: "last_7_days",
    sort_by: "",
    sort_order: "asc",
    group_by: "",
    is_shared: false,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["report-templates", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("report_templates").insert({
        organization_id: organizationId,
        created_by: user.id,
        name: form.name,
        description: form.description || null,
        report_category: form.report_category,
        report_type: form.report_type,
        date_range_type: form.date_range_type,
        sort_by: form.sort_by || null,
        sort_order: form.sort_order,
        group_by: form.group_by || null,
        is_shared: form.is_shared,
        filters: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      setShowDialog(false);
      setForm({ name: "", description: "", report_category: "", report_type: "", date_range_type: "last_7_days", sort_by: "", sort_order: "asc", group_by: "", is_shared: false });
      toast.success("Report template saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Template removed");
    },
  });

  // Group report definitions by category for dropdown
  const categories = [...new Set(REPORT_DEFINITIONS.map(r => r.category))];
  const filteredReports = REPORT_DEFINITIONS.filter(r => r.category === form.report_category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Custom Report Templates
          </h2>
          <p className="text-sm text-muted-foreground">Save and reuse report configurations with preset filters</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{templates.length}</p><p className="text-sm text-muted-foreground">Total Templates</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{templates.filter((t: any) => t.is_shared).length}</p><p className="text-sm text-muted-foreground">Shared</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{templates.filter((t: any) => t.created_by === user?.id).length}</p><p className="text-sm text-muted-foreground">My Templates</p></CardContent></Card>
      </div>

      {/* Templates Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Report Type</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Shared</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No report templates. Create one to save your favorite configurations.</TableCell></TableRow>
            ) : templates.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {t.is_default && <Star className="h-3 w-3 text-primary fill-primary" />}
                    {t.name}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{t.report_category}</Badge></TableCell>
                <TableCell className="text-sm">{t.report_type}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{t.date_range_type?.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell>{t.is_shared ? <Share2 className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">{format(new Date(t.created_at), "MMM dd, yyyy")}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Report Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekly Fuel Summary" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Report Category</Label>
                <Select value={form.report_category} onValueChange={v => setForm(p => ({ ...p, report_category: v, report_type: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Type</Label>
                <Select value={form.report_type} onValueChange={v => setForm(p => ({ ...p, report_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select report" /></SelectTrigger>
                  <SelectContent>
                    {filteredReports.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Date Range</Label>
                <Select value={form.date_range_type} onValueChange={v => setForm(p => ({ ...p, date_range_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Select value={form.sort_order} onValueChange={v => setForm(p => ({ ...p, sort_order: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_shared} onCheckedChange={v => setForm(p => ({ ...p, is_shared: v }))} />
              <Label>Share with organization</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.report_category || !form.report_type || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" /> Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomReportTemplates;
