import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDrivers } from "@/hooks/useDrivers";

// Overview
import { DriverHubOverview } from "@/components/drivers/DriverHubOverview";

// Operations
import { DriverAvailabilityBoard } from "@/components/drivers/DriverAvailabilityBoard";
import { DriverLeaderboard } from "@/components/drivers/DriverLeaderboard";
import { DriverCommunicationHub } from "@/components/drivers/DriverCommunicationHub";
import { DriverDVIRPanel } from "@/components/drivers/DriverDVIRPanel";
import { DriverHierarchyView } from "@/components/drivers/DriverHierarchyView";

// Compliance
import { DriverLicenseTracker } from "@/components/drivers/DriverLicenseTracker";
import { DriverOnboardingChecklist } from "@/components/drivers/DriverOnboardingChecklist";
import { DriverDocumentVault } from "@/components/drivers/DriverDocumentVault";
import { DriverMVRPanel } from "@/components/drivers/DriverMVRPanel";
import { DriverComplianceCalendar } from "@/components/drivers/DriverComplianceCalendar";
import { DriverFuelCards } from "@/components/drivers/DriverFuelCards";

// Safety & Risk
import { DriverIncidentReporting } from "@/components/drivers/DriverIncidentReporting";
import { DriverPredictiveRiskScoring } from "@/components/drivers/DriverPredictiveRiskScoring";
import { DriverFatiguePanel } from "@/components/drivers/DriverFatiguePanel";
import { DriverAutoCoaching } from "@/components/drivers/DriverAutoCoaching";

// Performance
import { DriverAnalyticsDashboard } from "@/components/drivers/DriverAnalyticsDashboard";
import { DriverPerformanceReviews } from "@/components/drivers/DriverPerformanceReviews";
import { DriverAchievementsPanel } from "@/components/drivers/DriverAchievementsPanel";
import { DriverTrainingPanel } from "@/components/drivers/DriverTrainingPanel";
import { DriverInsightsPanel } from "@/components/drivers/DriverInsightsPanel";

// HR & Finance
import { DriverContractManagement } from "@/components/drivers/DriverContractManagement";
import { DriverCostAllocation } from "@/components/drivers/DriverCostAllocation";
import { DriverRewardsRecognition } from "@/components/drivers/DriverRewardsRecognition";
import { DriverVehicleHistory } from "@/components/drivers/DriverVehicleHistory";

import {
  LayoutDashboard, Radio, Trophy, MessageSquare, ClipboardList, FolderTree,
  CreditCard, ClipboardCheck, FolderOpen, FileSearch, Calendar, Fuel,
  AlertTriangle, ShieldAlert, Clock, Zap,
  BarChart3, Star, Award, BookOpen, Brain,
  Briefcase, DollarSign, Gift, Car,
  Users, UserCircle, ChevronRight,
} from "lucide-react";

// Category definitions
const categories = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Fleet-wide KPIs and quick actions",
    tabs: [],
  },
  {
    key: "operations",
    label: "Operations",
    icon: Radio,
    description: "Daily fleet operations",
    tabs: [
      { key: "availability", label: "Availability", icon: Radio },
      { key: "leaderboard", label: "Leaderboard", icon: Trophy },
      { key: "communications", label: "Messages", icon: MessageSquare },
      { key: "dvir", label: "DVIR", icon: ClipboardList },
      { key: "hierarchy", label: "Groups", icon: FolderTree },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    icon: ClipboardCheck,
    description: "Licenses, documents & audits",
    tabs: [
      { key: "licenses", label: "Licenses", icon: CreditCard },
      { key: "compliance", label: "Calendar", icon: Calendar },
      { key: "onboarding", label: "Onboarding", icon: ClipboardCheck, needsDriver: true },
      { key: "documents", label: "Documents", icon: FolderOpen, needsDriver: true },
      { key: "mvr", label: "MVR Records", icon: FileSearch },
      { key: "fuel-cards", label: "Fuel Cards", icon: Fuel },
    ],
  },
  {
    key: "safety",
    label: "Safety & Risk",
    icon: ShieldAlert,
    description: "Incidents, risk scoring & coaching",
    tabs: [
      { key: "risk-scoring", label: "Risk Scoring", icon: ShieldAlert },
      { key: "incidents", label: "Incidents", icon: AlertTriangle },
      { key: "fatigue", label: "Fatigue", icon: Clock, needsDriver: true },
      { key: "auto-coaching", label: "Auto-Coaching", icon: Zap },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    icon: BarChart3,
    description: "Analytics, reviews & training",
    tabs: [
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "reviews", label: "Reviews", icon: Star, needsDriver: true },
      { key: "achievements", label: "Achievements", icon: Award, needsDriver: true },
      { key: "training", label: "Training", icon: BookOpen, needsDriver: true },
      { key: "insights", label: "AI Insights", icon: Brain, needsDriver: true },
    ],
  },
  {
    key: "hr-finance",
    label: "HR & Finance",
    icon: Briefcase,
    description: "Contracts, costs & rewards",
    tabs: [
      { key: "contracts", label: "Contracts", icon: Briefcase, needsDriver: true },
      { key: "cost-allocation", label: "Cost Allocation", icon: DollarSign, needsDriver: true },
      { key: "vehicle-history", label: "Vehicle History", icon: Car, needsDriver: true },
      { key: "rewards", label: "Rewards", icon: Gift },
    ],
  },
];

