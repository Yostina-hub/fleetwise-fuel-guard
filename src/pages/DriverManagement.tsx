import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Users, UserCircle, Search, ChevronRight,
} from "lucide-react";

// Flat tab structure grouped into sections — cleaner than nested categories
const sections = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    tabs: [{ key: "overview", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Radio,
    tabs: [
      { key: "availability", label: "Availability", icon: Radio },
      { key: "leaderboard", label: "Leaderboard", icon: Trophy },
      { key: "communications", label: "Messages", icon: MessageSquare },
      { key: "dvir", label: "DVIR", icon: ClipboardList },
      { key: "hierarchy", label: "Groups", icon: FolderTree },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: ClipboardCheck,
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
    id: "safety",
    label: "Safety & Risk",
    icon: ShieldAlert,
    tabs: [
      { key: "risk-scoring", label: "Risk Scoring", icon: ShieldAlert },
      { key: "incidents", label: "Incidents", icon: AlertTriangle },
      { key: "fatigue", label: "Fatigue", icon: Clock, needsDriver: true },
      { key: "auto-coaching", label: "Coaching", icon: Zap },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    tabs: [
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "reviews", label: "Reviews", icon: Star, needsDriver: true },
      { key: "achievements", label: "Achievements", icon: Award, needsDriver: true },
      { key: "training", label: "Training", icon: BookOpen, needsDriver: true },
      { key: "insights", label: "AI Insights", icon: Brain, needsDriver: true },
    ],
  },
  {
    id: "hr-finance",
    label: "HR & Finance",
    icon: Briefcase,
    tabs: [
      { key: "contracts", label: "Contracts", icon: Briefcase, needsDriver: true },
      { key: "cost-allocation", label: "Costs", icon: DollarSign, needsDriver: true },
      { key: "vehicle-history", label: "Vehicles", icon: Car, needsDriver: true },
      { key: "rewards", label: "Rewards", icon: Gift },
    ],
  },
];

const allTabs = sections.flatMap(s => s.tabs.map(t => ({ ...t, sectionId: s.id, sectionLabel: s.label })));

const resolveTab = (tab: string | null) => {
  if (!tab) return { sectionId: "overview", tabKey: "overview" };
  const found = allTabs.find(t => t.key === tab);
  if (found) return { sectionId: found.sectionId, tabKey: found.key };
  return { sectionId: "overview", tabKey: "overview" };
};

const DriverManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { drivers, loading } = useDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  const urlTab = searchParams.get("tab");
  const { sectionId, tabKey } = resolveTab(urlTab);
  const [activeSection, setActiveSection] = useState(sectionId);
  const [activeTab, setActiveTab] = useState(tabKey);

  useEffect(() => {
    const resolved = resolveTab(searchParams.get("tab"));
    setActiveSection(resolved.sectionId);
    setActiveTab(resolved.tabKey);
  }, [searchParams]);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const driverName = selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : "";

  const currentTabMeta = allTabs.find(t => t.key === activeTab);
  const needsDriver = currentTabMeta?.needsDriver || false;
  const currentSection = sections.find(s => s.id === activeSection);

  const filteredDrivers = useMemo(() => {
    if (!driverSearch) return drivers;
    const q = driverSearch.toLowerCase();
    return drivers.filter(d =>
      d.first_name.toLowerCase().includes(q) ||
      d.last_name.toLowerCase().includes(q) ||
      d.employee_id?.toLowerCase().includes(q)
    );
  }, [drivers, driverSearch]);

  const navigate = (section: string, tab?: string) => {
    setActiveSection(section);
    const sec = sections.find(s => s.id === section);
    const resolved = tab || (sec?.tabs[0]?.key || "overview");
    setActiveTab(resolved);
    if (resolved === "overview" && section === "overview") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: resolved }, { replace: true });
    }
  };

  const renderContent = () => {
    if (activeTab === "overview") {
      return <DriverHubOverview onNavigate={navigate} />;
    }

    if (needsDriver && !selectedDriverId) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Select a Driver</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Choose a driver from the selector above to view their {currentTabMeta?.label.toLowerCase()} data.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    const map: Record<string, JSX.Element> = {
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

    return map[activeTab] || null;
  };

  const isOverview = activeTab === "overview";

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        {/* ─── Header ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Driver Management</h1>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="cursor-pointer hover:text-foreground" onClick={() => navigate("overview")}>Hub</span>
                {!isOverview && currentSection && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="cursor-pointer hover:text-foreground" onClick={() => navigate(activeSection)}>
                      {currentSection.label}
                    </span>
                  </>
                )}
                {!isOverview && currentTabMeta && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">{currentTabMeta.label}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Driver Selector — always visible when not on overview */}
          {!isOverview && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
                <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="w-[220px] border-0 bg-transparent h-8 text-sm focus:ring-0">
                    <SelectValue placeholder="Select driver..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search drivers..."
                          value={driverSearch}
                          onChange={e => setDriverSearch(e.target.value)}
                          className="h-8 pl-7 text-xs"
                        />
                      </div>
                    </div>
                    {filteredDrivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={d.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {d.first_name[0]}{d.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{d.first_name} {d.last_name}</span>
                          <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[9px] ml-auto">
                            {d.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* ─── Section Navigation ─── */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {sections.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => navigate(sec.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <sec.icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Sub-tabs ─── */}
        {currentSection && currentSection.tabs.length > 1 && activeSection !== "overview" && (
          <div className="flex items-center gap-1 border-b pb-2 overflow-x-auto">
            {currentSection.tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchParams({ tab: tab.key }, { replace: true });
                }}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-all",
                  activeTab === tab.key
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.needsDriver && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Requires driver selection" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeSection}-${activeTab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
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
