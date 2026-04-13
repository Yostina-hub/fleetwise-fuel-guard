import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, startOfMonth, endOfMonth, differenceInDays, startOfDay } from "date-fns";

interface FuelBudgetTrackerProps {
  transactions: Array<{
    transaction_date: string;
    fuel_cost?: number | null;
    fuel_amount_liters: number;
  }>;
  monthlyBudget?: number;
}

const FuelBudgetTracker = ({ transactions, monthlyBudget }: FuelBudgetTrackerProps) => {
  const { formatCurrency, formatFuel } = useOrganizationSettings();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const today = startOfDay(now);
    
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const daysPassed = differenceInDays(today, monthStart) + 1;
    const daysRemaining = daysInMonth - daysPassed;
    const progressPct = (daysPassed / daysInMonth) * 100;

    const monthTxns = transactions.filter(t => {
      const d = new Date(t.transaction_date);
      return d >= monthStart && d <= monthEnd;
    });

    const totalSpent = monthTxns.reduce((s, t) => s + (t.fuel_cost || 0), 0);
    const totalLiters = monthTxns.reduce((s, t) => s + (t.fuel_amount_liters || 0), 0);
    
    // Estimate budget as 1.3x of current spend rate projected, if not provided
    const budget = monthlyBudget || Math.max(totalSpent * (daysInMonth / Math.max(daysPassed, 1)) * 1.15, 10000);
    const spendPct = budget > 0 ? (totalSpent / budget) * 100 : 0;
    
    const dailyRate = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const projectedTotal = dailyRate * daysInMonth;
    const projectedOverBudget = projectedTotal > budget;

    // Weekly breakdown
    const weeklyData = [
      { label: "Week 1", spent: 0 },
      { label: "Week 2", spent: 0 },
      { label: "Week 3", spent: 0 },
      { label: "Week 4+", spent: 0 },
    ];
    monthTxns.forEach(t => {
      const day = new Date(t.transaction_date).getDate();
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
      weeklyData[weekIndex].spent += t.fuel_cost || 0;
    });

    return {
      totalSpent,
      totalLiters,
      budget,
      spendPct: Math.min(spendPct, 100),
      remaining: Math.max(budget - totalSpent, 0),
      dailyRate,
      projectedTotal,
      projectedOverBudget,
      daysRemaining,
      progressPct,
      weeklyData,
      monthName: format(now, "MMMM yyyy"),
    };
  }, [transactions, monthlyBudget]);

  const statusColor = stats.spendPct > 90 ? "text-destructive" : stats.spendPct > 70 ? "text-warning" : "text-success";
  const StatusIcon = stats.spendPct > 90 ? AlertTriangle : stats.spendPct > 70 ? TrendingUp : CheckCircle;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-primary" />
            Monthly Budget
          </CardTitle>
          <Badge variant="outline" className="text-xs">{stats.monthName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Spent: <span className="font-semibold text-foreground">{formatCurrency(stats.totalSpent)}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              Budget: {formatCurrency(stats.budget)}
            </span>
          </div>
          <Progress value={stats.spendPct} className="h-3" />
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs font-medium flex items-center gap-1 ${statusColor}`}>
              <StatusIcon className="w-3 h-3" />
              {stats.spendPct.toFixed(0)}% used
            </span>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(stats.remaining)} remaining
            </span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatFuel(stats.totalLiters)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total Fuel</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatCurrency(stats.dailyRate)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Daily Rate</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{stats.daysRemaining}d</p>
            <p className="text-[10px] text-muted-foreground uppercase">Days Left</p>
          </div>
        </div>

        {/* Projected spending */}
        <div className={`p-3 rounded-lg border ${stats.projectedOverBudget ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Projected Total</span>
            <span className={`text-sm font-bold ${stats.projectedOverBudget ? 'text-destructive' : 'text-success'}`}>
              {formatCurrency(stats.projectedTotal)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.projectedOverBudget 
              ? `⚠️ Projected ${formatCurrency(stats.projectedTotal - stats.budget)} over budget`
              : `✓ On track, ${formatCurrency(stats.budget - stats.projectedTotal)} under budget`
            }
          </p>
        </div>

        {/* Weekly breakdown mini bars */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Weekly Breakdown</p>
          <div className="space-y-1.5">
            {stats.weeklyData.map((week, i) => {
              const maxWeekly = Math.max(...stats.weeklyData.map(w => w.spent), 1);
              const pct = (week.spent / maxWeekly) * 100;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{week.label}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/70 rounded-full transition-all" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">{formatCurrency(week.spent)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelBudgetTracker;
