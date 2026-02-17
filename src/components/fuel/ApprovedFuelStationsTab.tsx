import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useSubmitThrottle } from "@/hooks/useSubmitThrottle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, MapPin, Fuel, Edit, Trash2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

interface ApprovedStation {
  id: string;
  name: string;
  brand?: string;
  lat: number;
  lng: number;
  radius_meters?: number;
  is_active?: boolean;
}

export default function ApprovedFuelStationsTab() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const canSubmit = useSubmitThrottle();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStation, setEditingStation] = useState<ApprovedStation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    lat: "",
    lng: "",
    radius_meters: "100",
    is_active: true,
  });

  const { data: stations, isLoading } = useQuery({
    queryKey: ["approved_fuel_stations", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approved_fuel_stations")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");
      
      if (error) throw error;
      return data as ApprovedStation[];
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(
    stations?.length || 0, 
    ITEMS_PER_PAGE
  );
  const paginatedStations = stations?.slice(startIndex, endIndex) || [];

  const createMutation = useMutation({
    mutationFn: async (data: Omit<ApprovedStation, 'id'>) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      const { error } = await supabase
        .from("approved_fuel_stations")
        .insert({ ...data, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approved_fuel_stations"] });
      toast.success("Station added");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: ApprovedStation) => {
      const { error } = await supabase
        .from("approved_fuel_stations")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approved_fuel_stations"] });
      toast.success("Station updated");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("approved_fuel_stations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approved_fuel_stations"] });
      toast.success("Station removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({ name: "", brand: "", lat: "", lng: "", radius_meters: "100", is_active: true });
    setShowAddDialog(false);
    setEditingStation(null);
  };

  const handleSubmit = () => {
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    
    if (!formData.name || isNaN(lat) || isNaN(lng)) {
      toast.error("Name and valid coordinates required");
      return;
    }

    const data = {
      name: formData.name,
      brand: formData.brand || undefined,
      lat,
      lng,
      radius_meters: parseInt(formData.radius_meters) || 100,
      is_active: formData.is_active,
    };

    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (station: ApprovedStation) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      brand: station.brand || "",
      lat: station.lat.toString(),
      lng: station.lng.toString(),
      radius_meters: (station.radius_meters || 100).toString(),
      is_active: station.is_active ?? true,
    });
    setShowAddDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Approved Fuel Stations</h3>
          <p className="text-sm text-muted-foreground">
            Manage locations where refueling is authorized
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" />
          Add Station
        </Button>
      </div>

      {(!stations || stations.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Fuel className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-2">No Approved Stations</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Add fuel stations where drivers are authorized to refuel. 
              This helps detect unauthorized refueling locations.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Benefits:</p>
                  <ul className="space-y-1">
                    <li>• Alert when refueling at unapproved locations</li>
                    <li>• Track negotiated fuel prices by station</li>
                    <li>• Optimize routes based on approved stations</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>Add First Station</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStations.map(station => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>{station.brand || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
                    </TableCell>
                    <TableCell>{station.radius_meters || 100}m</TableCell>
                    <TableCell>
                      <Badge variant={station.is_active ? "outline" : "secondary"}>
                        {station.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(station)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteMutation.mutate(station.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={currentPage}
              totalItems={stations.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStation ? "Edit" : "Add"} Fuel Station</DialogTitle>
            <DialogDescription>
              Enter station details and GPS coordinates for geofence matching.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="station-name">Station Name *</Label>
                <Input
                  id="station-name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Shell Main Street"
                />
              </div>
              <div>
                <Label htmlFor="station-brand">Brand</Label>
                <Input
                  id="station-brand"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Shell, Total, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="station-lat">Latitude *</Label>
                <Input
                  id="station-lat"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={e => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="-1.2921"
                />
              </div>
              <div>
                <Label htmlFor="station-lng">Longitude *</Label>
                <Input
                  id="station-lng"
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={e => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="36.8219"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="station-radius">Radius (meters)</Label>
              <Input
                id="station-radius"
                type="number"
                value={formData.radius_meters}
                onChange={e => setFormData({ ...formData, radius_meters: e.target.value })}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Detection zone around station coordinates
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="station-active" className="cursor-pointer">Active</Label>
              <Switch
                id="station-active"
                checked={formData.is_active}
                onCheckedChange={v => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingStation ? "Update" : "Add"} Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
