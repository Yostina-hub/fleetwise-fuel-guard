import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  fuel_price_per_liter: number;
  currency: string;
  distance_unit: 'km' | 'miles';
  fuel_unit: 'liters' | 'gallons';
  avg_insurance_per_vehicle_annual: number;
  avg_maintenance_per_vehicle_annual: number;
  depreciation_rate_percent: number;
  avg_vehicle_value: number;
  co2_per_liter_diesel: number;
  co2_per_liter_petrol: number;
  default_timezone: string;
}

const DEFAULT_SETTINGS: Omit<OrganizationSettings, 'id' | 'organization_id'> = {
  fuel_price_per_liter: 65.0,
  currency: 'ETB',
  distance_unit: 'km',
  fuel_unit: 'liters',
  avg_insurance_per_vehicle_annual: 50000,
  avg_maintenance_per_vehicle_annual: 35000,
  depreciation_rate_percent: 15,
  avg_vehicle_value: 1500000,
  co2_per_liter_diesel: 2.68,
  co2_per_liter_petrol: 2.31,
  default_timezone: 'Africa/Addis_Ababa',
};

export const useOrganizationSettings = () => {
  const { organizationId } = useOrganization();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Merge with defaults for any missing fields
  const settings: OrganizationSettings = {
    id: data?.id || '',
    organization_id: data?.organization_id || organizationId || '',
    fuel_price_per_liter: data?.fuel_price_per_liter ?? DEFAULT_SETTINGS.fuel_price_per_liter,
    currency: data?.currency ?? DEFAULT_SETTINGS.currency,
    distance_unit: (data?.distance_unit as 'km' | 'miles') ?? DEFAULT_SETTINGS.distance_unit,
    fuel_unit: (data?.fuel_unit as 'liters' | 'gallons') ?? DEFAULT_SETTINGS.fuel_unit,
    avg_insurance_per_vehicle_annual: data?.avg_insurance_per_vehicle_annual ?? DEFAULT_SETTINGS.avg_insurance_per_vehicle_annual,
    avg_maintenance_per_vehicle_annual: data?.avg_maintenance_per_vehicle_annual ?? DEFAULT_SETTINGS.avg_maintenance_per_vehicle_annual,
    depreciation_rate_percent: data?.depreciation_rate_percent ?? DEFAULT_SETTINGS.depreciation_rate_percent,
    avg_vehicle_value: data?.avg_vehicle_value ?? DEFAULT_SETTINGS.avg_vehicle_value,
    co2_per_liter_diesel: data?.co2_per_liter_diesel ?? DEFAULT_SETTINGS.co2_per_liter_diesel,
    co2_per_liter_petrol: data?.co2_per_liter_petrol ?? DEFAULT_SETTINGS.co2_per_liter_petrol,
    default_timezone: data?.default_timezone ?? DEFAULT_SETTINGS.default_timezone,
  };

  // Currency formatting helper
  const formatCurrency = (value: number) => {
    const currencySymbols: Record<string, string> = {
      ETB: 'Br ',
      USD: '$',
      EUR: '€',
      GBP: '£',
      KES: 'KSh',
      NGN: '₦',
      ZAR: 'R',
    };
    const symbol = currencySymbols[settings.currency] || settings.currency + ' ';
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Distance formatting helper
  const formatDistance = (km: number) => {
    if (settings.distance_unit === 'miles') {
      return `${(km * 0.621371).toFixed(1)} mi`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Fuel formatting helper
  const formatFuel = (liters: number) => {
    if (settings.fuel_unit === 'gallons') {
      return `${(liters * 0.264172).toFixed(1)} gal`;
    }
    return `${liters.toFixed(1)} L`;
  };

  return {
    settings,
    loading: isLoading,
    error,
    refetch,
    formatCurrency,
    formatDistance,
    formatFuel,
  };
};
