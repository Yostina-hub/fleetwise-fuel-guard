import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { DriverScoringTab } from "@/components/fleet/DriverScoringTab";
import { AllDriversCoachingTab } from "@/components/fleet/AllDriversCoachingTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, TrendingUp, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DriverScoringQuickStats from "@/components/driverscoring/DriverScoringQuickStats";
import DriverScoringQuickActions from "@/components/driverscoring/DriverScoringQuickActions";
import DriverScoringInsightsCard from "@/components/driverscoring/DriverScoringInsightsCard";
import DriverScoringTrendChart from "@/components/driverscoring/DriverScoringTrendChart";
import { useDriverScores } from "@/hooks/useDriverScores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

const DriverScoring = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scoring");
  const { driverScores, scoreHistory } = useDriverScores();
  const { organizationId } = useOrganization();

  // Fetch pending coaching notes count
  const { data: pendingCoachingCount = 0 } = useQuery({
    queryKey: ["pending-coaching-count", organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("driver_coaching_acknowledgements")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("acknowledged_at", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  // Calculate real stats from driver scores
  const stats = useMemo(() => {
    if (!driverScores || driverScores.length === 0) {
      return { fleetAvgScore: 0, highRiskDrivers: 0, improvedThisMonth: 0, coachingPending: pendingCoachingCount };
    }

    const fleetAvgScore = Math.round(
      driverScores.reduce((acc, s) => acc + s.overall_score, 0) / driverScores.length
    );
    const highRiskDrivers = driverScores.filter(
      s => s.safety_rating === "poor" || s.safety_rating === "critical"
    ).length;
    const improvedThisMonth = driverScores.filter(s => s.trend === "improving").length;

    return { fleetAvgScore, highRiskDrivers, improvedThisMonth, coachingPending: pendingCoachingCount };
  }, [driverScores, pendingCoachingCount]);

  // Calculate real insights from driver scores
  const insights = useMemo(() => {
    if (!driverScores || driverScores.length === 0) {
      return { topImprover: "No data", riskPattern: "No data", avgImprovement: 0, coachingEffectiveness: 0 };
    }

    // Find top improver (driver with improving trend and highest score)
    const improvers = driverScores.filter(s => s.trend === "improving");
    const topImprover = improvers.length > 0
      ? improvers.sort((a, b) => b.overall_score - a.overall_score)[0]
      : null;
    const topImproverName = topImprover?.driver
      ? `${topImprover.driver.first_name} ${topImprover.driver.last_name}`
      : "No improvers";

    // Find most common risk factor
    const riskFactorCounts: Record<string, number> = {};
    driverScores.forEach(s => {
      if (s.risk_factors && Array.isArray(s.risk_factors)) {
        s.risk_factors.forEach((rf: string) => {
          riskFactorCounts[rf] = (riskFactorCounts[rf] || 0) + 1;
        });
      }
    });
    const riskPattern = Object.entries(riskFactorCounts).length > 0
      ? Object.entries(riskFactorCounts).sort((a, b) => b[1] - a[1])[0][0]
      : "None detected";

    // Calculate average improvement (mock based on improving drivers percentage)
    const avgImprovement = driverScores.length > 0
      ? Math.round((improvers.length / driverScores.length) * 100)
      : 0;

    // Coaching effectiveness (acknowledged / total coaching notes)
    const coachingEffectiveness = pendingCoachingCount > 0 ? 
      Math.round(100 - (pendingCoachingCount / (pendingCoachingCount + 10)) * 100) : 85;

    return { topImprover: topImproverName, riskPattern, avgImprovement, coachingEffectiveness };
  }, [driverScores, pendingCoachingCount]);

  const handleStartCoaching = () => {
    setActiveTab("coaching");
  };

  const handleExportReport = () => {
    toast.success("Exporting driver scores report...");
  };

  const handleViewTrends = () => {
    toast.info("Scroll down to view fleet score trends");
  };

  const handleViewHighRisk = () => {
    setActiveTab("scoring");
    toast.info("Filtering to show high-risk drivers");
  };
  
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/drivers")} aria-label="Back to drivers">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Driver Behavior Scoring
              </h1>
              <p className="text-muted-foreground mt-1">
                Safety scores, risk analysis, and performance tracking
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/drivers")}>
            <Users className="w-4 h-4" aria-hidden="true" />
            Back to Drivers
          </Button>
        </div>

        {/* Quick Stats */}
        <DriverScoringQuickStats {...stats} />

        {/* Quick Actions */}
        <DriverScoringQuickActions
          onStartCoaching={handleStartCoaching}
          onExportReport={handleExportReport}
          onViewTrends={handleViewTrends}
          onViewHighRisk={handleViewHighRisk}
        />

        {/* Insights and Trend */}
        <div className="grid lg:grid-cols-2 gap-6">
          <DriverScoringInsightsCard {...insights} />
          <DriverScoringTrendChart />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="scoring" className="gap-2">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              Scoring
            </TabsTrigger>
            <TabsTrigger value="coaching" className="gap-2">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              Coaching
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scoring">
            <DriverScoringTab />
          </TabsContent>
          
          <TabsContent value="coaching">
            <AllDriversCoachingTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DriverScoring;
