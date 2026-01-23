import { cn } from "@/lib/utils";

interface TripStatusFiltersProps {
  onTrip: number;
  inTransit: number;
  notOnTrip: number;
  atLoading: number;
  atUnloading: number;
  notRecognized: number;
  deviated: number;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

const TripStatusFilters = ({
  onTrip,
  inTransit,
  notOnTrip,
  atLoading,
  atUnloading,
  notRecognized,
  deviated,
  activeFilter = "all",
  onFilterChange,
}: TripStatusFiltersProps) => {
  const filters = [
    { 
      key: "on_trip", 
      label: "On Trip", 
      count: onTrip,
      borderColor: "border-[#4CAF50]",
      activeColor: "bg-[#4CAF50] text-white",
      textColor: "text-[#4CAF50]"
    },
    { 
      key: "in_transit", 
      label: "Intransit", 
      count: inTransit,
      borderColor: "border-[#FF9800]",
      activeColor: "bg-[#FF9800] text-white",
      textColor: "text-[#FF9800]"
    },
    { 
      key: "not_on_trip", 
      label: "Not On Trip", 
      count: notOnTrip,
      borderColor: "border-[#F44336]",
      activeColor: "bg-[#F44336] text-white",
      textColor: "text-[#F44336]"
    },
    { 
      key: "at_loading", 
      label: "At Loading", 
      count: atLoading,
      borderColor: "border-muted-foreground",
      activeColor: "bg-muted-foreground text-white",
      textColor: "text-muted-foreground"
    },
    { 
      key: "at_unloading", 
      label: "At UnLoading", 
      count: atUnloading,
      borderColor: "border-muted-foreground",
      activeColor: "bg-muted-foreground text-white",
      textColor: "text-muted-foreground"
    },
    { 
      key: "not_recognized", 
      label: "Not Recognized", 
      count: notRecognized,
      borderColor: "border-muted-foreground",
      activeColor: "bg-muted-foreground text-white",
      textColor: "text-muted-foreground"
    },
    { 
      key: "deviated", 
      label: "Deviated", 
      count: deviated,
      borderColor: "border-muted-foreground",
      activeColor: "bg-muted-foreground text-white",
      textColor: "text-muted-foreground"
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange?.(filter.key)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2",
            activeFilter === filter.key 
              ? filter.activeColor + " border-transparent"
              : `bg-background ${filter.borderColor} ${filter.textColor}`
          )}
        >
          <span className="font-bold mr-1">{filter.count}</span>
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TripStatusFilters;
