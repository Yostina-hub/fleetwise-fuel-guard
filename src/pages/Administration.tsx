import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings, Shield, Lock, Globe, Scale, History, Mail, AlertTriangle, KeyRound, Activity } from "lucide-react";
import OrganizationSettingsTab from "@/components/admin/OrganizationSettingsTab";
import SSOConfigTab from "@/components/admin/SSOConfigTab";
import PasswordPoliciesTab from "@/components/admin/PasswordPoliciesTab";
import IPAllowlistTab from "@/components/admin/IPAllowlistTab";
import LegalHoldsTab from "@/components/admin/LegalHoldsTab";
import LoginHistoryTab from "@/components/admin/LoginHistoryTab";
import TwoFactorTab from "@/components/admin/TwoFactorTab";
import { EmailReportsTab } from "@/components/admin/EmailReportsTab";
import { PenaltyConfigTab } from "@/components/admin/PenaltyConfigTab";
import { DriverPenaltiesTab } from "@/components/admin/DriverPenaltiesTab";
import UserActivityTab from "@/components/admin/UserActivityTab";
import AdminQuickStats from "@/components/admin/AdminQuickStats";
import AdminQuickActions from "@/components/admin/AdminQuickActions";
import { useTranslation } from "react-i18next";

const Administration = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("org-settings");

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold">{t('administration.title')}</h1>
            <p className="text-muted-foreground">
              {t('administration.organizationSettings')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <AdminQuickStats />

        {/* Quick Actions */}
        <AdminQuickActions
          onConfigureSSO={() => setActiveTab("sso")}
          onCreateEmailReport={() => setActiveTab("email-reports")}
          onViewPenalties={() => setActiveTab("penalties")}
          onManageSettings={() => setActiveTab("org-settings")}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto w-full gap-1">
          <TabsTrigger value="org-settings" className="gap-2">
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Organization</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
          <TabsTrigger value="sso" className="gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            SSO
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Password</span>
            <span className="sm:hidden">Pass</span>
          </TabsTrigger>
          <TabsTrigger value="2fa" className="gap-2">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="ip-allowlist" className="gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">IP Allowlist</span>
            <span className="sm:hidden">IP</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Legal Holds</span>
            <span className="sm:hidden">Legal</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Login History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">User Activity</span>
            <span className="sm:hidden">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="email-reports" className="gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Email Reports</span>
            <span className="sm:hidden">Email</span>
          </TabsTrigger>
          <TabsTrigger value="penalty-config" className="gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Penalty Rules</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
          <TabsTrigger value="penalties" className="gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Driver Penalties</span>
            <span className="sm:hidden">Penalties</span>
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

        <TabsContent value="2fa">
          <Card className="p-6">
            <TwoFactorTab />
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

        <TabsContent value="activity">
          <Card className="p-6">
            <UserActivityTab />
          </Card>
        </TabsContent>

        <TabsContent value="email-reports">
          <Card className="p-6">
            <EmailReportsTab />
          </Card>
        </TabsContent>

        <TabsContent value="penalty-config">
          <PenaltyConfigTab />
        </TabsContent>

        <TabsContent value="penalties">
          <DriverPenaltiesTab />
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
};

export default Administration;
