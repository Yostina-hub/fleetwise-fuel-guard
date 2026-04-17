import { useState } from "react";
import SafetyComfortReportDialog from "@/components/safety-comfort/SafetyComfortReportDialog";
import type { WorkflowFormProps } from "../registry";

export default function SafetyComfortReportWrapper({ prefill, onSubmitted, onCancel }: WorkflowFormProps) {
  const [open, setOpen] = useState(true);
  return (
    <SafetyComfortReportDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onCancel();
      }}
      prefill={prefill}
      onSubmitted={(res) => {
        setOpen(false);
        onSubmitted(res);
      }}
    />
  );
}
