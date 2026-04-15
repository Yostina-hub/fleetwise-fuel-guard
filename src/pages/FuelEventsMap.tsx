import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, AlertTriangle, Fuel, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const EVENT_COLORS: Record<string, string> = {
  refuel: "#22c55e",
  theft: "#ef4444",
  drain: "#f97316",
  leak: "#eab308",
};

const FuelEventsMap = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [filter, setFilter] = useState("all");

  const { data: fuelEvents = [] } = useQuery({
    queryKey: ["fuel-events-map", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_events")
        .select("*, vehicle:vehicles(plate_number)")
        .eq("organization_id", organizationId!)
        .not("lat", "is", null)
        .not("lng", "is", null)
        .order("event_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const filtered = filter === "all" ? fuelEvents : fuelEvents.filter((e: any) => e.event_type === filter);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'CARTO Dark Matter',
        sources: {
          raster: {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap &copy; CARTO',
          },
        },
        layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'raster', minzoom: 0, maxzoom: 20 }],
      },
      center: [38.75, 9.02],
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    filtered.forEach((evt: any) => {
      if (!evt.lat || !evt.lng) return;
      hasPoints = true;
      const color = EVENT_COLORS[evt.event_type] || "#6b7280";

      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;`;

      const plate = (evt as any).vehicle?.plate_number || "—";
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
        <div style="font-family:system-ui;font-size:13px;min-width:160px;">
          <div style="font-weight:700;margin-bottom:4px;">${plate}</div>
          <div style="color:${color};font-weight:600;text-transform:capitalize;">${evt.event_type}</div>
          <div style="color:#666;margin-top:2px;">${evt.fuel_change_percent ? Math.abs(evt.fuel_change_percent).toFixed(1) + "%" : "—"}</div>
          <div style="color:#999;font-size:11px;margin-top:4px;">${format(new Date(evt.event_time), "MMM dd, yyyy HH:mm")}</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([evt.lng, evt.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
      bounds.extend([evt.lng, evt.lat]);
    });

    if (hasPoints) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [filtered]);

  const stats = {
    refuel: fuelEvents.filter((e: any) => e.event_type === "refuel").length,
    theft: fuelEvents.filter((e: any) => e.event_type === "theft").length,
    drain: fuelEvents.filter((e: any) => e.event_type === "drain").length,
    leak: fuelEvents.filter((e: any) => e.event_type === "leak").length,
  };

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('fuelMap.title', 'Fuel Events Map')}</h1>
              <p className="text-muted-foreground text-xs">{t('fuelMap.subtitle', 'Visualize refuels, drains, and suspected theft on the map')}</p>
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All Events')}</SelectItem>
              <SelectItem value="refuel">🟢 {t('fuel.refuel', 'Refuel')}</SelectItem>
              <SelectItem value="theft">🔴 {t('fuel.theft', 'Theft')}</SelectItem>
              <SelectItem value="drain">🟠 {t('fuel.drain', 'Drain')}</SelectItem>
              <SelectItem value="leak">🟡 {t('fuel.leak', 'Leak')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('fuel.refuel', 'Refuels'), value: stats.refuel, icon: Fuel, color: "text-emerald-500" },
            { label: t('fuel.theft', 'Theft'), value: stats.theft, icon: AlertTriangle, color: "text-destructive" },
            { label: t('fuel.drain', 'Drains'), value: stats.drain, icon: Droplets, color: "text-orange-500" },
            { label: t('fuel.leak', 'Leaks'), value: stats.leak, icon: Droplets, color: "text-yellow-500" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div ref={mapContainer} className="w-full h-[calc(100vh-320px)] min-h-[400px]" />
        </Card>

        {filtered.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('fuelMap.recentEvents', 'Recent Events')} ({filtered.length})</CardTitle></CardHeader>
            <CardContent className="max-h-48 overflow-y-auto space-y-2">
              {filtered.slice(0, 20).map((evt: any) => (
                <div key={evt.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: EVENT_COLORS[evt.event_type] || "#6b7280" }} />
                    <span className="font-medium capitalize">{evt.event_type}</span>
                    <span className="text-muted-foreground">— {(evt as any).vehicle?.plate_number || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    <span>{evt.fuel_change_percent ? `${evt.fuel_change_percent > 0 ? "+" : ""}${evt.fuel_change_percent.toFixed(1)}%` : "—"}</span>
                    <span>{format(new Date(evt.event_time), "MMM dd HH:mm")}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default FuelEventsMap;
