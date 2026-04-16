import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Truck, FileText, BarChart3 } from "lucide-react";
import { TPLPartnersTab } from "@/components/3pl/TPLPartnersTab";
import { TPLShipmentsTab } from "@/components/3pl/TPLShipmentsTab";
import { TPLInvoicesTab } from "@/components/3pl/TPLInvoicesTab";
import { TPLPerformanceTab } from "@/components/3pl/TPLPerformanceTab";

const ThirdPartyLogistics = () => {
  const [activeTab, setActiveTab] = useState("partners");

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">3PL Management</h1>
          <p className="text-muted-foreground">Manage third-party logistics partners, shipments, billing, and performance</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="partners" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Partners
            </TabsTrigger>
            <TabsTrigger value="shipments" className="gap-1.5">
              <Truck className="h-4 w-4" /> Shipments
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5">
              <FileText className="h-4 w-4" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners"><TPLPartnersTab /></TabsContent>
          <TabsContent value="shipments"><TPLShipmentsTab /></TabsContent>
          <TabsContent value="invoices"><TPLInvoicesTab /></TabsContent>
          <TabsContent value="performance"><TPLPerformanceTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ThirdPartyLogistics;
