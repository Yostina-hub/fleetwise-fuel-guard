import { useState } from "react";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowList } from "@/components/workflow/WorkflowList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";

const WorkflowBuilder = () => {
  const [view, setView] = useState<"list" | "builder">("list");
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

  return (
    <Layout>
      {view === "list" ? (
        <div className="p-4 md:p-6">
          <WorkflowList
            onCreateNew={() => {
              setEditingWorkflowId(null);
              setView("builder");
            }}
            onEdit={(id) => {
              setEditingWorkflowId(id);
              setView("builder");
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-64px)]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setView("list")}
              className="h-7 gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Workflows
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <WorkflowCanvas />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default WorkflowBuilder;
