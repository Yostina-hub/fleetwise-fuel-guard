import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, ClipboardList, Award, Scale } from "lucide-react";
import { format } from "date-fns";

const SupplierBidsTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    rfq_title: "", rfq_description: "", rfq_deadline: "",
  });

  const { data: bids = [], isLoading } = useQuery({
    queryKey: ["supplier-bids", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("supplier_bids")
        .select("*, supplier:supplier_profiles(company_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const rfqNumber = `RFQ-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("supplier_bids").insert({
        organization_id: organizationId,
        rfq_number: rfqNumber,
        rfq_title: form.rfq_title,
        rfq_description: form.rfq_description,
        rfq_deadline: form.rfq_deadline || null,
        rfq_status: "open",
        bid_status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bids"] });
      setCreateOpen(false);
      setForm({ rfq_title: "", rfq_description: "", rfq_deadline: "" });
      toast.success("RFQ created");
    },
    onError: () => toast.error("Failed to create RFQ"),
  });

  const awardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_bids").update({
        is_awarded: true, awarded_at: new Date().toISOString(), bid_status: "awarded",
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bids"] });
      toast.success("Bid awarded");
    },
  });

  const openRfqs = bids.filter((b: any) => b.rfq_status === "open").length;
  const awardedCount = bids.filter((b: any) => b.is_awarded).length;

  // Group by RFQ
  const rfqGroups = bids.reduce((groups: Record<string, any[]>, bid: any) => {
    const key = bid.rfq_number;
    if (!groups[key]) groups[key] = [];
    groups[key].push(bid);
    return groups;
  }, {});

  const filtered = Object.entries(rfqGroups).filter(([key, items]: [string, any[]]) =>
    !searchQuery || key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    items.some(b => b.rfq_title?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{Object.keys(rfqGroups).length}</p>
          <p className="text-xs text-muted-foreground">Total RFQs</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{openRfqs}</p>
          <p className="text-xs text-muted-foreground">Open</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{awardedCount}</p>
          <p className="text-xs text-muted-foreground">Awarded</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search RFQs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New RFQ</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Request for Quotation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.rfq_title} onChange={e => setForm(f => ({ ...f, rfq_title: e.target.value }))} placeholder="What do you need?" /></div>
              <div><Label>Description</Label><Textarea value={form.rfq_description} onChange={e => setForm(f => ({ ...f, rfq_description: e.target.value }))} placeholder="Detailed requirements..." /></div>
              <div><Label>Deadline</Label><Input type="datetime-local" value={form.rfq_deadline} onChange={e => setForm(f => ({ ...f, rfq_deadline: e.target.value }))} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.rfq_title || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create RFQ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* RFQ Groups */}
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="space-y-4">
          {filtered.map(([rfqNumber, items]: [string, any[]]) => {
            const first = items[0];
            return (
              <Card key={rfqNumber} className="glass-strong">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{rfqNumber}</span>
                          <Badge variant="outline" className="text-[10px]">{first.rfq_status}</Badge>
                        </div>
                        <p className="font-medium">{first.rfq_title}</p>
                      </div>
                    </div>
                    {first.rfq_deadline && (
                      <span className="text-xs text-muted-foreground">Due: {format(new Date(first.rfq_deadline), "MMM d, yyyy")}</span>
                    )}
                  </div>
                  {/* Bids comparison */}
                  {items.filter(b => b.bid_amount).length > 0 && (
                    <div className="border border-border/50 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-5 gap-2 p-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                        <span>Supplier</span><span>Amount</span><span>Lead Time</span><span>Score</span><span>Action</span>
                      </div>
                      {items.filter(b => b.bid_amount).map((bid: any) => (
                        <div key={bid.id} className="grid grid-cols-5 gap-2 p-2 border-t border-border/30 text-sm items-center">
                          <span>{(bid.supplier as any)?.company_name || "—"}</span>
                          <span className="font-medium">{bid.bid_amount?.toLocaleString()} ETB</span>
                          <span>{bid.lead_time_days ? `${bid.lead_time_days}d` : "—"}</span>
                          <span>{bid.overall_score ? `${bid.overall_score}/100` : "—"}</span>
                          <div>
                            {bid.is_awarded ? (
                              <Badge variant="default" className="gap-1 text-[10px]"><Award className="w-3 h-3" /> Awarded</Badge>
                            ) : (
                              <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={() => awardMutation.mutate(bid.id)}>
                                Award
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {items.filter(b => b.bid_amount).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No bids received yet</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No RFQs found</p>}
        </div>
      )}
    </div>
  );
};

export default SupplierBidsTab;
