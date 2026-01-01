import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import { 
  Eye, 
  MapPin, 
  MoreHorizontal, 
  Wrench, 
  Fuel, 
  Edit, 
  Trash2, 
  UserPlus,
  Power,
  FileText
} from "lucide-react";

interface VehicleItem {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: 'moving' | 'idle' | 'offline';
  fuel: number;
  odometer: number;
  nextService: string;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
}

interface VehicleTableViewProps {
  vehicles: VehicleItem[];
  onVehicleClick: (vehicle: VehicleItem) => void;
  onEditVehicle?: (vehicle: VehicleItem) => void;
  onDeleteVehicle?: (vehicle: VehicleItem) => void;
}

export const VehicleTableView = ({
  vehicles,
  onVehicleClick,
  onEditVehicle,
  onDeleteVehicle
}: VehicleTableViewProps) => {
  const navigate = useNavigate();

  const getFuelColor = (level: number) => {
    if (level > 60) return "bg-success";
    if (level > 30) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">Plate</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Fuel</TableHead>
            <TableHead>Odometer</TableHead>
            <TableHead>Next Service</TableHead>
            <TableHead className="text-right w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow 
              key={vehicle.id} 
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onVehicleClick(vehicle)}
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">{vehicle.plate}</span>
                  <Badge variant="outline" className="text-xs w-fit mt-1">
                    {vehicle.id}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                  <span className="text-sm text-muted-foreground">{vehicle.year}</span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={vehicle.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getFuelColor(vehicle.fuel)}`}
                      style={{ width: `${vehicle.fuel}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-10">{vehicle.fuel}%</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium">{vehicle.odometer.toLocaleString()} km</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{vehicle.nextService}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onVehicleClick(vehicle)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate("/map", { state: { selectedVehicleId: vehicle.vehicleId } })}
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onVehicleClick(vehicle)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/map", { state: { selectedVehicleId: vehicle.vehicleId } })}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Track on Map
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEditVehicle?.(vehicle)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Vehicle
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Driver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/maintenance")}>
                        <Wrench className="w-4 h-4 mr-2" />
                        Maintenance
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/fuel-monitoring")}>
                        <Fuel className="w-4 h-4 mr-2" />
                        Fuel History
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/route-history")}>
                        <FileText className="w-4 h-4 mr-2" />
                        Trip History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Power className="w-4 h-4 mr-2" />
                        Send Command
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDeleteVehicle?.(vehicle)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Vehicle
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {vehicles.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <p className="text-muted-foreground">No vehicles found</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
