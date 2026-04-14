import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Shield, Key, History, FileText, UserCheck, AlertTriangle, ClipboardList } from "lucide-react";
import ApiKeysTab from "@/components/security/ApiKeysTab";
import AuditLogsTab from "@/components/security/AuditLogsTab";
import DataRetentionTab from "@/components/security/DataRetentionTab";
import GdprRequestsTab from "@/components/security/GdprRequestsTab";
import ConsentManagementTab from "@/components/security/ConsentManagementTab";
import BreachNotificationTab from "@/components/security/BreachNotificationTab";
import ProcessingActivitiesTab from "@/components/security/ProcessingActivitiesTab";
import SecurityQuickStats from "@/components/security/SecurityQuickStats";
import SecurityQuickActions from "@/components/security/SecurityQuickActions";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Security = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("api-keys");

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold">{t('security.title')}</h1>
            <p className="text-muted-foreground">
              {t('security.auditLog')}
            </p>
          </div>
        </div>

        <SecurityQuickStats
          activeApiKeys={3}
          auditLogsToday={45}
          retentionPolicies={5}
          pendingGdprRequests={0}
        />

        <SecurityQuickActions
          onCreateApiKey={() => setActiveTab("api-keys")}
          onExportAuditLogs={() => toast({ title: "Exporting audit logs..." })}
          onRunSecurityScan={() => toast({ title: "Security scan started" })}
          onRefreshData={() => toast({ title: "Data refreshed" })}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" aria-hidden="true" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="gap-2">
            <History className="h-4 w-4" aria-hidden="true" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="retention" className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            GDPR Requests
          </TabsTrigger>
          <TabsTrigger value="consent" className="gap-2">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Consent
          </TabsTrigger>
          <TabsTrigger value="breach" className="gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Breach
          </TabsTrigger>
          <TabsTrigger value="ropa" className="gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            ROPA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <Card className="p-6"><ApiKeysTab /></Card>
        </TabsContent>
        <TabsContent value="audit-logs">
          <Card className="p-6"><AuditLogsTab /></Card>
        </TabsContent>
        <TabsContent value="retention">
          <Card className="p-6"><DataRetentionTab /></Card>
        </TabsContent>
        <TabsContent value="gdpr">
          <Card className="p-6"><GdprRequestsTab /></Card>
        </TabsContent>
        <TabsContent value="consent">
          <Card className="p-6"><ConsentManagementTab /></Card>
        </TabsContent>
        <TabsContent value="breach">
          <Card className="p-6"><BreachNotificationTab /></Card>
        </TabsContent>
        <TabsContent value="ropa">
          <Card className="p-6"><ProcessingActivitiesTab /></Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
};

export default Security;
