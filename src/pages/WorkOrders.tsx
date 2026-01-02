import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ClipboardList, Package } from "lucide-react";
import WorkOrdersTab from "@/components/workorders/WorkOrdersTab";
import InventoryTab from "@/components/workorders/InventoryTab";

const WorkOrders = () => {
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

        <Tabs defaultValue="orders" className="space-y-4">
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
