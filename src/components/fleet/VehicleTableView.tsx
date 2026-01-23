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
import VehicleTypeImage from "./VehicleTypeImage";
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
  AlertTriangle
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
  
  // Use external sort state if provided, otherwise use local state
  const sortField = externalSortField;
  const sortDirection = externalSortDirection || 'asc';

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

  // When server-side sorting is used, don't sort client-side
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
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#4B0082]">
            {onSelectionChange && (
              <TableHead className="w-[50px] text-white">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
            )}
            <TableHead className="w-[60px] text-white font-semibold">SN</TableHead>
            <TableHead className="w-[80px] text-white font-semibold">State</TableHead>
            <TableHead className="w-[140px] text-white">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-semibold text-white hover:text-white hover:bg-white/20"
                onClick={() => handleSort('make')}
              >
                Branch {getSortIcon('make')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px] text-white">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-semibold text-white hover:text-white hover:bg-white/20"
                onClick={() => handleSort('plate_number')}
              >
                Vehicle {getSortIcon('plate_number')}
              </Button>
            </TableHead>
            <TableHead className="text-white">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-3 font-semibold text-white hover:text-white hover:bg-white/20"
                onClick={() => handleSort('status')}
              >
                Current_Status {getSortIcon('status')}
              </Button>
            </TableHead>
            <TableHead className="text-white font-semibold">
              Address
            </TableHead>
            <TableHead className="text-right w-[80px] text-white font-semibold">Alert</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedVehicles.map((vehicle, index) => (
            <TableRow 
              key={vehicle.id} 
              className={`hover:bg-muted/50 cursor-pointer transition-colors ${
                selectedIds.includes(vehicle.vehicleId) ? 'bg-primary/5' : ''
              } ${index % 2 === 1 ? 'bg-[#FFF5EE]' : 'bg-white'}`}
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
              {/* SN - Serial Number */}
              <TableCell className="text-center font-medium">
                {index + 1}
              </TableCell>
              {/* State - Vehicle Image */}
              <TableCell>
                <VehicleTypeImage 
                  vehicleType={vehicle.vehicleType}
                  make={vehicle.make}
                  status={vehicle.status}
                  size="md"
                />
              </TableCell>
              {/* Branch - Make/Model as Branch */}
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{vehicle.make}</span>
                  {vehicle.model && (
                    <span className="text-xs text-muted-foreground">{vehicle.model}</span>
                  )}
                </div>
              </TableCell>
              {/* Vehicle - Plate Number */}
              <TableCell>
                <span className="font-bold text-foreground">{vehicle.plate}</span>
              </TableCell>
              {/* Current Status */}
              <TableCell>
                <span className="text-muted-foreground">--</span>
              </TableCell>
              {/* Address */}
              <TableCell>
                <div className="max-w-[300px]">
                  {vehicle.latitude && vehicle.longitude ? (
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {vehicle.latitude.toFixed(4)}°N, {vehicle.longitude.toFixed(4)}°E
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Location unavailable</span>
                  )}
                </div>
              </TableCell>
              {/* Alert */}
              <TableCell className="text-right">
                {vehicle.status === 'offline' && (
                  <AlertTriangle className="w-5 h-5 text-[#F44336] ml-auto" />
                )}
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
