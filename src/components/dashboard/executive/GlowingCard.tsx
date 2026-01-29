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
    primary: "hover:shadow-cyan-500/20 hover:border-cyan-500/40",
    success: "hover:shadow-[#8DC63F]/20 hover:border-[#8DC63F]/40",
    warning: "hover:shadow-amber-400/20 hover:border-amber-400/40",
    destructive: "hover:shadow-red-400/20 hover:border-red-400/40",
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
        "relative rounded-xl border border-cyan-500/20 backdrop-blur-sm p-6 transition-all duration-500",
        "shadow-lg shadow-black/20",
        glowColorMap[glowColor] || glowColorMap.primary,
        className
      )}
      style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
    >
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-[#8DC63F]/5 opacity-60" />
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: "linear" }}
        />
      </div>
      
      {/* Subtle border accent */}
      <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-br from-cyan-500/10 via-transparent to-[#8DC63F]/5 pointer-events-none" />
      
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default GlowingCard;
