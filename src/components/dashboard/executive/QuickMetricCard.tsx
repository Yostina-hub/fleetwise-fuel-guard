import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface QuickMetricCardProps {
  title: string;
  value: string | number;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  icon?: ReactNode;
  className?: string;
}

const QuickMetricCard = ({ 
  title, 
  value, 
  badge, 
  badgeVariant = "secondary",
  icon,
  className = ""
}: QuickMetricCardProps) => {
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
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {icon && <div className="text-primary">{icon}</div>}
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
    </motion.div>
  );
};

export default QuickMetricCard;
