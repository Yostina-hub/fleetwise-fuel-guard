import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ClipboardList, Package, ShieldCheck, Users } from "lucide-react";
import WorkOrdersTab from "@/components/workorders/WorkOrdersTab";
import InventoryTab from "@/components/workorders/InventoryTab";
import WorkOrdersQuickStats from "@/components/workorders/WorkOrdersQuickStats";
import WorkOrdersQuickActions from "@/components/workorders/WorkOrdersQuickActions";
import WorkOrdersInsightsCard from "@/components/workorders/WorkOrdersInsightsCard";
import WorkOrdersTrendChart from "@/components/workorders/WorkOrdersTrendChart";
import ApprovalLevelsConfig from "@/components/workorders/ApprovalLevelsConfig";
import DelegationRulesConfig from "@/components/workorders/DelegationRulesConfig";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const WorkOrders = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("orders");

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
      <div className="p-3 md:p-6 space-y-4 animate-fade-in overflow-x-hidden">
        <div className="flex items-center gap-3 slide-in-right">
          <div className="p-4 rounded-2xl glass-strong glow-strong">
            <ClipboardList className="h-8 w-8 text-primary float-animation" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">{t('maintenance.workOrders')}</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {t('maintenance.partsInventory')}
            </p>
          </div>
        </div>

        <WorkOrdersQuickStats {...stats} />

        <WorkOrdersQuickActions
          onCreateOrder={handleCreateOrder}
          onOrderParts={handleOrderParts}
          onViewOverdue={handleViewOverdue}
          onExportReport={handleExportReport}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <WorkOrdersInsightsCard {...insights} />
          <WorkOrdersTrendChart />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 glass p-1 h-12">
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold hidden sm:inline">Work Orders</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Package className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold hidden sm:inline">Approvals</span>
            </TabsTrigger>
            <TabsTrigger value="delegation" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Users className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold hidden sm:inline">Delegation</span>
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

          <TabsContent value="approvals" className="animate-bounce-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300 card-premium">
              <ApprovalLevelsConfig />
            </Card>
          </TabsContent>

          <TabsContent value="delegation" className="animate-bounce-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300 card-premium">
              <DelegationRulesConfig />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WorkOrders;
