import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Zap, ArrowRight, Workflow, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import TEMPLATES, { type WorkflowTemplate } from "./workflowTemplates";

type TemplateCategory = WorkflowTemplate["category"];

interface WorkflowAutomationPanelProps {
  /** Filter templates by category */
  categories: TemplateCategory[];
  /** Panel title override */
  title?: string;
  /** Panel description override */
  description?: string;
  /** Max templates to show (default 6) */
  maxItems?: number;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  safety: "text-red-500 bg-red-500/10",
  maintenance: "text-blue-500 bg-blue-500/10",
  fuel: "text-amber-500 bg-amber-500/10",
  compliance: "text-purple-500 bg-purple-500/10",
  operations: "text-emerald-500 bg-emerald-500/10",
  alerts: "text-orange-500 bg-orange-500/10",
  cold_chain: "text-cyan-500 bg-cyan-500/10",
  sensors: "text-teal-500 bg-teal-500/10",
  ev_charging: "text-green-500 bg-green-500/10",
};

export const WorkflowAutomationPanel = ({
  categories,
  title = "Workflow Automations",
  description = "Pre-built automation workflows ready to deploy",
  maxItems = 6,
  compact = false,
  className,
}: WorkflowAutomationPanelProps) => {
  const navigate = useNavigate();

  const filtered = TEMPLATES.filter((t) => categories.includes(t.category)).slice(0, maxItems);

  if (filtered.length === 0) return null;

  const handleUseTemplate = (templateId: string) => {
    navigate(`/workflow-builder?template=${templateId}`);
  };

  if (compact) {
    return (
      <Card className={cn("border-dashed border-primary/20", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => navigate("/workflow-builder")}
            >
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {filtered.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 hover:border-primary/50 hover:bg-primary/5"
                onClick={() => handleUseTemplate(template.id)}
              >
                <span>{template.icon}</span>
                {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Workflow className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => navigate("/workflow-builder")}
          >
            <Sparkles className="h-3.5 w-3.5" />
            All Workflows
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {filtered.map((template) => {
              const colorClass = CATEGORY_COLORS[template.category] || "text-primary bg-primary/10";
              return (
                <div
                  key={template.id}
                  className="flex-shrink-0 w-[220px] group cursor-pointer rounded-xl border border-border p-3 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                  onClick={() => handleUseTemplate(template.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-lg", colorClass)}>
                      {template.icon}
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5">
                      {template.nodes.length} nodes
                    </Badge>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground mb-1 line-clamp-1">
                    {template.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[8px] h-4 px-1.5 capitalize">
                      {template.category.replace("_", " ")}
                    </Badge>
                    <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Deploy <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
