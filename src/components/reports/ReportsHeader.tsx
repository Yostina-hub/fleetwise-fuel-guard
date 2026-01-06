import { FileText, BarChart3, TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportsHeaderProps {
  totalReports: number;
  dateRange: string;
}

export const ReportsHeader = ({ totalReports, dateRange }: ReportsHeaderProps) => {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border/50 p-6 md:p-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Reports & Analytics
              </h1>
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary hidden sm:flex items-center gap-1">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI-Powered
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Comprehensive fleet analytics, operational insights, and performance metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              <span>Period: {dateRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold text-foreground">{totalReports}</span>
                  <span className="text-xs text-muted-foreground">Reports Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
