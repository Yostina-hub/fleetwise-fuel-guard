import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/reports/TablePagination";
import { Plus, Search, Loader2, Wrench, DollarSign, Calendar, MapPin, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const AccidentClaimsTab = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();

  const [form, setForm] = useState({
    vehicle_id: "", accident_date: "", accident_location: "", damage_description: "",
    estimated_repair_cost: "", fault_party: "pending", fault_determination: "",
    third_party_name: "", third_party_vehicle: "", third_party_insurance: "", third_party_contact: "",
    police_report_number: "", repair_vendor: "", notes: "",
  });

  const fetchClaims = async () => {
    if (!organizationId) { setClaims([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("accident_claims")
      .select("*")
      .eq("organization_id", organizationId)
      .order("accident_date", { ascending: false })
      .limit(100);
    if (!error) setClaims(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, [organizationId]);

  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "Unknown";

  const getStatusBadge = (status: string | null) => {
    const map: Record<string, string> = {
      filed: "bg-muted text-muted-foreground",
      under_review: "bg-warning/10 text-warning border-warning/20",
      approved: "bg-success/10 text-success border-success/20",
      rejected: "bg-destructive/10 text-destructive",
      repair_in_progress: "bg-blue-500/10 text-blue-500",
      settled: "bg-primary/10 text-primary border-primary/20",
    };
    return <Badge className={map[status || ""] || ""}>{(status || "pending").replace(/_/g, " ")}</Badge>;
  };

  const handleCreate = async () => {
    if (!organizationId || !form.vehicle_id || !form.accident_date) return;
    const claimNumber = `ACC-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("accident_claims").insert({
      organization_id: organizationId,
      claim_number: claimNumber,
      vehicle_id: form.vehicle_id,
      accident_date: form.accident_date,
      accident_location: form.accident_location || null,
      damage_description: form.damage_description || null,
      estimated_repair_cost: parseFloat(form.estimated_repair_cost) || null,
      fault_party: form.fault_party || null,
      fault_determination: form.fault_determination || null,
      third_party_name: form.third_party_name || null,
      third_party_vehicle: form.third_party_vehicle || null,
      third_party_insurance: form.third_party_insurance || null,
      third_party_contact: form.third_party_contact || null,
      police_report_number: form.police_report_number || null,
      repair_vendor: form.repair_vendor || null,
      notes: form.notes || null,
      status: "filed",
      filed_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Accident claim filed");
    setShowCreateDialog(false);
    setForm({ vehicle_id: "", accident_date: "", accident_location: "", damage_description: "", estimated_repair_cost: "", fault_party: "pending", fault_determination: "", third_party_name: "", third_party_vehicle: "", third_party_insurance: "", third_party_contact: "", police_report_number: "", repair_vendor: "", notes: "" });
    fetchClaims();
  };

  const filtered = claims.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return c.claim_number?.toLowerCase().includes(s) || c.accident_location?.toLowerCase().includes(s) || getVehiclePlate(c.vehicle_id).toLowerCase().includes(s) || c.third_party_name?.toLowerCase().includes(s);
  });

  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const totalEstimated = claims.reduce((s, c) => s + (c.estimated_repair_cost || 0), 0);
  const totalActual = claims.reduce((s, c) => s + (c.actual_repair_cost || 0), 0);
  const inRepair = claims.filter(c => c.status === "repair_in_progress").length;

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Claims", value: claims.length, icon: FileText },
          { label: "In Repair", value: inRepair, icon: Wrench, color: "text-blue-500" },
          { label: "Est. Costs", value: `${totalEstimated.toLocaleString()} ETB`, icon: DollarSign },
          { label: "Actual Costs", value: `${totalActual.toLocaleString()} ETB`, icon: DollarSign, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><s.icon className={`w-5 h-5 ${s.color || "text-primary"}`} /></div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search accident claims..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="filed">Filed</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="repair_in_progress">In Repair</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4" />File Claim</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Accident Claims</h3>
        </CardContent></Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Fault</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Repair Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(c => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedClaim(c)}>
                  <TableCell className="font-mono font-semibold">{c.claim_number}</TableCell>
                  <TableCell>{format(new Date(c.accident_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getVehiclePlate(c.vehicle_id)}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{c.accident_location || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{(c.fault_party || "pending").replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="font-semibold">{c.estimated_repair_cost ? `${c.estimated_repair_cost.toLocaleString()} ETB` : "—"}</TableCell>
                  <TableCell>{c.repair_vendor || "—"}</TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Detail Drawer */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Claim: {selectedClaim?.claim_number}</DialogTitle></DialogHeader>
          {selectedClaim && (
            <div className="space-y-6">
              {/* Timeline */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {["filed", "under_review", "approved", "repair_in_progress", "settled"].map((step, i) => {
                  const current = ["filed", "under_review", "approved", "repair_in_progress", "settled"].indexOf(selectedClaim.status || "filed");
                  const isActive = i <= current;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isActive ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <span className={`text-xs whitespace-nowrap ${isActive ? "font-semibold" : "text-muted-foreground"}`}>
                        {step.replace(/_/g, " ")}
                      </span>
                      {i < 4 && <div className={`w-8 h-0.5 ${isActive ? "bg-primary" : "bg-muted"}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{getVehiclePlate(selectedClaim.vehicle_id)}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{format(new Date(selectedClaim.accident_date), "PPP")}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{selectedClaim.accident_location || "—"}</span></div>
                <div><span className="text-muted-foreground">Police Report:</span> <span className="font-medium">{selectedClaim.police_report_number || "—"}</span></div>
                <div><span className="text-muted-foreground">Fault:</span> <Badge variant="outline" className="capitalize">{(selectedClaim.fault_party || "pending").replace(/_/g, " ")}</Badge></div>
                <div><span className="text-muted-foreground">Repair Vendor:</span> <span className="font-medium">{selectedClaim.repair_vendor || "—"}</span></div>
              </div>

              {selectedClaim.damage_description && (
                <div><p className="text-sm text-muted-foreground mb-1">Damage Description</p><p className="text-sm bg-muted p-3 rounded-lg">{selectedClaim.damage_description}</p></div>
              )}

              {/* Costs */}
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Estimated</p>
                  <p className="text-lg font-bold">{selectedClaim.estimated_repair_cost ? `${selectedClaim.estimated_repair_cost.toLocaleString()} ETB` : "—"}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-lg font-bold text-success">{selectedClaim.approved_amount ? `${selectedClaim.approved_amount.toLocaleString()} ETB` : "—"}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-lg font-bold text-primary">{selectedClaim.actual_repair_cost ? `${selectedClaim.actual_repair_cost.toLocaleString()} ETB` : "—"}</p>
                </CardContent></Card>
              </div>

              {/* Repair Timeline */}
              {(selectedClaim.repair_start_date || selectedClaim.repair_end_date) && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1"><Wrench className="w-4 h-4 text-muted-foreground" /><span>Repair: </span></div>
                  {selectedClaim.repair_start_date && <span>{format(new Date(selectedClaim.repair_start_date), "MMM dd")} →</span>}
                  {selectedClaim.repair_end_date ? <span>{format(new Date(selectedClaim.repair_end_date), "MMM dd, yyyy")}</span> : <span className="text-warning">In Progress</span>}
                </div>
              )}

              {/* Third Party */}
              {selectedClaim.third_party_name && (
                <Card><CardContent className="p-4">
                  <h4 className="font-semibold mb-2 text-sm">Third Party Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {selectedClaim.third_party_name}</div>
                    <div><span className="text-muted-foreground">Vehicle:</span> {selectedClaim.third_party_vehicle || "—"}</div>
                    <div><span className="text-muted-foreground">Insurance:</span> {selectedClaim.third_party_insurance || "—"}</div>
                    <div><span className="text-muted-foreground">Contact:</span> {selectedClaim.third_party_contact || "—"}</div>
                  </div>
                </CardContent></Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>File Accident Claim</DialogTitle>
            <DialogDescription>Record an accident with full details including third-party information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Vehicle *</Label>
                <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Accident Date *</Label><Input type="date" value={form.accident_date} onChange={e => setForm({ ...form, accident_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Location</Label><Input value={form.accident_location} onChange={e => setForm({ ...form, accident_location: e.target.value })} placeholder="Accident location" /></div>
              <div><Label>Police Report #</Label><Input value={form.police_report_number} onChange={e => setForm({ ...form, police_report_number: e.target.value })} /></div>
            </div>
            <div><Label>Damage Description</Label><Textarea value={form.damage_description} onChange={e => setForm({ ...form, damage_description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fault Party</Label>
                <Select value={form.fault_party} onValueChange={v => setForm({ ...form, fault_party: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="own">Our Fleet</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Est. Repair Cost (ETB)</Label><Input type="number" value={form.estimated_repair_cost} onChange={e => setForm({ ...form, estimated_repair_cost: e.target.value })} /></div>
            </div>
            <div><Label>Repair Vendor</Label><Input value={form.repair_vendor} onChange={e => setForm({ ...form, repair_vendor: e.target.value })} placeholder="Repair shop name" /></div>

            {/* Third party section */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Third Party Details (if applicable)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={form.third_party_name} onChange={e => setForm({ ...form, third_party_name: e.target.value })} /></div>
                <div><Label>Vehicle</Label><Input value={form.third_party_vehicle} onChange={e => setForm({ ...form, third_party_vehicle: e.target.value })} placeholder="Plate/make/model" /></div>
                <div><Label>Insurance</Label><Input value={form.third_party_insurance} onChange={e => setForm({ ...form, third_party_insurance: e.target.value })} /></div>
                <div><Label>Contact</Label><Input value={form.third_party_contact} onChange={e => setForm({ ...form, third_party_contact: e.target.value })} placeholder="Phone/email" /></div>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.vehicle_id || !form.accident_date}>File Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccidentClaimsTab;