const DriverManagement = () => {
  const { drivers, loading } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState("");

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const driverName = selectedDriver
    ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
    : "";

  const currentCategory = categories.find(c => c.key === activeCategory);
  const currentTab = currentCategory?.tabs.find(t => t.key === activeSubTab);
  const needsDriver = currentTab?.needsDriver || false;

  const handleNavigate = (category: string, tab?: string) => {
    setActiveCategory(category);
    const cat = categories.find(c => c.key === category);
    if (tab) {
      setActiveSubTab(tab);
    } else if (cat && cat.tabs.length > 0) {
      setActiveSubTab(cat.tabs[0].key);
    }
  };

  const renderContent = () => {
    if (activeCategory === "overview") {
      return <DriverHubOverview onNavigate={handleNavigate} />;
    }

    if (needsDriver && !selectedDriverId) {
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Select a Driver</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Use the driver selector above to view driver-specific data for this module.
            </p>
          </CardContent>
        </Card>
      );
    }

    const contentMap: Record<string, JSX.Element> = {
      // Operations
      availability: <DriverAvailabilityBoard />,
      leaderboard: <DriverLeaderboard />,
      communications: <DriverCommunicationHub />,
      dvir: <DriverDVIRPanel />,
      hierarchy: <DriverHierarchyView />,
      // Compliance
      licenses: <DriverLicenseTracker />,
      compliance: <DriverComplianceCalendar />,
      onboarding: <DriverOnboardingChecklist driverId={selectedDriverId} driverName={driverName} />,
      documents: <DriverDocumentVault driverId={selectedDriverId} driverName={driverName} />,
      mvr: <DriverMVRPanel />,
      "fuel-cards": <DriverFuelCards />,
      // Safety
      "risk-scoring": <DriverPredictiveRiskScoring />,
      incidents: <DriverIncidentReporting />,
      fatigue: <DriverFatiguePanel driverId={selectedDriverId} />,
      "auto-coaching": <DriverAutoCoaching />,
      // Performance
      analytics: <DriverAnalyticsDashboard />,
      reviews: <DriverPerformanceReviews driverId={selectedDriverId} driverName={driverName} />,
      achievements: <DriverAchievementsPanel driverId={selectedDriverId} driverName={driverName} />,
      training: <DriverTrainingPanel driverId={selectedDriverId} />,
      insights: <DriverInsightsPanel driverId={selectedDriverId} />,
      // HR & Finance
      contracts: <DriverContractManagement driverId={selectedDriverId} driverName={driverName} />,
      "cost-allocation": <DriverCostAllocation driverId={selectedDriverId} driverName={driverName} />,
      "vehicle-history": <DriverVehicleHistory driverId={selectedDriverId} driverName={driverName} />,
      rewards: <DriverRewardsRecognition />,
    };

    return contentMap[activeSubTab] || null;
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Driver Management Hub
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enterprise driver lifecycle, compliance & performance
            </p>
          </div>

          {/* Driver Selector — only show when not on overview */}
          {activeCategory !== "overview" && (
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
                            {d.first_name[0]}{d.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{d.first_name} {d.last_name}</span>
                        <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px] ml-auto">
                          {d.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Category Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleNavigate(cat.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                "border hover:shadow-sm",
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
              )}
            >
              <cat.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-tabs for current category */}
        {currentCategory && currentCategory.tabs.length > 0 && (
          <div className="flex items-center gap-1 border-b pb-2 overflow-x-auto">
            {currentCategory.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeSubTab === tab.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.needsDriver && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" title="Requires driver selection" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
};

export default DriverManagement;
