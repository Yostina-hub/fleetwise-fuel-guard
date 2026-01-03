import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Shield, Key, History, FileText } from "lucide-react";
import ApiKeysTab from "@/components/security/ApiKeysTab";
import AuditLogsTab from "@/components/security/AuditLogsTab";
import DataRetentionTab from "@/components/security/DataRetentionTab";
import GdprRequestsTab from "@/components/security/GdprRequestsTab";
import SecurityQuickStats from "@/components/security/SecurityQuickStats";
import SecurityQuickActions from "@/components/security/SecurityQuickActions";
import { useToast } from "@/hooks/use-toast";

const Security = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("api-keys");

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold">Security & Compliance</h1>
            <p className="text-muted-foreground">
              Manage API keys, audit logs, data retention, and GDPR requests
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <SecurityQuickStats
          activeApiKeys={3}
          auditLogsToday={45}
          retentionPolicies={5}
          pendingGdprRequests={0}
        />

        {/* Quick Actions */}
        <SecurityQuickActions
          onCreateApiKey={() => setActiveTab("api-keys")}
          onExportAuditLogs={() => toast({ title: "Exporting audit logs..." })}
          onRunSecurityScan={() => toast({ title: "Security scan started" })}
          onRefreshData={() => toast({ title: "Data refreshed" })}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
            Data Retention
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            GDPR Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <Card className="p-6">
            <ApiKeysTab />
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs">
          <Card className="p-6">
            <AuditLogsTab />
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card className="p-6">
            <DataRetentionTab />
          </Card>
        </TabsContent>

        <TabsContent value="gdpr">
          <Card className="p-6">
            <GdprRequestsTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
};

export default Security;
