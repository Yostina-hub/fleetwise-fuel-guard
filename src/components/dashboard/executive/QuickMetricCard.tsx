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
        bg-card/60 backdrop-blur-sm border rounded-lg p-4
        hover:shadow-lg hover:border-primary/30 transition-all duration-300
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {badge && (
          <Badge variant={badgeVariant} className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {icon && <div className="text-primary">{icon}</div>}
        <span className="text-2xl font-bold">{value}</span>
      </div>
    </motion.div>
  );
};

export default QuickMetricCard;
