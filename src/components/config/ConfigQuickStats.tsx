import { Card, CardContent } from "@/components/ui/card";
import { Radio, Droplet, Settings2, CheckCircle } from "lucide-react";

interface ConfigQuickStatsProps {
  activeProtocols: number;
  fuelSensors: number;
  enrichmentConfigs: number;
  lastUpdated: string;
}

const ConfigQuickStats = ({
  activeProtocols,
  fuelSensors,
  enrichmentConfigs,
  lastUpdated,
}: ConfigQuickStatsProps) => {
  const stats = [
    {
      label: "Active Protocols",
      value: activeProtocols.toString(),
      icon: Radio,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Fuel Sensors",
      value: fuelSensors.toString(),
      icon: Droplet,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Enrichment Configs",
      value: enrichmentConfigs.toString(),
      icon: Settings2,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Last Updated",
      value: lastUpdated,
      icon: CheckCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ConfigQuickStats;
