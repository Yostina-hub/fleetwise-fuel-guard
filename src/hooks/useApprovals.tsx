import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

export const useApprovals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Use the *effective* user — when a super_admin is impersonating, this is
  // the impersonated user's id, so approvals routed to them appear correctly.
  const { user: effectiveUser, isImpersonating } = useAuthContext();
  const effectiveUserId = effectiveUser?.id ?? null;

  // Realtime subscription for approvals (trip + fuel)
  useEffect(() => {
    const channel = supabase
      .channel("all-approvals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_approvals" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
          queryClient.invalidateQueries({ queryKey: ["approval-history"] });
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_request_approvals" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending-fuel-approvals"] });
          queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Fetch pending trip approvals for current user
  const { data: pendingApprovals, isLoading: loading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("trip_approvals")
        .select(`
          *,
          trip_request:trip_request_id(
            *,
            profiles:requester_id(email),
            pickup_geofence:pickup_geofence_id(name),
            drop_geofence:drop_geofence_id(name)
          )
        `)
        .eq("approver_id", user.user.id)
        .eq("action", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch pending fuel request approvals for current user
  const { data: pendingFuelApprovals, isLoading: fuelLoading } = useQuery({
    queryKey: ["pending-fuel-approvals"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("fuel_request_approvals")
        .select(`
          *,
          fuel_request:fuel_request_id(
            *
          )
        `)
        .eq("approver_id", user.user.id)
        .eq("action", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch approval history
  const { data: approvalHistory } = useQuery({
    queryKey: ["approval-history"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("trip_approvals")
        .select(`
          *,
          trip_request:trip_request_id(
            request_number,
            purpose,
            status
          )
        `)
        .eq("approver_id", user.user.id)
        .neq("action", "pending")
        .order("acted_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as any[];
    },
  });

  // Approve trip request
  const approveRequest = useMutation({
    mutationFn: async ({ approvalId, requestId, comment }: { approvalId: string; requestId: string; comment?: string }) => {
      const { error: approvalError } = await supabase
        .from("trip_approvals")
        .update({
          action: "approve",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) throw approvalError;

      const { data: allApprovals } = await supabase
        .from("trip_approvals")
        .select("*")
        .eq("trip_request_id", requestId)
        .order("step");

      const pendingCount = allApprovals?.filter((a) => a.action === "pending").length || 0;

      if (pendingCount === 0) {
        const { error: requestError } = await supabase
          .from("trip_requests")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", requestId);
        if (requestError) throw requestError;
      }

      return { requestId, allApproved: pendingCount === 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({
        title: "Approved",
        description: data.allApproved
          ? "Request fully approved and ready for scheduling"
          : "Approval recorded. Waiting for other approvers.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Approve fuel request
  const approveFuelRequest = useMutation({
    mutationFn: async ({ approvalId, fuelRequestId, comment, litersApproved }: { approvalId: string; fuelRequestId: string; comment?: string; litersApproved?: number }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error: approvalError } = await supabase
        .from("fuel_request_approvals")
        .update({
          action: "approve",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) throw approvalError;

      // Check remaining pending approvals for this fuel request
      const { data: allApprovals } = await supabase
        .from("fuel_request_approvals")
        .select("*")
        .eq("fuel_request_id", fuelRequestId)
        .order("step");

      const pendingCount = allApprovals?.filter((a) => a.action === "pending").length || 0;

      if (pendingCount === 0) {
        // Get the original request for liters
        const { data: fuelReq } = await supabase
          .from("fuel_requests")
          .select("liters_requested")
          .eq("id", fuelRequestId)
          .single();

        const { error: requestError } = await supabase
          .from("fuel_requests")
          .update({
            status: "approved",
            approved_by: user.user?.id,
            approved_at: new Date().toISOString(),
            liters_approved: litersApproved || fuelReq?.liters_requested,
          })
          .eq("id", fuelRequestId);
        if (requestError) throw requestError;
      }

      return { fuelRequestId, allApproved: pendingCount === 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-fuel-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast({
        title: "Fuel Request Approved",
        description: data.allApproved
          ? "Fuel request fully approved and ready for dispensing"
          : "Approval recorded. Waiting for other approvers.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reject fuel request
  const rejectFuelRequest = useMutation({
    mutationFn: async ({ approvalId, fuelRequestId, comment }: { approvalId: string; fuelRequestId: string; comment: string }) => {
      const { data: user } = await supabase.auth.getUser();

      const { error: approvalError } = await supabase
        .from("fuel_request_approvals")
        .update({
          action: "reject",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) throw approvalError;

      const { error: requestError } = await supabase
        .from("fuel_requests")
        .update({
          status: "rejected",
          rejected_reason: comment,
          approved_by: user.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", fuelRequestId);

      if (requestError) throw requestError;
      return fuelRequestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-fuel-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast({ title: "Rejected", description: "Fuel request has been rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reject trip request
  const rejectRequest = useMutation({
    mutationFn: async ({ approvalId, requestId, comment }: { approvalId: string; requestId: string; comment: string }) => {
      const { error: approvalError } = await supabase
        .from("trip_approvals")
        .update({
          action: "reject",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) throw approvalError;

      const { error: requestError } = await supabase
        .from("trip_requests")
        .update({
          status: "rejected",
          rejection_reason: comment,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (requestError) throw requestError;
      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({ title: "Rejected", description: "Request has been rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Escalate approval
  const escalateApproval = useMutation({
    mutationFn: async ({ approvalId, comment }: { approvalId: string; comment?: string }) => {
      const { error } = await supabase
        .from("trip_approvals")
        .update({
          action: "escalate",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (error) throw error;
      return approvalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      toast({ title: "Escalated", description: "Approval has been escalated to next level" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    pendingApprovals,
    pendingFuelApprovals,
    approvalHistory,
    loading: loading || fuelLoading,
    approveRequest,
    rejectRequest,
    escalateApproval,
    approveFuelRequest,
    rejectFuelRequest,
  };
};
