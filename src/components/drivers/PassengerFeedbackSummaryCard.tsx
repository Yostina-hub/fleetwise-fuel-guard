import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, ArrowRight } from "lucide-react";
import { useDriverPassengerFeedback } from "@/hooks/useDriverPassengerFeedback";

interface Props {
  driverId: string;
  onViewDetails?: () => void;
}

export const PassengerFeedbackSummaryCard = ({ driverId, onViewDetails }: Props) => {
  const { data } = useDriverPassengerFeedback(driverId);

  if (!data || data.totalRated === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium">No passenger ratings yet</p>
            <p className="text-[10px] text-muted-foreground">
              Rated trips from requesters will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avg = data.avgOverall ?? 0;
  const tone =
    avg >= 4.5
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : avg >= 3.5
      ? "text-primary bg-primary/10 border-primary/30"
      : "text-red-400 bg-red-500/10 border-red-500/30";

  return (
    <Card
      className="border-border/60 hover:border-primary/40 transition-colors cursor-pointer group"
      onClick={onViewDetails}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>
            <Star className="w-4 h-4 fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums">{avg.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">/ 5</span>
              <Badge variant="outline" className="text-[9px] py-0">
                {data.totalRated} ratings
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
              <span>Drv {data.avgDriver?.toFixed(1) ?? "—"}</span>
              <span>Veh {data.avgVehicle?.toFixed(1) ?? "—"}</span>
              <span>Punct {data.avgPunctuality?.toFixed(1) ?? "—"}</span>
              <span className="ml-auto">{data.responseRate}% response</span>
            </div>
          </div>
          {onViewDetails && (
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
