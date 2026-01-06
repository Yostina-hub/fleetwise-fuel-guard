import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, Clock, CheckCircle, FileText, Car, User, Wrench } from "lucide-react";
import { ComplianceItem } from "@/hooks/useExecutiveMetrics";
import { format, differenceInDays } from "date-fns";

interface ComplianceTrackerProps {
  items: ComplianceItem[];
  loading?: boolean;
}

const ComplianceTracker = ({ items, loading }: ComplianceTrackerProps) => {
  const getTypeIcon = (type: ComplianceItem['type']) => {
    switch (type) {
      case 'license': return <FileText className="w-4 h-4" />;
      case 'insurance': return <Shield className="w-4 h-4" />;
      case 'inspection': return <CheckCircle className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
    }
  };

  const getEntityIcon = (entityType: 'vehicle' | 'driver') => {
    return entityType === 'vehicle' 
      ? <Car className="w-3 h-3" /> 
      : <User className="w-3 h-3" />;
  };

  const getStatusConfig = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'expired':
        return { 
          color: 'bg-destructive text-destructive-foreground', 
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'Expired'
        };
      case 'expiring_soon':
        return { 
          color: 'bg-warning text-warning-foreground', 
          icon: <Clock className="w-3 h-3" />,
          label: 'Expiring Soon'
        };
      default:
        return { 
          color: 'bg-success text-success-foreground', 
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Valid'
        };
    }
  };

  const formatDaysRemaining = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const expiredCount = items.filter(i => i.status === 'expired').length;
  const expiringCount = items.filter(i => i.status === 'expiring_soon').length;
  const validCount = items.filter(i => i.status === 'valid').length;

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Compliance Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Compliance Tracker
          </CardTitle>
          <div className="flex gap-1.5">
            {expiredCount > 0 && (
              <Badge variant="destructive" className="text-xs">{expiredCount} Expired</Badge>
            )}
            {expiringCount > 0 && (
              <Badge className="text-xs bg-warning text-warning-foreground">{expiringCount} Soon</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
            <div className="text-xs text-muted-foreground">Expired</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-warning/10">
            <div className="text-2xl font-bold text-warning">{expiringCount}</div>
            <div className="text-xs text-muted-foreground">Expiring</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-success/10">
            <div className="text-2xl font-bold text-success">{validCount}</div>
            <div className="text-xs text-muted-foreground">Valid</div>
          </div>
        </div>

        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-2">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No compliance items to track
              </div>
            ) : (
              items.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${
                      item.status === 'expired' ? 'border-destructive/30 bg-destructive/5' :
                      item.status === 'expiring_soon' ? 'border-warning/30 bg-warning/5' :
                      'border-border'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      item.status === 'expired' ? 'bg-destructive/20 text-destructive' :
                      item.status === 'expiring_soon' ? 'bg-warning/20 text-warning' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{item.type.replace('_', ' ')}</span>
                        <Badge variant="outline" className="text-xs gap-1">
                          {getEntityIcon(item.entityType)}
                          {item.entityName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Expires: {format(new Date(item.expiryDate), 'MMM d, yyyy')}</span>
                        <span className={`font-medium ${
                          item.daysUntilExpiry < 0 ? 'text-destructive' :
                          item.daysUntilExpiry < 7 ? 'text-warning' :
                          'text-muted-foreground'
                        }`}>
                          ({formatDaysRemaining(item.daysUntilExpiry)})
                        </span>
                      </div>
                    </div>

                    <Badge className={`text-xs gap-1 ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ComplianceTracker;
