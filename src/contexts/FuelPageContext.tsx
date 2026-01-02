import { createContext, useContext } from "react";
import { Driver } from "@/hooks/useDrivers";

interface Vehicle {
  id: string;
  plate_number: string;
  [key: string]: any;
}

export interface FuelPageContextType {
  vehicles: Vehicle[];
  drivers: Driver[];
  getVehiclePlate: (vehicleId: string) => string;
  getDriverName: (driverId?: string) => string;
}

export const FuelPageContext = createContext<FuelPageContextType | null>(null);

export const useFuelPageContext = () => {
  const context = useContext(FuelPageContext);
  if (!context) {
    throw new Error("useFuelPageContext must be used within FuelMonitoring");
  }
  return context;
};
