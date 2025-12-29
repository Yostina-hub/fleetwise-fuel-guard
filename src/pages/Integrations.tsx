import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Webhook, Plug, Upload, Database } from "lucide-react";
import WebhooksTab from "@/components/integrations/WebhooksTab";
import IntegrationsTab from "@/components/integrations/IntegrationsTab";
import BulkJobsTab from "@/components/integrations/BulkJobsTab";
import ERPNextTab from "@/components/integrations/ERPNextTab";

const Integrations = () => {
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Plug className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">APIs & Integrations</h1>
          <p className="text-muted-foreground">
            Manage webhooks, external integrations, and bulk data operations
          </p>
        </div>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="erpnext" className="gap-2">
            <Database className="h-4 w-4" />
            tele Erp
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="bulk-jobs" className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks">
          <Card className="p-6">
            <WebhooksTab />
          </Card>
        </TabsContent>

        <TabsContent value="erpnext">
          <ERPNextTab />
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="p-6">
            <IntegrationsTab />
          </Card>
        </TabsContent>

        <TabsContent value="bulk-jobs">
          <Card className="p-6">
            <BulkJobsTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
};

export default Integrations;
