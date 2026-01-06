import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Signal, Activity, Clock, Zap } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface CommandCenterHeaderProps {
  totalVehicles: number;
  activeVehicles: number;
  totalTrips: number;
  activeAlerts: number;
}

const CommandCenterHeader = ({ 
  totalVehicles, 
  activeVehicles, 
  totalTrips, 
  activeAlerts 
}: CommandCenterHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { formattedValue: animatedVehicles } = useAnimatedCounter(activeVehicles, { duration: 1500 });
  const { formattedValue: animatedTrips } = useAnimatedCounter(totalTrips, { duration: 1500 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sidebar via-sidebar/95 to-sidebar border border-border/50"
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(141, 198, 63, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(141, 198, 63, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        <motion.div 
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Glowing orbs */}
      <motion.div 
        className="absolute top-10 right-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-5 left-40 w-24 h-24 bg-secondary/30 rounded-full blur-2xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />

      <div className="relative z-10 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <motion.div 
                className="absolute -inset-1 rounded-2xl bg-primary/30 blur-md"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            
            <div>
              <motion.h1 
                className="text-2xl lg:text-3xl font-bold text-foreground"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Fleet Command Center
              </motion.h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50 gap-1">
                  <motion.span 
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  Live Operations
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(currentTime, 'HH:mm:ss')}
                </span>
              </div>
            </div>
          </div>

          {/* Live Stats Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/10 backdrop-blur-sm border border-border/30"
              whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary) / 0.5)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Fleet</p>
                <p className="text-xl font-bold text-foreground">
                  {animatedVehicles}<span className="text-muted-foreground text-sm">/{totalVehicles}</span>
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/10 backdrop-blur-sm border border-border/30"
              whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary) / 0.5)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Signal className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Trips</p>
                <p className="text-xl font-bold text-foreground">{animatedTrips}</p>
              </div>
            </motion.div>

            {activeAlerts > 0 && (
              <motion.div 
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 backdrop-blur-sm border border-destructive/30"
                animate={{ borderColor: ['hsl(var(--destructive) / 0.3)', 'hsl(var(--destructive) / 0.6)', 'hsl(var(--destructive) / 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <span className="text-lg font-bold text-destructive">{activeAlerts}</span>
                </motion.div>
                <div>
                  <p className="text-xs text-destructive uppercase tracking-wider">Active Alerts</p>
                  <p className="text-sm font-medium text-destructive-foreground">Needs Attention</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CommandCenterHeader;
