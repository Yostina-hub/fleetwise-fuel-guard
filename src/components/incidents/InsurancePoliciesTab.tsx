import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/reports/TablePagination";
import { Plus, Search, Shield, Loader2, AlertTriangle, Calendar, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

interface InsurancePolicy {
  id: string;
  vehicle_id: string;
  policy_number: string;
  provider_name: string;
  policy_type: string | null;
  coverage_type: string | null;
  premium_amount: number | null;
  deductible_amount: number | null;
  coverage_limit: number | null;
  start_date: string;
  end_date: string;
  status: string | null;
  auto_renew: boolean | null;
  notes: string | null;
}

const InsurancePoliciesTab = () => {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();

  const [form, setForm] = useState({
    vehicle_id: "", policy_number: "", provider_name: "", policy_type: "comprehensive",
    coverage_type: "full", premium_amount: "", deductible_amount: "", coverage_limit: "",
    start_date: "", end_date: "", auto_renew: false, notes: "",
  });

  useEffect(() => {
    if (!organizationId) { setPolicies([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .select("*")
        .eq("organization_id", organizationId)
        .order("end_date", { ascending: true });
      if (!error) setPolicies((data as InsurancePolicy[]) || []);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "Unknown";

  const getExpiryStatus = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return { label: "Expired", color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: `${days}d left`, color: "bg-warning/10 text-warning" };
    return { label: "Active", color: "bg-success/10 text-success" };
  };

  const filtered = policies.filter(p => {
    const expiry = getExpiryStatus(p.end_date);
    if (statusFilter === "expired" && !expiry.label.includes("Expired")) return false;
    if (statusFilter === "expiring" && !expiry.label.includes("left")) return false;
    if (statusFilter === "active" && expiry.label !== "Active") return false;
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return p.policy_number.toLowerCase().includes(s) || p.provider_name.toLowerCase().includes(s) || getVehiclePlate(p.vehicle_id).toLowerCase().includes(s);
  });

  const totalItems = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const expiredCount = policies.filter(p => isPast(new Date(p.end_date))).length;
  const expiringCount = policies.filter(p => { const d = differenceInDays(new Date(p.end_date), new Date()); return d >= 0 && d <= 30; }).length;
  const totalPremium = policies.reduce((s, p) => s + (p.premium_amount || 0), 0);

  const handleAdd = async () => {
    if (!organizationId || !form.vehicle_id || !form.policy_number || !form.provider_name) return;
    const { error } = await supabase.from("vehicle_insurance").insert({
      organization_id: organizationId,
      vehicle_id: form.vehicle_id,
      policy_number: form.policy_number,
      provider_name: form.provider_name,
      policy_type: form.policy_type,
      coverage_type: form.coverage_type,
      premium_amount: parseFloat(form.premium_amount) || null,
      deductible_amount: parseFloat(form.deductible_amount) || null,
      coverage_limit: parseFloat(form.coverage_limit) || null,
      start_date: form.start_date || new Date().toISOString().split("T")[0],
      end_date: form.end_date || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      auto_renew: form.auto_renew,
      notes: form.notes || null,
      status: "active",
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Policy added");
    setShowAddDialog(false);
    setForm({ vehicle_id: "", policy_number: "", provider_name: "", policy_type: "comprehensive", coverage_type: "full", premium_amount: "", deductible_amount: "", coverage_limit: "", start_date: "", end_date: "", auto_renew: false, notes: "" });
    // refetch
    const { data } = await supabase.from("vehicle_insurance").select("*").eq("organization_id", organizationId).order("end_date", { ascending: true });
    if (data) setPolicies(data as InsurancePolicy[]);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Policies", value: policies.length, icon: Shield, color: "text-primary" },
          { label: "Expired", value: expiredCount, icon: AlertTriangle, color: "text-destructive" },
          { label: "Expiring (30d)", value: expiringCount, icon: Calendar, color: "text-warning" },
          { label: "Total Premium", value: `${totalPremium.toLocaleString()} ETB`, icon: Building2, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search policies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4" />Add Policy</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Insurance Policies</h3>
          <p>Add a policy to track vehicle insurance.</p>
        </CardContent></Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto-Renew</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(p => {
                const exp = getExpiryStatus(p.end_date);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold">{p.policy_number}</TableCell>
                    <TableCell>{getVehiclePlate(p.vehicle_id)}</TableCell>
                    <TableCell>{p.provider_name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{p.policy_type || "—"}</Badge></TableCell>
                    <TableCell className="font-semibold">{p.premium_amount ? `${p.premium_amount.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.start_date), "MMM dd, yyyy")} — {format(new Date(p.end_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell><Badge className={exp.color}>{exp.label}</Badge></TableCell>
                    <TableCell>{p.auto_renew ? <Badge className="bg-primary/10 text-primary">Yes</Badge> : "No"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Insurance Policy</DialogTitle>
            <DialogDescription>Register a new insurance policy for a vehicle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Policy Number *</Label><Input value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} placeholder="POL-XXXXX" /></div>
              <div><Label>Provider *</Label><Input value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} placeholder="Insurance company" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Policy Type</Label>
                <Select value={form.policy_type} onValueChange={v => setForm({ ...form, policy_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                    <SelectItem value="collision">Collision</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Coverage</Label>
                <Select value={form.coverage_type} onValueChange={v => setForm({ ...form, coverage_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Coverage</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Premium (ETB)</Label><Input type="number" value={form.premium_amount} onChange={e => setForm({ ...form, premium_amount: e.target.value })} /></div>
              <div><Label>Deductible</Label><Input type="number" value={form.deductible_amount} onChange={e => setForm({ ...form, deductible_amount: e.target.value })} /></div>
              <div><Label>Coverage Limit</Label><Input type="number" value={form.coverage_limit} onChange={e => setForm({ ...form, coverage_limit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="auto-renew" checked={form.auto_renew} onChange={e => setForm({ ...form, auto_renew: e.target.checked })} className="rounded" />
              <Label htmlFor="auto-renew">Auto-renew policy</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.vehicle_id || !form.policy_number || !form.provider_name}>Add Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsurancePoliciesTab;
