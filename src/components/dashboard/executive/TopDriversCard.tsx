import { motion } from "framer-motion";
import { Trophy, Medal, TrendingUp, TrendingDown, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Driver {
  id: string;
  name: string;
  avatarUrl?: string;
  safetyScore: number;
  totalTrips: number;
  totalDistance: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  rank: number;
}

interface TopDriversCardProps {
  drivers: Driver[];
  loading?: boolean;
}

const TopDriversCard = ({ drivers, loading }: TopDriversCardProps) => {
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-6"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/30 rounded w-1/3" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted/20 rounded w-1/2" />
                <div className="h-2 bg-muted/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-warning" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-warning/60" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden"
    >
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Top Drivers</h3>
              <p className="text-sm text-muted-foreground">By safety performance</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            This Month
          </Badge>
        </div>

        <div className="space-y-4">
          {drivers.slice(0, 5).map((driver, index) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-colors group"
            >
              {/* Rank */}
              <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                {getRankIcon(driver.rank)}
              </div>

              {/* Avatar */}
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarImage src={driver.avatarUrl} alt={driver.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-foreground text-sm truncate">{driver.name}</p>
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${getScoreColor(driver.safetyScore)}`}>
                      {driver.safetyScore}
                    </span>
                    {driver.trend !== 'stable' && (
                      driver.trend === 'up' 
                        ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                        : <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                </div>
                <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    className={`absolute inset-y-0 left-0 rounded-full ${getProgressColor(driver.safetyScore)}`}
                    initial={{ width: '0%' }}
                    animate={{ width: `${driver.safetyScore}%` }}
                    transition={{ duration: 1, delay: index * 0.15 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {driver.totalTrips} trips • {driver.totalDistance.toLocaleString()} km
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TopDriversCard;
