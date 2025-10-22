import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ClipboardList, Package } from "lucide-react";
import WorkOrdersTab from "@/components/workorders/WorkOrdersTab";
import InventoryTab from "@/components/workorders/InventoryTab";

const WorkOrders = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Work Orders & Inventory</h1>
          <p className="text-muted-foreground">
            Manage maintenance work orders and parts inventory
          </p>
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Orders
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="p-6">
            <WorkOrdersTab />
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card className="p-6">
            <InventoryTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkOrders;
