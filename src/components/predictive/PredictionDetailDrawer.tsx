import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Wrench, AlertTriangle, Clock, Banknote, Package } from "lucide-react";
import { PredictiveScore } from "@/hooks/usePredictiveMaintenance";

export function PredictionDetailDrawer({
  prediction,
  onOpenChange,
}: {
  prediction: PredictiveScore | null;
  onOpenChange: (v: boolean) => void;
}) {
  if (!prediction) return null;
  const componentEntries = Object.entries(prediction.component_health ?? {});

  return (
    <Sheet open={!!prediction} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> AI Prediction Detail
          </SheetTitle>
          <SheetDescription>
            {prediction.vehicles?.plate_number} · {prediction.vehicles?.make} {prediction.vehicles?.model}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Health Score</p>
                <p className="text-3xl font-bold">{prediction.health_score}%</p>
                <Progress value={prediction.health_score} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">AI Confidence</p>
                <p className="text-3xl font-bold">{prediction.ai_confidence ?? "—"}%</p>
                <Badge variant="outline" className="mt-2 text-[10px]">{prediction.ai_model || "heuristic"}</Badge>
              </CardContent>
            </Card>
          </div>

          {prediction.ai_reasoning && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> AI Reasoning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{prediction.ai_reasoning}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Predicted failure</p>
                <p className="font-semibold mt-1">{prediction.predicted_failure_component ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  ~{prediction.predicted_failure_window_days ?? "—"} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3" /> Cost impact</p>
                <p className="font-semibold mt-1">
                  {prediction.estimated_cost_impact_etb
                    ? `${Number(prediction.estimated_cost_impact_etb).toLocaleString()} ETB`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Downtime: {prediction.estimated_downtime_days ?? "—"} day(s)
                </p>
              </CardContent>
            </Card>
          </div>

          {componentEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Component Health Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {componentEntries.map(([name, score]) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize">{name}</span>
                      <span className="font-mono">{score}%</span>
                    </div>
                    <Progress value={Number(score)} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4" /> Recommended Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{prediction.recommended_action ?? "No action recommended"}</p>
              <Badge variant="outline">Priority: {prediction.recommended_priority ?? "medium"}</Badge>
              {prediction.recommended_parts && prediction.recommended_parts.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Recommended parts</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction.recommended_parts.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contributing Factors</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>Mileage: <span className="font-mono">{prediction.contributing_factors?.mileage_km?.toLocaleString() ?? "—"} km</span></p>
              <p>Vehicle age: <span className="font-mono">{prediction.contributing_factors?.vehicle_age_years ?? "—"} years</span></p>
              <p>Overdue schedules: <span className="font-mono">{prediction.contributing_factors?.overdue_schedules ?? 0}</span></p>
              <p>High-severity alerts (30d): <span className="font-mono">{prediction.contributing_factors?.recent_high_alerts_30d ?? 0}</span></p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
