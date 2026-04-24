import * as React from "react";
import { MapPin, ArrowRight, Route as RouteIcon, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationPickerField } from "@/components/shared/LocationPickerField";
import { cn } from "@/lib/utils";

export interface Stop {
  name: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  departure: string;
  departureLat: number | null;
  departureLng: number | null;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  stops: Stop[];
  onDepartureChange: (v: string) => void;
  onDepartureCoords: (lat: number, lng: number) => void;
  onDestinationChange: (v: string) => void;
  onDestinationCoords: (lat: number, lng: number) => void;
  onStopsChange: (stops: Stop[]) => void;
  className?: string;
}

export const RouteField: React.FC<Props> = ({
  departure, departureLat, departureLng,
  destination, destinationLat, destinationLng,
  stops,
  onDepartureChange, onDepartureCoords,
  onDestinationChange, onDestinationCoords,
  onStopsChange,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const summary = (
    <span className="flex items-center gap-1.5 min-w-0 flex-1">
      <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
      <span className={cn("truncate", !departure && "text-muted-foreground")}>
        {departure || "Pick departure"}
      </span>
      {stops.length > 0 && (
        <>
          <ArrowRight className="w-3 h-3 text-muted-foreground/70 shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">
            {stops.length} stop{stops.length > 1 ? "s" : ""}
          </span>
        </>
      )}
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
      <span className={cn("truncate", !destination && "text-muted-foreground")}>
        {destination || "Pick destination"}
      </span>
    </span>
  );

  return (
    <div className={className}>
      <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5">
        <RouteIcon className="w-3.5 h-3.5" /> Route <span className="text-destructive">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm",
              "flex items-center gap-2 text-left transition-colors",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            {summary}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(640px,calc(100vw-2rem))] p-4 space-y-4"
          align="start"
        >
          {/* Departure */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">
              Departure Place
            </Label>
            <LocationPickerField
              label=""
              value={departure}
              lat={departureLat}
              lng={departureLng}
              onChange={onDepartureChange}
              onCoordsChange={onDepartureCoords}
              placeholder="Select or type departure"
              iconColor="text-green-500"
            />
          </div>

          {/* Intermediate Stops */}
          {stops.length > 0 && (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <RouteIcon className="w-3.5 h-3.5" />
                </Label>
              </div>
              <div className="space-y-2">
                {stops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[auto_1fr_auto] items-end gap-1.5 rounded border border-border bg-background/60 p-2"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {idx + 1}
                    </div>
                    <LocationPickerField
                      label=""
                      value={stop.name}
                      lat={stop.lat}
                      lng={stop.lng}
                      onChange={(v) => {
                        const next = [...stops];
                        next[idx] = { ...next[idx], name: v };
                        onStopsChange(next);
                      }}
                      onCoordsChange={(lat, lng) => {
                        const next = [...stops];
                        next[idx] = { ...next[idx], lat, lng };
                        onStopsChange(next);
                      }}
                      placeholder={`Stop ${idx + 1}`}
                      iconColor="text-amber-500"
                    />
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Move up"
                        disabled={idx === 0}
                        onClick={() => {
                          const next = [...stops];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          onStopsChange(next);
                        }}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Move down"
                        disabled={idx === stops.length - 1}
                        onClick={() => {
                          const next = [...stops];
                          [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                          onStopsChange(next);
                        }}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Remove"
                        onClick={() => onStopsChange(stops.filter((_, i) => i !== idx))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destination */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">
              Final Destination
            </Label>
            <LocationPickerField
              label=""
              value={destination}
              lat={destinationLat}
              lng={destinationLng}
              onChange={onDestinationChange}
              onCoordsChange={onDestinationCoords}
              placeholder="Select or type final destination"
              iconColor="text-red-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
};
