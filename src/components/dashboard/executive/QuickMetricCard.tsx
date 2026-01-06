import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ReactNode, useEffect, useState } from "react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface QuickMetricCardProps {
  title: string;
  value: string | number;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  icon?: ReactNode;
  className?: string;
  animate?: boolean;
}

const QuickMetricCard = ({ 
  title, 
  value, 
  badge, 
  badgeVariant = "secondary",
  icon,
  className = "",
  animate = true
}: QuickMetricCardProps) => {
  // Extract numeric value for animation
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
  const suffix = typeof value === 'string' ? value.replace(/[0-9.-]/g, '').trim() : '';
  
  const { formattedValue } = useAnimatedCounter(numericValue, {
    duration: 1500,
    decimals: String(value).includes('.') ? 2 : 0,
  });

  const displayValue = animate ? `${formattedValue}${suffix ? ` ${suffix}` : ''}` : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4
        hover:border-primary/40 transition-all duration-300
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {badge && (
          <Badge 
            variant="outline" 
            className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/50"
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {badge}
            </motion.span>
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {icon && (
          <motion.div 
            className="text-primary"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {icon}
          </motion.div>
        )}
        <motion.span 
          className="text-2xl font-bold text-foreground"
          key={String(value)}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {displayValue}
        </motion.span>
      </div>
    </motion.div>
  );
};

export default QuickMetricCard;
