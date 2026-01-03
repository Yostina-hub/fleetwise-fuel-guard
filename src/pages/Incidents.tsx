import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, Receipt } from "lucide-react";
import IncidentsListTab from "@/components/incidents/IncidentsListTab";
import InsuranceClaimsTab from "@/components/incidents/InsuranceClaimsTab";
import TrafficViolationsTab from "@/components/incidents/TrafficViolationsTab";
import { IncidentQuickStats } from "@/components/incidents/IncidentQuickStats";
import { IncidentQuickActions } from "@/components/incidents/IncidentQuickActions";
import { IncidentInsightsCard } from "@/components/incidents/IncidentInsightsCard";
import { IncidentTrendChart } from "@/components/incidents/IncidentTrendChart";
import { RecentIncidentsCard } from "@/components/incidents/RecentIncidentsCard";

const Incidents = () => {
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Incident Management</h1>
            <p className="text-muted-foreground">
              Track and manage accidents, breakdowns, insurance claims, and traffic violations
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <IncidentQuickStats />

        {/* Quick Actions */}
        <IncidentQuickActions />

        {/* Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <IncidentInsightsCard />
          <IncidentTrendChart />
          <RecentIncidentsCard />
        </div>

        <Tabs defaultValue="incidents" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Incidents
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <FileText className="w-4 h-4" aria-hidden="true" />
              Insurance Claims
            </TabsTrigger>
            <TabsTrigger value="violations" className="gap-2">
              <Receipt className="w-4 h-4" aria-hidden="true" />
              Violations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <IncidentsListTab />
          </TabsContent>

          <TabsContent value="claims">
            <InsuranceClaimsTab />
          </TabsContent>

          <TabsContent value="violations">
            <TrafficViolationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Incidents;
