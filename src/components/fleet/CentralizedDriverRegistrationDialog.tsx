/**
 * CentralizedDriverRegistrationDialog
 * ====================================
 * Single, centralized entry point for "Add Driver" across the app.
 *
 * It resolves the published `driver_registration` form built in the Forms module
 * (`/forms`) and renders it via the legacy form registry, so:
 *   - Edits made in the Forms module (re-labels, re-orders, hide/show, validations)
 *     are picked up automatically — no code changes required.
 *   - The actual submission still uses the battle-tested legacy CreateDriverDialog
 *     (drivers table insert + create-user edge function + file uploads) so all
 *     features are preserved.
 *
 * On first launch, if no published version exists yet, privileged users
 * auto-seed the form from the bundled template (same pattern as
 * RequestLicenseRenewalDialog).
 */
import { useEffect, useState } from "react";
import { Loader2, FileWarning, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { usePublishedFormByKey, useCloneTemplate } from "@/lib/forms/api";
import { getTemplate } from "@/lib/forms/templates";
import { getLegacyFormEntry, RenderLegacyForm } from "@/components/forms/legacyFormRegistry";

const FORM_KEY = "driver_registration";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional initial values (e.g. when launched from a workflow). */
  prefill?: Record<string, any>;
  /** Fired after the driver row is successfully inserted. */
  onSubmitted?: (result: { id: string }) => void;
}

export default function CentralizedDriverRegistrationDialog({
  open,
  onOpenChange,
  prefill,
  onSubmitted,
}: Props) {
  const { organizationId } = useOrganization();
  const { hasRole } = useAuth() as any;
  const published = usePublishedFormByKey(FORM_KEY, organizationId);
  const clone = useCloneTemplate();
  const [seeding, setSeeding] = useState(false);

  const canSeed =
    typeof hasRole === "function" &&
    (hasRole("super_admin") ||
      hasRole("fleet_owner") ||
      hasRole("fleet_manager") ||
      hasRole("operations_manager") ||
      hasRole("hr_manager"));

  // Auto-seed the published form on first open if missing.
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
        toast.success("Driver Registration form published.");
        published.refetch();
      })
      .catch((e: any) => toast.error(e?.message || "Failed to seed form"))
      .finally(() => setSeeding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, published.isLoading, published.data, canSeed, organizationId]);

  const legacy = getLegacyFormEntry(FORM_KEY);
  const formName = published.data?.form?.name ?? "Register New Driver";
  const formDescription =
    published.data?.form?.description ??
    "Centralized intake form. Manage fields and validations from the Forms module.";

  const loading = published.isLoading || seeding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formName}
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <Sparkles className="h-3 w-3" />
              Centralized form
            </Badge>
          </DialogTitle>
          <DialogDescription>{formDescription}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !legacy ? (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <FileWarning className="h-8 w-8 mx-auto opacity-60" />
            <p className="text-sm">
              No registered renderer found for form key{" "}
              <span className="font-mono">{FORM_KEY}</span>.
            </p>
          </div>
        ) : !published.data && !canSeed ? (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <FileWarning className="h-8 w-8 mx-auto opacity-60" />
            <p className="text-sm">
              The Driver Registration form has not been published yet.
            </p>
            <p className="text-xs">
              Ask an administrator to open the Forms module and publish it.
            </p>
          </div>
        ) : (
          <RenderLegacyForm
            entry={legacy}
            prefill={prefill}
            onCancel={() => onOpenChange(false)}
            onSubmitted={(result) => {
              onSubmitted?.(result);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
