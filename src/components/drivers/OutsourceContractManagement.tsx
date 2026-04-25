import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { Handshake, FileText, DollarSign, AlertTriangle, Plus, Building2, Calendar, CreditCard } from "lucide-react";
import { friendlyToastError } from "@/lib/errorMessages";

interface OutsourceContractManagementProps {}

interface Contract {
  id: string;
  contract_number: string;
  contractor_name: string;
  contractor_contact: string | null;
  contractor_email: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  monthly_cost: number;
  total_contract_value: number;
  currency: string;
  payment_terms: string | null;
  sla_terms: string | null;
  penalty_terms: string | null;
  status: string;
  notes: string | null;
}

interface Payment {
  id: string;
  contract_id: string;
  payment_date: string;
  due_date: string | null;
  amount: number;
  currency: string;
  invoice_number: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
}

export const OutsourceContractManagement = ({}: OutsourceContractManagementProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");

  const [contractForm, setContractForm] = useState({
    contract_number: "", contractor_name: "", contractor_contact: "", contractor_email: "",
    contract_type: "driver_outsource", start_date: "", end_date: "", auto_renew: false,
    monthly_cost: "0", total_contract_value: "0", payment_terms: "", sla_terms: "", penalty_terms: "", notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    contract_id: "", payment_date: format(new Date(), "yyyy-MM-dd"), due_date: "",
    amount: "0", invoice_number: "", notes: "",
  });

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [cRes, pRes] = await Promise.all([
      supabase.from("outsource_contracts").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
      supabase.from("outsource_payments").select("*").eq("organization_id", organizationId).order("payment_date", { ascending: false }).limit(50),
    ]);
    setContracts((cRes.data as Contract[]) || []);
    setPayments((pRes.data as Payment[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [organizationId]);

  const fmt = (n: number, c = "ETB") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "expired": case "terminated": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "pending": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "suspended": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "paid": return "bg-emerald-500/10 text-emerald-400";
      case "overdue": return "bg-red-500/10 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalMonthlySpend = activeContracts.reduce((s, c) => s + (c.monthly_cost || 0), 0);
  const expiringContracts = contracts.filter(c => c.end_date && differenceInDays(new Date(c.end_date), new Date()) <= 60 && differenceInDays(new Date(c.end_date), new Date()) > 0);
  const overduePayments = payments.filter(p => p.status === "overdue" || (p.status === "pending" && p.due_date && new Date(p.due_date) < new Date()));

  const handleCreateContract = async () => {
    if (!organizationId) return;
    const { error } = await supabase.from("outsource_contracts").insert({
      organization_id: organizationId,
      contract_number: contractForm.contract_number,
      contractor_name: contractForm.contractor_name,
      contractor_contact: contractForm.contractor_contact || null,
      contractor_email: contractForm.contractor_email || null,
      contract_type: contractForm.contract_type,
      start_date: contractForm.start_date,
      end_date: contractForm.end_date || null,
      auto_renew: contractForm.auto_renew,
      monthly_cost: parseFloat(contractForm.monthly_cost) || 0,
      total_contract_value: parseFloat(contractForm.total_contract_value) || 0,
      payment_terms: contractForm.payment_terms || null,
      sla_terms: contractForm.sla_terms || null,
      penalty_terms: contractForm.penalty_terms || null,
      notes: contractForm.notes || null,
      status: "active",
    });
    if (error) friendlyToastError(error);
    else { toast({ title: "Contract created" }); setShowContractDialog(false); fetchData(); }
  };

  const handleRecordPayment = async () => {
    if (!organizationId || !paymentForm.contract_id) return;
    const { error } = await supabase.from("outsource_payments").insert({
      organization_id: organizationId,
      contract_id: paymentForm.contract_id,
      payment_date: paymentForm.payment_date,
      due_date: paymentForm.due_date || null,
      amount: parseFloat(paymentForm.amount) || 0,
      invoice_number: paymentForm.invoice_number || null,
      notes: paymentForm.notes || null,
      status: "pending",
    });
    if (error) friendlyToastError(error);
    else { toast({ title: "Payment recorded" }); setShowPaymentDialog(false); fetchData(); }
  };

  const markPaymentPaid = async (id: string) => {
    await supabase.from("outsource_payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Handshake className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{activeContracts.length}</p>
          <p className="text-[10px] text-muted-foreground">Active Contracts</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-xl font-bold">{fmt(totalMonthlySpend)}</p>
          <p className="text-[10px] text-muted-foreground">Monthly Spend</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{expiringContracts.length}</p>
          <p className="text-[10px] text-muted-foreground">Expiring Soon</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-2xl font-bold">{overduePayments.length}</p>
          <p className="text-[10px] text-muted-foreground">Overdue Payments</p>
        </CardContent></Card>
      </div>

      {/* Contracts */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Contracts</h3>
        <div className="flex gap-2">
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={paymentForm.contract_id || undefined} onValueChange={v => setPaymentForm(f => ({ ...f, contract_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select contract..." /></SelectTrigger>
                  <SelectContent>
                    {contracts.filter(c => c.status === "active").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.contract_number} — {c.contractor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Payment Date</label>
                    <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted-foreground">Due Date</label>
                    <Input type="date" value={paymentForm.due_date} onChange={e => setPaymentForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                  <Input placeholder="Invoice #" value={paymentForm.invoice_number} onChange={e => setPaymentForm(f => ({ ...f, invoice_number: e.target.value }))} />
                </div>
                <Textarea placeholder="Notes..." value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
                <Button className="w-full" onClick={handleRecordPayment}>Save Payment</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New Contract</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Outsource Contract</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Contract Number" value={contractForm.contract_number} onChange={e => setContractForm(f => ({ ...f, contract_number: e.target.value }))} />
                  <Select value={contractForm.contract_type} onValueChange={v => setContractForm(f => ({ ...f, contract_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["driver_outsource", "vehicle_lease", "full_service", "maintenance_outsource"].map(t => (
                        <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Contractor Name" value={contractForm.contractor_name} onChange={e => setContractForm(f => ({ ...f, contractor_name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Contact" value={contractForm.contractor_contact} onChange={e => setContractForm(f => ({ ...f, contractor_contact: e.target.value }))} />
                  <Input placeholder="Email" value={contractForm.contractor_email} onChange={e => setContractForm(f => ({ ...f, contractor_email: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Start Date</label>
                    <Input type="date" value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted-foreground">End Date</label>
                    <Input type="date" value={contractForm.end_date} onChange={e => setContractForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Monthly Cost" value={contractForm.monthly_cost} onChange={e => setContractForm(f => ({ ...f, monthly_cost: e.target.value }))} />
                  <Input type="number" placeholder="Total Value" value={contractForm.total_contract_value} onChange={e => setContractForm(f => ({ ...f, total_contract_value: e.target.value }))} />
                </div>
                <Textarea placeholder="Payment Terms..." value={contractForm.payment_terms} onChange={e => setContractForm(f => ({ ...f, payment_terms: e.target.value }))} rows={2} />
                <Textarea placeholder="SLA Terms..." value={contractForm.sla_terms} onChange={e => setContractForm(f => ({ ...f, sla_terms: e.target.value }))} rows={2} />
                <Textarea placeholder="Penalty Terms..." value={contractForm.penalty_terms} onChange={e => setContractForm(f => ({ ...f, penalty_terms: e.target.value }))} rows={2} />
                <Textarea placeholder="Notes..." value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                <Button className="w-full" onClick={handleCreateContract}>Create Contract</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {contracts.length === 0 && !loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          <Handshake className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No outsource contracts yet
        </CardContent></Card>
      ) : contracts.map(c => {
        const daysToExpiry = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
        const contractPayments = payments.filter(p => p.contract_id === c.id);
        const totalPaid = contractPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);

        return (
          <Card key={c.id} className={daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0 ? "border-amber-500/30" : ""}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{c.contractor_name}</span>
                  <Badge variant="outline" className="text-[10px]">{c.contract_number}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{typeLabel(c.contract_type)}</Badge>
                </div>
                <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(c.status)}`}>{c.status}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div><p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{format(new Date(c.start_date), "MMM yyyy")} — {c.end_date ? format(new Date(c.end_date), "MMM yyyy") : "Ongoing"}</p>
                </div>
                <div><p className="text-muted-foreground">Monthly Cost</p><p className="font-medium">{fmt(c.monthly_cost)}</p></div>
                <div><p className="text-muted-foreground">Total Value</p><p className="font-medium">{fmt(c.total_contract_value)}</p></div>
                <div><p className="text-muted-foreground">Total Paid</p><p className="font-medium text-emerald-400">{fmt(totalPaid)}</p></div>
                <div><p className="text-muted-foreground">Auto-Renew</p><p className="font-medium">{c.auto_renew ? "Yes" : "No"}</p></div>
              </div>
              {daysToExpiry !== null && daysToExpiry <= 60 && daysToExpiry > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> Expires in {daysToExpiry} days
                </div>
              )}
              {/* Recent payments for this contract */}
              {contractPayments.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Recent Payments</p>
                  {contractPayments.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-[10px]">
                      <span>{format(new Date(p.payment_date), "MMM d, yyyy")} — {p.invoice_number || "No invoice"}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmt(p.amount)}</span>
                        <Badge variant="outline" className={`text-[9px] ${statusColor(p.status)}`}>{p.status}</Badge>
                        {p.status === "pending" && (
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] text-emerald-400" onClick={() => markPaymentPaid(p.id)}>Pay</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
