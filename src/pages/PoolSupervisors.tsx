/**
 * PoolSupervisors
 * ---------------
 * Dedicated workspace for Pool Supervisors / Fleet Managers to review approved
 * vehicle requests and allocate vehicles + drivers from their pool. Previously
 * this UI lived inline on /vehicle-requests; it now has its own focused page
 * under Fleet Management → Pool Supervisors.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import Layout from "@/components/Layout";
import { PoolReviewPanel } from "@/components/vehicle-requests/PoolReviewPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Loader2, ClipboardList } from "lucide-react";

export default function PoolSupervisors() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  // Realtime — keep the queue fresh as approvals & assignments happen elsewhere.
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel("pool-supervisors-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pool-supervisors-queue", organizationId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pool-supervisors-queue", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)",
        )
        .eq("organization_id", organizationId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const approvedAwaiting = (requests as any[]).filter(
    (r) => r.status === "approved" && r.pool_review_status !== "reviewed",
  ).length;

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Pool Supervisors
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review approved vehicle requests and allocate a vehicle + driver from your pool.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-warning" />
                <span className="font-semibold">{approvedAwaiting}</span>
                <span className="text-muted-foreground">awaiting allocation</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Body */}
        {isLoading ? (
          <Card>
            <CardContent className="py-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading queue…
            </CardContent>
          </Card>
        ) : organizationId ? (
          approvedAwaiting === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Pool Supervisor Review
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No approved requests are waiting for pool review.</p>
                <p className="text-xs mt-1 opacity-70">
                  New approvals will appear here automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
            <PoolReviewPanel requests={requests} organizationId={organizationId} />
          )
        ) : null}
      </div>
    </Layout>
  );
}
