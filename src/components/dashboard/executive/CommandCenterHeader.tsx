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
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-lemon-green border border-primary/20"
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        <motion.div 
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Glowing orbs */}
      <motion.div 
        className="absolute top-10 right-20 w-32 h-32 bg-white/20 rounded-full blur-3xl"
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
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/10">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <motion.div 
                className="absolute -inset-1 rounded-2xl bg-white/20 blur-md"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            
            <div>
              <motion.h1 
                className="text-2xl lg:text-3xl font-bold text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Fleet Command Center
              </motion.h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="bg-white/20 text-white border-white/50 gap-1">
                  <motion.span 
                    className="w-2 h-2 rounded-full bg-white"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  Live Operations
                </Badge>
                <span className="text-sm text-white/90 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(currentTime, 'HH:mm:ss')}
                </span>
              </div>
            </div>
          </div>

          {/* Live Stats Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30"
              whileHover={{ scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.5)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-white/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/80 uppercase tracking-wider">Active Fleet</p>
                <p className="text-xl font-bold text-white">
                  {animatedVehicles}<span className="text-white/70 text-sm">/{totalVehicles}</span>
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30"
              whileHover={{ scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.5)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-white/30 flex items-center justify-center">
                <Signal className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/80 uppercase tracking-wider">Today's Trips</p>
                <p className="text-xl font-bold text-white">{animatedTrips}</p>
              </div>
            </motion.div>

            {activeAlerts > 0 && (
              <motion.div 
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/20 backdrop-blur-sm border border-destructive/50"
                animate={{ borderColor: ['hsl(var(--destructive) / 0.3)', 'hsl(var(--destructive) / 0.6)', 'hsl(var(--destructive) / 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-destructive/30 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <span className="text-lg font-bold text-white">{activeAlerts}</span>
                </motion.div>
                <div>
                  <p className="text-xs text-white uppercase tracking-wider">Active Alerts</p>
                  <p className="text-sm font-medium text-white">Needs Attention</p>
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
