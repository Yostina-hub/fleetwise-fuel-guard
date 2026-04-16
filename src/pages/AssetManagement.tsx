import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, History, BarChart3, TrendingDown, Plus, Fuel } from "lucide-react";
import AssetRegistryTab from "@/components/assets/AssetRegistryTab";
import AssetLifecycleTab from "@/components/assets/AssetLifecycleTab";
import AssetInventoryTab from "@/components/assets/AssetInventoryTab";
import AssetCostTab from "@/components/assets/AssetCostTab";
import AssetDepreciationTab from "@/components/assets/AssetDepreciationTab";
import AssetFuelHistoryTab from "@/components/assets/AssetFuelHistoryTab";

const AssetManagement = () => {
  const [activeTab, setActiveTab] = useState("registry");

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />Asset Management
            </h1>
            <p className="text-sm text-muted-foreground">Comprehensive lifecycle, inventory, cost & depreciation tracking</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="registry" className="gap-1 text-xs"><Package className="w-3 h-3" />Registry</TabsTrigger>
            <TabsTrigger value="lifecycle" className="gap-1 text-xs"><History className="w-3 h-3" />Lifecycle</TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1 text-xs"><Plus className="w-3 h-3" />Inventory</TabsTrigger>
            <TabsTrigger value="fuel" className="gap-1 text-xs"><Fuel className="w-3 h-3" />Fuel</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1 text-xs"><BarChart3 className="w-3 h-3" />Costs</TabsTrigger>
            <TabsTrigger value="depreciation" className="gap-1 text-xs"><TrendingDown className="w-3 h-3" />Depreciation</TabsTrigger>
          </TabsList>

          <TabsContent value="registry"><AssetRegistryTab /></TabsContent>
          <TabsContent value="lifecycle"><AssetLifecycleTab /></TabsContent>
          <TabsContent value="inventory"><AssetInventoryTab /></TabsContent>
          <TabsContent value="fuel"><AssetFuelHistoryTab /></TabsContent>
          <TabsContent value="costs"><AssetCostTab /></TabsContent>
          <TabsContent value="depreciation"><AssetDepreciationTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AssetManagement;
