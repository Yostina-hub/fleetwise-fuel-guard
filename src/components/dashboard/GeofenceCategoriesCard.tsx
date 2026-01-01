import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface GeofenceCategory {
  name: string;
  count: number;
}

const GeofenceCategoriesCard = () => {
  const { organizationId } = useOrganization();
  const [categories, setCategories] = useState<GeofenceCategory[]>([]);
  const [vehiclesNotInGeofence, setVehiclesNotInGeofence] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      try {
        // Fetch geofences by category
        const { data: geofences } = await supabase
          .from('geofences')
          .select('category')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (geofences) {
          const categoryCounts: Record<string, number> = {};
          geofences.forEach((g) => {
            const cat = g.category || 'No Category';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });

          const sorted = Object.entries(categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

          setCategories(sorted);
        }

        // Get vehicles count (for demo, assume some are not in geofence)
        const { data: vehicles, count } = await supabase
          .from('vehicles')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId);

        // Estimate vehicles not in geofence (for demo purposes)
        const totalVehicles = count || 0;
        setVehiclesNotInGeofence(Math.round(totalVehicles * 0.3));
      } catch (error) {
        console.error('Error fetching geofence data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  const displayCategories = [
    ...categories.slice(0, 5),
    { name: 'Vehicles not in geofence', count: vehiclesNotInGeofence, isSpecial: true },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Geofence Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between animate-pulse">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-8" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayCategories.map((cat, idx) => (
              <div
                key={cat.name}
                className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
              >
                <span className="text-primary hover:underline cursor-pointer text-sm">
                  {cat.name}
                </span>
                <span className="font-medium text-sm">{cat.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeofenceCategoriesCard;
