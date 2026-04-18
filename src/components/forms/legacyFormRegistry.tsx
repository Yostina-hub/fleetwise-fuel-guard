/**
 * Legacy Form Registry (unified renderer)
 * =========================================
 * Maps a `forms.key` value to an existing, fully-featured legacy form
 * component. When the unified `<FormRenderer />` receives a `formKey` that is
 * registered here, it short-circuits the JSON-schema rendering and mounts the
 * legacy component instead. This guarantees 100% functional & visual parity
 * with the original dialog (pickers, RPC routing, SMS, validations, etc.)
 * while still letting the form appear inside the unified Forms module
 * (preview, workflow tasks, public links).
 *
 * Each registered component must accept these props:
 *   - embedded: true        → render inline (no outer Dialog)
 *   - open: true            → kept for API compatibility
 *   - onOpenChange(false)   → user clicked Cancel
 *   - onSubmitted({ id })   → form successfully created the legacy record
 *   - prefill?              → optional context (workflow_task_id, vehicle_id…)
 */
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

export interface LegacyEmbeddedFormProps {
  embedded: true;
  open: true;
  onOpenChange: (open: boolean) => void;
  prefill?: Record<string, any>;
  onSubmitted?: (result: { id: string }) => void;
}

const VehicleRequestFormLazy = lazy(() =>
  import("@/components/vehicle-requests/VehicleRequestForm").then((m) => ({
    default: m.VehicleRequestForm as unknown as React.ComponentType<LegacyEmbeddedFormProps>,
  })),
);

export interface LegacyFormRegistryEntry {
  /** The form `key` in the Forms module (organization-scoped). */
  key: string;
  /** Optional human label for editor banners. */
  label: string;
  /** Inline embedded component. */
  Component: React.ComponentType<LegacyEmbeddedFormProps>;
}

const REGISTRY: LegacyFormRegistryEntry[] = [
  {
    key: "vehicle_request",
    label: "Fleet Request Form (legacy)",
    Component: VehicleRequestFormLazy,
  },
];

const REGISTRY_MAP = new Map(REGISTRY.map((r) => [r.key, r]));

/**
 * Resolves a form key to a registered legacy component.
 *
 * IMPORTANT: only the EXACT registered key is bound to the legacy component.
 * Cloned/derived variants (e.g. "vehicle_request_copy_4", "vehicle_request_v2")
 * are intentionally NOT bound — they render from their own JSON schema so the
 * editor's Preview matches the WYSIWYG Build canvas 1:1. This lets users
 * customize cloned templates without being overridden by the hard-coded
 * legacy component layout.
 */
export function getLegacyFormEntry(formKey?: string | null): LegacyFormRegistryEntry | undefined {
  if (!formKey) return undefined;
  return REGISTRY_MAP.get(formKey);
}

/** Render a registered legacy form inline. */
export function RenderLegacyForm({
  entry,
  prefill,
  onSubmitted,
  onCancel,
}: {
  entry: LegacyFormRegistryEntry;
  prefill?: Record<string, any>;
  onSubmitted?: (result: { id: string }) => void;
  onCancel?: () => void;
}) {
  const Comp = entry.Component;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Comp
        embedded
        open
        onOpenChange={(v) => {
          if (!v) onCancel?.();
        }}
        prefill={prefill}
        onSubmitted={onSubmitted}
      />
    </Suspense>
  );
}
