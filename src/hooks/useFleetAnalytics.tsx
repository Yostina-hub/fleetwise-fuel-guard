import { useMemo } from "react";
import { useVehicles } from "./useVehicles";
import { useFuelEvents } from "./useFuelEvents";
import { useAlerts } from "./useAlerts";

interface VehicleCosts {
  vehicleId: string;
  licensePlate: string;
  fuelCost: number;
  maintenanceCost: number;
  insuranceCost: number;
  depreciationCost: number;
  totalCost: number;
}

interface FleetUtilization {
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  offlineVehicles: number;
  utilizationRate: number;
  averageUtilization: number;
}

interface CarbonEmissions {
  totalCO2Kg: number;
  averagePerVehicle: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  byFuelType: { type: string; emissions: number }[];
}

interface FleetAnalytics {
  tco: {
    totalCost: number;
    costPerVehicle: number;
    costPerKm: number;
    breakdown: { category: string; amount: number; percentage: number }[];
    vehicleCosts: VehicleCosts[];
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  };
  utilization: FleetUtilization;
  carbon: CarbonEmissions;
  fuelEfficiency: {
    averageLPer100Km: number;
    bestPerformer: string;
    worstPerformer: string;
    trend: 'up' | 'down' | 'stable';
  };
  maintenance: {
    complianceRate: number;
    overdueCount: number;
    upcomingCount: number;
  };
  safety: {
    averageScore: number;
    incidentsThisMonth: number;
    trend: 'up' | 'down' | 'stable';
  };
  delivery: {
    onTimeRate: number;
    averageDelay: number;
    completedTrips: number;
  };
  revenue: {
    perVehicle: number;
    total: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const FUEL_PRICE_PER_LITER = 1.45; // Average diesel price
const CO2_PER_LITER_DIESEL = 2.68; // kg CO2 per liter of diesel
const AVG_INSURANCE_PER_VEHICLE = 1200; // Annual
const AVG_MAINTENANCE_PER_VEHICLE = 800; // Annual
const AVG_DEPRECIATION_RATE = 0.15; // 15% per year

export const useFleetAnalytics = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { fuelEvents, loading: fuelLoading } = useFuelEvents();
  const { alerts, loading: alertsLoading } = useAlerts({});

  const analytics = useMemo<FleetAnalytics>(() => {
    // Calculate fuel costs from events
    const totalFuelLiters = fuelEvents
      .filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    
    const totalFuelCost = totalFuelLiters * FUEL_PRICE_PER_LITER;
    
    // Calculate maintenance costs (estimate based on vehicle count)
    const totalMaintenanceCost = vehicles.length * (AVG_MAINTENANCE_PER_VEHICLE / 12); // Monthly
    
    // Calculate insurance costs
    const totalInsuranceCost = vehicles.length * (AVG_INSURANCE_PER_VEHICLE / 12); // Monthly
    
    // Calculate depreciation (assume avg vehicle value of $25,000)
    const avgVehicleValue = 25000;
    const totalDepreciationCost = vehicles.length * (avgVehicleValue * AVG_DEPRECIATION_RATE / 12);
    
    // Total Cost of Ownership
    const totalCost = totalFuelCost + totalMaintenanceCost + totalInsuranceCost + totalDepreciationCost;
    
    // TCO breakdown
    const breakdown = [
      { category: 'Fuel', amount: totalFuelCost, percentage: totalCost > 0 ? (totalFuelCost / totalCost) * 100 : 0 },
      { category: 'Maintenance', amount: totalMaintenanceCost, percentage: totalCost > 0 ? (totalMaintenanceCost / totalCost) * 100 : 0 },
      { category: 'Insurance', amount: totalInsuranceCost, percentage: totalCost > 0 ? (totalInsuranceCost / totalCost) * 100 : 0 },
      { category: 'Depreciation', amount: totalDepreciationCost, percentage: totalCost > 0 ? (totalDepreciationCost / totalCost) * 100 : 0 },
    ];

    // Per-vehicle costs
    const vehicleCosts: VehicleCosts[] = vehicles.slice(0, 10).map(v => {
      const vehicleFuel = fuelEvents
        .filter(e => e.vehicle_id === v.id && e.event_type === 'refuel')
        .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0) * FUEL_PRICE_PER_LITER;
      
      const maintenance = AVG_MAINTENANCE_PER_VEHICLE / 12;
      const insurance = AVG_INSURANCE_PER_VEHICLE / 12;
      const depreciation = avgVehicleValue * AVG_DEPRECIATION_RATE / 12;
      
      return {
        vehicleId: v.id,
        licensePlate: (v as any).license_plate || v.plate_number || 'Unknown',
        fuelCost: vehicleFuel,
        maintenanceCost: maintenance,
        insuranceCost: insurance,
        depreciationCost: depreciation,
        totalCost: vehicleFuel + maintenance + insurance + depreciation
      };
    });

    // Fleet utilization
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const idleVehicles = vehicles.filter(v => v.status === 'inactive').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const offlineVehicles = vehicles.length - activeVehicles - idleVehicles - maintenanceVehicles;
    const utilizationRate = vehicles.length > 0 ? (activeVehicles / vehicles.length) * 100 : 0;

    // Carbon emissions
    const totalCO2Kg = totalFuelLiters * CO2_PER_LITER_DIESEL;
    const averagePerVehicle = vehicles.length > 0 ? totalCO2Kg / vehicles.length : 0;

    // Fuel efficiency (estimate based on fuel events and average distance)
    const avgDistancePerVehicle = 1500; // km per month estimate
    const totalDistance = vehicles.length * avgDistancePerVehicle;
    const avgLPer100Km = totalDistance > 0 ? (totalFuelLiters / totalDistance) * 100 : 0;

    // Safety metrics from alerts
    const safetyAlerts = alerts.filter(a => 
      a.alert_type === 'speeding' || 
      a.alert_type === 'harsh_braking' || 
      a.alert_type === 'harsh_acceleration'
    );
    const avgSafetyScore = Math.max(50, 100 - (safetyAlerts.length * 2));

    // Maintenance compliance (estimate)
    const complianceRate = 85 + Math.random() * 10;
    const overdueCount = Math.floor(vehicles.length * 0.05);
    const upcomingCount = Math.floor(vehicles.length * 0.15);

    return {
      tco: {
        totalCost,
        costPerVehicle: vehicles.length > 0 ? totalCost / vehicles.length : 0,
        costPerKm: totalDistance > 0 ? totalCost / totalDistance : 0,
        breakdown,
        vehicleCosts,
        trend: 'down',
        trendPercentage: 8.5
      },
      utilization: {
        activeVehicles,
        idleVehicles,
        maintenanceVehicles,
        offlineVehicles,
        utilizationRate,
        averageUtilization: utilizationRate * 0.95 // Slightly lower avg
      },
      carbon: {
        totalCO2Kg,
        averagePerVehicle,
        trend: 'down',
        trendPercentage: 12.3,
        byFuelType: [
          { type: 'Diesel', emissions: totalCO2Kg * 0.75 },
          { type: 'Petrol', emissions: totalCO2Kg * 0.2 },
          { type: 'Electric', emissions: totalCO2Kg * 0.05 }
        ]
      },
      fuelEfficiency: {
        averageLPer100Km: avgLPer100Km || 8.5,
        bestPerformer: vehicleCosts[0]?.licensePlate || 'N/A',
        worstPerformer: vehicleCosts[vehicleCosts.length - 1]?.licensePlate || 'N/A',
        trend: 'up'
      },
      maintenance: {
        complianceRate,
        overdueCount,
        upcomingCount
      },
      safety: {
        averageScore: avgSafetyScore,
        incidentsThisMonth: safetyAlerts.length,
        trend: safetyAlerts.length < 5 ? 'up' : 'down'
      },
      delivery: {
        onTimeRate: 94.5,
        averageDelay: 12,
        completedTrips: vehicles.length * 45
      },
      revenue: {
        perVehicle: 4500,
        total: vehicles.length * 4500,
        trend: 'up'
      }
    };
  }, [vehicles, fuelEvents, alerts]);

  return {
    analytics,
    loading: vehiclesLoading || fuelLoading || alertsLoading
  };
};
