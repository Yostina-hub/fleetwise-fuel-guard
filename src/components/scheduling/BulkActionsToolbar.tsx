import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkActionsToolbarProps {
  selectedItems: string[];
  onClearSelection: () => void;
  itemType: "approvals" | "requests";
}

export const BulkActionsToolbar = ({
  selectedItems,
  onClearSelection,
  itemType,
}: BulkActionsToolbarProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const bulkApprove = useMutation({
    mutationFn: async (approvalIds: string[]) => {
      const promises = approvalIds.map((id) =>
        (supabase as any)
          .from("trip_approvals")
          .update({
            action: "approve",
            action_at: new Date().toISOString(),
            comment: "Bulk approved",
          })
          .eq("id", id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error("Some approvals failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({
        title: "Bulk Approval Complete",
        description: `${selectedItems.length} requests approved successfully.`,
      });
      onClearSelection();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Some approvals failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkReject = useMutation({
    mutationFn: async (approvalIds: string[]) => {
      const promises = approvalIds.map((id) =>
        (supabase as any)
          .from("trip_approvals")
          .update({
            action: "reject",
            action_at: new Date().toISOString(),
            comment: "Bulk rejected",
          })
          .eq("id", id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error("Some rejections failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({
        title: "Bulk Rejection Complete",
        description: `${selectedItems.length} requests rejected.`,
      });
      onClearSelection();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Some rejections failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBulkApprove = () => {
    if (selectedItems.length === 0) return;
    setProcessing(true);
    bulkApprove.mutate(selectedItems);
    setProcessing(false);
  };

  const handleBulkReject = () => {
    if (selectedItems.length === 0) return;
    setProcessing(true);
    bulkReject.mutate(selectedItems);
    setProcessing(false);
  };

  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <Badge variant="secondary" className="text-base px-3 py-1">
          {selectedItems.length} selected
        </Badge>

        <div className="flex gap-2">
          {itemType === "approvals" && (
            <>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={processing}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve All
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkReject}
                disabled={processing}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject All
              </Button>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      </div>
    </div>
  );
};
