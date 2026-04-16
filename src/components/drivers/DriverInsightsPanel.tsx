import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDriverInsights } from "@/hooks/useDriverInsights";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Target, 
  Gift, 
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Trophy,
  Loader2,
  ChevronRight,
  Wand2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { IssueRewardDialog } from "./IssueRewardDialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

interface DriverInsightsPanelProps {
  driverId: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'positive': return <Sparkles className="w-4 h-4 text-green-500" />;
    case 'info': return <Info className="w-4 h-4 text-blue-500" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default: return <Lightbulb className="w-4 h-4 text-primary" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'positive': return 'border-green-500/30 bg-green-500/5';
    case 'info': return 'border-blue-500/30 bg-blue-500/5';
    case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
    case 'critical': return 'border-red-500/30 bg-red-500/5';
    default: return 'border-primary/30 bg-primary/5';
  }
};

const getRewardTypeIcon = (type: string) => {
  switch (type) {
    case 'bonus': return '💰';
    case 'gift_card': return '🎁';
    case 'time_off': return '🏖️';
    case 'recognition': return '⭐';
    case 'certificate': return '📜';
    default: return '🎉';
  }
};

export const DriverInsightsPanel = ({ driverId }: DriverInsightsPanelProps) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const { 
    insights,
    unacknowledgedInsights,
    weeklyStats,
    goals,
    rewards,
    trends,
    isLoading,
    acknowledgeInsight,
    createGoal,
    issueReward,
  } = useDriverInsights(driverId);

  const handleGenerateInsights = async () => {
    if (!organizationId || !driverId) return;
    setGenerating(true);
    try {
      // Fetch driver data for AI analysis
      const [{ data: driver }, { data: recentTrips }, { data: scores }] = await Promise.all([
        supabase.from("drivers").select("first_name, last_name, safety_score, total_trips, total_distance_km").eq("id", driverId).single(),
        supabase.from("trips").select("distance_km, fuel_consumed, start_time, end_time, status").eq("driver_id", driverId).order("start_time", { ascending: false }).limit(20),
        (supabase as any).from("driver_behavior_scores").select("overall_score, speeding_score, braking_score, acceleration_score, cornering_score, calculated_at").eq("driver_id", driverId).order("calculated_at", { ascending: false }).limit(5),
      ]);

      const prompt = `Analyze this fleet driver's performance data and generate 2-3 actionable insights.

Driver: ${driver?.first_name} ${driver?.last_name}
Safety Score: ${driver?.safety_score || 'N/A'}
Total Trips: ${driver?.total_trips || 0}
Total Distance: ${driver?.total_distance_km || 0} km

Recent Trips (last 20): ${JSON.stringify(recentTrips?.slice(0, 5) || [])}
Behavior Scores: ${JSON.stringify(scores || [])}

Return ONLY a valid JSON array of insight objects with this structure:
[{"insight_type":"performance_trend","severity":"info","title":"...","description":"...","action_items":["action1","action2"],"confidence_score":85}]

Severity options: positive, info, warning, critical
Type options: risk_prediction, coaching_tip, performance_trend, fuel_optimization, route_suggestion`;

      const response = await supabase.functions.invoke("ai-gateway", {
        body: { prompt, model: "google/gemini-2.5-flash" },
      });

      if (response.error) throw response.error;

      let insightsData: any[];
      try {
        const text = response.data?.content || response.data?.text || response.data;
        const jsonStr = typeof text === "string" ? text.replace(/```json\n?|\n?```/g, "").trim() : JSON.stringify(text);
        insightsData = JSON.parse(jsonStr);
      } catch {
        throw new Error("Failed to parse AI response");
      }

      for (const insight of insightsData) {
        await (supabase as any).from("driver_ai_insights").insert({
          organization_id: organizationId,
          driver_id: driverId,
          insight_type: insight.insight_type || "performance_trend",
          severity: insight.severity || "info",
          title: insight.title,
          description: insight.description,
          action_items: insight.action_items || [],
          confidence_score: insight.confidence_score || null,
          is_acknowledged: false,
        });
      }

      toast({ title: `${insightsData.length} AI insights generated!` });
      // Refetch via query invalidation handled by hook
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Failed to generate insights", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = weeklyStats.slice().reverse().map(stat => ({
    week: format(new Date(stat.week_start), "MMM d"),
    safetyScore: stat.safety_score || 0,
    trips: stat.trips_completed,
    fuelEfficiency: stat.fuel_efficiency_km_per_liter || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Generate AI Insights Button */}
      <div className="flex items-center justify-between">
        <div />
        <Button size="sm" onClick={handleGenerateInsights} disabled={generating} className="gap-1.5">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Generate AI Insights
        </Button>
      </div>

      {/* AI Insights Alert */}
      {unacknowledgedInsights.length > 0 && (
        <Card className={cn(
          "glass-strong border-2",
          getSeverityColor(unacknowledgedInsights[0].severity)
        )}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getSeverityIcon(unacknowledgedInsights[0].severity)}
                  <h4 className="font-semibold">{unacknowledgedInsights[0].title}</h4>
                  <Badge variant="outline" className="capitalize">
                    {unacknowledgedInsights[0].insight_type.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {unacknowledgedInsights[0].description}
                </p>
                {unacknowledgedInsights[0].action_items.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-1">Recommended Actions:</p>
                    <ul className="space-y-1">
                      {(unacknowledgedInsights[0].action_items as string[]).map((action, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <ChevronRight className="w-3 h-3" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => acknowledgeInsight.mutate(unacknowledgedInsights[0].id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Acknowledge
                </Button>
              </div>
              {unacknowledgedInsights[0].confidence_score && (
                <div className="text-right">
                  <p className="text-sm font-bold">{unacknowledgedInsights[0].confidence_score}%</p>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
              )}
            </div>
            {unacknowledgedInsights.length > 1 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                +{unacknowledgedInsights.length - 1} more insights awaiting review
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Trends */}
      {trends && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Trips</p>
                {trends.tripsChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : trends.tripsChange < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
              <p className="text-2xl font-bold">{weeklyStats[0]?.trips_completed || 0}</p>
              <p className={cn(
                "text-xs",
                trends.tripsChange > 0 ? "text-green-500" : trends.tripsChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {trends.tripsChange > 0 ? '+' : ''}{trends.tripsChange} from last week
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Safety Score</p>
                {trends.safetyScoreChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : trends.safetyScoreChange < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
              <p className="text-2xl font-bold">{weeklyStats[0]?.safety_score?.toFixed(0) || 0}</p>
              <p className={cn(
                "text-xs",
                trends.safetyScoreChange > 0 ? "text-green-500" : trends.safetyScoreChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {trends.safetyScoreChange > 0 ? '+' : ''}{trends.safetyScoreChange?.toFixed(1)} points
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
                {trends.fuelEfficiencyChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : trends.fuelEfficiencyChange < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
              <p className="text-2xl font-bold">{weeklyStats[0]?.fuel_efficiency_km_per_liter?.toFixed(1) || 0}</p>
              <p className={cn(
                "text-xs",
                trends.fuelEfficiencyChange > 0 ? "text-green-500" : trends.fuelEfficiencyChange < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {trends.fuelEfficiencyChange > 0 ? '+' : ''}{trends.fuelEfficiencyChange?.toFixed(2)} km/L
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Harsh Events</p>
                {trends.harshEventsChange < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : trends.harshEventsChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
              <p className="text-2xl font-bold">{weeklyStats[0]?.harsh_events_count || 0}</p>
              <p className={cn(
                "text-xs",
                trends.harshEventsChange < 0 ? "text-green-500" : trends.harshEventsChange > 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {trends.harshEventsChange > 0 ? '+' : ''}{trends.harshEventsChange} events
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Chart */}
      {chartData.length > 1 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Performance Trends</CardTitle>
            <CardDescription>Weekly safety score and trip trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="week" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="safetyScore" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Safety Score"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trips" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--success))' }}
                    name="Trips"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Goals */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <CardTitle>Active Goals</CardTitle>
              </div>
              <CreateGoalDialog driverId={driverId} onSubmit={async (goal) => { await createGoal.mutateAsync(goal); }} />
            </div>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No active goals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 3).map((goal) => {
                  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                  const daysLeft = differenceInDays(new Date(goal.end_date), new Date());

                  return (
                    <div key={goal.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Ending today'}
                          </p>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-500">+{goal.xp_reward} XP</Badge>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Rewards */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <CardTitle>Rewards & Recognition</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No rewards yet</p>
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {rewards.map((reward) => (
                    <div 
                      key={reward.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <span className="text-2xl">{getRewardTypeIcon(reward.reward_type)}</span>
                      <div className="flex-1">
                        <p className="font-medium">{reward.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reward.issued_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      {reward.value_amount && (
                        <Badge className="bg-green-500/20 text-green-500">
                          {reward.currency} {reward.value_amount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Insights */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle>AI Insights History</CardTitle>
          </div>
          <CardDescription>Personalized recommendations and analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No insights generated yet</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div 
                    key={insight.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      getSeverityColor(insight.severity),
                      insight.is_acknowledged && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(insight.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{insight.title}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.insight_type.replace('_', ' ')}
                          </Badge>
                          {insight.is_acknowledged && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(insight.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
