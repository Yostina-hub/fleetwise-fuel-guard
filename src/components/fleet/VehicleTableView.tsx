import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User
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
  nextService: string | null;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
  speed?: number;
  lastSeen?: string | null;
  deviceConnected?: boolean;
}

type SortField = 'plate' | 'make' | 'status' | 'fuel' | 'odometer';
type SortDirection = 'asc' | 'desc';

interface VehicleTableViewProps {
  vehicles: VehicleItem[];
  onVehicleClick: (vehicle: VehicleItem) => void;
  onEditVehicle?: (vehicle: VehicleItem) => void;
  onDeleteVehicle?: (vehicle: VehicleItem) => void;
  onAssignDriver?: (vehicle: VehicleItem) => void;
  onFuelHistory?: (vehicle: VehicleItem) => void;
  onTripHistory?: (vehicle: VehicleItem) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const VehicleTableView = ({
  vehicles,
  onVehicleClick,
  onEditVehicle,
  onDeleteVehicle,
  onAssignDriver,
  onFuelHistory,
  onTripHistory,
  selectedIds = [],
  onSelectionChange
}: VehicleTableViewProps) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getFuelColor = (level: number) => {
    if (level > 60) return "bg-success";
    if (level > 30) return "bg-warning";
    return "bg-destructive";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const allSelected = vehicles.length > 0 && selectedIds.length === vehicles.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < vehicles.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(vehicles.map(v => v.vehicleId));
    }
  };

  const handleSelectOne = (vehicleId: string) => {
    if (selectedIds.includes(vehicleId)) {
      onSelectionChange?.(selectedIds.filter(id => id !== vehicleId));
    } else {
      onSelectionChange?.([...selectedIds, vehicleId]);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {onSelectionChange && (
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
            )}
            <TableHead className="w-[140px]">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('plate')}
              >
                Plate {getSortIcon('plate')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('make')}
              >
                Vehicle {getSortIcon('make')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('status')}
              >
                Status {getSortIcon('status')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('fuel')}
              >
                Fuel {getSortIcon('fuel')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('odometer')}
              >
                Odometer {getSortIcon('odometer')}
              </Button>
            </TableHead>
            <TableHead>Driver</TableHead>
            <TableHead className="text-right w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedVehicles.map((vehicle) => (
            <TableRow 
              key={vehicle.id} 
              className={`hover:bg-muted/50 cursor-pointer transition-colors ${
                selectedIds.includes(vehicle.vehicleId) ? 'bg-primary/5' : ''
              }`}
              onClick={() => onVehicleClick(vehicle)}
            >
              {onSelectionChange && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.includes(vehicle.vehicleId)}
                    onCheckedChange={() => handleSelectOne(vehicle.vehicleId)}
                    aria-label={`Select ${vehicle.plate}`}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">{vehicle.plate}</span>
                  {vehicle.vehicleType && (
                    <Badge variant="outline" className="text-xs w-fit mt-1 capitalize">
                      {vehicle.vehicleType.replace('_', ' ')}
                    </Badge>
                  )}
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
                {vehicle.assignedDriver ? (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{vehicle.assignedDriver}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
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
                      <DropdownMenuItem onClick={() => onAssignDriver?.(vehicle)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Driver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/maintenance")}>
                        <Wrench className="w-4 h-4 mr-2" />
                        Maintenance
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFuelHistory?.(vehicle)}>
                        <Fuel className="w-4 h-4 mr-2" />
                        Fuel History
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTripHistory?.(vehicle)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Trip History
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
              <TableCell colSpan={onSelectionChange ? 8 : 7} className="text-center py-12">
                <p className="text-muted-foreground">No vehicles found</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
