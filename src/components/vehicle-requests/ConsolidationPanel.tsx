/**
 * ConsolidationPanel
 * ------------------
 * Pool Supervisor panel showing merge-preview groups across FOUR strategies:
 *   1. exact_route   — same pool + departure + destination + day
 *   2. dest_window   — same destination + ±30 min
 *   3. geofence_pair — pickup geofence + drop geofence
 *   4. smart_rules   — configurable rule engine (capacity / proximity / time / compatibility)
 *
 * The Smart Rules tab exposes inline controls so the supervisor can tune the
 * thresholds before re-scanning.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Layers,
  MapPin,
  Clock,
  Route,
  Zap,
  Sliders,
  Users,
  Package,
  Snowflake,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  organizationId: string;
}

interface SmartRules {
  capacity: { enabled: boolean; max_utilization_pct: number; reference_capacity: number };
  proximity: { enabled: boolean; radius_km: number };
  time_window: { enabled: boolean; window_minutes: number };
  compatibility: { enabled: boolean };
}

const DEFAULT_RULES: SmartRules = {
  capacity: { enabled: true, max_utilization_pct: 80, reference_capacity: 14 },
  proximity: { enabled: true, radius_km: 5 },
  time_window: { enabled: true, window_minutes: 30 },
  compatibility: { enabled: true },
};

const STORAGE_KEY = "vr_consolidation_smart_rules";

export const ConsolidationPanel = ({ organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("smart_rules");
  const [rules, setRules] = useState<SmartRules>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_RULES, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_RULES;
  });

  const saveRules = (next: SmartRules) => {
    setRules(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["consolidate-requests", organizationId, rules],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("consolidate-requests", {
        body: { organization_id: organizationId, rules },
      });
      if (error) throw error;
      return data;
    },
  });

  const dispatchMut = useMutation({
    mutationFn: async (poolName: string | null) => {
      const { data, error } = await supabase.functions.invoke("auto-dispatch-pool", {
        body: { organization_id: organizationId, pool_name: poolName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (res: any) => {
      toast.success(`Dispatched ${res?.assigned ?? 0} request(s) across ${res?.groups ?? 0} group(s)`);
      queryClient.invalidateQueries({ queryKey: ["consolidate-requests", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["pool-supervisors-queue", organizationId] });
    },
    onError: (e: any) => toast.error(e?.message || "Dispatch failed"),
  });

  const groups = data?.groups || { exact_route: [], dest_window: [], geofence_pair: [], smart_rules: [] };
  const counts = {
    exact_route: groups.exact_route?.length || 0,
    dest_window: groups.dest_window?.length || 0,
    geofence_pair: groups.geofence_pair?.length || 0,
    smart_rules: groups.smart_rules?.length || 0,
  };

  const renderGroups = (list: any[], strategy: string) => {
    if (!list || list.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No mergeable groups for this strategy.
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {list.map((g: any) => {
          const first = g.requests[0];
          return (
            <div key={g.key} className="rounded-lg border p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                  <Layers className="w-4 h-4 text-primary" />
                  {strategy === "geofence_pair" ? (
                    <span>
                      <MapPin className="w-3 h-3 inline mr-0.5 text-success" />
                      {g.pickup_geofence} → {g.drop_geofence}
                    </span>
                  ) : (
                    <span>
                      {first.departure_place || "(pickup)"} → {first.destination || "(drop)"}
                    </span>
                  )}
                  <Badge variant="secondary">{g.count} requests</Badge>
                  {strategy === "smart_rules" && (
                    <>
                      {g.cargo_profile === "passenger" && g.utilization_pct != null && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" /> {g.combined_passengers} pax · {g.utilization_pct}%
                        </Badge>
                      )}
                      {g.cargo_profile === "cargo_dry" && (
                        <Badge variant="outline" className="gap-1">
                          <Package className="w-3 h-3" /> Dry cargo
                        </Badge>
                      )}
                      {g.cargo_profile === "cargo_cold" && (
                        <Badge variant="outline" className="gap-1 border-cyan-500/40 text-cyan-600">
                          <Snowflake className="w-3 h-3" /> Cold chain
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => dispatchMut.mutate(first.pool_name || null)}
                  disabled={dispatchMut.isPending}
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Dispatch group
                </Button>
              </div>
              {strategy === "smart_rules" && g.reasons?.length > 0 && (
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1">
                  {g.reasons.map((r: string) => (
                    <span key={r} className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">
                      ✓ {r}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {g.requests.map((r: any) => (
                  <Badge key={r.id} variant="outline" className="text-[11px]">
                    {r.request_number}
                    <Clock className="w-2.5 h-2.5 ml-1 opacity-60" />
                    {new Date(r.needed_from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                    {r.passengers ? ` · ${r.passengers}p` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const RuleRow = ({
    icon,
    title,
    desc,
    enabled,
    onToggle,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    enabled: boolean;
    onToggle: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <div className="rounded-md border border-border/50 p-3 space-y-2 bg-muted/20">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold">{title}</Label>
            <Switch checked={enabled} onCheckedChange={onToggle} className="ml-auto" />
          </div>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {enabled && children && <div className="pl-7 flex flex-wrap items-end gap-3">{children}</div>}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" />
          Request Consolidation
          <Badge variant="outline" className="ml-1">
            {data?.total_requests ?? 0} pending
          </Badge>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
          {isLoading || isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Scanning requests…
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="smart_rules" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Smart <Badge variant="secondary" className="ml-1">{counts.smart_rules}</Badge>
              </TabsTrigger>
              <TabsTrigger value="exact_route">
                Exact <Badge variant="secondary" className="ml-1">{counts.exact_route}</Badge>
              </TabsTrigger>
              <TabsTrigger value="dest_window">
                ±30min <Badge variant="secondary" className="ml-1">{counts.dest_window}</Badge>
              </TabsTrigger>
              <TabsTrigger value="geofence_pair">
                Geofence <Badge variant="secondary" className="ml-1">{counts.geofence_pair}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="smart_rules" className="mt-3 space-y-3">
              {/* Rules editor */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sliders className="w-3.5 h-3.5" />
                  Consolidation rules
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 ml-auto text-[11px]"
                    onClick={() => saveRules(DEFAULT_RULES)}
                  >
                    Reset
                  </Button>
                </div>

                <RuleRow
                  icon={<Users className="w-4 h-4" />}
                  title="Capacity utilization"
                  desc="Only consolidate when combined load stays below the threshold of vehicle capacity."
                  enabled={rules.capacity.enabled}
                  onToggle={(v) => saveRules({ ...rules, capacity: { ...rules.capacity, enabled: v } })}
                >
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Max utilization (%)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={100}
                      className="h-8 w-24 text-xs"
                      value={rules.capacity.max_utilization_pct}
                      onChange={(e) =>
                        saveRules({
                          ...rules,
                          capacity: { ...rules.capacity, max_utilization_pct: Number(e.target.value) || 80 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Reference seats</Label>
                    <Input
                      type="number"
                      min={1}
                      max={80}
                      className="h-8 w-24 text-xs"
                      value={rules.capacity.reference_capacity}
                      onChange={(e) =>
                        saveRules({
                          ...rules,
                          capacity: { ...rules.capacity, reference_capacity: Number(e.target.value) || 14 },
                        })
                      }
                    />
                  </div>
                </RuleRow>

                <RuleRow
                  icon={<MapPin className="w-4 h-4" />}
                  title="Geographic proximity"
                  desc="Group requests whose drop-offs fall within this radius."
                  enabled={rules.proximity.enabled}
                  onToggle={(v) => saveRules({ ...rules, proximity: { ...rules.proximity, enabled: v } })}
                >
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Radius (km)</Label>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      max={100}
                      className="h-8 w-24 text-xs"
                      value={rules.proximity.radius_km}
                      onChange={(e) =>
                        saveRules({
                          ...rules,
                          proximity: { ...rules.proximity, radius_km: Number(e.target.value) || 5 },
                        })
                      }
                    />
                  </div>
                </RuleRow>

                <RuleRow
                  icon={<Clock className="w-4 h-4" />}
                  title="Time window"
                  desc="Only group when scheduled pickups fall within this window of each other."
                  enabled={rules.time_window.enabled}
                  onToggle={(v) =>
                    saveRules({ ...rules, time_window: { ...rules.time_window, enabled: v } })
                  }
                >
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Window (minutes)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      className="h-8 w-24 text-xs"
                      value={rules.time_window.window_minutes}
                      onChange={(e) =>
                        saveRules({
                          ...rules,
                          time_window: { ...rules.time_window, window_minutes: Number(e.target.value) || 30 },
                        })
                      }
                    />
                  </div>
                </RuleRow>

                <RuleRow
                  icon={<Package className="w-4 h-4" />}
                  title="Compatibility"
                  desc="Never mix passengers with cargo, or temperature-controlled goods with dry cargo."
                  enabled={rules.compatibility.enabled}
                  onToggle={(v) =>
                    saveRules({ ...rules, compatibility: { enabled: v } })
                  }
                />
              </div>

              {renderGroups(groups.smart_rules, "smart_rules")}
            </TabsContent>

            <TabsContent value="exact_route" className="mt-3">
              {renderGroups(groups.exact_route, "exact_route")}
            </TabsContent>
            <TabsContent value="dest_window" className="mt-3">
              {renderGroups(groups.dest_window, "dest_window")}
            </TabsContent>
            <TabsContent value="geofence_pair" className="mt-3">
              {renderGroups(groups.geofence_pair, "geofence_pair")}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
