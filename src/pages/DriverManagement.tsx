import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useDrivers } from "@/hooks/useDrivers";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Trophy, MessageSquare, ClipboardList, FolderTree,
  Users, LayoutDashboard,
} from "lucide-react";

// Overview
import { DriverHubOverview } from "@/components/drivers/DriverHubOverview";

// Operations sub-tabs
import { DriverAvailabilityBoard } from "@/components/drivers/DriverAvailabilityBoard";
import { DriverLeaderboard } from "@/components/drivers/DriverLeaderboard";
import { DriverCommunicationHub } from "@/components/drivers/DriverCommunicationHub";
import { DriverDVIRPanel } from "@/components/drivers/DriverDVIRPanel";
import { DriverHierarchyView } from "@/components/drivers/DriverHierarchyView";

const operationsTabs = [
  { key: "availability", label: "Availability", icon: Radio },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "dvir", label: "DVIR", icon: ClipboardList },
  { key: "groups", label: "Groups", icon: FolderTree },
];

const DriverManagement = () => {
  const navigate = useNavigate();
  const { drivers } = useDrivers();
  const [view, setView] = useState<"overview" | "operations">("overview");
  const [opsTab, setOpsTab] = useState("availability");

  const handleNavigate = (section: string, tab?: string) => {
    // Route to dedicated pages
    const routeMap: Record<string, string> = {
      compliance: "/driver-compliance",
      safety: "/driver-safety",
      performance: "/driver-performance",
      "hr-finance": "/driver-hr",
    };
    if (routeMap[section]) {
      navigate(routeMap[section]);
      return;
    }
    if (section === "operations") {
      setView("operations");
      if (tab) setOpsTab(tab);
    } else {
      setView("overview");
    }
  };

  const renderOperationsContent = () => {
    const map: Record<string, JSX.Element> = {
      availability: <DriverAvailabilityBoard />,
      leaderboard: <DriverLeaderboard />,
      messages: <DriverCommunicationHub />,
      dvir: <DriverDVIRPanel />,
      groups: <DriverHierarchyView />,
    };
    return map[opsTab] || null;
  };

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Driver Management</h1>
            <p className="text-xs text-muted-foreground">
              {view === "overview" ? "Fleet-wide driver overview & quick actions" : "Operations & real-time status"}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 border-b pb-1">
          <button
            onClick={() => setView("overview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all",
              view === "overview" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setView("operations")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all",
              view === "operations" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            Operations
          </button>
        </div>

        {/* Operations Sub-tabs */}
        {view === "operations" && (
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {operationsTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setOpsTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-all",
                  opsTab === tab.key
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={view === "overview" ? "overview" : `ops-${opsTab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-[400px]"
          >
            {view === "overview" ? (
              <DriverHubOverview onNavigate={handleNavigate} />
            ) : (
              renderOperationsContent()
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default DriverManagement;
