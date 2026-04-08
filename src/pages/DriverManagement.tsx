import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDrivers } from "@/hooks/useDrivers";
import { DriverLeaderboard } from "@/components/drivers/DriverLeaderboard";
import { DriverAchievementsPanel } from "@/components/drivers/DriverAchievementsPanel";
import { DriverTrainingPanel } from "@/components/drivers/DriverTrainingPanel";
import { DriverFatiguePanel } from "@/components/drivers/DriverFatiguePanel";
import { DriverInsightsPanel } from "@/components/drivers/DriverInsightsPanel";
import { DriverAvailabilityBoard } from "@/components/drivers/DriverAvailabilityBoard";
import { DriverOnboardingChecklist } from "@/components/drivers/DriverOnboardingChecklist";
import { DriverDocumentVault } from "@/components/drivers/DriverDocumentVault";
import { DriverLicenseTracker } from "@/components/drivers/DriverLicenseTracker";
import { DriverHierarchyView } from "@/components/drivers/DriverHierarchyView";
import { DriverVehicleHistory } from "@/components/drivers/DriverVehicleHistory";
import { DriverIncidentReporting } from "@/components/drivers/DriverIncidentReporting";
import { DriverDVIRPanel } from "@/components/drivers/DriverDVIRPanel";
import { DriverCommunicationHub } from "@/components/drivers/DriverCommunicationHub";
// P2 components
import { DriverMVRPanel } from "@/components/drivers/DriverMVRPanel";
import { DriverCostAllocation } from "@/components/drivers/DriverCostAllocation";
import { DriverPerformanceReviews } from "@/components/drivers/DriverPerformanceReviews";
import { DriverFuelCards } from "@/components/drivers/DriverFuelCards";
import { DriverComplianceCalendar } from "@/components/drivers/DriverComplianceCalendar";
import { DriverAnalyticsDashboard } from "@/components/drivers/DriverAnalyticsDashboard";
import { DriverAutoCoaching } from "@/components/drivers/DriverAutoCoaching";
// P3 components
import { DriverRewardsRecognition } from "@/components/drivers/DriverRewardsRecognition";
import { DriverContractManagement } from "@/components/drivers/DriverContractManagement";
import { DriverPredictiveRiskScoring } from "@/components/drivers/DriverPredictiveRiskScoring";
import {
  Trophy,
  Award,
  BookOpen,
  Brain,
  Clock,
  Users,
  UserCircle,
  Radio,
  ClipboardCheck,
  FolderOpen,
  CreditCard,
  FolderTree,
  Car,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  FileSearch,
  DollarSign,
  Star,
  Calendar,
  BarChart3,
  Zap,
  Gift,
  Briefcase,
  ShieldAlert,
} from "lucide-react";

