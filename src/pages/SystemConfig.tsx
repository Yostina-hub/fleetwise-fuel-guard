import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings2, Radio, Droplet, Mail, MessageSquare } from "lucide-react";
import DeviceProtocolsTab from "@/components/config/DeviceProtocolsTab";
import FuelDetectionTab from "@/components/config/FuelDetectionTab";
import EnrichmentTab from "@/components/config/EnrichmentTab";
import SmtpConfigTab from "@/components/config/SmtpConfigTab";
import SmsGatewayTab from "@/components/config/SmsGatewayTab";
import ConfigQuickStats from "@/components/config/ConfigQuickStats";
import ConfigQuickActions from "@/components/config/ConfigQuickActions";
import { toast } from "sonner";

const SystemConfig = () => {
  const [activeTab, setActiveTab] = useState("protocols");

  // Mock stats - in production, these would come from hooks
  const stats = {
    activeProtocols: 8,
    fuelSensors: 12,
    enrichmentConfigs: 3,
    lastUpdated: "Today",
  };

  const handleAddProtocol = () => {
    setActiveTab("protocols");
    toast.info("Use the 'Add Protocol' button in the Device Protocols tab");
  };

  const handleRefreshConfigs = () => {
    toast.success("Refreshing configurations...");
  };

  const handleExportConfigs = () => {
    toast.success("Exporting configurations...");
  };

  const handleTestConnection = () => {
    toast.success("Testing connections...");
  };

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Settings2 className="h-8 w-8 text-primary animate-float" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">System Configuration</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Configure device protocols, fuel detection, and data enrichment
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <ConfigQuickStats {...stats} />

        {/* Quick Actions */}
        <ConfigQuickActions
          onAddProtocol={handleAddProtocol}
          onRefreshConfigs={handleRefreshConfigs}
          onExportConfigs={handleExportConfigs}
          onTestConnection={handleTestConnection}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 glass p-1 h-14">
            <TabsTrigger value="protocols" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Radio className="h-4 w-4" aria-hidden="true" />
              Device Protocols
            </TabsTrigger>
            <TabsTrigger value="fuel" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Droplet className="h-4 w-4" aria-hidden="true" />
              Fuel Detection
            </TabsTrigger>
            <TabsTrigger value="enrichment" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Data Enrichment
            </TabsTrigger>
            <TabsTrigger value="smtp" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Mail className="h-4 w-4" aria-hidden="true" />
              SMTP / Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              SMS Gateway
            </TabsTrigger>
          </TabsList>

          <TabsContent value="protocols" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <DeviceProtocolsTab />
            </Card>
          </TabsContent>

          <TabsContent value="fuel" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <FuelDetectionTab />
            </Card>
          </TabsContent>

          <TabsContent value="enrichment" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <EnrichmentTab />
            </Card>
          </TabsContent>

          <TabsContent value="smtp" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <SmtpConfigTab />
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <SmsGatewayTab />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SystemConfig;
