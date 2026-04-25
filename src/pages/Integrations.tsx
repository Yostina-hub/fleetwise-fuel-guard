import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Webhook, Plug, Upload, Database, Zap, Users, Shield, CreditCard, Building2 } from "lucide-react";
import WebhooksTab from "@/components/integrations/WebhooksTab";
import IntegrationsTab from "@/components/integrations/IntegrationsTab";
import BulkJobsTab from "@/components/integrations/BulkJobsTab";
import ERPNextTab from "@/components/integrations/ERPNextTab";
import ERPWebhookBridgeTab from "@/components/integrations/ERPWebhookBridgeTab";
import LDAPImportTab from "@/components/integrations/LDAPImportTab";
import SIEMForwardingTab from "@/components/integrations/SIEMForwardingTab";
import BillingIntegrationTab from "@/components/integrations/BillingIntegrationTab";
import ActiveDirectoryTab from "@/components/integrations/ActiveDirectoryTab";
import IntegrationsQuickStats from "@/components/integrations/IntegrationsQuickStats";
import IntegrationsQuickActions from "@/components/integrations/IntegrationsQuickActions";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Integrations = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("webhooks");

  const { data: webhookCount } = useQuery({
    queryKey: ["webhooks-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("webhook_subscriptions").select("*", { count: "exact", head: true }).eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: integrationsCount } = useQuery({
    queryKey: ["integrations-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("integrations").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: jobStats } = useQuery({
    queryKey: ["bulk-jobs-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bulk_jobs").select("status");
      if (error) throw error;
      const completed = data?.filter(j => j.status === "completed").length || 0;
      const failed = data?.filter(j => j.status === "failed").length || 0;
      return { completed, failed };
    },
  });

  const stats = {
    activeWebhooks: webhookCount ?? 0,
    totalIntegrations: integrationsCount ?? 0,
    bulkJobsCompleted: jobStats?.completed ?? 0,
    failedJobs: jobStats?.failed ?? 0,
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
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Plug className="h-8 w-8 text-primary animate-float" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">{t('pages.integrations.title', 'APIs & Integrations')}</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {t('pages.integrations.description', 'Manage webhooks, external integrations, and bulk data operations')}
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
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-9 glass p-1 h-14">
            <TabsTrigger value="webhooks" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Webhook className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="erp-bridge" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">ERP Bridge</span>
            </TabsTrigger>
            <TabsTrigger value="erpnext" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Database className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">tele Erp</span>
            </TabsTrigger>
            <TabsTrigger value="active-directory" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">AD / Oracle</span>
            </TabsTrigger>
            <TabsTrigger value="ldap" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">LDAP Import</span>
            </TabsTrigger>
            <TabsTrigger value="siem" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">SIEM</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Plug className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="bulk-jobs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Bulk Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 h-full rounded-lg text-xs md:text-sm">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="animate-scale-in">
            <Card className="p-6 glass-strong border-2 hover:border-primary/50 transition-all duration-300">
              <WebhooksTab />
            </Card>
          </TabsContent>

          <TabsContent value="erp-bridge" className="animate-scale-in">
            <ERPWebhookBridgeTab />
          </TabsContent>

          <TabsContent value="erpnext" className="animate-scale-in">
            <ERPNextTab />
          </TabsContent>

          <TabsContent value="active-directory" className="animate-scale-in">
            <ActiveDirectoryTab />
          </TabsContent>

          <TabsContent value="ldap" className="animate-scale-in">
            <LDAPImportTab />
          </TabsContent>

          <TabsContent value="siem" className="animate-scale-in">
            <SIEMForwardingTab />
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

          <TabsContent value="billing" className="animate-scale-in">
            <BillingIntegrationTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Integrations;
