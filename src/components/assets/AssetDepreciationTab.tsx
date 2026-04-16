import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingDown, DollarSign, Calendar } from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO } from "date-fns";

interface DepreciationRow {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  purchase_cost: number;
  current_value: number;
  salvage_value: number;
  depreciation_method: string;
  depreciation_rate: number;
  useful_life_years: number;
  purchase_date: string;
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  depreciation_pct: number;
  remaining_life_months: number;
}

export default function AssetDepreciationTab() {
  const { organizationId } = useOrganization();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fleet-assets-depreciation", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_assets")
        .select("*")
        .eq("organization_id", organizationId!)
        .not("purchase_cost", "is", null)
        .order("purchase_cost", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const depreciationData: DepreciationRow[] = useMemo(() => {
    return assets.map((a: any) => {
      const cost = a.purchase_cost || 0;
      const salvage = a.salvage_value || 0;
      const life = a.useful_life_years || 5;
      const rate = a.depreciation_rate || (100 / life);
      const method = a.depreciation_method || "straight_line";
      const purchaseDate = a.purchase_date ? parseISO(a.purchase_date) : new Date();
      const ageMonths = differenceInMonths(new Date(), purchaseDate);
      const ageYears = ageMonths / 12;

      let annualDep: number;
      let accumulated: number;

      if (method === "declining_balance") {
        // Declining balance
        annualDep = cost * (rate / 100);
        let val = cost;
        for (let i = 0; i < Math.floor(ageYears); i++) {
          val = Math.max(val - val * (rate / 100), salvage);
        }
        accumulated = cost - val;
      } else {
        // Straight line
        annualDep = (cost - salvage) / life;
        accumulated = Math.min(annualDep * ageYears, cost - salvage);
      }

      const bookValue = Math.max(cost - accumulated, salvage);
      const depPct = cost > 0 ? (accumulated / (cost - salvage)) * 100 : 0;
      const remainingMonths = Math.max((life * 12) - ageMonths, 0);

      return {
        id: a.id,
        asset_code: a.asset_code,
        name: a.name,
        category: a.category,
        purchase_cost: cost,
        current_value: a.current_value || bookValue,
        salvage_value: salvage,
        depreciation_method: method,
        depreciation_rate: rate,
        useful_life_years: life,
        purchase_date: a.purchase_date,
        annual_depreciation: Math.round(annualDep * 100) / 100,
        accumulated_depreciation: Math.round(accumulated * 100) / 100,
        book_value: Math.round(bookValue * 100) / 100,
        depreciation_pct: Math.min(Math.round(depPct * 10) / 10, 100),
        remaining_life_months: Math.round(remainingMonths),
      };
    });
  }, [assets]);

  const totalOriginal = depreciationData.reduce((s, d) => s + d.purchase_cost, 0);
  const totalBook = depreciationData.reduce((s, d) => s + d.book_value, 0);
  const totalAccumulated = depreciationData.reduce((s, d) => s + d.accumulated_depreciation, 0);
  const totalAnnual = depreciationData.reduce((s, d) => s + d.annual_depreciation, 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Original Cost</p><p className="text-lg font-bold">{totalOriginal.toLocaleString()} ETB</p></div></div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" /><div><p className="text-xs text-muted-foreground">Accumulated Dep.</p><p className="text-lg font-bold text-destructive">{totalAccumulated.toLocaleString()} ETB</p></div></div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-success" /><div><p className="text-xs text-muted-foreground">Current Book Value</p><p className="text-lg font-bold text-success">{totalBook.toLocaleString()} ETB</p></div></div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-warning" /><div><p className="text-xs text-muted-foreground">Annual Dep. Cost</p><p className="text-lg font-bold text-warning">{totalAnnual.toLocaleString()} ETB</p></div></div>
        </Card>
      </div>

      <Card>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Original Cost</TableHead>
                <TableHead>Annual Dep.</TableHead>
                <TableHead>Accumulated</TableHead>
                <TableHead>Book Value</TableHead>
                <TableHead>Depreciation</TableHead>
                <TableHead>Remaining Life</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : depreciationData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assets with cost data</TableCell></TableRow>
              ) : (
                depreciationData.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.asset_code}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{d.depreciation_method?.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{d.purchase_cost.toLocaleString()} ETB</TableCell>
                    <TableCell className="text-warning">{d.annual_depreciation.toLocaleString()} ETB</TableCell>
                    <TableCell className="text-destructive">{d.accumulated_depreciation.toLocaleString()} ETB</TableCell>
                    <TableCell className="font-semibold text-success">{d.book_value.toLocaleString()} ETB</TableCell>
                    <TableCell className="w-32">
                      <Progress value={d.depreciation_pct} className="h-2 [&>div]:bg-destructive" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{d.depreciation_pct}%</p>
                    </TableCell>
                    <TableCell>
                      {d.remaining_life_months > 0 ? (
                        <span className="text-sm">{Math.floor(d.remaining_life_months / 12)}y {d.remaining_life_months % 12}m</span>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Fully Depreciated</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
