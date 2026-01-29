import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Mail, 
  Calendar,
  RefreshCw,
  Printer,
  Share2
} from "lucide-react";

interface ReportsQuickActionsProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const ReportsQuickActions = ({ 
  onExportCSV, 
  onExportPDF, 
  onRefresh,
  isLoading 
}: ReportsQuickActionsProps) => {
  const actions = [
    {
      label: "Export CSV",
      icon: FileSpreadsheet,
      onClick: onExportCSV,
      variant: "outline" as const,
    },
    {
      label: "Export PDF",
      icon: FileText,
      onClick: onExportPDF,
      variant: "outline" as const,
    },
    {
      label: "Refresh Data",
      icon: RefreshCw,
      onClick: onRefresh,
      variant: "outline" as const,
      loading: isLoading,
    },
    {
      label: "Print Report",
      icon: Printer,
      onClick: () => window.print(),
      variant: "outline" as const,
    },
  ];

  return (
    <Card 
      className="border border-cyan-500/20"
      style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
          <Download className="w-4 h-4 text-[#8DC63F]" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              disabled={action.loading}
              className="justify-start gap-2 h-9 bg-white/5 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-cyan-500/50"
            >
              <action.icon className={`w-4 h-4 text-cyan-400 ${action.loading ? 'animate-spin' : ''}`} />
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
