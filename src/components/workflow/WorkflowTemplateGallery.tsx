import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingDown,
  Shield,
  Wrench,
  Fuel,
  CheckCircle,
  Truck,
  AlertTriangle,
  Thermometer,
  Zap,
  Battery,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import TEMPLATES, { type WorkflowTemplate } from "./workflowTemplates";

interface WorkflowTemplateGalleryProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  safety: { icon: Shield, color: "text-red-500", bg: "bg-red-500/10" },
  maintenance: { icon: Wrench, color: "text-blue-500", bg: "bg-blue-500/10" },
  fuel: { icon: Fuel, color: "text-amber-500", bg: "bg-amber-500/10" },
  compliance: { icon: CheckCircle, color: "text-purple-500", bg: "bg-purple-500/10" },
  operations: { icon: Truck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  alerts: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
  cold_chain: { icon: Thermometer, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  sensors: { icon: Zap, color: "text-teal-500", bg: "bg-teal-500/10" },
  ev_charging: { icon: Battery, color: "text-green-500", bg: "bg-green-500/10" },
};

const DIFFICULTY_CONFIG: Record<string, { color: string }> = {
  beginner: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  intermediate: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  advanced: { color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export const WorkflowTemplateGallery = ({
  onSelectTemplate,
  onClose,
}: WorkflowTemplateGalleryProps) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="w-full max-w-5xl h-[85vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Workflow Templates</h2>
                <p className="text-xs text-muted-foreground">
                  {TEMPLATES.length} industry-proven automation templates • Fully customizable
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search + Category filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={selectedCategory === null ? "default" : "ghost"}
                onClick={() => setSelectedCategory(null)}
                className="h-7 text-[10px] px-2.5"
              >
                All
              </Button>
              {categories.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config?.icon || Shield;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? "default" : "ghost"}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className="h-7 text-[10px] px-2.5 gap-1 capitalize"
                  >
                    <Icon className="h-3 w-3" />
                    {cat}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((template, idx) => {
                const catConfig = CATEGORY_CONFIG[template.category];
                const diffConfig = DIFFICULTY_CONFIG[template.difficulty];
                const CatIcon = catConfig?.icon || Shield;
                const isHovered = hoveredTemplate === template.id;

                return (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card
                      className={cn(
                        "group cursor-pointer transition-all duration-300 overflow-hidden",
                        isHovered
                          ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                          : "hover:border-primary/30"
                      )}
                      onMouseEnter={() => setHoveredTemplate(template.id)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                      onClick={() => onSelectTemplate(template)}
                    >
                      <CardContent className="p-4">
                        {/* Top */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-xl", catConfig?.bg)}>
                            {template.icon}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] h-5", diffConfig?.color)}
                          >
                            {template.difficulty}
                          </Badge>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-foreground mb-1 leading-tight">
                          {template.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {template.nodes.length} nodes
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingDown className="h-2.5 w-2.5 text-emerald-500" />
                            {template.estimatedSavings}
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[8px] h-4 px-1.5 bg-muted/50"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* CTA */}
                        <div className={cn(
                          "flex items-center justify-between pt-2 border-t border-border transition-all",
                        )}>
                          <span className={cn("text-[10px] font-medium flex items-center gap-1", catConfig?.color)}>
                            <CatIcon className="h-3 w-3" />
                            {template.category}
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium text-primary flex items-center gap-0.5 transition-transform",
                            isHovered && "translate-x-0.5"
                          )}>
                            Use Template
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
};
