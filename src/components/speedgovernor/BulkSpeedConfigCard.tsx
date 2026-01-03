import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Send, 
  Gauge,
  CheckCircle,
  Loader2,
  Settings2,
  Zap
} from "lucide-react";
import { useSpeedGovernor } from "@/hooks/useSpeedGovernor";
import { toast } from "sonner";
import { BatchSpeedCommandDialog } from "./BatchSpeedCommandDialog";

interface Vehicle {
  id: string;
  plate: string;
  maxSpeed: number;
  governorActive: boolean;
  hasConfig?: boolean;
}

interface BulkSpeedConfigCardProps {
  vehicles: Vehicle[];
}

export const BulkSpeedConfigCard = ({ vehicles }: BulkSpeedConfigCardProps) => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [bulkSpeedLimit, setBulkSpeedLimit] = useState<number>(80);
  const [isApplying, setIsApplying] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const { updateConfig } = useSpeedGovernor();

  // Prepare vehicles with hasConfig for batch dialog
  const vehiclesWithConfig = vehicles.map(v => ({
    ...v,
    hasConfig: v.maxSpeed > 0,
  }));

  const handleSelectAll = () => {
    if (selectedVehicles.length === vehicles.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(vehicles.map(v => v.id));
    }
  };

  const handleToggleVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleApplyBulk = async () => {
    if (selectedVehicles.length === 0) {
      toast.error("Please select at least one vehicle");
      return;
    }

    setIsApplying(true);
    try {
      // Apply speed limit to all selected vehicles
      await Promise.all(
        selectedVehicles.map(vehicleId =>
          updateConfig.mutateAsync({
            vehicleId,
            maxSpeedLimit: bulkSpeedLimit,
            governorActive: true
          })
        )
      );
      
      toast.success(`Speed limit of ${bulkSpeedLimit} km/h applied to ${selectedVehicles.length} vehicles`);
      setSelectedVehicles([]);
    } catch (error) {
      toast.error("Failed to apply speed limits to some vehicles");
    } finally {
      setIsApplying(false);
    }
  };

  const quickLimits = [60, 80, 100, 120];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          Bulk Speed Configuration
        </CardTitle>
        <CardDescription>
          Apply speed limits to multiple vehicles at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setBatchDialogOpen(true)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Send Batch Command
          </Button>
        </div>

        {/* Speed Limit Input */}
        <div className="space-y-2">
          <Label htmlFor="bulk-speed-limit">Speed Limit (km/h)</Label>
          <div className="flex gap-2">
            <Input
              id="bulk-speed-limit"
              type="number"
              value={bulkSpeedLimit}
              onChange={(e) => setBulkSpeedLimit(parseInt(e.target.value) || 80)}
              min={30}
              max={120}
              className="w-24"
            />
            <div className="flex gap-1">
              {quickLimits.map(limit => (
                <Button
                  key={limit}
                  variant={bulkSpeedLimit === limit ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkSpeedLimit(limit)}
                >
                  {limit}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Vehicles</Label>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedVehicles.length === vehicles.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No vehicles with speed governors found
              </p>
            ) : (
              vehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedVehicles.includes(vehicle.id) ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggleVehicle(vehicle.id)}
                >
                  <Checkbox
                    checked={selectedVehicles.includes(vehicle.id)}
                    onCheckedChange={() => handleToggleVehicle(vehicle.id)}
                    aria-label={`Select vehicle ${vehicle.plate}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{vehicle.plate}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {vehicle.maxSpeed} km/h
                    </p>
                  </div>
                  <Badge variant={vehicle.governorActive ? "default" : "secondary"} className="text-xs">
                    {vehicle.governorActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Apply Button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedVehicles.length} vehicle{selectedVehicles.length !== 1 ? "s" : ""} selected
          </div>
          <Button
            onClick={handleApplyBulk}
            disabled={selectedVehicles.length === 0 || isApplying}
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Apply to {selectedVehicles.length || "0"} Vehicles
          </Button>
        </div>

        {/* Batch Command Dialog */}
        <BatchSpeedCommandDialog
          open={batchDialogOpen}
          onOpenChange={setBatchDialogOpen}
          vehicles={vehiclesWithConfig}
        />
      </CardContent>
    </Card>
  );
};
