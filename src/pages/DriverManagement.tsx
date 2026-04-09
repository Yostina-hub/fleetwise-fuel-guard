import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDrivers } from "@/hooks/useDrivers";
import { motion, AnimatePresence } from "framer-motion";

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
  Users, UserCircle,
} from "lucide-react";

// Category definitions
const categories = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Fleet-wide KPIs and quick actions",
    gradient: "from-primary to-primary/60",
    tabs: [],
  },
  {
    key: "operations",
    label: "Operations",
    icon: Radio,
    description: "Daily fleet operations",
    gradient: "from-emerald-500 to-emerald-600",
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
    gradient: "from-blue-500 to-blue-600",
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
    gradient: "from-amber-500 to-amber-600",
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
    gradient: "from-purple-500 to-purple-600",
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
    gradient: "from-pink-500 to-pink-600",
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
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-dashed border-2">
            <CardContent className="py-20 text-center">
              <div className="relative inline-block mb-5">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                  <Users className="w-10 h-10 text-primary/40" />
                </div>
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">!</span>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1">Select a Driver</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Use the driver selector above to view driver-specific data for this module.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    const contentMap: Record<string, JSX.Element> = {
      availability: <DriverAvailabilityBoard />,
      leaderboard: <DriverLeaderboard />,
      communications: <DriverCommunicationHub />,
      dvir: <DriverDVIRPanel />,
      hierarchy: <DriverHierarchyView />,
      licenses: <DriverLicenseTracker />,
      compliance: <DriverComplianceCalendar />,
      onboarding: <DriverOnboardingChecklist driverId={selectedDriverId} driverName={driverName} />,
      documents: <DriverDocumentVault driverId={selectedDriverId} driverName={driverName} />,
      mvr: <DriverMVRPanel />,
      "fuel-cards": <DriverFuelCards />,
      "risk-scoring": <DriverPredictiveRiskScoring />,
      incidents: <DriverIncidentReporting />,
      fatigue: <DriverFatiguePanel driverId={selectedDriverId} />,
      "auto-coaching": <DriverAutoCoaching />,
      analytics: <DriverAnalyticsDashboard />,
      reviews: <DriverPerformanceReviews driverId={selectedDriverId} driverName={driverName} />,
      achievements: <DriverAchievementsPanel driverId={selectedDriverId} driverName={driverName} />,
      training: <DriverTrainingPanel driverId={selectedDriverId} />,
      insights: <DriverInsightsPanel driverId={selectedDriverId} />,
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Driver Hub</h1>
                <p className="text-muted-foreground text-xs">
                  Enterprise driver lifecycle, compliance & performance
                </p>
              </div>
            </div>
          </div>

          {/* Driver Selector */}
          {activeCategory !== "overview" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
                <UserCircle className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="w-[260px] border-0 bg-transparent h-8 text-sm focus:ring-0">
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
            </motion.div>
          )}
        </div>

        {/* Category Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {categories.map((cat) => (
            <motion.button
              key={cat.key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate(cat.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all overflow-hidden",
                "border",
                activeCategory === cat.key
                  ? "text-primary-foreground border-transparent shadow-lg"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30 hover:shadow-sm"
              )}
            >
              {activeCategory === cat.key && (
                <div className={cn("absolute inset-0 bg-gradient-to-r -z-10", cat.gradient)} />
              )}
              <cat.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Sub-tabs */}
        {currentCategory && currentCategory.tabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 border-b pb-2 overflow-x-auto"
          >
            {currentCategory.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeSubTab === tab.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.needsDriver && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" title="Requires driver selection" />
                )}
                {activeSubTab === tab.key && (
                  <motion.div
                    layoutId="activeSubTab"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${activeSubTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-[400px]"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default DriverManagement;
