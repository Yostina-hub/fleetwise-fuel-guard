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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import StatusBadge from "@/components/StatusBadge";
import { useVehicleFuelStatus } from "@/hooks/useVehicleFuelStatus";
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
  Radio,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Gauge,
  Clock,
  Wifi,
  WifiOff,
  Settings2,
  Droplets
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VehicleItem {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: 'moving' | 'idle' | 'offline';
  fuel: number | null;
  odometer: number;
  nextService: string | null;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
  speed?: number;
  latitude?: number | null;
  longitude?: number | null;
  lastSeen?: string | null;
  deviceConnected?: boolean;
  vin?: string;
}

type SortField = 'plate_number' | 'make' | 'status' | 'fuel_level_percent' | 'odometer_km' | 'speed_kmh' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface VehicleTableViewProps {
  vehicles: VehicleItem[];
  onVehicleClick: (vehicle: VehicleItem) => void;
  onEditVehicle?: (vehicle: VehicleItem) => void;
  onDeleteVehicle?: (vehicle: VehicleItem) => void;
  onAssignDriver?: (vehicle: VehicleItem) => void;
  onFuelHistory?: (vehicle: VehicleItem) => void;
  onTripHistory?: (vehicle: VehicleItem) => void;
  onSendCommand?: (vehicle: VehicleItem) => void;
  onAssignDevice?: (vehicle: VehicleItem) => void;
  onTerminalSettings?: (vehicle: VehicleItem) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  // Server-side sorting
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

export const VehicleTableView = ({
  vehicles,
  onVehicleClick,
  onEditVehicle,
  onDeleteVehicle,
  onAssignDriver,
  onFuelHistory,
  onTripHistory,
  onSendCommand,
  onAssignDevice,
  onTerminalSettings,
  selectedIds = [],
  onSelectionChange,
  sortField: externalSortField,
  sortDirection: externalSortDirection,
  onSortChange
}: VehicleTableViewProps) => {
  const navigate = useNavigate();
  const { fuelStatusMap } = useVehicleFuelStatus();
  
  // Use external sort state if provided, otherwise use local state
  const sortField = externalSortField;
  const sortDirection = externalSortDirection || 'asc';

  const getFuelColor = (level: number) => {
    if (level > 60) return "bg-success";
    if (level > 30) return "bg-warning";
    return "bg-destructive";
  };

  const handleSort = (field: SortField) => {
    if (!onSortChange) return;
    
    if (sortField === field) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never";
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  // When server-side sorting is used, don't sort client-side
  // Just use the vehicles array as-is since it comes pre-sorted from the server
  const sortedVehicles = vehicles;

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
                onClick={() => handleSort('plate_number')}
              >
                Plate {getSortIcon('plate_number')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">VIN</TableHead>
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
            <TableHead className="w-[80px]">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('speed_kmh')}
              >
                Speed {getSortIcon('speed_kmh')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('fuel_level_percent')}
              >
                Fuel {getSortIcon('fuel_level_percent')}
              </Button>
            </TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-medium"
                onClick={() => handleSort('odometer_km')}
              >
                Odometer {getSortIcon('odometer_km')}
              </Button>
            </TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Last Update</TableHead>
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
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{vehicle.plate}</span>
                    {vehicle.deviceConnected ? (
                      <Wifi className="w-3 h-3 text-success" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  {vehicle.vehicleType && (
                    <Badge variant="outline" className="text-xs w-fit mt-1 capitalize">
                      {vehicle.vehicleType.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-mono text-muted-foreground">
                  {vehicle.vin ? vehicle.vin.substring(0, 11) + '...' : '-'}
                </span>
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
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{vehicle.speed || 0}</span>
                  <span className="text-xs text-muted-foreground">km/h</span>
                </div>
              </TableCell>
              <TableCell>
                {(() => {
                  const fuelStatus = fuelStatusMap.get(vehicle.vehicleId);
                  const hasSensor = fuelStatus?.has_fuel_sensor;
                  const fuelLevel = fuelStatus?.last_fuel_reading ?? vehicle.fuel;
                  
                  if (hasSensor && fuelLevel !== null) {
                    return (
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                <div className="w-16 bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getFuelColor(fuelLevel)}`}
                                    style={{ width: `${fuelLevel}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-10">{Math.round(fuelLevel)}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Fuel sensor active</p>
                              <p className="text-xs text-muted-foreground">{fuelStatus.fuel_records_count} readings</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  }
                  
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Fuel className="h-3 w-3" />
                              No Sensor
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>No fuel sensor data available</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
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
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatLastSeen(vehicle.lastSeen)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onVehicleClick(vehicle)}
                          aria-label={`View details for ${vehicle.plate}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View details</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate("/map", { state: { selectedVehicleId: vehicle.vehicleId } })}
                          aria-label={`Track ${vehicle.plate} on map`}
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Track on map</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More actions for ${vehicle.plate}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>More actions</p>
                        </TooltipContent>
                      </Tooltip>
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
                        <DropdownMenuItem onClick={() => onAssignDevice?.(vehicle)}>
                          <Radio className="w-4 h-4 mr-2" />
                          GPS Device
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendCommand?.(vehicle)}>
                          <Power className="w-4 h-4 mr-2" />
                          Send Command
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTerminalSettings?.(vehicle)}>
                          <Settings2 className="w-4 h-4 mr-2" />
                          Terminal Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
          {vehicles.length === 0 && (
            <TableRow>
              <TableCell colSpan={onSelectionChange ? 11 : 10} className="text-center py-12">
                <p className="text-muted-foreground">No vehicles found</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
