import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useDrivers } from "@/hooks/useDrivers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, AlertTriangle, Clock, Zap, UserCircle, Search, Navigation,
} from "lucide-react";

import { DriverPredictiveRiskScoring } from "@/components/drivers/DriverPredictiveRiskScoring";
import { DriverIncidentReporting } from "@/components/drivers/DriverIncidentReporting";
import { DriverFatiguePanel } from "@/components/drivers/DriverFatiguePanel";
import { DriverAutoCoaching } from "@/components/drivers/DriverAutoCoaching";
import { IdleCoachingQueue } from "@/components/drivers/IdleCoachingQueue";

import { useTranslation } from 'react-i18next';
const tabs = [
  { key: "risk-scoring", label: "Risk Scoring", icon: ShieldAlert },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "fatigue", label: "Fatigue", icon: Clock, needsDriver: true },
  { key: "coaching", label: "Coaching", icon: Zap },
  { key: "idle-coaching", label: "Idle Coaching", icon: Navigation },
];

const DriverSafety = () => {
  const { t } = useTranslation();
  const { drivers } = useDrivers();
  const [activeTab, setActiveTab] = useState("risk-scoring");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  const currentTab = tabs.find(t => t.key === activeTab);
  const needsDriver = currentTab?.needsDriver || false;

  const filteredDrivers = useMemo(() => {
    if (!driverSearch) return drivers;
    const q = driverSearch.toLowerCase();
    return drivers.filter(d =>
      d.first_name.toLowerCase().includes(q) || d.last_name.toLowerCase().includes(q)
    );
  }, [drivers, driverSearch]);

  const renderContent = () => {
    if (needsDriver && !selectedDriverId) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <UserCircle className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Select a Driver</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose a driver to view their {currentTab?.label.toLowerCase()} data.
          </p>
        </motion.div>
      );
    }

    const map: Record<string, JSX.Element> = {
      "risk-scoring": <DriverPredictiveRiskScoring />,
      incidents: <DriverIncidentReporting />,
      fatigue: <DriverFatiguePanel driverId={selectedDriverId} />,
      coaching: <DriverAutoCoaching />,
      "idle-coaching": <IdleCoachingQueue />,
    };
    return map[activeTab] || null;
  };

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t('pages.driver_safety.title', 'Safety & Risk')}</h1>
              <p className="text-xs text-muted-foreground">Risk scoring, incidents, fatigue & coaching</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
            <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedDriverId || undefined} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="w-[220px] border-0 bg-transparent h-8 text-sm focus:ring-0">
                <SelectValue placeholder="Select driver..." />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={driverSearch} onChange={e => setDriverSearch(e.target.value)} className="h-8 pl-7 text-xs" />
                  </div>
                </div>
                {filteredDrivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={d.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{d.first_name[0]}{d.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{d.first_name} {d.last_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin border-b">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.needsDriver && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="min-h-[400px]">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default DriverSafety;
