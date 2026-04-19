import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, ArrowRightLeft } from "lucide-react";
import type { HistoryStats } from "./types";

const STAT_ITEMS: Array<{
  key: keyof HistoryStats;
  label: string;
  icon: typeof Activity;
  accent: string;
}> = [
  { key: "total", label: "Total Events", icon: Activity, accent: "text-foreground" },
  { key: "today", label: "Last 24 hours", icon: Clock, accent: "text-primary" },
  { key: "approvals", label: "Approvals", icon: CheckCircle2, accent: "text-success" },
  { key: "routings", label: "Routings", icon: ArrowRightLeft, accent: "text-primary" },
];

export const HistoryStatsCards = ({ stats }: { stats: HistoryStats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {STAT_ITEMS.map(({ key, label, icon: Icon, accent }) => (
      <Card key={key}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${accent}`}>{stats[key]}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
          <Icon className={`h-5 w-5 ${accent} opacity-70`} />
        </CardContent>
      </Card>
    ))}
  </div>
);
