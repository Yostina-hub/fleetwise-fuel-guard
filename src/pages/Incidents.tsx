import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import IncidentsTab from "@/components/incidents/IncidentsTab";

const Incidents = () => {
  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground">
            Track and manage accidents, breakdowns, and violations
          </p>
        </div>
      </div>

      <Card className="p-6">
        <IncidentsTab />
      </Card>
    </div>
    </Layout>
  );
};

export default Incidents;
