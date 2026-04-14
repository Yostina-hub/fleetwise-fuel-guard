import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Battery, Zap, MapPin, BarChart3, Settings } from "lucide-react";
import { EVBatteryDashboard } from "@/components/ev/EVBatteryDashboard";
import { EVChargingHistory } from "@/components/ev/EVChargingHistory";
import { EVChargingStations } from "@/components/ev/EVChargingStations";
import { EVCostAnalysis } from "@/components/ev/EVCostAnalysis";
import { EVFleetOverview } from "@/components/ev/EVFleetOverview";
import { useTranslation } from "react-i18next";

const EVManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { key: "overview", label: "Fleet Overview", icon: Battery },
    { key: "battery", label: "Battery Health", icon: Zap },
    { key: "charging", label: "Charging Sessions", icon: BarChart3 },
    { key: "stations", label: "Charging Stations", icon: MapPin },
    { key: "costs", label: "Cost Analysis", icon: Settings },
  ];

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Battery className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('evManagement.title')}</h1>
            <p className="text-muted-foreground text-xs">
              {t('evManagement.batteryLevel')} & {t('evManagement.chargingHistory')}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            <TabsContent value="overview" className="mt-0">
              <EVFleetOverview />
            </TabsContent>
            <TabsContent value="battery" className="mt-0">
              <EVBatteryDashboard />
            </TabsContent>
            <TabsContent value="charging" className="mt-0">
              <EVChargingHistory />
            </TabsContent>
            <TabsContent value="stations" className="mt-0">
              <EVChargingStations />
            </TabsContent>
            <TabsContent value="costs" className="mt-0">
              <EVCostAnalysis />
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </Layout>
  );
};

export default EVManagement;
