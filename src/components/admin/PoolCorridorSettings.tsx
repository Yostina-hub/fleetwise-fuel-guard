/**
 * PoolCorridorSettings
 * --------------------
 * Lets admins/managers tune `fleet_pools.corridor_km` per pool. This value
 * controls how far a driver may detour from their planned route to pick up
 * an extra passenger via Tier-2 proximity matching.
 *
 * Recommended ranges:
 *   - 1.5 km : tight, premium / executive pools
 *   - 3.0 km : balanced default for staff transport
 *   - 5.0 km : flexible, ride-share style pools
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Route, Save } from "lucide-react";
import { toast } from "sonner";

interface PoolRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  corridor_km: number;
}

const PRESETS: Array<{ label: string; km: number; hint: string }> = [
  { label: "Tight", km: 1.5, hint: "Executive / premium" },
  { label: "Balanced", km: 3.0, hint: "Default" },
  { label: "Flexible", km: 5.0, hint: "Ride-share style" },
];

export const PoolCorridorSettings = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  // Local edits keyed by pool id; merged into the rendered value for a
  // smooth slider experience without thrashing react-query.
  const [draft, setDraft] = useState<Record<string, number>>({});

  const { data: pools = [], isLoading } = useQuery({
    queryKey: ["fleet-pools-corridor", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_pools")
        .select("id, code, name, category, corridor_km")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as PoolRow[];
    },
  });

  // Reset local draft whenever the server data refreshes
  useEffect(() => {
    setDraft({});
  }, [pools.length]);

  const saveMutation = useMutation({
    mutationFn: async (input: { id: string; km: number }) => {
      const { error } = await (supabase as any)
        .from("fleet_pools")
        .update({ corridor_km: input.km })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Corridor set to ${vars.km.toFixed(1)} km`);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["fleet-pools-corridor", organizationId] });
    },
    onError: (e: any) => toast.error(e.message || "Could not update corridor"),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return pools;
    const q = search.toLowerCase();
    return pools.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q),
    );
  }, [pools, search]);

  const renderRow = (p: PoolRow) => {
    const current = draft[p.id] ?? Number(p.corridor_km ?? 3);
    const dirty = draft[p.id] != null && draft[p.id] !== Number(p.corridor_km);
    return (
      <div
        key={p.id}
        className="rounded-md border border-border p-3 bg-background"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">
              {p.code}
              {p.category && (
                <span className="ml-2 text-muted-foreground/70">
                  · {p.category}
                </span>
              )}
            </div>
          </div>
          <Badge
            variant={dirty ? "default" : "secondary"}
            className="tabular-nums"
          >
            {current.toFixed(1)} km
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Slider
            value={[current]}
            min={0.5}
            max={10}
            step={0.1}
            onValueChange={([v]) =>
              setDraft((prev) => ({ ...prev, [p.id]: v }))
            }
            className="flex-1"
          />
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate({ id: p.id, km: current })}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save
          </Button>
        </div>

        <div className="flex items-center gap-1 mt-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.km}
              type="button"
              onClick={() =>
                setDraft((prev) => ({ ...prev, [p.id]: preset.km }))
              }
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                Math.abs(current - preset.km) < 0.05
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
              title={preset.hint}
            >
              {preset.label} · {preset.km}km
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="w-4 h-4 text-primary" />
            Shared-ride corridor (per pool)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Maximum distance a driver may detour from their planned route to
            pick up an extra passenger via Tier-2 proximity matching.
          </p>
        </div>
        <div className="w-56">
          <Input
            placeholder="Filter pools…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Loading pools…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No active pools found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(renderRow)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PoolCorridorSettings;
