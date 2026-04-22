/**
 * FuelAlertsSummaryCard
 * ---------------------
 * Live summary of fuel-related alerts (theft, leak, drain, idling) for the
 * date range selected in PageDateRangeProvider. Auto-refreshes every 30s.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Droplets, Flame, Clock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { usePageDateRange } from "@/contexts/PageDateRangeContext";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertCounts {
  theft: number;
  leak: number;
  drain: number;
  idling: number;
  total: number;
}

const FuelAlertsSummaryCard = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { startISO, endISO, range } = usePageDateRange();

  const { data, isLoading } = useQuery<AlertCounts>({
    queryKey: ["fuel-alerts-summary", organizationId, startISO, endISO],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const counts: AlertCounts = { theft: 0, leak: 0, drain: 0, idling: 0, total: 0 };

      // Fuel events: theft, leak, drain
      const { data: events, error: evErr } = await supabase
        .from("fuel_events")
        .select("event_type, status")
        .eq("organization_id", organizationId!)
        .gte("event_time", startISO)
        .lte("event_time", endISO)
        .in("event_type", ["theft", "leak", "drain"])
        .neq("status", "false_positive");
      if (evErr) throw evErr;

      (events || []).forEach((e: any) => {
        if (e.event_type === "theft") counts.theft++;
        else if (e.event_type === "leak") counts.leak++;
        else if (e.event_type === "drain") counts.drain++;
      });

      // Idling alerts (alert_type contains 'idle')
      const { data: alerts, error: alErr } = await supabase
        .from("alerts")
        .select("alert_type")
        .eq("organization_id", organizationId!)
        .gte("alert_time", startISO)
        .lte("alert_time", endISO)
        .ilike("alert_type", "%idle%");
      if (alErr) throw alErr;
      counts.idling = (alerts || []).length;

      counts.total = counts.theft + counts.leak + counts.drain + counts.idling;
      return counts;
    },
  });

  const items = [
    { key: "theft", label: t("fuel.theft", "Theft"), value: data?.theft ?? 0, icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    { key: "leak", label: t("fuel.leak", "Leak"), value: data?.leak ?? 0, icon: Droplets, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { key: "drain", label: t("fuel.drain", "Drain"), value: data?.drain ?? 0, icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
    { key: "idling", label: t("fuel.idling", "Idling"), value: data?.idling ?? 0, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  ];

  const rangeLabel = `${range.start.toLocaleDateString()} – ${range.end.toLocaleDateString()}`;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t("fuel.alertsSummary", "Fuel Alerts")}
            {!isLoading && data && data.total > 0 && (
              <Badge variant="destructive" className="ml-1">{data.total}</Badge>
            )}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{rangeLabel}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((i) => <Skeleton key={i.key} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((it) => (
              <div
                key={it.key}
                className={`flex items-center gap-3 p-3 rounded-lg border border-border/40 ${it.bg} transition-colors hover:border-border`}
              >
                <div className={`p-2 rounded-md bg-background/50 ${it.color}`}>
                  <it.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{it.label}</p>
                  <p className="text-2xl font-bold leading-tight">{it.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && data?.total === 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {t("fuel.noAlertsInRange", "No fuel alerts in selected range — fleet is healthy.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FuelAlertsSummaryCard;
