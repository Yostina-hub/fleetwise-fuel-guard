// SOP Hub — unified card grid for filing & opening any of the 14 ET FMG SOPs.
// Phase C of the SOP migration: a single entry point at /sop that lets users
// browse all standard operating procedures grouped by domain, search/filter
// them, see live counts of in-flight instances, and jump straight into either
// the dedicated SOP page or the "File new" dialog.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Search, ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { WORKFLOW_CONFIGS } from "@/lib/workflow-engine/configs";
import type { WorkflowConfig } from "@/lib/workflow-engine/types";
import { NewWorkflowDialog } from "@/lib/workflow-engine/NewWorkflowDialog";

// SOP slug → /sop route segment mapping (kept aligned with App.tsx routes).
const SOP_ROUTES: Record<string, string> = {
  fleet_inspection: "/sop/fleet-inspection",
  vehicle_registration: "/sop/vehicle-registration",
  vehicle_insurance_renewal: "/sop/vehicle-insurance-renewal",
  preventive_maintenance: "/sop/preventive-maintenance",
  breakdown_maintenance: "/sop/breakdown-maintenance",
  vehicle_dispatch: "/sop/vehicle-dispatch",
  driver_onboarding: "/sop/driver-onboarding",
  driver_training: "/sop/driver-training",
  driver_allowance: "/sop/driver-allowance",
  vehicle_disposal: "/sop/vehicle-disposal",
  roadside_assistance: "/sop/roadside-assistance",
  license_renewal: "/sop/license-renewal",
  outsource_rental: "/sop/outsource-rental",
  safety_comfort: "/sop/safety-comfort",
};

// Group SOPs by domain for visual scanning.
const CATEGORIES: Array<{ key: string; label: string; types: string[] }> = [
  { key: "fleet", label: "Fleet & Compliance", types: ["fleet_inspection", "vehicle_registration", "vehicle_insurance_renewal", "license_renewal"] },
  { key: "maintenance", label: "Maintenance", types: ["preventive_maintenance", "breakdown_maintenance", "roadside_assistance", "safety_comfort"] },
  { key: "ops", label: "Operations & Dispatch", types: ["vehicle_dispatch", "outsource_rental", "vehicle_disposal"] },
  { key: "drivers", label: "Drivers & HR", types: ["driver_onboarding", "driver_training", "driver_allowance"] },
];

interface SopCardProps {
  config: WorkflowConfig;
  count: number;
  onFile: (cfg: WorkflowConfig) => void;
}

function SopCard({ config, count, onFile }: SopCardProps) {
  const Icon = config.icon ?? ClipboardList;
  const route = SOP_ROUTES[config.type] ?? "/sop";
  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/60 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{config.title}</CardTitle>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{config.sopCode}</p>
            </div>
          </div>
          {count > 0 && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {count} active
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs line-clamp-2 mt-2">
          {config.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onFile(config)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          File new
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link to={route}>
            Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SopHub() {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [fileConfig, setFileConfig] = useState<WorkflowConfig | null>(null);

  // Live counts of in-flight (non-completed) instances per workflow_type.
  const { data: counts = {} } = useQuery({
    queryKey: ["sop-instance-counts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .select("workflow_type,status")
        .eq("organization_id", organizationId!)
        .neq("status", "completed");
      if (error) return {} as Record<string, number>;
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        map[row.workflow_type] = (map[row.workflow_type] ?? 0) + 1;
      }
      return map;
    },
  });

  const allConfigs = useMemo(() => Object.values(WORKFLOW_CONFIGS), []);
  const totalActive = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  const filterFn = (cfg: WorkflowConfig) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cfg.title.toLowerCase().includes(q) ||
      cfg.sopCode.toLowerCase().includes(q) ||
      cfg.description.toLowerCase().includes(q)
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SOP Workflows</h1>
              <p className="text-sm text-muted-foreground">
                Ethiopian FMG standard operating procedures — file, track, and resolve.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {allConfigs.length} SOPs
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totalActive} active
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Category groups */}
        {CATEGORIES.map((cat) => {
          const items = cat.types
            .map((t) => WORKFLOW_CONFIGS[t])
            .filter(Boolean)
            .filter(filterFn);
          if (items.length === 0) return null;
          return (
            <section key={cat.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">
                  {cat.label}
                </h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((cfg) => (
                  <SopCard
                    key={cfg.type}
                    config={cfg}
                    count={counts[cfg.type] ?? 0}
                    onFile={setFileConfig}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Empty search state */}
        {search && allConfigs.filter(filterFn).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No SOPs match <strong>"{search}"</strong>.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shared "File new" dialog — driven by whichever card was clicked. */}
      {fileConfig && (
        <NewWorkflowDialog
          config={fileConfig}
          open={!!fileConfig}
          onOpenChange={(o) => !o && setFileConfig(null)}
        />
      )}
    </Layout>
  );
}
