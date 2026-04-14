import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook that sends notification (in-app + optionally email/SMS) when
 * a new trip approval is pending for a manager.
 */
export const useApprovalNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendApprovalNotification = useMutation({
    mutationFn: async ({
      approverId,
      requestNumber,
      requesterName,
      purpose,
      channels = ["in_app"],
    }: {
      approverId: string;
      requestNumber: string;
      requesterName: string;
      purpose: string;
      channels?: ("in_app" | "email" | "sms")[];
    }) => {
      const title = `Pending Approval: ${requestNumber}`;
      const message = `${requesterName} has submitted a trip request "${purpose}" that requires your approval.`;

      // 1. Always create in-app notification
      if (channels.includes("in_app")) {
        const { error } = await supabase.rpc("send_notification", {
          _user_id: approverId,
          _type: "approval_pending",
          _title: title,
          _message: message,
          _link: "/trip-management?tab=approvals",
          _metadata: { request_number: requestNumber },
        });
        if (error) console.error("In-app notification failed:", error);
      }

      // 2. Send email notification via edge function
      if (channels.includes("email")) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/send-approval-notification`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${session.session?.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "email",
                approver_id: approverId,
                request_number: requestNumber,
                requester_name: requesterName,
                purpose,
              }),
            }
          );
        } catch (e) {
          console.error("Email notification failed:", e);
        }
      }

      // 3. Send SMS notification via edge function
      if (channels.includes("sms")) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/send-approval-notification`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${session.session?.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "sms",
                approver_id: approverId,
                request_number: requestNumber,
                requester_name: requesterName,
                purpose,
              }),
            }
          );
        } catch (e) {
          console.error("SMS notification failed:", e);
        }
      }

      return { title, message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  /** Send notifications to all pending approvers of a request */
  const notifyPendingApprovers = useMutation({
    mutationFn: async ({
      requestId,
      requestNumber,
      requesterName,
      purpose,
      channels = ["in_app"],
    }: {
      requestId: string;
      requestNumber: string;
      requesterName: string;
      purpose: string;
      channels?: ("in_app" | "email" | "sms")[];
    }) => {
      // Fetch all pending approvers for this request
      const { data: pendingApprovals, error } = await supabase
        .from("trip_approvals" as any)
        .select("approver_id")
        .eq("trip_request_id", requestId)
        .eq("action", "pending");

      if (error) throw error;
      if (!pendingApprovals?.length) return;

      // Send notification to each approver
      const uniqueApprovers = [...new Set((pendingApprovals as any[]).map(a => a.approver_id))];
      await Promise.all(
        uniqueApprovers.map(approverId =>
          sendApprovalNotification.mutateAsync({
            approverId,
            requestNumber,
            requesterName,
            purpose,
            channels,
          })
        )
      );

      return { notifiedCount: uniqueApprovers.length };
    },
    onSuccess: (data) => {
      if (data?.notifiedCount) {
        toast({
          title: "Notifications Sent",
          description: `${data.notifiedCount} approver(s) have been notified`,
        });
      }
    },
  });

  return {
    sendApprovalNotification,
    notifyPendingApprovers,
  };
};
