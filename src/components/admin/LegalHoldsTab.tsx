import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const LegalHoldsTab = () => {
  const { organizationId } = useOrganization();

  const { data: legalHolds, isLoading } = useQuery({
    queryKey: ["legal_holds", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_holds")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading legal holds">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Legal Holds</h3>
          <p className="text-sm text-muted-foreground">
            Prevent data deletion for legal compliance and litigation
          </p>
        </div>
        <Button aria-label="Create new legal hold">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Create Legal Hold
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hold Name</TableHead>
            <TableHead>Case Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Issued Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {legalHolds?.map((hold: any) => (
            <TableRow key={hold.id}>
              <TableCell className="font-medium">{hold.hold_name}</TableCell>
              <TableCell>{hold.case_number || "-"}</TableCell>
              <TableCell className="capitalize">{hold.hold_type}</TableCell>
              <TableCell>{format(new Date(hold.issued_at), "MMM dd, yyyy")}</TableCell>
              <TableCell>
                {hold.status === "active" ? (
                  <Badge variant="destructive">Active</Badge>
                ) : (
                  <Badge variant="outline">Released</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {legalHolds?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" role="status" aria-label="No legal holds in place">
          <p>No legal holds in place</p>
          <p className="text-sm mt-2">Create holds to preserve data for legal purposes</p>
        </div>
      )}
    </div>
  );
};

export default LegalHoldsTab;
