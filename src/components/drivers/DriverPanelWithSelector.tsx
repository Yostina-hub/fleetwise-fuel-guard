import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";
import { DriverAchievementsPanel } from "./DriverAchievementsPanel";
import { DriverTrainingPanel } from "./DriverTrainingPanel";
import { DriverFatiguePanel } from "./DriverFatiguePanel";
import { DriverInsightsPanel } from "./DriverInsightsPanel";

interface DriverPanelWithSelectorProps {
  panel: "achievements" | "training" | "fatigue" | "insights";
}

export const DriverPanelWithSelector = ({ panel }: DriverPanelWithSelectorProps) => {
  const { drivers, loading } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const driverName = selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : "";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a driver..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={d.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {d.first_name[0]}{d.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {d.first_name} {d.last_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedDriverId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a driver above to view their {panel} data</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {panel === "achievements" && <DriverAchievementsPanel driverId={selectedDriverId} driverName={driverName} />}
          {panel === "training" && <DriverTrainingPanel driverId={selectedDriverId} />}
          {panel === "fatigue" && <DriverFatiguePanel driverId={selectedDriverId} />}
          {panel === "insights" && <DriverInsightsPanel driverId={selectedDriverId} />}
        </>
      )}
    </div>
  );
};
