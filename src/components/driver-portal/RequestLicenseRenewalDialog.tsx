/**
 * RequestLicenseRenewalDialog
 * ===========================
 * Driver-facing entry point that launches the centralized FMG-LIC 13 workflow.
 *
 * Architecture:
 *   - Form  → built in the Forms module (`license_renewal_request`).
 *   - SOP   → defined in the Workflow Designer (or seeded from configs.ts).
 *   - Trigger → driver_notifications row is auto-created on every stage move.
 *
 * This component owns *no* business logic: it simply renders the registered
 * workflow form (via RenderWorkflowForm) and, on submit, creates a workflow
 * instance using the standard useWorkflow hook.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileWarning, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { licenseRenewalConfig } from "@/lib/workflow-engine/configs";
import { useEffectiveConfig } from "@/lib/workflow-engine/useEffectiveConfig";
import { useWorkflow } from "@/lib/workflow-engine/useWorkflow";
import { RenderWorkflowForm } from "@/lib/workflow-forms/registry";
import { usePublishedFormByKey, useCloneTemplate } from "@/lib/forms/api";
import { getTemplate } from "@/lib/forms/templates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driver: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    license_number?: string | null;
    license_expiry?: string | null;
  };
}

const FORM_KEY = "license_renewal_request";

export default function RequestLicenseRenewalDialog({ open, onOpenChange, driver }: Props) {
  const { organizationId } = useOrganization();
  const { user, hasRole } = useAuth() as any;
  const { config } = useEffectiveConfig(licenseRenewalConfig);
  const { createInstance } = useWorkflow(config);

  const published = usePublishedFormByKey(FORM_KEY, organizationId);
  const clone = useCloneTemplate();

  const [seeding, setSeeding] = useState(false);

  // Auto-seed the form template on first open if the org hasn't published one yet.
  // Only privileged users can do this; drivers see a friendly empty state instead.
  const canSeed =
    typeof hasRole === "function" &&
    (hasRole("super_admin") || hasRole("fleet_owner") || hasRole("fleet_manager") || hasRole("operations_manager"));

  useEffect(() => {
    if (!open) return;
    if (published.isLoading) return;
    if (published.data) return;
    if (!canSeed || !organizationId) return;
    const tpl = getTemplate(FORM_KEY);
    if (!tpl) return;
    setSeeding(true);
    clone
      .mutateAsync({ organizationId, template: tpl })
      .then(() => {
        toast.success("License Renewal Request form published.");
        published.refetch();
      })
      .catch((e: any) => toast.error(e?.message || "Failed to seed form"))
      .finally(() => setSeeding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, published.isLoading, published.data, canSeed, organizationId]);

  const submit = async (result?: Record<string, any>) => {
    const payload = result ?? {};
    try {
      await createInstance.mutateAsync({
        title: payload.title || `License renewal — ${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim(),
        description: payload.notes || null,
        driverId: driver.id,
        data: {
          ...payload,
          driver_id: driver.id,
          requested_by: user?.id,
        },
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to file renewal request");
    }
  };

  const prefill = {
    driver_id: driver.id,
    current_license_number: driver.license_number,
    current_expiry: driver.license_expiry,
    title: `License renewal — ${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim(),
  };

  // While we have a published form, delegate entirely to the registered renderer.
  if (open && published.data) {
    return (
      <RenderWorkflowForm
        formKey={`user_form:${FORM_KEY}`}
        prefill={prefill}
        onCancel={() => onOpenChange(false)}
        onSubmitted={submit}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request License Renewal</DialogTitle>
          <DialogDescription>
            FMG-LIC 13 — Driver License Renewal SOP
          </DialogDescription>
        </DialogHeader>

        {published.isLoading || seeding ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
            {seeding ? "Publishing renewal form…" : "Loading form…"}
          </div>
        ) : !published.data ? (
          <div className="text-center py-6 space-y-3">
            <FileWarning className="w-10 h-10 mx-auto text-muted-foreground opacity-60" aria-hidden="true" />
            <p className="text-sm font-medium">License renewal form not yet published.</p>
            <p className="text-xs text-muted-foreground">
              Ask your fleet manager to publish the <span className="font-mono">{FORM_KEY}</span> form
              in the Forms module, or seed it from the official template.
            </p>
            {canSeed && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={clone.isPending}
                onClick={() => {
                  const tpl = getTemplate(FORM_KEY);
                  if (!tpl || !organizationId) return;
                  clone
                    .mutateAsync({ organizationId, template: tpl })
                    .then(() => {
                      toast.success("Form published.");
                      published.refetch();
                    })
                    .catch((e: any) => toast.error(e?.message || "Failed"));
                }}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Publish from template
              </Button>
            )}
          </div>
        ) : null}

        {!published.data && !seeding && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
