import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  delay?: number;
  interactive?: boolean;
}

const GlowingCard = ({ 
  children, 
  className, 
  glowColor = "primary",
  delay = 0,
  interactive = true
}: GlowingCardProps) => {
  const glowColorMap: Record<string, string> = {
    primary: "hover:shadow-primary/40 hover:border-primary/40",
    success: "hover:shadow-success/40 hover:border-success/40",
    warning: "hover:shadow-warning/40 hover:border-warning/40",
    destructive: "hover:shadow-destructive/40 hover:border-destructive/40",
  };

  const gradientMap: Record<string, string> = {
    primary: "from-primary/10 via-transparent to-primary/5",
    success: "from-success/10 via-transparent to-success/5",
    warning: "from-warning/10 via-transparent to-warning/5",
    destructive: "from-destructive/10 via-transparent to-destructive/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={interactive ? { 
        y: -6, 
        scale: 1.015,
        transition: { duration: 0.3, ease: "easeOut" }
      } : undefined}
      className={cn(
        "relative rounded-xl border border-border/50 bg-[#1a2332]/90 backdrop-blur-xl p-6 transition-all duration-500",
        "shadow-xl shadow-black/20",
        glowColorMap[glowColor] || glowColorMap.primary,
        className
      )}
    >
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-60",
          gradientMap[glowColor] || gradientMap.primary
        )} />
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: "linear" }}
        />
      </div>
      
      {/* Subtle border glow */}
      <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
      
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default GlowingCard;
