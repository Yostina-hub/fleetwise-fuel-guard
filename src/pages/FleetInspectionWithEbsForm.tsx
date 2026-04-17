import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClipboardCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { WorkflowPage } from "@/lib/workflow-engine/WorkflowPage";
import { fleetInspectionConfig } from "@/lib/workflow-engine/configs";
import CreateWorkRequestForm from "@/components/maintenance-enterprise/CreateWorkRequestForm";

/**
 * Fleet Inspection SOP page extended with the Oracle EBS-style
 * "Create Work Request" form for Pre-trip / Post-trip inspections.
 */
export default function FleetInspectionWithEbsForm() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <Layout>
      <WorkflowPage
        config={fleetInspectionConfig}
        extraAction={
          <Button variant="outline" onClick={() => setOpen(true)}>
            <ClipboardCheck className="w-4 h-4 mr-1" /> Create Work Request
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Work Request — Vehicle Trip Inspection</DialogTitle>
            <DialogDescription>
              File a Pre-trip or Post-trip vehicle inspection request (Oracle EBS aligned form).
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
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
