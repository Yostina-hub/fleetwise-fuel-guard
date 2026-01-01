import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, CreditCard, ChevronRight, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDrivers } from "@/hooks/useDrivers";
import { useMemo } from "react";
import { differenceInDays, format } from "date-fns";

interface ComplianceItem {
  id: string;
  type: 'license' | 'medical';
  entityName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'expired' | 'critical' | 'warning';
}

const ComplianceAlertsCard = () => {
  const navigate = useNavigate();
  const { drivers, loading } = useDrivers();

  const complianceItems = useMemo(() => {
    const items: ComplianceItem[] = [];
    const today = new Date();

    drivers.forEach(driver => {
      // Check driver licenses
      if (driver.license_expiry) {
        const expiryDate = new Date(driver.license_expiry);
        const daysUntil = differenceInDays(expiryDate, today);
        
        if (daysUntil <= 30) {
          items.push({
            id: `license-${driver.id}`,
            type: 'license',
            entityName: `${driver.first_name} ${driver.last_name}`,
            expiryDate: driver.license_expiry,
            daysUntilExpiry: daysUntil,
            status: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'critical' : 'warning',
          });
        }
      }

      // Check medical certificates
      if (driver.medical_certificate_expiry) {
        const expiryDate = new Date(driver.medical_certificate_expiry);
        const daysUntil = differenceInDays(expiryDate, today);
        
        if (daysUntil <= 30) {
          items.push({
            id: `medical-${driver.id}`,
            type: 'medical',
            entityName: `${driver.first_name} ${driver.last_name}`,
            expiryDate: driver.medical_certificate_expiry,
            daysUntilExpiry: daysUntil,
            status: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'critical' : 'warning',
          });
        }
      }
    });

    // Sort by urgency (most urgent first)
    return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [drivers]);

  const stats = useMemo(() => ({
    expired: complianceItems.filter(i => i.status === 'expired').length,
    critical: complianceItems.filter(i => i.status === 'critical').length,
    warning: complianceItems.filter(i => i.status === 'warning').length,
  }), [complianceItems]);

  const getTypeIcon = (type: ComplianceItem['type']) => {
    switch (type) {
      case 'license':
        return <CreditCard className="w-4 h-4" />;
      case 'medical':
        return <Heart className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: ComplianceItem['type']) => {
    switch (type) {
      case 'license':
        return 'License';
      case 'medical':
        return 'Medical Cert';
      default:
        return type;
    }
  };

  const getStatusBadge = (item: ComplianceItem) => {
    if (item.status === 'expired') {
      return (
        <Badge variant="destructive" className="text-xs">
          Expired {Math.abs(item.daysUntilExpiry)}d ago
        </Badge>
      );
    }
    if (item.status === 'critical') {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
          {item.daysUntilExpiry}d left
        </Badge>
      );
    }
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
        {item.daysUntilExpiry}d left
      </Badge>
    );
  };

  const hasAlerts = stats.expired > 0 || stats.critical > 0 || stats.warning > 0;

  return (
    <Card className={stats.expired > 0 ? "border-destructive/30" : stats.critical > 0 ? "border-warning/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Compliance Alerts
          {stats.expired > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
              {stats.expired} expired
            </span>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/drivers')}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="flex gap-4 mb-4 text-center">
          <div className="flex-1 p-2 rounded-lg bg-destructive/5">
            <p className="text-lg font-bold text-destructive">{loading ? '-' : stats.expired}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
          <div className="flex-1 p-2 rounded-lg bg-warning/5">
            <p className="text-lg font-bold text-warning">{loading ? '-' : stats.critical}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <div className="flex-1 p-2 rounded-lg bg-primary/5">
            <p className="text-lg font-bold text-primary">{loading ? '-' : stats.warning}</p>
            <p className="text-xs text-muted-foreground">Warning</p>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !hasAlerts ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            All documents compliant
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {complianceItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    item.status === 'expired' 
                      ? 'border-destructive/30 bg-destructive/5' 
                      : item.status === 'critical'
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded ${
                      item.status === 'expired' ? 'bg-destructive/10 text-destructive' :
                      item.status === 'critical' ? 'bg-warning/10 text-warning' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.entityName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {getTypeLabel(item.type)}
                        <span className="opacity-50">•</span>
                        {format(new Date(item.expiryDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(item)}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplianceAlertsCard;
