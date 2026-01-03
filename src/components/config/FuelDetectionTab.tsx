import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Settings, Info, Loader2 } from "lucide-react";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import FuelDetectionConfigDialog from "@/components/fuel/FuelDetectionConfigDialog";

const ITEMS_PER_PAGE = 10;

const FuelDetectionTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

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

  const handleAddClick = () => {
    setEditingConfig(null);
    setShowConfigDialog(true);
  };

  const handleEditClick = (config: any) => {
    setEditingConfig(config);
    setShowConfigDialog(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["fuel_detection_configs"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading fuel detection configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Fuel Detection Algorithms</h3>
          <p className="text-sm text-muted-foreground">
            Configure refuel/theft detection thresholds and filters per vehicle
          </p>
        </div>
        <Button aria-label="Configure fuel detection for vehicle" onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Configure Vehicle
        </Button>
      </div>

      <FuelConfigsTable 
        configs={configs || []} 
        onEditClick={handleEditClick}
      />

      <FuelDetectionConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onSuccess={handleSuccess}
        existingConfig={editingConfig}
      />
    </div>
  );
};

interface FuelConfigsTableProps {
  configs: any[];
  onEditClick: (config: any) => void;
}

const FuelConfigsTable = ({ configs, onEditClick }: FuelConfigsTableProps) => {
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(configs.length, ITEMS_PER_PAGE);
  const paginatedConfigs = configs.slice(startIndex, endIndex);

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Settings className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="font-medium mb-2">No Fuel Detection Configs</p>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          Configure algorithms to automatically detect refuel and theft events for your vehicles.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
          <div className="flex items-start gap-2 text-sm">
            <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Detection features:</p>
              <ul className="space-y-1">
                <li>• Automatic refuel event detection</li>
                <li>• Fuel theft/leak detection with configurable thresholds</li>
                <li>• Kalman filter for sensor noise reduction</li>
                <li>• Temperature compensation for accurate readings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
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
          {paginatedConfigs.map((config: any) => (
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEditClick(config)}
                  aria-label={`Configure fuel detection settings for ${config.vehicles?.plate_number || 'vehicle'}`}
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        currentPage={currentPage}
        totalItems={configs.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default FuelDetectionTab;
