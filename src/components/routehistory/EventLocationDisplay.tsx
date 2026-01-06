import { useAddressGeocoding } from "@/hooks/useAddressGeocoding";
import { Skeleton } from "@/components/ui/skeleton";

interface EventLocationDisplayProps {
  latitude: number;
  longitude: number;
}

export const EventLocationDisplay = ({ latitude, longitude }: EventLocationDisplayProps) => {
  const { address, isLoading } = useAddressGeocoding(latitude, longitude, true);

  if (isLoading) {
    return <Skeleton className="h-3 w-24 inline-block" />;
  }

  if (address) {
    return (
      <span className="text-muted-foreground truncate" title={address}>
        {address}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground font-mono text-[10px]">
      {latitude.toFixed(4)}, {longitude.toFixed(4)}
    </span>
  );
};

export default EventLocationDisplay;
