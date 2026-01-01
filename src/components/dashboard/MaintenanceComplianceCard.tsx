import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MaintenanceComplianceCardProps {
  complianceRate: number;
  overdueCount: number;
  upcomingCount: number;
}

const MaintenanceComplianceCard = ({
  complianceRate,
  overdueCount,
  upcomingCount
}: MaintenanceComplianceCardProps) => {
  const getComplianceStatus = (rate: number) => {
    if (rate >= 95) return { label: 'Excellent', color: 'text-success', bgColor: 'bg-success' };
    if (rate >= 85) return { label: 'Good', color: 'text-primary', bgColor: 'bg-primary' };
    if (rate >= 70) return { label: 'Fair', color: 'text-warning', bgColor: 'bg-warning' };
    return { label: 'Poor', color: 'text-destructive', bgColor: 'bg-destructive' };
  };

  const status = getComplianceStatus(complianceRate);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="w-4 h-4 text-warning" />
          Maintenance Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Main metric */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold">{complianceRate.toFixed(0)}%</span>
            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          <Progress 
            value={complianceRate} 
            className="h-2"
          />
        </div>
        
        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {overdueCount > 0 ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <div>
                <div className="text-sm font-semibold text-destructive">{overdueCount}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
              <CheckCircle className="w-4 h-4 text-success" />
              <div>
                <div className="text-sm font-semibold text-success">0</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
            <Clock className="w-4 h-4 text-warning" />
            <div>
              <div className="text-sm font-semibold text-warning">{upcomingCount}</div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
            </div>
          </div>
        </div>
        
        {/* Action hint */}
        {overdueCount > 0 && (
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            <span>{overdueCount} vehicle{overdueCount > 1 ? 's' : ''} need{overdueCount === 1 ? 's' : ''} immediate attention</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceComplianceCard;
