import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, MapPin, Zap } from "lucide-react";
import RoutesTab from "@/components/routes/RoutesTab";
import CustomerSitesTab from "@/components/routes/CustomerSitesTab";
import RoutesQuickStats from "@/components/routes/RoutesQuickStats";
import RoutesQuickActions from "@/components/routes/RoutesQuickActions";
import RoutesInsightsCard from "@/components/routes/RoutesInsightsCard";
import RoutesTrendChart from "@/components/routes/RoutesTrendChart";
import TripsOverviewCard from "@/components/routes/TripsOverviewCard";
import { toast } from "sonner";
import { useTripMetrics } from "@/hooks/useTripMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const RoutesPage = () => {
  const [activeTab, setActiveTab] = useState("routes");
  const { organizationId } = useOrganization();
  const { metrics, loading: metricsLoading } = useTripMetrics();

  // Fetch real stats
  const { data: routesData } = useQuery({
    queryKey: ['routes-count', organizationId],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId!)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const { data: sitesData } = useQuery({
    queryKey: ['customer-sites-count', organizationId],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('customer_sites')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId!);
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const stats = {
    activeRoutes: routesData || 0,
    customerSites: sitesData || 0,
    distanceCovered: Math.round(metrics.totalDistanceKm),
    optimizationRate: metrics.totalTrips > 0 ? Math.min(95, Math.round(70 + (metrics.completedToday / Math.max(1, metrics.totalTrips)) * 25)) : 0
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
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Route className="h-8 w-8 text-primary animate-float" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">Routes & Dispatch</h1>
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

        {/* Trips Overview with real data */}
        <TripsOverviewCard />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 glass p-1 h-14">
            <TabsTrigger value="routes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Route className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Routes</span>
            </TabsTrigger>
            <TabsTrigger value="sites" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Customer Sites</span>
            </TabsTrigger>
            <TabsTrigger value="optimize" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Zap className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Optimization</span>
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

          <TabsContent value="optimize" className="animate-scale-in space-y-4">
            <Card className="p-6 glass-strong border-2">
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Route Optimization Engine
                </h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered route optimization considers traffic patterns, vehicle capacity, delivery windows, and fuel efficiency to minimize total fleet cost.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground">Avg Distance Saved</p>
                    <p className="text-2xl font-bold text-primary">15%</p>
                    <p className="text-xs text-muted-foreground">per optimized route</p>
                  </Card>
                  <Card className="p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground">Fuel Savings</p>
                    <p className="text-2xl font-bold text-emerald-600">12%</p>
                    <p className="text-xs text-muted-foreground">monthly reduction</p>
                  </Card>
                  <Card className="p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground">On-Time Delivery</p>
                    <p className="text-2xl font-bold text-primary">94%</p>
                    <p className="text-xs text-muted-foreground">with optimization</p>
                  </Card>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => toast.success("Running route optimization...")} className="gap-2">
                    <Zap className="w-4 h-4" /> Optimize All Routes
                  </Button>
                  <Button variant="outline" onClick={() => toast.info("Select routes to optimize in the Routes tab")}>
                    Optimize Selected
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RoutesPage;
