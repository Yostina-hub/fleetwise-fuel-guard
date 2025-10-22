import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/usePermissions";

import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

const GdprRequestsTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<"export" | "delete" | "rectify">("export");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["gdpr-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gdpr_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error("Missing organization or user");
      
      const { error } = await supabase
        .from("gdpr_requests")
        .insert([{
          request_type: requestType,
          notes,
          organization_id: organizationId,
          requested_by: user.id,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-requests"] });
      setIsDialogOpen(false);
      setRequestType("export");
      setNotes("");
      toast({
        title: "Request Submitted",
        description: "Your GDPR request has been submitted for processing",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit GDPR request",
        variant: "destructive",
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("gdpr_requests")
        .update({
          status,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdpr-requests"] });
      toast({
        title: "Request Updated",
        description: "GDPR request status has been updated",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">GDPR Data Requests</h2>
          <p className="text-sm text-muted-foreground">
            Request data export, deletion, or rectification
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create GDPR Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="requestType">Request Type</Label>
                <Select value={requestType} onValueChange={(v: any) => setRequestType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="export">Data Export</SelectItem>
                    <SelectItem value="delete">Data Deletion</SelectItem>
                    <SelectItem value="rectify">Data Rectification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional information about your request..."
                />
              </div>
              <Button
                onClick={() => createRequestMutation.mutate()}
                disabled={createRequestMutation.isPending}
                className="w-full"
              >
                {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Processed</TableHead>
              {isSuperAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium capitalize">
                  {request.request_type}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(request.requested_at), "PP")}
                </TableCell>
                <TableCell>
                  {request.processed_at
                    ? format(new Date(request.processed_at), "PP")
                    : "-"}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRequestMutation.mutate({
                              id: request.id,
                              status: "completed",
                            })
                          }
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRequestMutation.mutate({
                              id: request.id,
                              status: "rejected",
                            })
                          }
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default GdprRequestsTab;
