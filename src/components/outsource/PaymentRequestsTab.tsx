import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, CheckCircle2, XCircle, Send, Fuel, Layers, ShieldCheck, Banknote, Calculator } from "lucide-react";
import { useOutsourcePaymentRequests, type PRStatus } from "@/hooks/useOutsourcePaymentRequests";
import { ApprovalChainPanel } from "./ApprovalChainPanel";
import { useOutsourcePriceCatalogs } from "@/hooks/useOutsourcePriceCatalogs";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_LABEL: Record<PRStatus, string> = {
  draft: "Draft",
  submitted: "1 — Submitted (Fleet Ops)",
  fuel_info_pending: "1b — Awaiting Fuel/Lubricant info",
  consolidating: "2 — Consolidating (Fleet Performance)",
  info_required: "3 — Additional info required",
  pending_approval: "4 — Pending approval (Delegation matrix)",
  approved: "4 — Approved",
  contract_check: "5 — Contract validation",
  validated: "Validated → ready for payment",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Partial<Record<PRStatus, "default" | "secondary" | "outline" | "destructive">> = {
  submitted: "secondary",
  fuel_info_pending: "secondary",
  consolidating: "secondary",
  info_required: "destructive",
  pending_approval: "default",
  approved: "default",
  contract_check: "default",
  validated: "default",
  rejected: "destructive",
  paid: "outline",
  cancelled: "outline",
};

export function PaymentRequestsTab() {
  const { organizationId } = useOrganization();
  const { requests, isLoading, create, transition, provideFuelInfo } = useOutsourcePaymentRequests();
  const { catalogs } = useOutsourcePriceCatalogs();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rental_vehicle_id: "",
    catalog_id: "",
    period_start: new Date().toISOString().split("T")[0],
    period_end: new Date().toISOString().split("T")[0],
    amount_requested: 0,
    notes: "",
    attendance_days: 0,
  });

  // Fuel info dialog state
  const [fuelDialog, setFuelDialog] = useState<string | null>(null);
  const [fuelForm, setFuelForm] = useState({ fuel_cost: 0, lubricant_cost: 0, notes: "" });

  // Rental vehicles for attendance lookup
  const { data: rentalVehicles = [] } = useQuery({
    queryKey: ["rental-vehicles-for-pr", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("rental_vehicles")
        .select("id, plate_number, supplier_id")
        .eq("organization_id", organizationId)
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const generateFromAttendance = async () => {
    if (!form.rental_vehicle_id || !form.catalog_id || !form.period_start || !form.period_end) {
      toast.error("Select rental vehicle, catalog, and period first");
      return;
    }
    const catalog = catalogs.find((c) => c.id === form.catalog_id);
    if (!catalog) return;

    const { data, error } = await (supabase as any)
      .from("outsource_vehicle_attendance")
      .select("attendance_date, status, hours_active, km_driven")
      .eq("rental_vehicle_id", form.rental_vehicle_id)
      .gte("attendance_date", form.period_start)
      .lte("attendance_date", form.period_end);

    if (error) {
      toast.error(`Attendance lookup failed: ${error.message}`);
      return;
    }
    const records = data || [];
    const presentDays = records.filter((r: any) => r.status === "present" || r.status === "partial").length;

    if (presentDays === 0) {
      toast.warning("No attendance records in this period — defaulting to 0");
    }

    let amount = 0;
    if (catalog.unit === "per_day") amount = presentDays * Number(catalog.base_rate || 0);
    else if (catalog.unit === "per_hour") {
      const hours = records.reduce((a: number, r: any) => a + Number(r.hours_active || 0), 0);
      amount = hours * Number(catalog.base_rate || 0);
    } else if (catalog.unit === "per_km") {
      const km = records.reduce((a: number, r: any) => a + Number(r.km_driven || 0), 0);
      amount = km * Number(catalog.base_rate || 0);
    } else {
      amount = presentDays * Number(catalog.base_rate || 0);
    }

    setForm({
      ...form,
      attendance_days: presentDays,
      amount_requested: Math.round(amount * 100) / 100,
      notes: `${form.notes ? form.notes + "\n" : ""}Auto-generated: ${presentDays} day(s) × ${catalog.unit} @ ${catalog.currency} ${catalog.base_rate}`,
    });
    toast.success(`Computed ${catalog.currency} ${amount.toLocaleString()} from ${presentDays} attendance day(s)`);
  };

  const submit = () => {
    if (!form.period_start || !form.period_end || !form.amount_requested) {
      toast.error("Period and amount required");
      return;
    }
    create.mutate(
      {
        period_start: form.period_start,
        period_end: form.period_end,
        amount_requested: form.amount_requested,
        notes: form.notes,
        rental_vehicle_id: form.rental_vehicle_id || null,
      } as any,
      {
        onSuccess: () => {
          setOpen(false);
          setForm({
            rental_vehicle_id: "",
            catalog_id: "",
            period_start: new Date().toISOString().split("T")[0],
            period_end: new Date().toISOString().split("T")[0],
            amount_requested: 0,
            notes: "",
            attendance_days: 0,
          });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Payment Requests</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Step 1 — New request</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>1a — Send approved required information & report for payment</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rental vehicle</Label>
                  <Select value={form.rental_vehicle_id} onValueChange={(v) => setForm({ ...form, rental_vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select rental vehicle" /></SelectTrigger>
                    <SelectContent>
                      {rentalVehicles.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price catalog</Label>
                  <Select value={form.catalog_id} onValueChange={(v) => setForm({ ...form, catalog_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      {catalogs.filter((c) => c.is_active).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.catalog_name} — {c.currency} {c.base_rate}/{c.unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Period start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
                <div><Label>Period end</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
                <div className="col-span-2">
                  <Button type="button" variant="outline" size="sm" onClick={generateFromAttendance} className="w-full">
                    <Calculator className="w-4 h-4 mr-1" /> 1.6 — Generate amount from attendance × catalog
                  </Button>
                  {form.attendance_days > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Computed from {form.attendance_days} attendance day(s)</p>
                  )}
                </div>
                <div className="col-span-2"><Label>Amount requested (ETB)</Label><Input type="number" value={form.amount_requested} onChange={(e) => setForm({ ...form, amount_requested: Number(e.target.value) })} /></div>
                <div className="col-span-2"><Label>Notes / approved info reference</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={submit} disabled={create.isPending}><Send className="w-4 h-4 mr-1" /> Submit</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p> :
           requests.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No payment requests yet.</p> :
          (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Request #</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead>
                <TableHead>Fuel/Lub</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.request_number}</TableCell>
                    <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                    <TableCell>{r.currency} {r.amount_requested.toLocaleString()}{r.amount_approved ? <span className="text-xs text-success ml-1">(✓ {r.amount_approved.toLocaleString()})</span> : null}</TableCell>
                    <TableCell className="text-xs">{r.fuel_cost ? `F:${r.fuel_cost}` : "—"} {r.lubricant_cost ? ` / L:${r.lubricant_cost}` : ""}</TableCell>
                    <TableCell><Badge variant={STATUS_COLOR[r.status] || "secondary"}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "PP")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {/* Step 1b — Provide fuel info */}
                      {(r.status === "submitted" || r.status === "fuel_info_pending") && (
                        <Button size="sm" variant="outline" onClick={() => { setFuelDialog(r.id); setFuelForm({ fuel_cost: r.fuel_cost || 0, lubricant_cost: r.lubricant_cost || 0, notes: "" }); }}>
                          <Fuel className="w-3 h-3 mr-1" /> 1b Fuel info
                        </Button>
                      )}
                      {/* Step 2 — Consolidate */}
                      {r.status === "submitted" && (
                        <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: r.id, status: "consolidating" })}>
                          <Layers className="w-3 h-3 mr-1" /> 2 Consolidate
                        </Button>
                      )}
                      {/* Step 2 OK? -> needs info / send for approval */}
                      {r.status === "consolidating" && (
                        <>
                          <Button size="sm" onClick={() => transition.mutate({ id: r.id, status: "pending_approval" })}>
                            OK → 4 Approval
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => transition.mutate({ id: r.id, status: "info_required", patch: { rejection_reason: "More info required" } })}>
                            Need info
                          </Button>
                        </>
                      )}
                      {/* Step 3 — Info required → resubmit */}
                      {r.status === "info_required" && (
                        <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: r.id, status: "consolidating" })}>3 Re-submit info</Button>
                      )}
                      {/* Step 4 — Approve */}
                      {r.status === "pending_approval" && (
                        <>
                          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => transition.mutate({ id: r.id, status: "approved", patch: { amount_approved: r.amount_requested } })}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> 4 Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => transition.mutate({ id: r.id, status: "rejected" })}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {/* Step 5 — Contract check */}
                      {r.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: r.id, status: "contract_check" })}>
                          <ShieldCheck className="w-3 h-3 mr-1" /> 5 Check contract
                        </Button>
                      )}
                      {r.status === "contract_check" && (
                        <>
                          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => transition.mutate({ id: r.id, status: "validated", patch: { contract_check_result: "valid" } })}>
                            Valid ✓
                          </Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => transition.mutate({ id: r.id, status: "info_required", patch: { contract_check_result: "needs_info", rejection_reason: "6 — Request additional info/document" } })}>
                            6 Need doc
                          </Button>
                        </>
                      )}
                      {r.status === "validated" && (
                        <Button size="sm" onClick={() => transition.mutate({ id: r.id, status: "paid", patch: { payment_reference: `PAY-${Date.now()}` } })}>
                          <Banknote className="w-3 h-3 mr-1" /> Mark paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fuel info dialog (step 1b) */}
      <Dialog open={!!fuelDialog} onOpenChange={(v) => !v && setFuelDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>1b — Provide fuel & lubricant usage</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fuel cost (ETB)</Label><Input type="number" value={fuelForm.fuel_cost} onChange={(e) => setFuelForm({ ...fuelForm, fuel_cost: Number(e.target.value) })} /></div>
            <div><Label>Lubricant cost (ETB)</Label><Input type="number" value={fuelForm.lubricant_cost} onChange={(e) => setFuelForm({ ...fuelForm, lubricant_cost: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={fuelForm.notes} onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => { if (fuelDialog) provideFuelInfo.mutate({ id: fuelDialog, ...fuelForm }, { onSuccess: () => setFuelDialog(null) }); }}
              disabled={provideFuelInfo.isPending}>Submit & advance to consolidation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
