import { Calendar, Download, FileSpreadsheet, FileText, RefreshCw, Search } from "lucide-react";
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

interface ReportsDateFilterProps {
  startDate: string;
  endDate: string;
  searchQuery: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearchChange: (query: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const ReportsDateFilter = ({
  startDate,
  endDate,
  searchQuery,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
  onExportCSV,
  onExportPDF,
  onRefresh,
  isLoading,
}: ReportsDateFilterProps) => {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
      {/* Left: Search & Date Range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
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

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-lg border border-border/50">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent text-sm outline-none w-32"
              aria-label="Start date"
            />
          </div>
          <span className="text-muted-foreground text-sm">to</span>
          <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-lg border border-border/50">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent text-sm outline-none w-32"
              aria-label="End date"
            />
          </div>
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
