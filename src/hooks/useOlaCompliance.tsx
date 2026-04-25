import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type OlaGroupBy = "operation_type" | "pool_name" | "division";

export interface OlaComplianceRow {
  bucket: string;
  total: number;
  on_time: number;
  breached: number;
  compliance_pct: number | null;
  avg_assignment_minutes: number | null;
}

export function useOlaCompliance(start: Date, end: Date, groupBy: OlaGroupBy = "operation_type") {
  const { organizationId } = useOrganization();
  const [rows, setRows] = useState<OlaComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) {
      setRows([]); setLoading(false); return;
    }
    setLoading(true);
    supabase
      .rpc("compute_ola_compliance", {
        p_org_id: organizationId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_group_by: groupBy,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else { setRows((data as OlaComplianceRow[]) ?? []); setError(null); }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [organizationId, start.getTime(), end.getTime(), groupBy]);

  return { rows, loading, error };
}
