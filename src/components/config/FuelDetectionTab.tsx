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
import { Plus, Settings } from "lucide-react";

const FuelDetectionTab = () => {
  const { organizationId } = useOrganization();

  const { data: configs, isLoading } = useQuery({
    queryKey: ["fuel_detection_configs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_detection_configs")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  if (isLoading) return <div role="status" aria-live="polite" aria-label="Loading fuel detection configurations">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Fuel Detection Algorithms</h3>
          <p className="text-sm text-muted-foreground">
            Configure refuel/theft detection thresholds and filters per vehicle
          </p>
        </div>
        <Button aria-label="Configure fuel detection for vehicle">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Configure Vehicle
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Refuel Threshold</TableHead>
            <TableHead>Theft Threshold</TableHead>
            <TableHead>Filters</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs?.map((config: any) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">
                {config.vehicles
                  ? `${config.vehicles.plate_number} (${config.vehicles.make})`
                  : "-"}
              </TableCell>
              <TableCell>{config.refuel_threshold_percent}%</TableCell>
              <TableCell>{config.theft_threshold_percent}%</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {config.use_kalman_filter && (
                    <Badge variant="secondary" className="text-xs">
                      Kalman
                    </Badge>
                  )}
                  {config.use_temperature_compensation && (
                    <Badge variant="secondary" className="text-xs">
                      Temp
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {config.is_active ? (
                  <Badge variant="outline">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" aria-label={`Configure fuel detection settings for ${config.vehicles?.plate_number || 'vehicle'}`}>
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {configs?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" role="status" aria-label="No fuel detection configurations found">
          <p>No fuel detection configs found</p>
          <p className="text-sm mt-2">
            Configure algorithms to detect refuel/theft events
          </p>
        </div>
      )}
    </div>
  );
};

export default FuelDetectionTab;
