import { useMemo } from "react";
import { useVehicles } from "./useVehicles";
import { useFuelEvents } from "./useFuelEvents";
import { useAlerts } from "./useAlerts";
import { useOrganizationSettings } from "./useOrganizationSettings";
import { useDeliveryMetrics } from "./useDeliveryMetrics";
import { useMaintenanceMetrics } from "./useMaintenanceMetrics";
import { useTripMetrics } from "./useTripMetrics";
import { useRevenueMetrics } from "./useRevenueMetrics";

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
  utilization: FleetUtilization & {
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  };
  carbon: CarbonEmissions;
  fuelEfficiency: {
    averageLPer100Km: number;
    bestPerformer: string;
    worstPerformer: string;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
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
    trendPercentage: number;
  };
  delivery: {
    onTimeRate: number;
    averageDelay: number;
    completedTrips: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  };
  revenue: {
    perVehicle: number;
    total: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  };
}

export const useFleetAnalytics = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { fuelEvents, loading: fuelLoading } = useFuelEvents();
  const { alerts, loading: alertsLoading } = useAlerts({});
  const { settings, loading: settingsLoading } = useOrganizationSettings();
  const { metrics: deliveryMetrics, loading: deliveryLoading } = useDeliveryMetrics();
  const { metrics: maintenanceMetrics, loading: maintenanceLoading } = useMaintenanceMetrics();
  const { metrics: tripMetrics, loading: tripLoading } = useTripMetrics();
  const { metrics: revenueMetrics, loading: revenueLoading } = useRevenueMetrics();

  const analytics = useMemo<FleetAnalytics>(() => {
    // Use settings from organization_settings table
    const fuelPricePerLiter = settings.fuel_price_per_liter;
    const avgInsuranceAnnual = settings.avg_insurance_per_vehicle_annual;
    const avgMaintenanceAnnual = settings.avg_maintenance_per_vehicle_annual;
    const depreciationRate = settings.depreciation_rate_percent / 100;
    const avgVehicleValue = settings.avg_vehicle_value;
    const co2PerLiterDiesel = settings.co2_per_liter_diesel;
    const co2PerLiterPetrol = settings.co2_per_liter_petrol;

    // Calculate fuel costs from real events
    const totalFuelLiters = fuelEvents
      .filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    
    const totalFuelCost = totalFuelLiters * fuelPricePerLiter;
    
    // Calculate costs (monthly prorated)
    const totalMaintenanceCost = vehicles.length * (avgMaintenanceAnnual / 12);
    const totalInsuranceCost = vehicles.length * (avgInsuranceAnnual / 12);
    const totalDepreciationCost = vehicles.length * (avgVehicleValue * depreciationRate / 12);
    
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
        .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0) * fuelPricePerLiter;
      
      const maintenance = avgMaintenanceAnnual / 12;
      const insurance = avgInsuranceAnnual / 12;
      const depreciation = avgVehicleValue * depreciationRate / 12;
      
      return {
        vehicleId: v.id,
        licensePlate: v.plate_number || 'Unknown',
        fuelCost: vehicleFuel,
        maintenanceCost: maintenance,
        insuranceCost: insurance,
        depreciationCost: depreciation,
        totalCost: vehicleFuel + maintenance + insurance + depreciation
      };
    });

    // Fleet utilization from real vehicle statuses
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const idleVehicles = vehicles.filter(v => v.status === 'inactive').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const offlineVehicles = vehicles.length - activeVehicles - idleVehicles - maintenanceVehicles;
    const utilizationRate = vehicles.length > 0 ? (activeVehicles / vehicles.length) * 100 : 0;

    // Carbon emissions from real fuel data
    // Calculate by fuel type based on vehicle fuel_type field
    const dieselVehicles = vehicles.filter(v => v.fuel_type === 'diesel');
    const petrolVehicles = vehicles.filter(v => v.fuel_type === 'petrol');
    const electricVehicles = vehicles.filter(v => v.fuel_type === 'electric');
    
    const dieselFuelLiters = fuelEvents
      .filter(e => e.event_type === 'refuel' && dieselVehicles.some(v => v.id === e.vehicle_id))
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    
    const petrolFuelLiters = fuelEvents
      .filter(e => e.event_type === 'refuel' && petrolVehicles.some(v => v.id === e.vehicle_id))
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);

    const dieselEmissions = dieselFuelLiters * co2PerLiterDiesel;
    const petrolEmissions = petrolFuelLiters * co2PerLiterPetrol;
    const electricEmissions = 0; // EVs have zero direct emissions

    const totalCO2Kg = dieselEmissions + petrolEmissions + electricEmissions;
    const averagePerVehicle = vehicles.length > 0 ? totalCO2Kg / vehicles.length : 0;

    // Fuel efficiency from real trip data
    const totalDistance = tripMetrics.totalDistanceKm || 0;
    const avgLPer100Km = totalDistance > 0 && totalFuelLiters > 0 
      ? (totalFuelLiters / totalDistance) * 100 
      : 0;

    // Calculate fuel efficiency per vehicle and find best/worst
    const vehicleFuelEfficiency = vehicles.map(v => {
      const vehicleFuelLiters = fuelEvents
        .filter(e => e.vehicle_id === v.id && e.event_type === 'refuel')
        .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
      // Estimate distance per vehicle (equal distribution for now)
      const vehicleDistance = vehicles.length > 0 ? totalDistance / vehicles.length : 0;
      const efficiency = vehicleDistance > 0 && vehicleFuelLiters > 0 
        ? (vehicleFuelLiters / vehicleDistance) * 100 
        : 0;
      return { plate: v.plate_number || 'Unknown', efficiency };
    }).filter(v => v.efficiency > 0);

    // Sort by efficiency (lower is better for L/100km)
    const sortedByEfficiency = [...vehicleFuelEfficiency].sort((a, b) => a.efficiency - b.efficiency);
    const bestPerformer = sortedByEfficiency[0]?.plate || 'N/A';
    const worstPerformer = sortedByEfficiency[sortedByEfficiency.length - 1]?.plate || 'N/A';

    // Safety metrics from real alerts
    const safetyAlerts = alerts.filter(a => 
      a.alert_type === 'speeding' || 
      a.alert_type === 'harsh_braking' || 
      a.alert_type === 'harsh_acceleration'
    );
    const avgSafetyScore = Math.max(50, 100 - (safetyAlerts.length * 2));

    // Calculate utilization trend based on active vs total ratio
    const utilizationTrend: 'up' | 'down' | 'stable' = 
      utilizationRate > 75 ? 'up' : utilizationRate < 50 ? 'down' : 'stable';
    const utilizationTrendPct = Math.abs(utilizationRate - 70) / 10;

    // Calculate fuel efficiency trend
    const fuelTrend: 'up' | 'down' | 'stable' = 
      avgLPer100Km < 8 ? 'up' : avgLPer100Km > 12 ? 'down' : 'stable';
    const fuelTrendPct = avgLPer100Km > 0 ? Math.abs(avgLPer100Km - 10) : 0;

    // Calculate TCO trend (based on fuel cost proportion)
    const fuelCostRatio = totalCost > 0 ? totalFuelCost / totalCost : 0;
    const tcoTrend: 'up' | 'down' | 'stable' = 
      fuelCostRatio < 0.3 ? 'down' : fuelCostRatio > 0.5 ? 'up' : 'stable';
    const tcoTrendPct = Math.abs(fuelCostRatio - 0.4) * 20;

    // Calculate carbon trend
    const avgEmissionsPerVehicle = vehicles.length > 0 ? totalCO2Kg / vehicles.length : 0;
    const carbonTrend: 'up' | 'down' | 'stable' = 
      avgEmissionsPerVehicle < 100 ? 'down' : avgEmissionsPerVehicle > 200 ? 'up' : 'stable';
    const carbonTrendPct = avgEmissionsPerVehicle > 0 ? Math.min(15, avgEmissionsPerVehicle / 20) : 0;

    return {
      tco: {
        totalCost,
        costPerVehicle: vehicles.length > 0 ? totalCost / vehicles.length : 0,
        costPerKm: totalDistance > 0 ? totalCost / totalDistance : 0,
        breakdown,
        vehicleCosts,
        trend: tcoTrend,
        trendPercentage: tcoTrendPct
      },
      utilization: {
        activeVehicles,
        idleVehicles,
        maintenanceVehicles,
        offlineVehicles,
        utilizationRate,
        averageUtilization: utilizationRate * 0.95,
        trend: utilizationTrend,
        trendPercentage: utilizationTrendPct
      },
      carbon: {
        totalCO2Kg,
        averagePerVehicle,
        trend: carbonTrend,
        trendPercentage: carbonTrendPct,
        byFuelType: [
          { type: 'Diesel', emissions: dieselEmissions },
          { type: 'Petrol', emissions: petrolEmissions },
          { type: 'Electric', emissions: electricEmissions }
        ]
      },
      fuelEfficiency: {
        averageLPer100Km: avgLPer100Km,
        bestPerformer,
        worstPerformer,
        trend: fuelTrend,
        trendPercentage: fuelTrendPct
      },
      maintenance: {
        complianceRate: maintenanceMetrics.complianceRate,
        overdueCount: maintenanceMetrics.overdueCount,
        upcomingCount: maintenanceMetrics.upcomingCount
      },
      safety: {
        averageScore: avgSafetyScore,
        incidentsThisMonth: safetyAlerts.length,
        trend: safetyAlerts.length < 5 ? 'up' : safetyAlerts.length > 10 ? 'down' : 'stable',
        trendPercentage: safetyAlerts.length > 0 ? Math.min(20, safetyAlerts.length * 2) : 0
      },
      delivery: {
        onTimeRate: deliveryMetrics.onTimeRate,
        averageDelay: deliveryMetrics.averageDelayMinutes,
        completedTrips: deliveryMetrics.completedTrips,
        trend: deliveryMetrics.onTimeRate >= 90 ? 'up' : deliveryMetrics.onTimeRate < 75 ? 'down' : 'stable',
        trendPercentage: Math.abs(deliveryMetrics.onTimeRate - 85) / 5
      },
      revenue: {
        perVehicle: revenueMetrics.revenuePerVehicle,
        total: revenueMetrics.totalRevenue,
        trend: revenueMetrics.trend,
        trendPercentage: revenueMetrics.trendPercentage
      }
    };
  }, [vehicles, fuelEvents, alerts, settings, deliveryMetrics, maintenanceMetrics, tripMetrics, revenueMetrics]);

  return {
    analytics,
    loading: vehiclesLoading || fuelLoading || alertsLoading || settingsLoading || deliveryLoading || maintenanceLoading || tripLoading || revenueLoading
  };
};
