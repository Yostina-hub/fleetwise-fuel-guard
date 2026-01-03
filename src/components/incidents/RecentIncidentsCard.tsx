import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Car, AlertTriangle, Wrench, MapPin } from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export const RecentIncidentsCard = () => {
  const { incidents, loading } = useIncidentsManagement();

  const recentIncidents = incidents
    ?.sort((a, b) => new Date(b.incident_time).getTime() - new Date(a.incident_time).getTime())
    .slice(0, 5) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'accident': return Car;
      case 'breakdown': return Wrench;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/10 text-green-600';
      case 'closed': return 'bg-green-500/10 text-green-600';
      case 'investigating': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-blue-500/10 text-blue-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          Recent Incidents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentIncidents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground" role="status" aria-label="No recent incidents">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm">No incidents recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentIncidents.map((incident) => {
              const TypeIcon = getTypeIcon(incident.incident_type);
              return (
                <div 
                  key={incident.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="p-2 rounded-md bg-destructive/10">
                    <TypeIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{incident.incident_number}</span>
                      <Badge variant={getSeverityColor(incident.severity)} className="text-[10px]">
                        {incident.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(incident.incident_time), 'MMM d, h:mm a')}</span>
                      {incident.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {incident.location}
                          </span>
                        </>
                      )}
                    </div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
