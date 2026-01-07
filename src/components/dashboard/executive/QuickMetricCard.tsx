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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary))" }}
      className={`
        bg-[#1a2332] border border-[#2a3a4d] rounded-lg p-4
        hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 
        transition-all duration-300
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white/90">{title}</span>
        {badge && (
          <Badge 
            variant="outline" 
            className="text-xs bg-blue-500/30 text-blue-300 border-blue-400/60 font-medium"
          >
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-1.5"
            >
              <motion.span 
                className="w-2 h-2 rounded-full bg-blue-400"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {badge}
            </motion.span>
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        {icon && (
          <motion.div 
            className="text-primary"
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {icon}
          </motion.div>
        )}
        <motion.span 
          className="text-3xl font-bold text-white tracking-tight"
          key={String(value)}
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
        >
          {displayValue}
        </motion.span>
      </div>
    </motion.div>
  );
};

export default QuickMetricCard;
