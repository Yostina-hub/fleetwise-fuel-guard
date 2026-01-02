import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const AVAILABLE_TABLES = [
  "telemetry",
  "trips",
  "audit_logs",
  "alerts",
  "driver_events",
  "fuel_events",
  "geofence_events",
];

const DataRetentionTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [retentionDays, setRetentionDays] = useState("90");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["retention-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_retention_policies")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(policies?.length || 0, 10);

  const createPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Missing organization");
      
      const { error } = await supabase
        .from("data_retention_policies")
        .insert([{
          table_name: selectedTable,
          retention_days: parseInt(retentionDays),
          organization_id: organizationId,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-policies"] });
      setIsDialogOpen(false);
      setSelectedTable("");
      setRetentionDays("90");
      toast({
        title: "Policy Created",
        description: "Data retention policy has been created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create retention policy",
        variant: "destructive",
      });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("data_retention_policies")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-policies"] });
      toast({
        title: "Policy Deleted",
        description: "Retention policy has been removed",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Data Retention Policies</h2>
          <p className="text-sm text-muted-foreground">
            Configure how long different types of data are retained
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Add new retention policy">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Retention Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="table">Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger aria-label="Select table for retention policy">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TABLES.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="days">Retention Period (days)</Label>
                <Input
                  id="days"
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  min="1"
                />
              </div>
              <Button
                onClick={() => createPolicyMutation.mutate()}
                disabled={!selectedTable || !retentionDays || createPolicyMutation.isPending}
                className="w-full"
              >
                {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p role="status" aria-live="polite" aria-label="Loading retention policies">Loading...</p>
      ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Retention Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Cleanup</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies?.slice(startIndex, endIndex).map((policy) => (
              <TableRow key={policy.id}>
                <TableCell className="font-medium">{policy.table_name}</TableCell>
                <TableCell>{policy.retention_days} days</TableCell>
                <TableCell>
                  <Badge variant={policy.is_active ? "default" : "secondary"}>
                    {policy.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {policy.last_cleanup_at
                    ? format(new Date(policy.last_cleanup_at), "PP")
                    : "Never"}
                </TableCell>
                <TableCell>
                  {format(new Date(policy.created_at), "PP")}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePolicyMutation.mutate(policy.id)}
                    aria-label={`Delete retention policy for ${policy.table_name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalItems={policies?.length || 0}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
        </>
      )}
    </div>
  );
};

export default DataRetentionTab;
