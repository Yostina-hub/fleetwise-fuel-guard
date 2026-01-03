import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ClipboardList, Package } from "lucide-react";
import WorkOrdersTab from "@/components/workorders/WorkOrdersTab";
import InventoryTab from "@/components/workorders/InventoryTab";
import WorkOrdersQuickStats from "@/components/workorders/WorkOrdersQuickStats";
import WorkOrdersQuickActions from "@/components/workorders/WorkOrdersQuickActions";
import WorkOrdersInsightsCard from "@/components/workorders/WorkOrdersInsightsCard";
import WorkOrdersTrendChart from "@/components/workorders/WorkOrdersTrendChart";
import { toast } from "sonner";

const WorkOrders = () => {
  const [activeTab, setActiveTab] = useState("orders");

  // Mock stats - in production, these would come from hooks
  const stats = {
    openOrders: 12,
    completedThisMonth: 28,
    partsOnOrder: 5,
    costThisMonth: 8450
  };

  const insights = {
    avgCompletionTime: 3.5,
    overdueCount: 2,
    topVehicle: "KBZ 123A",
    costTrend: 12
  };

  const handleCreateOrder = () => {
    setActiveTab("orders");
    toast.info("Use the 'New Work Order' button in the Work Orders tab");
  };

  const handleOrderParts = () => {
    setActiveTab("inventory");
    toast.info("Navigate to Inventory to order parts");
  };

  const handleViewOverdue = () => {
    setActiveTab("orders");
    toast.info("Filtering to show overdue work orders");
  };

  const handleExportReport = () => {
    toast.success("Exporting work orders report...");
  };

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 slide-in-right">
          <div className="p-4 rounded-2xl glass-strong glow-strong">
            <ClipboardList className="h-8 w-8 text-primary float-animation" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Work Orders & Inventory</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Track maintenance tasks and manage spare parts inventory
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <WorkOrdersQuickStats {...stats} />

        {/* Quick Actions */}
        <WorkOrdersQuickActions
          onCreateOrder={handleCreateOrder}
          onOrderParts={handleOrderParts}
          onViewOverdue={handleViewOverdue}
          onExportReport={handleExportReport}
        />

        {/* Insights and Trend */}
        <div className="grid lg:grid-cols-2 gap-6">
          <WorkOrdersInsightsCard {...insights} />
          <WorkOrdersTrendChart />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 glass p-1 h-14">
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Work Orders</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Package className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Inventory</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="animate-bounce-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300 card-premium">
              <WorkOrdersTab />
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="animate-bounce-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300 card-premium">
              <InventoryTab />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WorkOrders;