const DriverManagement = () => {
  const { drivers, loading } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("availability");

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const driverName = selectedDriver
    ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
    : "";

  // Tabs that require a driver to be selected
  const driverRequiredTabs = ["achievements", "training", "fatigue", "insights", "onboarding", "documents", "vehicle-history", "cost-allocation", "reviews", "contracts"];
  const needsDriver = driverRequiredTabs.includes(activeTab);

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Driver Management Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Lifecycle, compliance, availability, gamification & AI insights
            </p>
          </div>

          {/* Driver Selector */}
          <div className="flex items-center gap-3">
            <UserCircle className="w-5 h-5 text-muted-foreground" />
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a driver..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={d.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {d.first_name[0]}
                          {d.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {d.first_name} {d.last_name}
                      </span>
                      <Badge
                        variant={d.status === "active" ? "default" : "secondary"}
                        className="text-[10px] ml-auto"
                      >
                        {d.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <TabsList className="inline-flex w-max gap-1 h-auto flex-wrap sm:flex-nowrap p-1">
              {/* Fleet-wide tabs */}
              <TabsTrigger value="availability" className="gap-1.5 text-xs px-3 py-1.5">
                <Radio className="w-3.5 h-3.5" /> Availability
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5 text-xs px-3 py-1.5">
                <Trophy className="w-3.5 h-3.5" /> Leaderboard
              </TabsTrigger>
              <TabsTrigger value="licenses" className="gap-1.5 text-xs px-3 py-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Licenses
              </TabsTrigger>
              <TabsTrigger value="hierarchy" className="gap-1.5 text-xs px-3 py-1.5">
                <FolderTree className="w-3.5 h-3.5" /> Groups
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-1.5 text-xs px-3 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Incidents
              </TabsTrigger>
              <TabsTrigger value="dvir" className="gap-1.5 text-xs px-3 py-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> DVIR
              </TabsTrigger>
              <TabsTrigger value="communications" className="gap-1.5 text-xs px-3 py-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Messages
              </TabsTrigger>
              {/* P2 Fleet-wide tabs */}
              <TabsTrigger value="mvr" className="gap-1.5 text-xs px-3 py-1.5">
                <FileSearch className="w-3.5 h-3.5" /> MVR
              </TabsTrigger>
              <TabsTrigger value="fuel-cards" className="gap-1.5 text-xs px-3 py-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Fuel Cards
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5 text-xs px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5" /> Compliance
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs px-3 py-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="auto-coaching" className="gap-1.5 text-xs px-3 py-1.5">
                <Zap className="w-3.5 h-3.5" /> Coaching
              </TabsTrigger>
              {/* P3 Fleet-wide tabs */}
              <TabsTrigger value="rewards" className="gap-1.5 text-xs px-3 py-1.5">
                <Gift className="w-3.5 h-3.5" /> Rewards
              </TabsTrigger>
              <TabsTrigger value="risk-scoring" className="gap-1.5 text-xs px-3 py-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Risk
              </TabsTrigger>
              {/* Driver-specific tabs */}
              <TabsTrigger value="onboarding" className="gap-1.5 text-xs px-3 py-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" /> Onboarding
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5 text-xs px-3 py-1.5">
                <FolderOpen className="w-3.5 h-3.5" /> Documents
              </TabsTrigger>
              <TabsTrigger value="vehicle-history" className="gap-1.5 text-xs px-3 py-1.5">
                <Car className="w-3.5 h-3.5" /> Vehicles
              </TabsTrigger>
              <TabsTrigger value="cost-allocation" className="gap-1.5 text-xs px-3 py-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Costs
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-xs px-3 py-1.5">
                <Star className="w-3.5 h-3.5" /> Reviews
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5 text-xs px-3 py-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Contracts
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1.5 text-xs px-3 py-1.5">
                <Award className="w-3.5 h-3.5" /> Achievements
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-1.5 text-xs px-3 py-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Training
              </TabsTrigger>
              <TabsTrigger value="fatigue" className="gap-1.5 text-xs px-3 py-1.5">
                <Clock className="w-3.5 h-3.5" /> Fatigue
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5 text-xs px-3 py-1.5">
                <Brain className="w-3.5 h-3.5" /> AI Insights
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Fleet-wide tabs */}
          <TabsContent value="availability"><DriverAvailabilityBoard /></TabsContent>
          <TabsContent value="leaderboard"><DriverLeaderboard /></TabsContent>
          <TabsContent value="licenses"><DriverLicenseTracker /></TabsContent>
          <TabsContent value="hierarchy"><DriverHierarchyView /></TabsContent>
          <TabsContent value="incidents"><DriverIncidentReporting /></TabsContent>
          <TabsContent value="dvir"><DriverDVIRPanel /></TabsContent>
          <TabsContent value="communications"><DriverCommunicationHub /></TabsContent>
          {/* P2 Fleet-wide tabs */}
          <TabsContent value="mvr"><DriverMVRPanel /></TabsContent>
          <TabsContent value="fuel-cards"><DriverFuelCards /></TabsContent>
          <TabsContent value="compliance"><DriverComplianceCalendar /></TabsContent>
          <TabsContent value="analytics"><DriverAnalyticsDashboard /></TabsContent>
          <TabsContent value="auto-coaching"><DriverAutoCoaching /></TabsContent>

          {/* Driver-specific tabs */}
          {needsDriver && !selectedDriverId ? (
            <div className="mt-6">
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-semibold mb-2">Select a Driver</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Use the driver selector above to view driver-specific data for this tab.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <TabsContent value="onboarding">
                <DriverOnboardingChecklist driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="documents">
                <DriverDocumentVault driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="vehicle-history">
                <DriverVehicleHistory driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="cost-allocation">
                <DriverCostAllocation driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="reviews">
                <DriverPerformanceReviews driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="achievements">
                <DriverAchievementsPanel driverId={selectedDriverId} driverName={driverName} />
              </TabsContent>
              <TabsContent value="training">
                <DriverTrainingPanel driverId={selectedDriverId} />
              </TabsContent>
              <TabsContent value="fatigue">
                <DriverFatiguePanel driverId={selectedDriverId} />
              </TabsContent>
              <TabsContent value="insights">
                <DriverInsightsPanel driverId={selectedDriverId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default DriverManagement;
