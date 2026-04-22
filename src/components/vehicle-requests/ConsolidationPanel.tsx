/**
 * ConsolidationPanel
 * ------------------
 * Pool Supervisor panel showing merge-preview groups across three strategies
 * (exact route, destination + ±30min, geofence pair). Supervisor can manually
 * trigger auto-dispatch to apply a merge.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Layers, MapPin, Clock, Route, Zap } from "lucide-react";
import { toast } from "sonner";

interface Props {
  organizationId: string;
}

export const ConsolidationPanel = ({ organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("exact_route");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["consolidate-requests", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("consolidate-requests", {
        body: { organization_id: organizationId },
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

  const groups = data?.groups || { exact_route: [], dest_window: [], geofence_pair: [] };
  const counts = {
    exact_route: groups.exact_route?.length || 0,
    dest_window: groups.dest_window?.length || 0,
    geofence_pair: groups.geofence_pair?.length || 0,
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
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
              <div className="flex flex-wrap gap-1.5">
                {g.requests.map((r: any) => (
                  <Badge key={r.id} variant="outline" className="text-[11px]">
                    {r.request_number}
                    <Clock className="w-2.5 h-2.5 ml-1 opacity-60" />
                    {new Date(r.needed_from).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
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
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="exact_route">
                Exact route <Badge variant="secondary" className="ml-1">{counts.exact_route}</Badge>
              </TabsTrigger>
              <TabsTrigger value="dest_window">
                Dest + 30min <Badge variant="secondary" className="ml-1">{counts.dest_window}</Badge>
              </TabsTrigger>
              <TabsTrigger value="geofence_pair">
                Geofence pair <Badge variant="secondary" className="ml-1">{counts.geofence_pair}</Badge>
              </TabsTrigger>
            </TabsList>
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
