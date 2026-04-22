import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, Receipt, Ticket, User, Users, Lock, Camera, Shield, Car } from "lucide-react";
import IncidentsListTab from "@/components/incidents/IncidentsListTab";
import InsuranceClaimsTab from "@/components/incidents/InsuranceClaimsTab";
import InsurancePoliciesTab from "@/components/incidents/InsurancePoliciesTab";
import AccidentClaimsTab from "@/components/incidents/AccidentClaimsTab";
import TrafficViolationsTab from "@/components/incidents/TrafficViolationsTab";
import IncidentTicketsTab from "@/components/incidents/IncidentTicketsTab";
import ByPersonTab from "@/components/incidents/ByPersonTab";
import ThirdPartyTab from "@/components/incidents/ThirdPartyTab";
import ImmobilizationTab from "@/components/incidents/ImmobilizationTab";
import DashcamAlertsTab from "@/components/incidents/DashcamAlertsTab";
import { IncidentQuickStats } from "@/components/incidents/IncidentQuickStats";
import { IncidentQuickActions } from "@/components/incidents/IncidentQuickActions";
import { WorkflowAutomationPanel } from "@/components/workflow/WorkflowAutomationPanel";
import { IncidentInsightsCard } from "@/components/incidents/IncidentInsightsCard";
import { IncidentTrendChart } from "@/components/incidents/IncidentTrendChart";
import { RecentIncidentsCard } from "@/components/incidents/RecentIncidentsCard";
import { useTranslation } from "react-i18next";
import { PageDateRangeProvider } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";

const Incidents = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "incidents";
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const handleTabChange = (value: string) => {
    setSearchParams(value === "incidents" ? {} : { tab: value });
  };

  const handleReportIncident = () => {
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
      <PageDateRangeProvider>
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

        {/* Page-level date range filter */}
        <PageDateRangeFilter />

        <IncidentQuickStats />

        <IncidentQuickActions
          onCreateIncident={handleReportIncident}
          onFileClaim={handleFileClaim}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <IncidentInsightsCard />
          <IncidentTrendChart />
          <RecentIncidentsCard />
        </div>

        <WorkflowAutomationPanel
          categories={["safety", "sensors"]}
          title="Incident Response Automations"
          description="Accident detection via shock sensors, dashcam triggers, panic button workflows"
          compact
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex w-full max-w-6xl overflow-x-auto">
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Incidents</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Claims</span>
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
            <TabsTrigger value="accident-claims" className="gap-2">
              <Car className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Accidents</span>
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
            <TabsTrigger value="immobilization" className="gap-2">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Immobilizer</span>
            </TabsTrigger>
            <TabsTrigger value="dashcam" className="gap-2">
              <Camera className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Dashcam</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <IncidentsListTab
              externalCreateOpen={openCreateDialog}
              onExternalCreateClose={() => setOpenCreateDialog(false)}
            />
          </TabsContent>
          <TabsContent value="claims"><InsuranceClaimsTab /></TabsContent>
          <TabsContent value="policies"><InsurancePoliciesTab /></TabsContent>
          <TabsContent value="accident-claims"><AccidentClaimsTab /></TabsContent>
          <TabsContent value="violations"><TrafficViolationsTab /></TabsContent>
          <TabsContent value="tickets"><IncidentTicketsTab /></TabsContent>
          <TabsContent value="by-person"><ByPersonTab /></TabsContent>
          <TabsContent value="third-party"><ThirdPartyTab /></TabsContent>
          <TabsContent value="immobilization"><ImmobilizationTab /></TabsContent>
          <TabsContent value="dashcam"><DashcamAlertsTab /></TabsContent>
        </Tabs>
      </div>
      </PageDateRangeProvider>
    </Layout>
  );
};

export default Incidents;
