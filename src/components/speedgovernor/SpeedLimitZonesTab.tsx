import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, School, Construction, Car, Building2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

interface SpeedLimitZone {
  id: string;
  name: string;
  description: string | null;
  zone_type: string;
  speed_limit_kmh: number;
  geofence_id: string | null;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  days_active: number[] | null;
  geofences?: { name: string } | null;
}

interface Geofence {
  id: string;
  name: string;
}

const ZONE_TYPES = [
  { value: "school", label: "School Zone", icon: School, color: "bg-yellow-500" },
  { value: "construction", label: "Construction Zone", icon: Construction, color: "bg-orange-500" },
  { value: "highway", label: "Highway", icon: Car, color: "bg-blue-500" },
  { value: "urban", label: "Urban Area", icon: Building2, color: "bg-gray-500" },
  { value: "custom", label: "Custom Zone", icon: MapPin, color: "bg-purple-500" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const SpeedLimitZonesTab = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<SpeedLimitZone | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [zoneType, setZoneType] = useState("custom");
  const [speedLimit, setSpeedLimit] = useState(50);
  const [geofenceId, setGeofenceId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [daysActive, setDaysActive] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Fetch zones
  const { data: zones, isLoading } = useQuery({
    queryKey: ["speed-limit-zones", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_limit_zones")
        .select(`*, geofences(name)`)
        .eq("organization_id", organizationId!)
        .order("name");

      if (error) throw error;
      return data as SpeedLimitZone[];
    },
    enabled: !!organizationId,
  });

  // Fetch geofences
  const { data: geofences } = useQuery({
    queryKey: ["geofences-for-zones", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select("id, name")
        .eq("organization_id", organizationId!)
        .order("name");

      if (error) throw error;
      return data as Geofence[];
    },
    enabled: !!organizationId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const zoneData = {
        organization_id: organizationId!,
        name,
        description: description || null,
        zone_type: zoneType,
        speed_limit_kmh: speedLimit,
        geofence_id: geofenceId || null,
        is_active: isActive,
        start_time: startTime || null,
        end_time: endTime || null,
        days_active: daysActive,
      };

      if (editingZone) {
        const { error } = await supabase
          .from("speed_limit_zones")
          .update(zoneData)
          .eq("id", editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("speed_limit_zones")
          .insert([zoneData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-limit-zones"] });
      toast({
        title: editingZone ? "Zone Updated" : "Zone Created",
        description: `Speed limit zone has been ${editingZone ? "updated" : "created"} successfully.`,
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("speed_limit_zones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-limit-zones"] });
      toast({
        title: "Zone Deleted",
        description: "Speed limit zone has been removed.",
      });
    },
  });

  const resetForm = () => {
    setEditingZone(null);
    setName("");
    setDescription("");
    setZoneType("custom");
    setSpeedLimit(50);
    setGeofenceId("");
    setIsActive(true);
    setStartTime("");
    setEndTime("");
    setDaysActive([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleEdit = (zone: SpeedLimitZone) => {
    setEditingZone(zone);
    setName(zone.name);
    setDescription(zone.description || "");
    setZoneType(zone.zone_type);
    setSpeedLimit(zone.speed_limit_kmh);
    setGeofenceId(zone.geofence_id || "");
    setIsActive(zone.is_active);
    setStartTime(zone.start_time || "");
    setEndTime(zone.end_time || "");
    setDaysActive(zone.days_active || [0, 1, 2, 3, 4, 5, 6]);
    setDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    setDaysActive(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const getZoneTypeInfo = (type: string) => {
    return ZONE_TYPES.find(z => z.value === type) || ZONE_TYPES[4];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Speed Limit Zones
            </CardTitle>
            <CardDescription>
              Configure zone-based speed limits tied to geofences
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingZone ? "Edit Speed Limit Zone" : "Create Speed Limit Zone"}</DialogTitle>
                <DialogDescription>
                  Configure a zone-based speed limit that applies to a specific area
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="zone-name">Zone Name</Label>
                  <Input
                    id="zone-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Bole Road School Zone"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zone-description">Description</Label>
                  <Input
                    id="zone-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="zone-type">Zone Type</Label>
                    <Select value={zoneType} onValueChange={setZoneType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="speed-limit">Speed Limit (km/h)</Label>
                    <Input
                      id="speed-limit"
                      type="number"
                      value={speedLimit}
                      onChange={(e) => setSpeedLimit(parseInt(e.target.value))}
                      min={10}
                      max={120}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="geofence">Link to Geofence</Label>
                  <Select value={geofenceId} onValueChange={setGeofenceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a geofence (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No geofence</SelectItem>
                      {geofences?.map(gf => (
                        <SelectItem key={gf.id} value={gf.id}>{gf.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-time">Active From</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-time">Active Until</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Active Days</Label>
                  <div className="flex gap-1">
                    {DAYS.map((day, index) => (
                      <Button
                        key={day}
                        type="button"
                        variant={daysActive.includes(index) ? "default" : "outline"}
                        size="sm"
                        className="w-10"
                        onClick={() => toggleDay(index)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="zone-active">Zone Status</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable this zone</p>
                  </div>
                  <Switch
                    id="zone-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingZone ? "Update Zone" : "Create Zone"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !zones?.length ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No Speed Limit Zones</p>
            <p className="text-muted-foreground text-sm mb-4">
              Create zones to enforce different speed limits in different areas
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Zone
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Speed Limit</TableHead>
                  <TableHead>Geofence</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => {
                  const typeInfo = getZoneTypeInfo(zone.zone_type);
                  const Icon = typeInfo.icon;
                  return (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">
                        <div>
                          {zone.name}
                          {zone.description && (
                            <p className="text-xs text-muted-foreground">{zone.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-lg">{zone.speed_limit_kmh} km/h</TableCell>
                      <TableCell>
                        {zone.geofences?.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {zone.start_time && zone.end_time ? (
                          <span>{zone.start_time} - {zone.end_time}</span>
                        ) : (
                          <span className="text-muted-foreground">All day</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.is_active ? "default" : "secondary"}>
                          {zone.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(zone)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(zone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};