import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Fuel, Car, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  driverId?: string;
  organizationId?: string | null;
  userId?: string;
  onViewVehicleRequest?: (request: any) => void;
}

const statusVariant = (s: string): "default" | "destructive" | "outline" | "secondary" => {
  if (["completed", "fulfilled", "approved", "auto_approved"].includes(s)) return "default";
  if (["rejected", "cancelled"].includes(s)) return "destructive";
  return "outline";
};

const DriverSubmissionsTab = ({ driverId, organizationId, userId, onViewVehicleRequest }: Props) => {
  const queryClient = useQueryClient();

  const { data: maintenance, isLoading: lm } = useQuery({
    queryKey: ["driver-portal-submissions", "maintenance", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data } = await supabase
        .from("maintenance_requests")
        .select("id, request_number, request_type, priority, status, workflow_stage, created_at, description")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!driverId,
  });

  const { data: fuel, isLoading: lf } = useQuery({
    queryKey: ["driver-portal-submissions", "fuel", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data } = await (supabase as any)
        .from("fuel_requests")
        .select("id, request_number, fuel_type, liters_requested, liters_approved, status, clearance_status, created_at, purpose")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!driverId,
  });

  const { data: vehicles, isLoading: lv } = useQuery({
    queryKey: ["driver-portal-submissions", "vehicle", userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return [];
      const { data } = await (supabase as any)
        .from("vehicle_requests")
        .select("id, request_number, purpose, request_type, priority, status, approval_status, needed_from, needed_until, created_at, destination, rejection_reason, rejected_at, assigned_vehicle_id, driver_checked_in_at, driver_checked_out_at, organization_id, assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model, year, fuel_type, status)")
        .eq("organization_id", organizationId)
        .eq("requester_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!userId && !!organizationId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
  };

  const isLoading = lm || lf || lv;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">My Submissions</h2>
        <Button size="sm" variant="ghost" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="maintenance" className="space-y-3">
        <TabsList>
          <TabsTrigger value="maintenance" className="gap-1">
            <Wrench className="w-4 h-4" aria-hidden="true" /> Maintenance ({maintenance?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="fuel" className="gap-1">
            <Fuel className="w-4 h-4" aria-hidden="true" /> Fuel ({fuel?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="gap-1">
            <Car className="w-4 h-4" aria-hidden="true" /> Vehicle ({vehicles?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : maintenance && maintenance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                    <TableCell className="capitalize">{r.request_type}</TableCell>
                    <TableCell>
                      <Badge variant={r.priority === "critical" || r.priority === "high" ? "destructive" : "outline"} className="capitalize">
                        {r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{(r.workflow_stage || r.status).replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM dd")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No maintenance requests yet</p>
          )}
        </TabsContent>

        <TabsContent value="fuel">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : fuel && fuel.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clearance</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuel.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                    <TableCell className="capitalize">{r.fuel_type || "—"}</TableCell>
                    <TableCell>{r.liters_approved || r.liters_requested}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.clearance_status?.replace(/_/g, " ") || "—"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM dd")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No fuel requests yet</p>
          )}
        </TabsContent>

        <TabsContent value="vehicle">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : vehicles && vehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((r: any) => (
                  <TableRow
                    key={r.id}
                    className={onViewVehicleRequest ? "cursor-pointer hover:bg-muted/40" : undefined}
                    onClick={onViewVehicleRequest ? () => onViewVehicleRequest(r) : undefined}
                  >
                    <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={r.priority === "urgent" || r.priority === "high" ? "destructive" : "outline"} className="capitalize">
                        {r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.approval_status?.replace(/_/g, " ") || "—"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.needed_from ? format(new Date(r.needed_from), "MMM dd HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No vehicle requests yet</p>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default DriverSubmissionsTab;
