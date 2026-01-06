import { Download, FileSpreadsheet, FileText, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ReportTimePeriodSelect, TimePeriodOption } from "./ReportTimePeriodSelect";

interface DateRange {
  from: Date;
  to: Date;
}

interface ReportsDateFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  timePeriod: TimePeriodOption;
  onTimePeriodChange: (period: TimePeriodOption) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const ReportsDateFilter = ({
  searchQuery,
  onSearchChange,
  onExportCSV,
  onExportPDF,
  onRefresh,
  isLoading,
  timePeriod,
  onTimePeriodChange,
  dateRange,
  onDateRangeChange,
}: ReportsDateFilterProps) => {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
      {/* Left: Search & Time Period */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50 border-border/50"
            aria-label="Search reports"
          />
        </div>

        {/* Time Period Select */}
        <div className="w-full sm:w-auto">
          <ReportTimePeriodSelect
            value={timePeriod}
            onChange={onTimePeriodChange}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
          aria-label="Refresh data"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} aria-hidden="true" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 shadow-md shadow-primary/20">
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExportCSV} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportPDF} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4" aria-hidden="true" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
