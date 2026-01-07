import { motion } from "framer-motion";
import { MapPin, Plus, Minus } from "lucide-react";
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4 h-full"
    >
      {/* Header */}
      <h3 className="font-semibold text-base text-white flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-primary" />
        Alerts Map
      </h3>

      {/* Map Container */}
      <div className="relative h-[250px] rounded-lg overflow-hidden border border-[#2a3a4d]">
        {/* Map Background - styled to look like a real map */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)`,
          }}
        >
          {/* Road-like grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-30">
            <defs>
              <pattern id="roads" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 30 H60 M30 0 V60" stroke="#475569" strokeWidth="1" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#roads)" />
          </svg>

          {/* Simulated map features */}
          <div className="absolute top-[20%] left-[15%] w-16 h-12 bg-green-900/30 rounded" />
          <div className="absolute top-[50%] right-[20%] w-20 h-8 bg-blue-900/30 rounded" />
          <div className="absolute bottom-[25%] left-[40%] w-12 h-16 bg-green-900/30 rounded" />

          {/* Alert Markers */}
          {alertsWithLocation.length > 0 ? (
            alertsWithLocation.slice(0, 5).map((alert, index) => {
              // Distribute markers across the map
              const positions = [
                { left: '70%', top: '55%' },
                { left: '30%', top: '35%' },
                { left: '50%', top: '70%' },
                { left: '20%', top: '60%' },
                { left: '80%', top: '30%' },
              ];
              const pos = positions[index % positions.length];
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.15 }}
                  className="absolute cursor-pointer"
                  style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="relative">
                    {/* Pulse effect */}
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2, delay: index * 0.3 }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: getSeverityColor(alert.severity) }}
                    />
                    {/* Marker pin */}
                    <div 
                      className="relative w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: getSeverityColor(alert.severity) }}
                    >
                      <MapPin className="h-3.5 w-3.5 text-white" />
                    </div>
                    {/* Pin tail */}
                    <div 
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: `6px solid ${getSeverityColor(alert.severity)}`,
                      }}
                    />
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/60">
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No alerts with location</p>
              </div>
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-7 w-7 bg-[#1a2332]/90 hover:bg-[#2a3a4d] border border-[#2a3a4d]"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-7 w-7 bg-[#1a2332]/90 hover:bg-[#2a3a4d] border border-[#2a3a4d]"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Map Attribution */}
          <div className="absolute bottom-1 right-2 text-[8px] text-white/40">
            © Fleet Map
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AlertsMapCard;
