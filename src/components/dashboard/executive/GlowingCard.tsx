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
    primary: "shadow-primary/20 hover:shadow-primary/40",
    success: "shadow-success/20 hover:shadow-success/40",
    warning: "shadow-warning/20 hover:shadow-warning/40",
    destructive: "shadow-destructive/20 hover:shadow-destructive/40",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={interactive ? { 
        y: -4, 
        scale: 1.01,
        transition: { duration: 0.2 }
      } : undefined}
      className={cn(
        "relative rounded-xl border bg-card/80 backdrop-blur-xl p-6 transition-all duration-300",
        "shadow-lg",
        glowColorMap[glowColor] || glowColorMap.primary,
        className
      )}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl opacity-50 pointer-events-none">
        <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10" />
      </div>
      
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default GlowingCard;
