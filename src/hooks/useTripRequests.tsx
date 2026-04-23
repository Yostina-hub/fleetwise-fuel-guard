import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDriverScope } from "./useDriverScope";
import { logActivity } from "@/lib/sessionTracker";

export const useTripRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDriverOnly, driverId, userId, loading: scopeLoading } = useDriverScope();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("trip-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: requests, isLoading: loading } = useQuery({
    queryKey: ["trip-requests", isDriverOnly, driverId, userId],
    queryFn: async () => {
      let query = supabase
        .from("trip_requests")
        .select(`
          *,
          pickup_geofence:pickup_geofence_id(id, name),
          drop_geofence:drop_geofence_id(id, name),
          preferred_driver:preferred_driver_id(id, first_name, last_name),
          cost_center:cost_center_id(id, code, name)
        `)
        .order("created_at", { ascending: false });

      // RBAC: drivers only see requests they raised or are the preferred driver for.
      if (isDriverOnly) {
        if (!userId) return [];
        const orParts = [`requester_id.eq.${userId}`];
        if (driverId) orParts.push(`preferred_driver_id.eq.${driverId}`);
        query = query.or(orParts.join(","));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !scopeLoading,
  });

  const createRequest = useMutation({
    mutationFn: async (request: any) => {
      const { data: orgData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id!)
        .single();

      const requestNumber = `TR-${Date.now().toString().slice(-8)}`;

      const payload = {
        organization_id: orgData?.organization_id!,
        requester_id: (await supabase.auth.getUser()).data.user?.id!,
        request_number: requestNumber,
        purpose: request.purpose,
        pickup_at: request.pickup_at,
        return_at: request.return_at,
        pickup_geofence_id: request.pickup_geofence_id || null,
        drop_geofence_id: request.drop_geofence_id || null,
        passenger_count: request.passengers || request.passenger_count || 1,
        preferred_driver_id: request.preferred_driver_id || null,
        cost_center_id: request.cost_center_id || null,
        priority: request.priority || "normal",
        special_requirements: request.special_requirements || null,
        cargo_weight_kg: request.cargo_weight_kg || null,
        cargo_volume_m3: request.cargo_volume_m3 || null,
        cargo_description: request.cargo_description || null,
        required_class: request.required_class || null,
        notes: request.notes || null,
        status: "draft",
      };

      const { data, error } = await supabase
        .from("trip_requests")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      logActivity({
        event_type: "request_created",
        event_category: "trip_request",
        resource_type: "trip_request",
        resource_id: data?.id ?? null,
      }).catch(() => {});
      toast({ title: "Success", description: "Trip request created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: request, error } = await supabase
        .from("trip_requests")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          sla_deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;

      const { data: orgData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id!)
        .single();

      if (!orgData?.organization_id) throw new Error("Organization not found");

      const { data: approvers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", orgData.organization_id)
        .eq("role", "operations_manager")
        .limit(1);

      if (approvers && approvers.length > 0) {
        const { error: approvalError } = await supabase
          .from("trip_approvals")
          .insert({
            trip_request_id: requestId,
            step: 1,
            approver_id: approvers[0].user_id,
            action: "pending",
          });

        if (approvalError) throw approvalError;
      }

      return request;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      logActivity({
        event_type: "request_submitted",
        event_category: "trip_request",
        resource_type: "trip_request",
        resource_id: data?.id ?? null,
      }).catch(() => {});
      toast({ title: "Success", description: "Trip request submitted for approval" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("trip_requests")
        .update({ status: "rejected", rejection_reason: "Cancelled by requester", rejected_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({ title: "Cancelled", description: "Trip request has been cancelled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("trip_requests")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({ title: "Updated", description: "Trip request updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return { requests, loading, createRequest, submitRequest, cancelRequest, updateRequest };
};
