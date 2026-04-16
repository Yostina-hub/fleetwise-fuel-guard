import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { CreditCard, AlertTriangle, DollarSign, ShieldAlert, Plus, Edit, Loader2, Ban, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

interface FuelCard {
  id: string;
  driver_id: string;
  card_number: string;
  card_provider: string | null;
  card_type: string;
  daily_limit: number | null;
  monthly_limit: number | null;
  current_month_spent: number | null;
  status: string;
  issued_date: string;
  expiry_date: string | null;
  suspicious_activity_flag: boolean;
  suspicious_activity_notes: string | null;
  last_transaction_at: string | null;
}

export const DriverFuelCards = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [editCard, setEditCard] = useState<FuelCard | null>(null);
  const [form, setForm] = useState({
    driver_id: "",
    card_number: "",
    card_provider: "",
    card_type: "fuel_only",
    daily_limit: "",
    monthly_limit: "",
    expiry_date: "",
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["driver-fuel-cards", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("driver_fuel_cards")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as FuelCard[]) || [];
    },
    enabled: !!organizationId,
  });

  const getDriverName = (id: string) => {
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };

  const resetForm = () => {
    setForm({ driver_id: "", card_number: "", card_provider: "", card_type: "fuel_only", daily_limit: "", monthly_limit: "", expiry_date: "" });
    setShowAdd(false);
    setEditCard(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !form.driver_id || !form.card_number) throw new Error("Driver and card number required");
      const { error } = await supabase.from("driver_fuel_cards").insert({
        organization_id: organizationId,
        driver_id: form.driver_id,
        card_number: form.card_number,
        card_provider: form.card_provider || null,
        card_type: form.card_type,
        daily_limit: form.daily_limit ? parseFloat(form.daily_limit) : null,
        monthly_limit: form.monthly_limit ? parseFloat(form.monthly_limit) : null,
        expiry_date: form.expiry_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-fuel-cards"] }); resetForm(); toast.success("Fuel card assigned"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCard) return;
      const { error } = await supabase.from("driver_fuel_cards").update({
        card_number: form.card_number,
        card_provider: form.card_provider || null,
        card_type: form.card_type,
        daily_limit: form.daily_limit ? parseFloat(form.daily_limit) : null,
        monthly_limit: form.monthly_limit ? parseFloat(form.monthly_limit) : null,
        expiry_date: form.expiry_date || null,
      }).eq("id", editCard.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-fuel-cards"] }); resetForm(); toast.success("Card updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("driver_fuel_cards").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver-fuel-cards"] }); toast.success("Card status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (card: FuelCard) => {
    setEditCard(card);
    setForm({
      driver_id: card.driver_id,
      card_number: card.card_number,
      card_provider: card.card_provider || "",
      card_type: card.card_type,
      daily_limit: card.daily_limit?.toString() || "",
      monthly_limit: card.monthly_limit?.toString() || "",
      expiry_date: card.expiry_date || "",
    });
    setShowAdd(true);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/30";
      case "suspended": return "bg-warning/10 text-warning border-warning/30";
      case "lost": case "cancelled": return "bg-destructive/10 text-destructive border-destructive/30";
      default: return "";
    }
  };

  const activeCount = cards.filter(c => c.status === "active").length;
  const flaggedCount = cards.filter(c => c.suspicious_activity_flag).length;
  const totalSpent = cards.reduce((s, c) => s + (c.current_month_spent || 0), 0);

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(cards.length, ITEMS_PER_PAGE);
  const paged = cards.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fuel Card Management</h3>
          <p className="text-sm text-muted-foreground">Assign and manage fuel cards per driver</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Assign Card</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><CreditCard className="w-5 h-5 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{cards.length}</p><p className="text-xs text-muted-foreground">Total Cards</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" /><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><ShieldAlert className="w-5 h-5 mx-auto mb-1 text-destructive" /><p className="text-2xl font-bold">{flaggedCount}</p><p className="text-xs text-muted-foreground">Flagged</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><DollarSign className="w-5 h-5 mx-auto mb-1 text-warning" /><p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p><p className="text-xs text-muted-foreground">This Month</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">All Fuel Cards</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No fuel cards assigned</p>
              <Button className="mt-3" onClick={() => setShowAdd(true)}>Assign First Card</Button>
            </div>
          ) : (
            <>
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Card #</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Limits</TableHead>
                    <TableHead>Spent (Month)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(card => {
                    const util = card.monthly_limit && card.current_month_spent ? (card.current_month_spent / card.monthly_limit) * 100 : 0;
                    return (
                      <TableRow key={card.id}>
                        <TableCell className="font-mono">•••• {card.card_number.slice(-4)}</TableCell>
                        <TableCell>{getDriverName(card.driver_id)}</TableCell>
                        <TableCell>{card.card_provider || "—"}</TableCell>
                        <TableCell className="capitalize">{card.card_type.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-xs">
                          {card.daily_limit ? <div>Daily: {formatCurrency(card.daily_limit)}</div> : null}
                          {card.monthly_limit ? <div>Monthly: {formatCurrency(card.monthly_limit)}</div> : null}
                          {!card.daily_limit && !card.monthly_limit && "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(card.current_month_spent || 0)}</span>
                            {card.monthly_limit && (
                              <span className={`text-xs ${util > 90 ? "text-destructive" : util > 70 ? "text-warning" : "text-muted-foreground"}`}>
                                ({util.toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={statusColor(card.status)}>{card.status}</Badge>
                            {card.suspicious_activity_flag && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="w-3 h-3" /></Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(card)}><Edit className="w-4 h-4" /></Button>
                            {card.status === "active" && (
                              <Button variant="ghost" size="sm" className="text-warning" onClick={() => statusMutation.mutate({ id: card.id, status: "suspended" })}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            {card.status === "suspended" && (
                              <Button variant="ghost" size="sm" className="text-success" onClick={() => statusMutation.mutate({ id: card.id, status: "active" })}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination currentPage={currentPage} totalItems={cards.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={open => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCard ? "Edit" : "Assign"} Fuel Card</DialogTitle>
            <DialogDescription>{editCard ? "Update fuel card details and limits." : "Assign a new fuel card to a driver."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editCard && (
              <div>
                <Label>Driver *</Label>
                <Select value={form.driver_id || undefined} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Card Number *</Label>
                <Input value={form.card_number} onChange={e => setForm(f => ({ ...f, card_number: e.target.value }))} placeholder="1234-5678-9012" />
              </div>
              <div>
                <Label>Provider</Label>
                <Input value={form.card_provider} onChange={e => setForm(f => ({ ...f, card_provider: e.target.value }))} placeholder="OLA, Shell, etc." />
              </div>
            </div>
            <div>
              <Label>Card Type</Label>
              <Select value={form.card_type} onValueChange={v => setForm(f => ({ ...f, card_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel_only">Fuel Only</SelectItem>
                  <SelectItem value="fuel_and_services">Fuel & Services</SelectItem>
                  <SelectItem value="universal">Universal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily Limit</Label>
                <Input type="number" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: e.target.value }))} placeholder="e.g. 5000" />
              </div>
              <div>
                <Label>Monthly Limit</Label>
                <Input type="number" value={form.monthly_limit} onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))} placeholder="e.g. 50000" />
              </div>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={() => editCard ? updateMutation.mutate() : createMutation.mutate()} disabled={createMutation.isPending || updateMutation.isPending || (!editCard && (!form.driver_id || !form.card_number)) || (!!editCard && !form.card_number)}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editCard ? "Update" : "Assign"} Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
