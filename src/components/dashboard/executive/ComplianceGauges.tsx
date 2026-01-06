import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Shield, FileText, Car, User, Clock, AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { ComplianceItem } from "@/hooks/useExecutiveMetrics";
import { format } from "date-fns";
import AnimatedMetricRing from "./AnimatedMetricRing";

interface ComplianceGaugesProps {
  items: ComplianceItem[];
  loading?: boolean;
}

const ComplianceGauges = ({ items, loading }: ComplianceGaugesProps) => {
  const getTypeIcon = (type: ComplianceItem['type']) => {
    switch (type) {
      case 'license': return <FileText className="w-4 h-4" />;
      case 'insurance': return <Shield className="w-4 h-4" />;
      case 'inspection': return <CheckCircle className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
    }
  };

  const expiredCount = items.filter(i => i.status === 'expired').length;
  const expiringCount = items.filter(i => i.status === 'expiring_soon').length;
  const validCount = items.filter(i => i.status === 'valid').length;
  const totalItems = items.length;
  
  const complianceRate = totalItems > 0 
    ? ((validCount + expiringCount * 0.5) / totalItems) * 100 
    : 100;

  const criticalItems = items.filter(i => i.status === 'expired' || i.daysUntilExpiry < 7).slice(0, 5);

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] bg-muted/50 rounded-lg animate-pulse" />
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
            Compliance Overview
          </CardTitle>
          {expiredCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {expiredCount} Critical
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Compliance Gauge */}
        <div className="flex items-center justify-center">
          <AnimatedMetricRing
            value={complianceRate}
            size={140}
            strokeWidth={12}
            color={complianceRate >= 90 ? 'hsl(var(--success))' : 
                   complianceRate >= 70 ? 'hsl(var(--warning))' : 
                   'hsl(var(--destructive))'}
            label="Compliance"
            sublabel={`${validCount} of ${totalItems} items valid`}
          />
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-3 rounded-lg bg-destructive/10"
          >
            <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
            <div className="text-xs text-muted-foreground">Expired</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center p-3 rounded-lg bg-warning/10"
          >
            <div className="text-2xl font-bold text-warning">{expiringCount}</div>
            <div className="text-xs text-muted-foreground">Expiring</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center p-3 rounded-lg bg-success/10"
          >
            <div className="text-2xl font-bold text-success">{validCount}</div>
            <div className="text-xs text-muted-foreground">Valid</div>
          </motion.div>
        </div>

        {/* Critical Items */}
        {criticalItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Requires Attention
            </h4>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2 pr-2">
                {criticalItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.status === 'expired' 
                        ? 'border-destructive/30 bg-destructive/5' 
                        : 'border-warning/30 bg-warning/5'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      item.status === 'expired' 
                        ? 'bg-destructive/20 text-destructive' 
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">{item.type}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.entityType === 'vehicle' ? <Car className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                          {item.entityName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {item.daysUntilExpiry < 0 
                          ? `${Math.abs(item.daysUntilExpiry)} days overdue`
                          : item.daysUntilExpiry === 0 
                            ? 'Expires today'
                            : `${item.daysUntilExpiry} days left`
                        }
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplianceGauges;
