import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings2, Radio, Droplet } from "lucide-react";
import DeviceProtocolsTab from "@/components/config/DeviceProtocolsTab";
import FuelDetectionTab from "@/components/config/FuelDetectionTab";
import EnrichmentTab from "@/components/config/EnrichmentTab";

const SystemConfig = () => {
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground">
            Configure device protocols, fuel detection, and data enrichment
          </p>
        </div>
      </div>

      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="protocols" className="gap-2">
            <Radio className="h-4 w-4" />
            Device Protocols
          </TabsTrigger>
          <TabsTrigger value="fuel" className="gap-2">
            <Droplet className="h-4 w-4" />
            Fuel Detection
          </TabsTrigger>
          <TabsTrigger value="enrichment" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Data Enrichment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="protocols">
          <Card className="p-6">
            <DeviceProtocolsTab />
          </Card>
        </TabsContent>

        <TabsContent value="fuel">
          <Card className="p-6">
            <FuelDetectionTab />
          </Card>
        </TabsContent>

        <TabsContent value="enrichment">
          <Card className="p-6">
            <EnrichmentTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
};

export default SystemConfig;
