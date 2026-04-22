/**
 * PageDateRangeFilter
 * -------------------
 * Sticky-friendly date range filter bar for operational pages. Reads from /
 * writes to <PageDateRangeProvider> so all KPI cards and table tabs on the
 * page automatically refetch for the chosen range.
 */
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { usePageDateRange } from "@/contexts/PageDateRangeContext";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PageDateRangeFilterProps {
  /** Optional helper text shown next to the filter */
  hint?: string;
  className?: string;
}

const PageDateRangeFilter = ({ hint, className }: PageDateRangeFilterProps) => {
  const { range, setRange } = usePageDateRange();
  const { t } = useTranslation();

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card/50 backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="font-medium text-foreground">
          {t("common.dateRange", { defaultValue: "Date range" })}
        </span>
        {hint && <span className="hidden sm:inline">— {hint}</span>}
      </div>
      <DateRangeFilter dateRange={range} onDateRangeChange={setRange} />
    </div>
  );
};

export default PageDateRangeFilter;
