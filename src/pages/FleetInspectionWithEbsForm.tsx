import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, GitBranch, Award } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { WorkflowPage } from "@/lib/workflow-engine/WorkflowPage";
import { fleetInspectionConfig } from "@/lib/workflow-engine/configs";
import CreateWorkRequestForm from "@/components/maintenance-enterprise/CreateWorkRequestForm";
import AnnualInspectionPipeline from "@/components/maintenance-enterprise/AnnualInspectionPipeline";

/**
 * Fleet Inspection SOP page extended with:
 *  - Oracle EBS "Create Work Request" form (Pre/Post/Annual radios)
 *  - Annual Inspection Outsourcing Pipeline tracker
 */
export default function FleetInspectionWithEbsForm() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("workflow");
  const queryClient = useQueryClient();

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="workflow"><GitBranch className="w-4 h-4 mr-1" /> SOP Workflow</TabsTrigger>
              <TabsTrigger value="annual"><Award className="w-4 h-4 mr-1" /> Annual Pipeline</TabsTrigger>
            </TabsList>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <ClipboardCheck className="w-4 h-4 mr-1" /> Create Work Request
            </Button>
          </div>

          <TabsContent value="workflow" className="mt-4">
            <WorkflowPage config={fleetInspectionConfig} />
          </TabsContent>
          <TabsContent value="annual" className="mt-4">
            <AnnualInspectionPipeline />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Work Request — Vehicle Trip Inspection</DialogTitle>
            <DialogDescription>
              File a Pre-trip, Post-trip or Annual vehicle inspection request (Oracle EBS aligned form).
            </DialogDescription>
          </DialogHeader>
          <CreateWorkRequestForm
            defaultContext="trip_inspection"
            defaultRequestType="inspection"
            onSubmitted={() => {
              setOpen(false);
              queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
              queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
              queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
              queryClient.invalidateQueries({ queryKey: ["annual-inspections-pipeline"] });
              setTab("annual");
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
