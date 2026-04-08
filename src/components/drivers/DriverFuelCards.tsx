import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { CreditCard, AlertTriangle, DollarSign, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface FuelCard {
  id: string;
  card_number: string;
  card_provider: string | null;
  card_type: string;
  daily_limit: number | null;
  monthly_limit: number | null;
  current_month_spent: number | null;
  status: string;
  issued_date: string;
  expiry_date: string | null;
  suspicious_activity_flag: boolean;
  suspicious_activity_notes: string | null;
  last_transaction_at: string | null;
}

export const DriverFuelCards = () => {
  const { organizationId } = useOrganization();
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_fuel_cards")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      setCards((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "suspended": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "lost": case "cancelled": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "";
    }
  };

  const activeCount = cards.filter(c => c.status === "active").length;
  const flaggedCount = cards.filter(c => c.suspicious_activity_flag).length;
  const totalSpent = cards.reduce((s, c) => s + (c.current_month_spent || 0), 0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Fuel Card Management</h3>
        <p className="text-sm text-muted-foreground">Track fuel card assignments, spending limits, and suspicious activity</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <CreditCard className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{cards.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Cards</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CreditCard className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <ShieldAlert className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-2xl font-bold">{flaggedCount}</p>
          <p className="text-[10px] text-muted-foreground">Flagged</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{fmt(totalSpent)}</p>
          <p className="text-[10px] text-muted-foreground">This Month</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">All Fuel Cards</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No fuel cards assigned</p>
            </div>
          ) : (
            cards.map(card => {
              const utilization = card.monthly_limit && card.current_month_spent ? (card.current_month_spent / card.monthly_limit) * 100 : 0;
              return (
                <div key={card.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <CreditCard className={`w-5 h-5 shrink-0 ${card.suspicious_activity_flag ? "text-red-400" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">•••• {card.card_number.slice(-4)}</p>
                      {card.card_provider && <span className="text-[10px] text-muted-foreground">{card.card_provider}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{card.card_type.replace(/_/g, " ")}</span>
                      {card.monthly_limit && (
                        <span className="text-[10px] text-muted-foreground">
                          {fmt(card.current_month_spent || 0)} / {fmt(card.monthly_limit)} ({utilization.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    {card.monthly_limit && (
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${utilization > 90 ? "bg-red-400" : utilization > 70 ? "bg-amber-400" : "bg-primary"}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {card.suspicious_activity_flag && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="w-3 h-3" />Flagged</Badge>}
                    <Badge variant="outline" className={`text-[10px] ${statusColor(card.status)}`}>{card.status}</Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
