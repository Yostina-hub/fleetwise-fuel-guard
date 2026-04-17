// Vehicle Handover — Catalog Admin
// Lets fleet managers / org admins manage the configurable list of materials,
// safety items, comfort items, and accessories shown on the EFM/FA/03 form.
// Backed by the `vehicle_handover_catalog_items` table.
import { useState } from "react";
import Layout from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Category = "safety" | "comfort" | "accessory" | "other";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "safety", label: "Safety" },
  { value: "comfort", label: "Comfort" },
  { value: "accessory", label: "Accessory" },
  { value: "other", label: "Other" },
];

export default function HandoverCatalogAdmin() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("safety");
  const [defaultQty, setDefaultQty] = useState<number>(1);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["handover-catalog", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_handover_catalog_items")
        .select("id, name, category, default_qty, sort_order, is_active")
        .eq("organization_id", organizationId!)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      if (!name.trim()) throw new Error("Name required");
      const maxSort = Math.max(0, ...items
        .filter((i: any) => i.category === category)
        .map((i: any) => Number(i.sort_order) || 0));
      const { error } = await supabase.from("vehicle_handover_catalog_items").insert({
        organization_id: organizationId,
        name: name.trim(),
        category,
        default_qty: defaultQty,
        sort_order: maxSort + 10,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setDefaultQty(1);
      qc.invalidateQueries({ queryKey: ["handover-catalog", organizationId] });
      qc.invalidateQueries({ queryKey: ["wf-handover-catalog", organizationId] });
      toast.success("Item added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("vehicle_handover_catalog_items")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-catalog", organizationId] });
      qc.invalidateQueries({ queryKey: ["wf-handover-catalog", organizationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_handover_catalog_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-catalog", organizationId] });
      qc.invalidateQueries({ queryKey: ["wf-handover-catalog", organizationId] });
      toast.success("Removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped: Record<Category, any[]> = {
    safety: [], comfort: [], accessory: [], other: [],
  };
  items.forEach((i: any) => {
    if (grouped[i.category as Category]) grouped[i.category as Category].push(i);
  });

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Vehicle Handover — Catalog Admin</h1>
            <p className="text-xs text-muted-foreground">
              Manage the configurable items shown on the EFM/FA/03 handover checklist.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add new item</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px_auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Item name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spare tire" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default qty</Label>
              <Input type="number" min={1} value={defaultQty}
                onChange={(e) => setDefaultQty(Number(e.target.value) || 1)} />
            </div>
            <Button onClick={() => addItem.mutate()} disabled={addItem.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <Card key={c.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {c.label}
                    <Badge variant="secondary">{grouped[c.value].length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {grouped[c.value].length === 0 ? (
                    <p className="text-xs text-muted-foreground">No items.</p>
                  ) : grouped[c.value].map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 border rounded p-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${!it.is_active ? "text-muted-foreground line-through" : ""}`}>
                          {it.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Default qty: {it.default_qty || 1}
                        </p>
                      </div>
                      <Switch
                        checked={!!it.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: it.id, is_active: v })}
                      />
                      <Button size="icon" variant="ghost"
                        onClick={() => {
                          if (confirm(`Remove "${it.name}"?`)) remove.mutate(it.id);
                        }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
