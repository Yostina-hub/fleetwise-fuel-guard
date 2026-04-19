// Phase A — Idempotent seeder that upserts the 14 SOP workflows into the
// `workflows` table as visual graphs. Re-running this function will UPDATE
// existing seeded SOPs in place (matched by name), preserving their UUIDs and
// run history.
import { supabase } from "@/integrations/supabase/client";
import {
  fleetInspectionConfig, vehicleRegistrationConfig, vehicleInsuranceRenewalConfig,
  preventiveMaintenanceConfig, breakdownMaintenanceConfig, vehicleDispatchConfig,
  driverOnboardingConfig, driverTrainingConfig, driverAllowanceConfig,
  vehicleDisposalConfig, roadsideAssistanceConfig, licenseRenewalConfig,
  outsourceRentalConfig, safetyComfortConfig, vehicleHandoverConfig,
  fleetTransferConfig, vehicleRequestConfig,
} from "./configs";
import { convertSopConfigToGraph } from "./sopConverter";
import type { WorkflowConfig } from "./types";

const ALL_SOPS: WorkflowConfig[] = [
  fleetInspectionConfig, vehicleRegistrationConfig, vehicleInsuranceRenewalConfig,
  preventiveMaintenanceConfig, breakdownMaintenanceConfig, vehicleDispatchConfig,
  driverOnboardingConfig, driverTrainingConfig, driverAllowanceConfig,
  vehicleDisposalConfig, roadsideAssistanceConfig, licenseRenewalConfig,
  outsourceRentalConfig, safetyComfortConfig, vehicleHandoverConfig,
  fleetTransferConfig, vehicleRequestConfig,
];

export interface SeedReport {
  inserted: number;
  updated: number;
  total: number;
  errors: string[];
}

export async function seedSOPWorkflows(
  organizationId: string,
  userId?: string,
): Promise<SeedReport> {
  const report: SeedReport = { inserted: 0, updated: 0, total: ALL_SOPS.length, errors: [] };
  if (!organizationId) {
    report.errors.push("No organization selected");
    return report;
  }

  // Fetch existing seeded SOPs. Prefer the new `sop_type` key when present;
  // fall back to legacy name match so previously-seeded rows are upgraded
  // in-place (and adopted into the new (kind='sop', sop_type) keyed model).
  const seededTypes = ALL_SOPS.map((c) => c.type);
  const seededNames = ALL_SOPS.map((c) => `${c.sopCode} — ${c.title}`);
  const { data: existing, error: fetchErr } = await supabase
    .from("workflows")
    .select("id, name, sop_type, kind")
    .eq("organization_id", organizationId)
    .or(
      `sop_type.in.(${seededTypes.join(",")}),and(category.eq.sop,name.in.(${seededNames
        .map((n) => `"${n.replace(/"/g, '""')}"`)
        .join(",")}))`,
    );

  if (fetchErr) {
    report.errors.push(`Failed to fetch existing SOPs: ${fetchErr.message}`);
    return report;
  }
  const existingByType = new Map<string, string>();
  for (const w of existing || []) {
    if ((w as any).sop_type) existingByType.set((w as any).sop_type, w.id);
  }
  const existingByName = new Map<string, string>();
  for (const w of existing || []) {
    if (!(w as any).sop_type) existingByName.set(w.name, w.id);
  }

  for (const config of ALL_SOPS) {
    try {
      const graph = convertSopConfigToGraph(config);
      const existingId = existingByType.get(config.type) ?? existingByName.get(graph.name);
      const sopRow = {
        kind: "sop" as const,
        sop_type: config.type,
        sop_code: config.sopCode,
        definition: serializeConfig(config) as any,
        category: graph.category,
        description: graph.description,
        nodes: graph.nodes as any,
        edges: graph.edges as any,
      };

      if (existingId) {
        const { error } = await supabase
          .from("workflows")
          .update(sopRow)
          .eq("id", existingId);
        if (error) throw error;
        report.updated++;
      } else {
        const { error } = await supabase.from("workflows").insert({
          organization_id: organizationId,
          name: graph.name,
          status: "draft",
          created_by: userId || null,
          ...sopRow,
        });
        if (error) throw error;
        report.inserted++;
      }
    } catch (e: any) {
      report.errors.push(`${config.sopCode}: ${e?.message || "unknown error"}`);
    }
  }

  return report;
}

/**
 * Strip non-serializable fields (e.g. Lucide icon components) so the config
 * round-trips through JSONB cleanly. The icon is re-attached on read by
 * matching `type` against WORKFLOW_CONFIGS.
 */
function serializeConfig(config: WorkflowConfig): Omit<WorkflowConfig, "icon"> {
  const { icon: _icon, ...rest } = config;
  return rest;
}
