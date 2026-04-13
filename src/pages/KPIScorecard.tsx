import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const KPIScorecard = () => {
  const { organizationId } = useOrganization();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ["kpi-scorecards", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("kpi_scorecards")
        .select("*")
        .eq("organization_id", organizationId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const onTarget = kpis.filter((k: any) => k.actual_value >= k.target_value);
  const categories = [...new Set(kpis.map((k: any) => k.category))];

  const trendIcon = (t: string) => {
    switch (t) { case "up": return <TrendingUp className="h-4 w-4 text-green-500" />; case "down": return <TrendingDown className="h-4 w-4 text-destructive" />; default: return <Minus className="h-4 w-4 text-muted-foreground" />; }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">KPI Scorecards</h1><p className="text-muted-foreground">Track key performance indicators and organizational targets</p></div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add KPI</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{kpis.length}</p><p className="text-sm text-muted-foreground">Total KPIs</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{onTarget.length}</p><p className="text-sm text-muted-foreground">On Target</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{kpis.length - onTarget.length}</p><p className="text-sm text-muted-foreground">Below Target</p></div></div></CardContent></Card>
        </div>

        {categories.map(cat => (
          <Card key={cat}><CardHeader><CardTitle className="capitalize">{cat} KPIs</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow>
                <TableHead>KPI</TableHead><TableHead>Target</TableHead><TableHead>Actual</TableHead><TableHead>Progress</TableHead><TableHead>Period</TableHead><TableHead>Trend</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {kpis.filter((k: any) => k.category === cat).map((k: any) => {
                  const pct = k.target_value > 0 ? Math.min(100, (k.actual_value / k.target_value) * 100) : 0;
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.kpi_name}</TableCell>
                      <TableCell>{k.target_value} {k.unit}</TableCell>
                      <TableCell className="font-bold">{k.actual_value} {k.unit}</TableCell>
                      <TableCell className="w-32"><Progress value={pct} className="h-2" /></TableCell>
                      <TableCell className="text-sm">{format(new Date(k.period_start), "MMM dd")} - {format(new Date(k.period_end), "MMM dd")}</TableCell>
                      <TableCell>{trendIcon(k.trend)}</TableCell>
                      <TableCell><Badge variant={pct >= 100 ? "default" : pct >= 75 ? "secondary" : "destructive"}>{pct >= 100 ? "On Target" : pct >= 75 ? "Close" : "Below"}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ))}

        {isLoading && <Card><CardContent className="py-8 text-center">Loading KPIs...</CardContent></Card>}
        {!isLoading && kpis.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No KPIs configured yet</CardContent></Card>}
      </div>
    </Layout>
  );
};

export default KPIScorecard;
