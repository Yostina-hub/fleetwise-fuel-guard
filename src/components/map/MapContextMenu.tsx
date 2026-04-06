import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Copy, Ruler, Navigation, MapPin, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MapContextMenuProps {
  map: maplibregl.Map | null;
  onMeasureFrom?: (lngLat: [number, number]) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  lngLat: [number, number];
}

export const MapContextMenu = ({ map, onMeasureFrom }: MapContextMenuProps) => {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    lngLat: [0, 0],
  });
  const [addressLoading, setAddressLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const hideMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false }));
    setAddress(null);
  }, []);

  useEffect(() => {
    if (!map) return;

    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      const { x, y } = e.point;
      const { lng, lat } = e.lngLat;

      setMenu({ visible: true, x, y, lngLat: [lng, lat] });
      setAddress(null);
    };

    const handleClick = () => hideMenu();
    const handleMove = () => hideMenu();

    map.on("contextmenu", handleContextMenu);
    map.on("click", handleClick);
    map.on("movestart", handleMove);

    return () => {
      map.off("contextmenu", handleContextMenu);
      map.off("click", handleClick);
      map.off("movestart", handleMove);
    };
  }, [map, hideMenu]);

  // Close on outside click
  useEffect(() => {
    if (!menu.visible) return;
    const handleDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [menu.visible, hideMenu]);

  const handleCopyCoords = () => {
    const text = `${menu.lngLat[1].toFixed(6)}, ${menu.lngLat[0].toFixed(6)}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Coordinates copied", description: text });
    hideMenu();
  };

  const handleWhatsHere = async () => {
    setAddressLoading(true);
    try {
      // Dispatch a custom event that the parent can handle for geocoding
      window.dispatchEvent(
        new CustomEvent("mapWhatsHere", {
          detail: { lat: menu.lngLat[1], lng: menu.lngLat[0] },
        })
      );
      
      // Simple coordinate display as fallback
      setAddress(`${menu.lngLat[1].toFixed(6)}°N, ${menu.lngLat[0].toFixed(6)}°E`);
    } catch {
      setAddress("Unable to determine location");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDirectionsTo = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${menu.lngLat[1]},${menu.lngLat[0]}`;
    window.open(url, "_blank");
    hideMenu();
  };

  const handleMeasureFrom = () => {
    onMeasureFrom?.(menu.lngLat);
    hideMenu();
  };

  if (!menu.visible) return null;

  // Position menu within map bounds
  const mapEl = map?.getContainer();
  const mapRect = mapEl?.getBoundingClientRect();
  let menuX = menu.x;
  let menuY = menu.y;
  if (mapRect && menuRef.current) {
    const mw = menuRef.current.offsetWidth || 220;
    const mh = menuRef.current.offsetHeight || 200;
    if (menuX + mw > mapRect.width) menuX = mapRect.width - mw - 8;
    if (menuY + mh > mapRect.height) menuY = mapRect.height - mh - 8;
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-[1000] bg-background border border-border rounded-xl shadow-xl overflow-hidden min-w-[220px] animate-in fade-in zoom-in-95 duration-150"
      style={{ left: menuX, top: menuY }}
    >
      {/* Coordinates header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-mono text-muted-foreground">
          {menu.lngLat[1].toFixed(6)}, {menu.lngLat[0].toFixed(6)}
        </span>
        <button onClick={hideMenu} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="py-1">
        <ContextMenuItem
          icon={<MapPin className="w-4 h-4" />}
          label="What's here?"
          onClick={handleWhatsHere}
        />
        <ContextMenuItem
          icon={<Copy className="w-4 h-4" />}
          label="Copy coordinates"
          onClick={handleCopyCoords}
        />
        <ContextMenuItem
          icon={<Ruler className="w-4 h-4" />}
          label="Measure from here"
          onClick={handleMeasureFrom}
        />
        <ContextMenuItem
          icon={<Navigation className="w-4 h-4" />}
          label="Directions to here"
          onClick={handleDirectionsTo}
        />
      </div>

      {/* Address result */}
      {(addressLoading || address) && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          {addressLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              Looking up…
            </div>
          ) : (
            <p className="text-xs text-foreground leading-relaxed">{address}</p>
          )}
        </div>
      )}
    </div>
  );
};

const ContextMenuItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
  >
    <span className="text-muted-foreground">{icon}</span>
    {label}
  </button>
);
