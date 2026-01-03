import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Webhook, Plug, Upload, Database } from "lucide-react";
import WebhooksTab from "@/components/integrations/WebhooksTab";
import IntegrationsTab from "@/components/integrations/IntegrationsTab";
import BulkJobsTab from "@/components/integrations/BulkJobsTab";
import ERPNextTab from "@/components/integrations/ERPNextTab";
import IntegrationsQuickStats from "@/components/integrations/IntegrationsQuickStats";
import IntegrationsQuickActions from "@/components/integrations/IntegrationsQuickActions";
import { toast } from "sonner";

const Integrations = () => {
  const [activeTab, setActiveTab] = useState("webhooks");

  // Mock stats - in production, these would come from hooks
  const stats = {
    activeWebhooks: 5,
    totalIntegrations: 3,
    bulkJobsCompleted: 127,
    failedJobs: 2,
  };

  const handleAddWebhook = () => {
    setActiveTab("webhooks");
    toast.info("Use the 'Add Webhook' button in the Webhooks tab");
  };

  const handleSyncNow = () => {
    toast.success("Syncing integrations...");
  };

  const handleExportLogs = () => {
    toast.success("Exporting integration logs...");
  };

  const handleConfigure = () => {
    setActiveTab("integrations");
  };

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Plug className="h-8 w-8 text-primary animate-float" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">APIs & Integrations</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Manage webhooks, external integrations, and bulk data operations
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <IntegrationsQuickStats {...stats} />

        {/* Quick Actions */}
        <IntegrationsQuickActions
          onAddWebhook={handleAddWebhook}
          onSyncNow={handleSyncNow}
          onExportLogs={handleExportLogs}
          onConfigure={handleConfigure}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 glass p-1 h-14">
            <TabsTrigger value="webhooks" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Webhook className="h-4 w-4" aria-hidden="true" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="erpnext" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Database className="h-4 w-4" aria-hidden="true" />
              tele Erp
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Plug className="h-4 w-4" aria-hidden="true" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="bulk-jobs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Bulk Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <WebhooksTab />
            </Card>
          </TabsContent>

          <TabsContent value="erpnext" className="animate-scale-in">
            <ERPNextTab />
          </TabsContent>

          <TabsContent value="integrations" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <IntegrationsTab />
            </Card>
          </TabsContent>

          <TabsContent value="bulk-jobs" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <BulkJobsTab />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Integrations;
