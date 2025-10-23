import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useApprovals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending approvals for current user
  const { data: pendingApprovals, isLoading: loading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("trip_approvals" as any)
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
      return data as any;
    },
  });

  // Fetch approval history
  const { data: approvalHistory } = useQuery({
    queryKey: ["approval-history"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("trip_approvals" as any)
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
      return data as any;
    },
  });

  // Approve request
  const approveRequest = useMutation({
    mutationFn: async ({ 
      approvalId, 
      requestId, 
      comment 
    }: { 
      approvalId: string; 
      requestId: string; 
      comment?: string;
    }) => {
      // Update approval
      const { error: approvalError } = await supabase
        .from("trip_approvals" as any)
        .update({
          action: "approve",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) throw approvalError;

      // Check if this was the last approval step
      const { data: allApprovals } = await supabase
        .from("trip_approvals" as any)
        .select("*")
        .eq("trip_request_id", requestId)
        .order("step");

      const pendingCount = allApprovals?.filter((a: any) => a.action === "pending").length || 0;

      // If no more pending approvals, update request status to approved
      if (pendingCount === 0) {
        const { error: requestError } = await supabase
          .from("trip_requests" as any)
          .update({ status: "approved" })
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject request
  const rejectRequest = useMutation({
    mutationFn: async ({ 
      approvalId, 
      requestId, 
      comment 
    }: { 
      approvalId: string; 
      requestId: string; 
      comment: string;
    }) => {
      // Update approval
      const { error: approvalError } = await supabase
        .from("trip_approvals" as any)
        .update({
          action: "reject",
          comment,
          acted_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) throw approvalError;

      // Update request status to rejected
      const { error: requestError } = await supabase
        .from("trip_requests" as any)
        .update({ 
          status: "rejected",
          rejection_reason: comment,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      
      toast({
        title: "Rejected",
        description: "Request has been rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Escalate approval
  const escalateApproval = useMutation({
    mutationFn: async ({ 
      approvalId, 
      comment 
    }: { 
      approvalId: string; 
      comment?: string;
    }) => {
      const { error } = await supabase
        .from("trip_approvals" as any)
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
      
      toast({
        title: "Escalated",
        description: "Approval has been escalated to next level",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    pendingApprovals,
    approvalHistory,
    loading,
    approveRequest,
    rejectRequest,
    escalateApproval,
  };
};
