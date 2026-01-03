import { useState } from "react";
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
import { toast } from "sonner";

const DriverScoring = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scoring");
  
  // Mock stats - in production, these would come from hooks
  const stats = {
    fleetAvgScore: 78,
    highRiskDrivers: 3,
    improvedThisMonth: 12,
    coachingPending: 5
  };

  const insights = {
    topImprover: "John Kamau",
    riskPattern: "Harsh Braking",
    avgImprovement: 8,
    coachingEffectiveness: 85
  };

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
