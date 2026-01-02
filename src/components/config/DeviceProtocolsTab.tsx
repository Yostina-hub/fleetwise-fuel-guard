import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const DeviceProtocolsTab = () => {
  const { organizationId } = useOrganization();

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["device_protocols", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_protocols")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("vendor", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading device protocols">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Device Protocol Decoders</h3>
          <p className="text-sm text-muted-foreground">
            Configure AVL codec parsers and vendor-specific decoders
          </p>
        </div>
        <Button aria-label="Add new device protocol">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Add Protocol
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Protocol Name</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Devices</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols?.map((protocol: any) => (
            <TableRow key={protocol.id}>
              <TableCell className="font-medium">{protocol.vendor}</TableCell>
              <TableCell>{protocol.protocol_name}</TableCell>
              <TableCell>{protocol.version || "-"}</TableCell>
              <TableCell>
                {protocol.is_active ? (
                  <Badge variant="outline">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">-</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {protocols?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" role="status" aria-label="No device protocols configured">
          <p>No device protocols configured</p>
          <p className="text-sm mt-2">Add protocols to decode tracker data</p>
        </div>
      )}
    </div>
  );
};

export default DeviceProtocolsTab;
