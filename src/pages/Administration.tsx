import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings, Shield, Lock, Globe, Scale, History } from "lucide-react";
import OrganizationSettingsTab from "@/components/admin/OrganizationSettingsTab";
import SSOConfigTab from "@/components/admin/SSOConfigTab";
import PasswordPoliciesTab from "@/components/admin/PasswordPoliciesTab";
import IPAllowlistTab from "@/components/admin/IPAllowlistTab";
import LegalHoldsTab from "@/components/admin/LegalHoldsTab";
import LoginHistoryTab from "@/components/admin/LoginHistoryTab";

const Administration = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground">
            Manage organization settings, security, and compliance
          </p>
        </div>
      </div>

      <Tabs defaultValue="org-settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="org-settings" className="gap-2">
            <Globe className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="sso" className="gap-2">
            <Shield className="h-4 w-4" />
            SSO
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="ip-allowlist" className="gap-2">
            <Shield className="h-4 w-4" />
            IP Allowlist
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="h-4 w-4" />
            Legal Holds
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Login History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org-settings">
          <Card className="p-6">
            <OrganizationSettingsTab />
          </Card>
        </TabsContent>

        <TabsContent value="sso">
          <Card className="p-6">
            <SSOConfigTab />
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="p-6">
            <PasswordPoliciesTab />
          </Card>
        </TabsContent>

        <TabsContent value="ip-allowlist">
          <Card className="p-6">
            <IPAllowlistTab />
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card className="p-6">
            <LegalHoldsTab />
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <LoginHistoryTab />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Administration;
