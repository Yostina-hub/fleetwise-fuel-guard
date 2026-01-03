import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Car, FileText, DollarSign, Clock, CheckCircle } from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { Skeleton } from "@/components/ui/skeleton";

export const IncidentQuickStats = () => {
  const { incidents, loading } = useIncidentsManagement();

  const stats = (() => {
    if (loading || !incidents) {
      return [
        { label: "Total Incidents", value: null, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", trend: "All time" },
        { label: "Open Cases", value: null, icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10", trend: "Pending resolution" },
        { label: "Resolved", value: null, icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-500/10", trend: "Successfully closed" },
        { label: "Accidents", value: null, icon: Car, color: "text-red-600", bgColor: "bg-red-500/10", trend: "Collision incidents" },
        { label: "Breakdowns", value: null, icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-500/10", trend: "Mechanical issues" },
        { label: "Est. Costs", value: null, icon: DollarSign, color: "text-blue-600", bgColor: "bg-blue-500/10", trend: "Total damages" },
      ];
    }

    const totalIncidents = incidents.length;
    const openCases = incidents.filter(i => i.status === 'reported' || i.status === 'investigating').length;
    const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const accidents = incidents.filter(i => i.incident_type === 'accident').length;
    const breakdowns = incidents.filter(i => i.incident_type === 'breakdown').length;
    const totalCosts = incidents.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);

    return [
      { 
        label: "Total Incidents", 
        value: totalIncidents, 
        icon: AlertTriangle, 
        color: "text-destructive", 
        bgColor: "bg-destructive/10", 
        trend: "All time" 
      },
      { 
        label: "Open Cases", 
        value: openCases, 
        icon: Clock, 
        color: "text-orange-600", 
        bgColor: "bg-orange-500/10", 
        trend: openCases === 0 ? "All clear!" : "Pending resolution" 
      },
      { 
        label: "Resolved", 
        value: resolved, 
        icon: CheckCircle, 
        color: "text-green-600", 
        bgColor: "bg-green-500/10", 
        trend: "Successfully closed" 
      },
      { 
        label: "Accidents", 
        value: accidents, 
        icon: Car, 
        color: "text-red-600", 
        bgColor: "bg-red-500/10", 
        trend: "Collision incidents" 
      },
      { 
        label: "Breakdowns", 
        value: breakdowns, 
        icon: AlertTriangle, 
        color: "text-amber-600", 
        bgColor: "bg-amber-500/10", 
        trend: "Mechanical issues" 
      },
      { 
        label: "Est. Costs", 
        value: `$${(totalCosts / 1000).toFixed(1)}k`, 
        icon: DollarSign, 
        color: "text-blue-600", 
        bgColor: "bg-blue-500/10", 
        trend: "Total damages" 
      },
    ];
  })();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
            </div>
            <div>
              {stat.value === null ? (
                <Skeleton className="h-7 w-16 mb-1" />
              ) : (
                <p className="text-xl font-bold">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{stat.trend}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
