import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Server, Shield, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export type SiteEnvironment = "production" | "disaster_recovery" | "testbed";

interface SiteConfig {
  id: SiteEnvironment;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
  location: string;
  status: "active" | "standby" | "maintenance";
  syncStatus: "synced" | "syncing" | "behind";
  lastSync: string;
  role: string;
}

const sites: SiteConfig[] = [
  {
    id: "production",
    label: "Production (PR)",
    shortLabel: "PR",
    icon: <Server className="h-5 w-5" />,
    description: "Primary production environment — live fleet operations",
    location: "Addis Ababa DC-1",
    status: "active",
    syncStatus: "synced",
    lastSync: "Real-time",
    role: "Primary Active",
  },
  {
    id: "disaster_recovery",
    label: "Disaster Recovery (DR)",
    shortLabel: "DR",
    icon: <Shield className="h-5 w-5" />,
    description: "Secondary site — hot standby for failover",
    location: "Addis Ababa DC-2",
    status: "standby",
    syncStatus: "synced",
    lastSync: "2s ago",
    role: "Hot Standby",
  },
  {
    id: "testbed",
    label: "Testbed / Pre-Production",
    shortLabel: "TB",
    icon: <FlaskConical className="h-5 w-5" />,
    description: "Pre-production validation & integration testing",
    location: "Cloud Region",
    status: "active",
    syncStatus: "behind",
    lastSync: "1h ago",
    role: "Testing",
  },
];

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  standby: "bg-amber-500",
  maintenance: "bg-red-500",
};

const syncBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  synced: "default",
  syncing: "secondary",
  behind: "outline",
};

interface Props {
  selected: SiteEnvironment;
  onSelect: (site: SiteEnvironment) => void;
}

const SiteEnvironmentSelector = ({ selected, onSelect }: Props) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {sites.map((site) => (
        <Card
          key={site.id}
          className={cn(
            "cursor-pointer transition-all hover:border-primary/40",
            selected === site.id
              ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
              : "glass-strong"
          )}
          onClick={() => onSelect(site.id)}
        >
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg glass", selected === site.id ? "text-primary" : "text-muted-foreground")}>
                  {site.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm">{site.label}</p>
                  <p className="text-xs text-muted-foreground">{site.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", statusColors[site.status])} />
                <span className="text-xs font-medium capitalize">{site.status}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{site.description}</p>
            <div className="flex items-center justify-between text-xs">
              <Badge variant="outline" className="text-xs">{site.role}</Badge>
              <Badge variant={syncBadgeVariant[site.syncStatus]} className="text-xs">
                Sync: {site.syncStatus === "synced" ? "✓" : site.syncStatus === "syncing" ? "⟳" : "⚠"} {site.lastSync}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export { sites };
export default SiteEnvironmentSelector;
