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
import { DriverHubOverview } from "@/components/drivers/DriverHubOverview";
import { DriverAvailabilityBoard } from "@/components/drivers/DriverAvailabilityBoard";
import { DriverLeaderboard } from "@/components/drivers/DriverLeaderboard";
import { DriverCommunicationHub } from "@/components/drivers/DriverCommunicationHub";
import { DriverDVIRPanel } from "@/components/drivers/DriverDVIRPanel";
import { DriverHierarchyView } from "@/components/drivers/DriverHierarchyView";
import BulkProvisionDriversButton from "@/components/drivers/BulkProvisionDriversButton";
import { useTranslation } from 'react-i18next';

const DriverManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { drivers } = useDrivers();
  const [view, setView] = useState<"overview" | "operations">("overview");
  const [opsTab, setOpsTab] = useState("availability");

  const operationsTabs = useMemo(() => [
    { key: "availability", label: t('drivers.availability', 'Availability'), icon: Radio },
    { key: "leaderboard", label: t('drivers.leaderboard', 'Leaderboard'), icon: Trophy },
    { key: "messages", label: t('drivers.messages', 'Messages'), icon: MessageSquare },
    { key: "dvir", label: t('drivers.dvir', 'DVIR'), icon: ClipboardList },
    { key: "groups", label: t('drivers.groups', 'Groups'), icon: FolderTree },
  ], [t]);

  const handleNavigate = (section: string, tab?: string) => {
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('pages.driver_management.title', 'Driver Management')}</h1>
            <p className="text-xs text-muted-foreground">
              {view === "overview" ? t('drivers.overviewDesc', 'Fleet-wide driver overview & quick actions') : t('drivers.operationsDesc', 'Operations & real-time status')}
            </p>
          </div>
        </div>

        <div className="flex gap-1 border-b pb-1">
          <button
            onClick={() => setView("overview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all",
              view === "overview" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            {t('common.overview', 'Overview')}
          </button>
          <button
            onClick={() => setView("operations")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all",
              view === "operations" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            {t('drivers.operations', 'Operations')}
          </button>
        </div>

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
