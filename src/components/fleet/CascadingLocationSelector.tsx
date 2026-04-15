import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const ADMIN_REGIONS = [
  'Addis Ababa', 'Afar', 'Amhara', 'Benishangul Gumuz', 'Central Ethiopia',
  'Dire Dawa', 'Gambella', 'Harari', 'Oromia', 'Sidama', 'Somali',
  'South Ethiopia', 'South West Ethiopia', 'Tigray',
] as const;

interface Props {
  region: string;
  zone: string;
  woreda: string;
  onRegionChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  onWoredaChange: (v: string) => void;
  regionLabel?: string;
  zoneLabel?: string;
  woredaLabel?: string;
  required?: boolean;
}

async function fetchAllPages(query: any): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw error;
    allData = [...allData, ...(data || [])];
    hasMore = (data?.length || 0) === PAGE_SIZE;
    page++;
  }
  return allData;
}

export const CascadingLocationSelector = ({
  region, zone, woreda,
  onRegionChange, onZoneChange, onWoredaChange,
  regionLabel = "Region", zoneLabel = "Zone", woredaLabel = "Woreda",
  required = false,
}: Props) => {

  // Fetch zones for selected region
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["zones-by-region", region],
    queryFn: async () => {
      const data = await fetchAllPages(
        (supabase as any)
          .from("administrative_localities")
          .select("zone")
          .eq("admin_region", region)
          .order("zone")
      );
      const unique = [...new Set(data.map((d: any) => d.zone))].filter(Boolean).sort();
      return unique as string[];
    },
    enabled: !!region,
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  // Fetch woredas for selected region + zone
  const { data: woredas = [], isLoading: woredasLoading } = useQuery({
    queryKey: ["woredas-by-zone", region, zone],
    queryFn: async () => {
      const data = await fetchAllPages(
        (supabase as any)
          .from("administrative_localities")
          .select("woreda")
          .eq("admin_region", region)
          .eq("zone", zone)
          .order("woreda")
      );
      const unique = [...new Set(data.map((d: any) => d.woreda))].filter(Boolean).sort();
      return unique as string[];
    },
    enabled: !!region && !!zone,
    staleTime: 1000 * 60 * 30,
  });

  const handleRegionChange = (v: string) => {
    const val = v === "__none__" ? "" : v;
    onRegionChange(val);
    onZoneChange("");
    onWoredaChange("");
  };

  const handleZoneChange = (v: string) => {
    const val = v === "__none__" ? "" : v;
    onZoneChange(val);
    onWoredaChange("");
  };

  const handleWoredaChange = (v: string) => {
    const val = v === "__none__" ? "" : v;
    onWoredaChange(val);
  };

  return (
    <>
      {/* Region — static list */}
      <div>
        <Label>{regionLabel}{required ? " *" : ""}</Label>
        <Select value={region || "__none__"} onValueChange={handleRegionChange}>
          <SelectTrigger><SelectValue placeholder="Select region..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {ADMIN_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Zone — from DB */}
      <div>
        <Label>{zoneLabel}</Label>
        <Select value={zone || "__none__"} onValueChange={handleZoneChange} disabled={!region}>
          <SelectTrigger className={!region ? "opacity-50" : ""}>
            {zonesLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</span>
            ) : (
              <SelectValue placeholder="Select zone..." />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Woreda — from DB */}
      <div>
        <Label>{woredaLabel}</Label>
        <Select value={woreda || "__none__"} onValueChange={handleWoredaChange} disabled={!zone}>
          <SelectTrigger className={!zone ? "opacity-50" : ""}>
            {woredasLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</span>
            ) : (
              <SelectValue placeholder="Select woreda..." />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {woredas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default CascadingLocationSelector;
