import { useMemo } from "react";
import { useVehicles } from "./useVehicles";
import { useMaintenanceSchedules } from "./useMaintenanceSchedules";
import { isWithinInterval, parseISO, addDays } from "date-fns";

export interface AvailableVehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  status: string;
  isAvailable: boolean;
  unavailableReason?: string;
}

export const useAvailableVehicles = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { schedules, loading: schedulesLoading } = useMaintenanceSchedules();

  const availableVehicles = useMemo(() => {
    const now = new Date();
    
    // Get vehicle IDs that have scheduled or in-progress maintenance
    const vehiclesInMaintenance = new Set<string>();
    const maintenanceReasons: Record<string, string> = {};

    schedules.forEach(schedule => {
      if (!schedule.is_active) return;
      
      // Check if maintenance is due soon (within 3 days) or overdue
      if (schedule.next_due_date) {
        const dueDate = parseISO(schedule.next_due_date);
        const warningDate = addDays(now, 3);
        
        if (dueDate <= warningDate) {
          vehiclesInMaintenance.add(schedule.vehicle_id);
          maintenanceReasons[schedule.vehicle_id] = 
            dueDate <= now 
              ? `Overdue: ${schedule.service_type}` 
              : `Due soon: ${schedule.service_type}`;
        }
      }
    });

    return vehicles.map(vehicle => {
      const isMaintenanceStatus = vehicle.status === 'maintenance';
      const hasScheduledMaintenance = vehiclesInMaintenance.has(vehicle.id);
      const isInactive = vehicle.status === 'inactive';
      
      let unavailableReason: string | undefined;
      
      if (isMaintenanceStatus) {
        unavailableReason = 'Currently in maintenance';
      } else if (hasScheduledMaintenance) {
        unavailableReason = maintenanceReasons[vehicle.id] || 'Scheduled for maintenance';
      } else if (isInactive) {
        unavailableReason = 'Vehicle inactive';
      }

      return {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        status: vehicle.status,
        isAvailable: !isMaintenanceStatus && !hasScheduledMaintenance && !isInactive,
        unavailableReason,
      } as AvailableVehicle;
    });
  }, [vehicles, schedules]);

  const available = useMemo(
    () => availableVehicles.filter(v => v.isAvailable),
    [availableVehicles]
  );

  const unavailable = useMemo(
    () => availableVehicles.filter(v => !v.isAvailable),
    [availableVehicles]
  );

  return {
    allVehicles: availableVehicles,
    available,
    unavailable,
    loading: vehiclesLoading || schedulesLoading,
  };
};
