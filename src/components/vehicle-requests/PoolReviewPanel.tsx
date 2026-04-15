import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Truck, Users, Send, UserCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVehicles } from "@/hooks/useVehicles";
import { useAvailableVehicles } from "@/hooks/useAvailableVehicles";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  requests: any[];
  organizationId: string;
}

export const PoolReviewPanel = ({ requests, organizationId }: Props) => {
  const queryClient = useQueryClient();
  const { available } = useAvailableVehicles();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  // Requests that are approved and need pool review/assignment
  const approvedRequests = requests.filter(
    (r: any) => r.status === "approved" && r.pool_review_status !== "reviewed"
  );

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: "reviewed" | "unavailable" }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("vehicle_requests").update({
        pool_review_status: action,
        pool_reviewer_id: user!.id,
        pool_reviewed_at: new Date().toISOString(),
      }).eq("id", requestId);
    },
    onSuccess: () => {
      toast.success("Pool review updated");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ requestId, vehicleId, driverId }: { requestId: string; vehicleId: string; driverId?: string }) => {
      const request = requests.find((r: any) => r.id === requestId);
      const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
      
      const updates: any = {
        status: "assigned",
        assigned_vehicle_id: vehicleId,
        assigned_at: new Date().toISOString(),
        actual_assignment_minutes: mins,
        pool_review_status: "reviewed",
        pool_reviewed_at: new Date().toISOString(),
      };
      
      if (driverId) {
        updates.assigned_driver_id = driverId;
      }

      const user = (await supabase.auth.getUser()).data.user;
      updates.pool_reviewer_id = user!.id;
      updates.assigned_by = user!.id;

      await (supabase as any).from("vehicle_requests").update(updates).eq("id", requestId);
    },
    onSuccess: () => {
      toast.success("Vehicle assigned from pool");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      setExpandedId(null);
      setSelectedVehicle("");
      setSelectedDriver("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (approvedRequests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No requests pending pool review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          Pool Supervisor Review ({approvedRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvedRequests.map((r: any) => (
          <div key={r.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{r.request_number}</span>
                <Badge variant="outline" className="text-[10px]">
                  {r.request_type === "daily_operation" ? "Daily" : r.request_type === "project_operation" ? "Project" : "Field"}
                </Badge>
                {r.pool_name && <Badge variant="secondary" className="text-[10px]">{r.pool_name}</Badge>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                {expandedId === r.id ? "Collapse" : "Review"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Requester: {r.requester_name}</span>
              <span>From: {format(new Date(r.needed_from), "MMM dd, HH:mm")}</span>
              <span>Route: {r.departure_place || "—"} → {r.destination || "—"}</span>
            </div>

            {r.project_number && (
              <div className="text-xs text-muted-foreground">Project: {r.project_number}</div>
            )}

            {expandedId === r.id && (
              <div className="border-t pt-3 space-y-3">
                {/* Vehicle availability */}
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-1">
                    <Truck className="w-3 h-3" /> Available Vehicles ({available.length})
                  </Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select available vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {available.slice(0, 30).map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.plate_number} — {v.make} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-xs"
                    disabled={!selectedVehicle || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ requestId: r.id, vehicleId: selectedVehicle, driverId: selectedDriver || undefined })}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {assignMutation.isPending ? "Assigning..." : "Assign & Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => reviewMutation.mutate({ requestId: r.id, action: "unavailable" })}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> No Vehicles Available
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
