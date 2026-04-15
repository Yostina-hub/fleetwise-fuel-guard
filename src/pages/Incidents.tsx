import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, Receipt, Ticket, User, Users } from "lucide-react";
import IncidentsListTab from "@/components/incidents/IncidentsListTab";
import InsuranceClaimsTab from "@/components/incidents/InsuranceClaimsTab";
import TrafficViolationsTab from "@/components/incidents/TrafficViolationsTab";
import IncidentTicketsTab from "@/components/incidents/IncidentTicketsTab";
import ByPersonTab from "@/components/incidents/ByPersonTab";
import ThirdPartyTab from "@/components/incidents/ThirdPartyTab";
import { IncidentQuickStats } from "@/components/incidents/IncidentQuickStats";
import { IncidentQuickActions } from "@/components/incidents/IncidentQuickActions";
import { WorkflowAutomationPanel } from "@/components/workflow/WorkflowAutomationPanel";
import { IncidentInsightsCard } from "@/components/incidents/IncidentInsightsCard";
import { IncidentTrendChart } from "@/components/incidents/IncidentTrendChart";
import { RecentIncidentsCard } from "@/components/incidents/RecentIncidentsCard";
import { useTranslation } from "react-i18next";

const Incidents = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "incidents";
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const handleTabChange = (value: string) => {
    setSearchParams(value === "incidents" ? {} : { tab: value });
  };

  const handleReportIncident = () => {
    // Switch to incidents tab and open create dialog
    if (activeTab !== "incidents") {
      handleTabChange("incidents");
    }
    setOpenCreateDialog(true);
  };

  const handleFileClaim = () => {
    handleTabChange("claims");
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('incidents.title')}</h1>
            <p className="text-muted-foreground">
              {t('incidents.reportIncident')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <IncidentQuickStats />

        {/* Quick Actions */}
        <IncidentQuickActions
          onCreateIncident={handleReportIncident}
          onFileClaim={handleFileClaim}
        />

        {/* Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <IncidentInsightsCard />
          <IncidentTrendChart />
          <RecentIncidentsCard />
        </div>

        {/* Incident & Safety Automations */}
        <WorkflowAutomationPanel
          categories={["safety", "sensors"]}
          title="Incident Response Automations"
          description="Accident detection via shock sensors, dashcam triggers, panic button workflows"
          compact
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Incidents</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Claims</span>
            </TabsTrigger>
            <TabsTrigger value="violations" className="gap-2">
              <Receipt className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Violations</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="by-person" className="gap-2">
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">By Person</span>
            </TabsTrigger>
            <TabsTrigger value="third-party" className="gap-2">
              <Users className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">3rd Party</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <IncidentsListTab
              externalCreateOpen={openCreateDialog}
              onExternalCreateClose={() => setOpenCreateDialog(false)}
            />
          </TabsContent>

          <TabsContent value="claims">
            <InsuranceClaimsTab />
          </TabsContent>

          <TabsContent value="violations">
            <TrafficViolationsTab />
          </TabsContent>

          <TabsContent value="tickets">
            <IncidentTicketsTab />
          </TabsContent>

          <TabsContent value="by-person">
            <ByPersonTab />
          </TabsContent>

          <TabsContent value="third-party">
            <ThirdPartyTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Incidents;
