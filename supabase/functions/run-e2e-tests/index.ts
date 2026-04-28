// Orchestrates all workflow E2E proofs and returns a structured PASS/FAIL report.
// Calls 4 SQL RPCs:
//   - run_fuel_workflow_e2e_test()       (existing)
//   - run_maintenance_workflow_e2e_test()(existing)
//   - run_vehicle_request_e2e_test()     (new)
//   - run_outsource_tire_e2e_test()      (new)
// Optional ?cleanup=true also calls the matching cleanup_* helpers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface StepRow {
  step: string;
  flow: string;
  status: "PASS" | "FAIL" | "SKIP" | "OK";
  detail: string | null;
}

interface SuiteReport {
  suite: string;
  rpc: string;
  passed: number;
  failed: number;
  total: number;
  steps: StepRow[];
  error?: string;
}

const SUITES: { suite: string; rpc: string; cleanup?: string }[] = [
  { suite: "Fuel Request",       rpc: "run_fuel_workflow_e2e_test" },
  { suite: "Vehicle Request",    rpc: "run_vehicle_request_e2e_test",    cleanup: "cleanup_vehicle_request_e2e_test" },
  { suite: "Maintenance",        rpc: "run_maintenance_workflow_e2e_test", cleanup: "cleanup_maintenance_workflow_e2e_test" },
  { suite: "Outsource + Tire",   rpc: "run_outsource_tire_e2e_test",     cleanup: "cleanup_outsource_tire_e2e_test" },
  { suite: "License Renewal",    rpc: "run_license_renewal_e2e_test",    cleanup: "cleanup_license_renewal_e2e_test" },
  { suite: "Dispatch Jobs",      rpc: "run_dispatch_jobs_e2e_test",      cleanup: "cleanup_dispatch_jobs_e2e_test" },
];

function normalize(rows: any[]): StepRow[] {
  return (rows ?? []).map((r) => ({
    step: r.t_step ?? r.step ?? "?",
    flow: r.t_flow ?? r.flow ?? "?",
    status: (r.t_status ?? r.status ?? "FAIL") as StepRow["status"],
    detail: r.t_detail ?? r.detail ?? null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const cleanup = url.searchParams.get("cleanup") === "true";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const reports: SuiteReport[] = [];
  const startedAt = new Date().toISOString();

  for (const s of SUITES) {
    const report: SuiteReport = {
      suite: s.suite,
      rpc: s.rpc,
      passed: 0,
      failed: 0,
      total: 0,
      steps: [],
    };
    try {
      const { data, error } = await admin.rpc(s.rpc as any);
      if (error) {
        report.error = error.message;
        report.failed = 1;
        report.total = 1;
      } else {
        report.steps = normalize(data as any[]);
        report.total = report.steps.length;
        report.passed = report.steps.filter((x) => x.status === "PASS" || x.status === "OK").length;
        report.failed = report.steps.filter((x) => x.status === "FAIL").length;
      }
    } catch (e) {
      report.error = (e as Error).message;
      report.failed = 1;
      report.total = 1;
    }
    reports.push(report);
  }

  if (cleanup) {
    for (const s of SUITES) {
      if (!s.cleanup) continue;
      try {
        await admin.rpc(s.cleanup as any);
      } catch (_e) { /* ignore */ }
    }
  }

  const totals = reports.reduce(
    (acc, r) => ({
      passed: acc.passed + r.passed,
      failed: acc.failed + r.failed,
      total: acc.total + r.total,
    }),
    { passed: 0, failed: 0, total: 0 },
  );

  const overall = totals.failed === 0 ? "PASS" : "FAIL";

  return new Response(
    JSON.stringify({
      overall,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      totals,
      suites: reports,
    }, null, 2),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
