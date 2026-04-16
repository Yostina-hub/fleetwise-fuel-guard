import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Gift, Trophy, Heart, Star, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";

interface Reward {
  id: string;
  driver_id: string;
  reward_type: string;
  title: string;
  description: string | null;
  value_amount: number | null;
  currency: string;
  status: string;
  issued_at: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
}

export const DriverRewardsRecognition = () => {
  const { organizationId } = useOrganization();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_rewards")
        .select("*")
        .eq("organization_id", organizationId)
        .order("issued_at", { ascending: false })
        .limit(100);
      setRewards((data as Reward[]) || []);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "safety_bonus": return <Trophy className="w-4 h-4 text-amber-400" />;
      case "gift_card": return <Gift className="w-4 h-4 text-primary" />;
      case "monetary": return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case "peer_nomination": return <Heart className="w-4 h-4 text-pink-400" />;
      case "milestone": return <Star className="w-4 h-4 text-amber-400" />;
      default: return <Gift className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "redeemed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "active": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "expired": return "bg-muted text-muted-foreground";
      default: return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  const totalValue = rewards.reduce((s, r) => s + (r.value_amount || 0), 0);
  const redeemedCount = rewards.filter(r => r.status === "redeemed").length;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Rewards & Recognition</h3>
        <p className="text-sm text-muted-foreground">Safety bonuses, gift cards, peer nominations, and milestone rewards</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Gift className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{rewards.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Rewards</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{fmt(totalValue)}</p>
          <p className="text-[10px] text-muted-foreground">Total Value</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Star className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{redeemedCount}</p>
          <p className="text-[10px] text-muted-foreground">Redeemed</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Heart className="w-5 h-5 mx-auto mb-1 text-pink-400" />
          <p className="text-2xl font-bold">{rewards.filter(r => r.reward_type === "peer_nomination").length}</p>
          <p className="text-[10px] text-muted-foreground">Nominations</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Recognition Wall</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No rewards issued yet</p>
              <p className="text-xs mt-1">Start recognizing your best drivers</p>
            </div>
          ) : (
            rewards.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                {typeIcon(r.reward_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.reward_type.replace(/_/g, " ")}</Badge>
                    {r.issued_at && <span className="text-[10px] text-muted-foreground">{format(new Date(r.issued_at), "MMM dd, yyyy")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.value_amount && r.value_amount > 0 && <span className="text-sm font-bold text-emerald-400">{fmt(r.value_amount)}</span>}
                  <Badge variant="outline" className={`text-[10px] ${statusColor(r.status)}`}>{r.status}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
