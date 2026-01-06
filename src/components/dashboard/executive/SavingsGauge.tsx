import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Fuel, Wrench, Shield } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface SavingsCategory {
  name: string;
  actual: number;
  potential: number;
  icon: React.ReactNode;
  color: string;
}

interface SavingsGaugeProps {
  categories: SavingsCategory[];
  totalSavings: number;
  currency?: string;
  loading?: boolean;
}

const SavingsGauge = ({ categories, totalSavings, currency = 'ETB', loading }: SavingsGaugeProps) => {
  const { formattedValue: animatedTotal } = useAnimatedCounter(totalSavings, { duration: 2000 });

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-6 h-80"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/30 rounded w-1/3" />
          <div className="h-32 bg-muted/20 rounded-xl" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-primary/5"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Fleet Savings</h3>
            <p className="text-sm text-muted-foreground">Cost optimization overview</p>
          </div>
          <motion.div 
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/30"
            whileHover={{ scale: 1.05 }}
          >
            <DollarSign className="w-6 h-6 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Total Saved</p>
              <p className="text-2xl font-bold text-success">{currency} {animatedTotal}</p>
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          {categories.map((category, index) => {
            const percentage = category.potential > 0 ? (category.actual / category.potential) * 100 : 0;
            
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <div style={{ color: category.color }}>{category.icon}</div>
                    </div>
                    <span className="text-sm font-medium text-foreground">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">
                      {currency} {category.actual.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      / {category.potential.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, delay: index * 0.2, ease: 'easeOut' }}
                  />
                  {/* Potential indicator */}
                  <motion.div 
                    className="absolute inset-y-0 right-0 rounded-full opacity-30"
                    style={{ 
                      backgroundColor: category.color,
                      width: `${100 - percentage}%` 
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.2 }}
                    transition={{ delay: index * 0.2 + 1 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom insight */}
        <motion.div 
          className="mt-6 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <TrendingUp className="w-5 h-5 text-primary" />
          <p className="text-sm text-foreground">
            <span className="font-medium">Optimization Potential:</span>{' '}
            <span className="text-primary font-bold">
              {currency} {(categories.reduce((sum, c) => sum + c.potential, 0) - totalSavings).toLocaleString()}
            </span>{' '}
            additional savings available
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SavingsGauge;
