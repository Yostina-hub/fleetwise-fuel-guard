import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const IPAllowlistTab = () => {
  const { organizationId } = useOrganization();

  const { data: ipAllowlists, isLoading } = useQuery({
    queryKey: ["ip_allowlists", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ip_allowlists")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">IP Address Allowlists</h3>
          <p className="text-sm text-muted-foreground">
            Restrict access to specific IP addresses or ranges (CIDR notation supported)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add IP Range
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>IP Address/Range</TableHead>
            <TableHead>Applies To</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ipAllowlists?.map((ip: any) => (
            <TableRow key={ip.id}>
              <TableCell className="font-medium">{ip.name}</TableCell>
              <TableCell className="font-mono">{ip.ip_address}</TableCell>
              <TableCell className="capitalize">{ip.applies_to}</TableCell>
              <TableCell>
                {ip.is_active ? (
                  <Badge variant="outline">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {ipAllowlists?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No IP allowlists configured</p>
          <p className="text-sm mt-2">Add IP addresses to restrict access</p>
        </div>
      )}
    </div>
  );
};

export default IPAllowlistTab;
