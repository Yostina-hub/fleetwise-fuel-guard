/**
 * PageDateRangeContext
 * --------------------
 * Page-scoped date range used to drive both summary KPI cards and table data
 * on operational pages (Fuel, Work Orders, Incidents, Driver Scoring, etc.).
 *
 * Wrap a page in <PageDateRangeProvider>, place <PageDateRangeFilter /> at the
 * top, and read the range with `usePageDateRange()` from any descendant.
 */
import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";

export interface PageDateRange {
  start: Date;
  end: Date;
}

interface Ctx {
  range: PageDateRange;
  setRange: (r: PageDateRange) => void;
  /** ISO string for `gte` filters (start of day, inclusive) */
  startISO: string;
  /** ISO string for `lte` filters (end of day, inclusive) */
  endISO: string;
}

const PageDateRangeContext = createContext<Ctx | null>(null);

const DEFAULT_RANGE: PageDateRange = {
  start: startOfDay(subDays(new Date(), 30)),
  end: endOfDay(new Date()),
};

export const PageDateRangeProvider = ({
  children,
  initialRange = DEFAULT_RANGE,
}: {
  children: ReactNode;
  initialRange?: PageDateRange;
}) => {
  const [range, setRange] = useState<PageDateRange>(initialRange);

  const value = useMemo<Ctx>(
    () => ({
      range,
      setRange,
      startISO: startOfDay(range.start).toISOString(),
      endISO: endOfDay(range.end).toISOString(),
    }),
    [range],
  );

  return <PageDateRangeContext.Provider value={value}>{children}</PageDateRangeContext.Provider>;
};

/**
 * Read the current page's date range. Returns sensible defaults (last 30 days)
 * if the component is rendered outside a provider — keeps existing pages safe.
 */
export const usePageDateRange = (): Ctx => {
  const ctx = useContext(PageDateRangeContext);
  if (ctx) return ctx;
  return {
    range: DEFAULT_RANGE,
    setRange: () => {},
    startISO: startOfDay(DEFAULT_RANGE.start).toISOString(),
    endISO: endOfDay(DEFAULT_RANGE.end).toISOString(),
  };
};
