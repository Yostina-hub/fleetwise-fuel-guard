/**
 * UnifiedVehicleRequestDialog
 * ============================
 * Single entry point for "Create New Vehicle Request" across the app.
 *
 * Resolution order:
 *   1. Look up the org's published Vehicle Request form (any key matching
 *      `vehicle_request*`). If found, mount the unified `<FormRenderer />`,
 *      which short-circuits to the legacy component via `legacyFormRegistry`
 *      for full feature parity.
 *   2. If nothing is published yet, fall back to the legacy
 *      `<VehicleRequestForm />` directly so users are never blocked.
 *
 * Props mirror the legacy dialog so call sites can swap 1:1.
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";
import { EMPTY_SCHEMA, EMPTY_SETTINGS } from "@/lib/forms/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

interface ResolvedForm {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  version: { id: string; schema: any; settings: any };
}

function useResolvedVehicleRequestForm(open: boolean) {
  const { organizationId } = useOrganization();
  return useQuery({
    enabled: !!organizationId && open,
    queryKey: ["unified-vehicle-request-form", organizationId],
    queryFn: async (): Promise<ResolvedForm | null> => {
      // Find any non-archived form whose key looks like a Vehicle Request
      // template (exact `vehicle_request` or any clone like
      // `vehicle_request_copy_4`). Prefer the most recently updated one.
      const { data: forms, error: e1 } = await (supabase as any)
        .from("forms")
        .select("id, key, name, description, current_published_version_id, updated_at")
        .eq("organization_id", organizationId)
        .eq("is_archived", false)
        .like("key", "vehicle_request%")
        .order("updated_at", { ascending: false });
      if (e1) throw e1;

      const candidate = (forms ?? []).find((f: any) => !!f.current_published_version_id);
      if (!candidate) return null;

      const { data: ver, error: e2 } = await (supabase as any)
        .from("form_versions")
        .select("id, schema, settings")
        .eq("id", candidate.current_published_version_id)
        .maybeSingle();
      if (e2) throw e2;
      if (!ver) return null;

      return {
        id: candidate.id,
        key: candidate.key,
        name: candidate.name,
        description: candidate.description,
        version: {
          id: ver.id,
          schema: ver.schema ?? EMPTY_SCHEMA,
          settings: ver.settings ?? EMPTY_SETTINGS,
        },
      };
    },
  });
}

export function UnifiedVehicleRequestDialog({ open, onOpenChange, source }: Props) {
  const q = useResolvedVehicleRequestForm(open);

  // While resolving, show a spinner inside a dialog so layout doesn't jump.
  if (q.isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading form…</DialogTitle>
            <DialogDescription>Resolving the published Vehicle Request form for your organization.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback: no published form → mount the legacy dialog directly.
  if (!q.data) {
    return <VehicleRequestForm open={open} onOpenChange={onOpenChange} source={source} />;
  }

  const form = q.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.name ?? "Vehicle Request"}</DialogTitle>
          {form.description ? <DialogDescription>{form.description}</DialogDescription> : null}
        </DialogHeader>
        <FormRenderer
          schema={form.version.schema}
          settings={form.version.settings}
          formKey={form.key}
          prefill={source ? { source } : undefined}
          onCancel={() => onOpenChange(false)}
          onSubmit={async () => {
            // The legacy component performs the actual insert + RPC routing
            // and closes itself via onSubmitted → onOpenChange(false).
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default UnifiedVehicleRequestDialog;
