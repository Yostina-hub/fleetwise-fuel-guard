import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface CurrentRate {
  id: string;
  rate_per_unit: number;
  unit: string;
  effective_from: string;
  source: string | null;
}

/**
 * Returns the current effective energy rate for a given type.
 * Falls back to organization_settings.fuel_price_per_liter for fuel if no rate is configured.
 */
export const useCurrentEnergyRate = (energyType: "fuel" | "ev_charging", fuelType?: string) => {
  const { organizationId } = useOrganization();
  const { settings } = useOrganizationSettings();

  const { data: rate, isLoading } = useQuery({
    queryKey: ["current-energy-rate", organizationId, energyType, fuelType],
    queryFn: async () => {
      if (!organizationId) return null;
      const today = new Date().toISOString().split("T")[0];
      let query = (supabase as any)
        .from("energy_cost_rates")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("energy_type", energyType)
        .lte("effective_from", today)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (fuelType) {
        query = query.eq("fuel_type", fuelType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out expired rates
      const active = (data || []).filter((r: any) => !r.effective_until || r.effective_until >= today);
      return active[0] || null;
    },
    enabled: !!organizationId,
  });

  // Fallback for fuel: use org settings
  const fallbackRate = energyType === "fuel" ? settings.fuel_price_per_liter : 0;
  const currentRate = rate?.rate_per_unit ?? fallbackRate;
  const unit = rate?.unit ?? (energyType === "ev_charging" ? "kWh" : "liter");

  return {
    currentRate,
    unit,
    rateRecord: rate as CurrentRate | null,
    isFromHistory: !!rate,
    isLoading,
  };
};
