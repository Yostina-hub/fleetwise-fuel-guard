import { 
  Truck, 
  Car, 
  Bus, 
  Bike,
  Container
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleTypeImageProps {
  vehicleType?: string;
  make?: string;
  status?: 'moving' | 'idle' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VehicleTypeImage = ({ 
  vehicleType = "automobile", 
  make = "",
  status = 'offline',
  size = 'md',
  className 
}: VehicleTypeImageProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  // Color based on status
  const statusColors = {
    moving: "bg-gradient-to-br from-green-400 to-green-600",
    idle: "bg-gradient-to-br from-yellow-400 to-yellow-600", 
    offline: "bg-gradient-to-br from-red-400 to-red-600",
  };

  // Get the appropriate icon based on vehicle type
  const getVehicleIcon = () => {
    const type = vehicleType?.toLowerCase() || "";
    
    if (type.includes("bus") || type.includes("coaster")) {
      return Bus;
    } else if (type.includes("truck") || type.includes("trailer") || type.includes("heavy")) {
      return Truck;
    } else if (type.includes("motorcycle") || type.includes("bike")) {
      return Bike;
    } else if (type.includes("van") || type.includes("pickup")) {
      return Container;
    } else {
      return Car;
    }
  };

  const VehicleIcon = getVehicleIcon();

  return (
    <div 
      className={cn(
        "rounded-lg flex items-center justify-center shadow-md",
        sizeClasses[size],
        statusColors[status],
        className
      )}
    >
      <VehicleIcon className={cn("text-white drop-shadow-sm", iconSizeClasses[size])} />
    </div>
  );
};

export default VehicleTypeImage;
