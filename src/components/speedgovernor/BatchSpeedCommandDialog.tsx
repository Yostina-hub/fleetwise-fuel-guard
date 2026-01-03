import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";
import { Gauge, Loader2, CheckCircle, XCircle } from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  maxSpeed: number;
  governorActive: boolean;
  hasConfig: boolean;
}

interface BatchSpeedCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
}

interface BatchResult {
  vehicleId: string;
  plate: string;
  success: boolean;
  commandId?: string;
  error?: string;
}

export function BatchSpeedCommandDialog({ 
  open, 
  onOpenChange, 
  vehicles 
}: BatchSpeedCommandDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [speedLimit, setSpeedLimit] = useState(80);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const selectAll = () => {
    if (selectedVehicleIds.length === vehicles.length) {
      setSelectedVehicleIds([]);
    } else {
      setSelectedVehicleIds(vehicles.map(v => v.id));
    }
  };

  const handleSendBatch = async () => {
    if (!organizationId || !user || selectedVehicleIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one vehicle",
        variant: "destructive",
      });
      return;
    }

    if (speedLimit < 20 || speedLimit > 180) {
      toast({
        title: "Invalid Speed Limit",
        description: "Speed limit must be between 20 and 180 km/h",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-governor-command", {
        body: {
          vehicleIds: selectedVehicleIds,
          commandType: "set_speed_limit",
          speedLimit,
          organizationId,
          userId: user.id,
          isBatch: true,
        },
      });

      if (error) throw error;

      setResults(data.results as BatchResult[]);
      
      const successCount = data.results.filter((r: BatchResult) => r.success).length;
      toast({
        title: "Batch Command Sent",
        description: `Successfully sent to ${successCount}/${data.results.length} vehicles`,
        variant: successCount === data.results.length ? "default" : "destructive",
      });

      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
      queryClient.invalidateQueries({ queryKey: ["speed-governor-configs"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send batch command";
      console.error("Error sending batch command:", error);
      toast({
        title: "Batch Command Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setResults(null);
    setSelectedVehicleIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Batch Speed Limit Command
          </DialogTitle>
          <DialogDescription>
            Set the same speed limit for multiple vehicles at once
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {results.filter(r => r.success).length} / {results.length} Successful
              </Badge>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg p-3">
              <div className="space-y-2">
                {results.map((result) => (
                  <div 
                    key={result.vehicleId}
                    className={`flex items-center justify-between p-2 rounded ${
                      result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                    }`}
                  >
                    <span className="font-medium text-sm">{result.plate}</span>
                    {result.success ? (
                      <Badge variant="default" className="bg-green-600 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {result.error || "Failed"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Speed Limit (km/h)</Label>
              <Input
                type="number"
                min={20}
                max={180}
                value={speedLimit}
                onChange={(e) => setSpeedLimit(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Vehicles ({selectedVehicleIds.length} selected)</Label>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedVehicleIds.length === vehicles.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <ScrollArea className="h-[250px] border rounded-lg p-3">
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleVehicle(vehicle.id)}
                    >
                      <Checkbox 
                        checked={selectedVehicleIds.includes(vehicle.id)}
                        onCheckedChange={() => toggleVehicle(vehicle.id)}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{vehicle.plate}</span>
                        {vehicle.hasConfig && (
                          <span className="text-xs text-muted-foreground ml-2">
                            Current: {vehicle.maxSpeed} km/h
                          </span>
                        )}
                      </div>
                      {vehicle.governorActive && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button 
              onClick={handleSendBatch} 
              disabled={selectedVehicleIds.length === 0 || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send to ${selectedVehicleIds.length} Vehicles`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
