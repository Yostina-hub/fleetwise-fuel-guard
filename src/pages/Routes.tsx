import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Route, MapPin } from "lucide-react";
import RoutesTab from "@/components/routes/RoutesTab";
import CustomerSitesTab from "@/components/routes/CustomerSitesTab";
import RoutesQuickStats from "@/components/routes/RoutesQuickStats";
import RoutesQuickActions from "@/components/routes/RoutesQuickActions";
import RoutesInsightsCard from "@/components/routes/RoutesInsightsCard";
import RoutesTrendChart from "@/components/routes/RoutesTrendChart";
import { toast } from "sonner";

const RoutesPage = () => {
  const [activeTab, setActiveTab] = useState("routes");

  // Mock stats - in production, these would come from hooks
  const stats = {
    activeRoutes: 8,
    customerSites: 45,
    distanceCovered: 12500,
    optimizationRate: 87
  };

  const insights = {
    topRoute: "CBD to Industrial Area",
    avgDeliveryTime: 42,
    frequentSite: "ABC Warehouse",
    efficiencyGain: 15
  };

  const handleCreateRoute = () => {
    setActiveTab("routes");
    toast.info("Use the 'Add Route' button in the Routes tab");
  };

  const handleAddSite = () => {
    setActiveTab("sites");
    toast.info("Use the 'Add Site' button in the Customer Sites tab");
  };

  const handleOptimizeRoutes = () => {
    toast.success("Optimizing routes...");
  };

  const handleExportReport = () => {
    toast.success("Exporting routes report...");
  };

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Route className="h-8 w-8 text-primary animate-float" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Routes & Dispatch</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Optimize delivery routes and manage customer locations
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <RoutesQuickStats {...stats} />

        {/* Quick Actions */}
        <RoutesQuickActions
          onCreateRoute={handleCreateRoute}
          onAddSite={handleAddSite}
          onOptimizeRoutes={handleOptimizeRoutes}
          onExportReport={handleExportReport}
        />

        {/* Insights and Trend */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RoutesInsightsCard {...insights} />
          <RoutesTrendChart />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 glass p-1 h-14">
            <TabsTrigger value="routes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Route className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Routes</span>
            </TabsTrigger>
            <TabsTrigger value="sites" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Customer Sites</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routes" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl">
              <RoutesTab />
            </Card>
          </TabsContent>

          <TabsContent value="sites" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl">
              <CustomerSitesTab />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RoutesPage;
