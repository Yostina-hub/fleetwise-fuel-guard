import { motion } from "framer-motion";
import { MapPin, Plus, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  lat?: number;
  lng?: number;
  title: string;
  severity: string;
}

interface AlertsMapCardProps {
  alerts: Alert[];
  loading?: boolean;
}

const AlertsMapCard = ({ alerts, loading }: AlertsMapCardProps) => {
  const alertsWithLocation = alerts.filter(a => a.lat && a.lng);
  
  // Calculate center based on alerts or default
  const centerLat = alertsWithLocation.length > 0 
    ? alertsWithLocation.reduce((sum, a) => sum + (a.lat || 0), 0) / alertsWithLocation.length 
    : -1.2921;
  const centerLng = alertsWithLocation.length > 0 
    ? alertsWithLocation.reduce((sum, a) => sum + (a.lng || 0), 0) / alertsWithLocation.length 
    : 36.8219;

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Alerts Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-[300px] rounded-lg overflow-hidden bg-muted/30 border border-border/30">
            {/* Map placeholder with styling similar to the reference */}
            <div 
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(135deg, 
                    hsl(var(--muted)/0.3) 0%, 
                    hsl(var(--muted)/0.5) 50%,
                    hsl(var(--muted)/0.3) 100%
                  )
                `,
              }}
            >
              {/* Grid overlay to simulate map */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                }}
              />
              
              {/* Alert markers */}
              {alertsWithLocation.length > 0 ? (
                alertsWithLocation.slice(0, 5).map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="absolute"
                    style={{
                      left: `${20 + (index * 15)}%`,
                      top: `${30 + (index * 10)}%`,
                    }}
                  >
                    <div className="relative">
                      <div className={`w-6 h-6 rounded-full ${getSeverityColor(alert.severity)} flex items-center justify-center shadow-lg animate-pulse`}>
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${getSeverityColor(alert.severity).replace('bg-', 'border-t-')}`} />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No alerts with location data</p>
                  </div>
                </div>
              )}

              {/* Map controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              {/* Attribution */}
              <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50">
                © Fleet Map
              </div>
            </div>

            {/* Alert count badge */}
            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/50">
              <span className="text-xs font-medium text-foreground">
                {alertsWithLocation.length} alerts with location
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AlertsMapCard;
