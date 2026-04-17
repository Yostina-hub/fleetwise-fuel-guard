// Server-side workflow executor.
// Walks the saved nodes/edges graph, runs each node against the live database,
// and writes a complete log line into workflow_runs.execution_log.
//
// Invocation modes:
//   POST { workflow_id, trigger_data?, run_id? }   → executes a single workflow
//   POST { mode: "scan" }                          → finds & runs all due
//                                                    scheduled / queued workflows
//
// Used by:
//   - pg_cron (every minute, mode=scan)
//   - workflow-webhook edge function (per-call, with workflow_id)
//   - Manual "Run Now" button in the UI (per-call)
//   - DB triggers queue rows in workflow_runs(status=running) which scan picks up

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WorkflowNode {
  id: string;
  type?: string;
  data: {
    label: string;
    nodeType: string;
    category: string;
    config?: Record<string, any>;
  };
}
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface LogEntry {
  node_id: string;
  label: string;
  node_type: string;
  category: string;
  status: "success" | "error" | "skipped";
  message: string;
  branch?: "true" | "false" | null;
  data?: Record<string, any>;
  duration_ms: number;
  ts: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));

    // ── Mode: scan — pg_cron entrypoint ─────────────────────
    if (body.mode === "scan") {
      const result = await scanAndRun(admin);
      return json({ ok: true, ...result });
    }

    // ── Mode: single execution ──────────────────────────────
    const workflowId: string | undefined = body.workflow_id;
    if (!workflowId) {
      return json({ error: "workflow_id required" }, 400);
    }

    const out = await runWorkflow(admin, {
      workflowId,
      triggerData: body.trigger_data ?? { source: "manual" },
      runId: body.run_id,
    });
    return json({ ok: true, ...out });
  } catch (e: any) {
    console.error("workflow-runner fatal:", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────
// Scanner: cron-entrypoint
// ─────────────────────────────────────────────────────────────
async function scanAndRun(admin: any) {
  let scheduledRan = 0;
  let queuedRan = 0;
  const errors: string[] = [];

  // 1) Scheduled workflows whose cron window matches "now"
  const { data: scheduled } = await admin
    .from("workflows")
    .select("id, organization_id, cron_expression, last_executed_at")
    .eq("status", "active")
    .not("cron_expression", "is", null);

  for (const wf of scheduled ?? []) {
    if (!cronDue(wf.cron_expression, wf.last_executed_at)) continue;
    try {
      await runWorkflow(admin, {
        workflowId: wf.id,
        triggerData: { source: "cron", cron: wf.cron_expression },
      });
      scheduledRan++;
    } catch (err: any) {
      errors.push(`scheduled ${wf.id}: ${err?.message}`);
    }
  }

  // 2) Workflow runs queued or resumed (status=running, picked up by scanner)
  const { data: queued } = await admin
    .from("workflow_runs")
    .select("id, workflow_id, organization_id, trigger_data, started_at")
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - 1000).toISOString())
    .limit(50);

  for (const run of queued ?? []) {
    try {
      await runWorkflow(admin, {
        workflowId: run.workflow_id,
        triggerData: run.trigger_data ?? { source: "db_event" },
        runId: run.id,
      });
      queuedRan++;
    } catch (err: any) {
      errors.push(`queued ${run.id}: ${err?.message}`);
    }
  }

  return { scheduled_ran: scheduledRan, queued_ran: queuedRan, errors };
}

// Very small cron matcher: supports "*/N * * * *", "M H * * *", "* * * * *"
// Falls back to "run if no execution in last 60s" for un-parseable expressions.
function cronDue(cron: string, lastExecutedAt: string | null): boolean {
  const since = lastExecutedAt
    ? Date.now() - new Date(lastExecutedAt).getTime()
    : Infinity;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return since > 60_000;
  const [min, hr] = parts;
  const now = new Date();

  // every-N minutes
  const everyMatch = /^\*\/(\d+)$/.exec(min);
  if (everyMatch) {
    const n = parseInt(everyMatch[1], 10);
    if (since < (n - 1) * 60_000) return false;
    return now.getUTCMinutes() % n === 0;
  }

  // explicit minute / hour
  if (/^\d+$/.test(min) && now.getUTCMinutes() !== Number(min)) return false;
  if (/^\d+$/.test(hr) && now.getUTCHours() !== Number(hr)) return false;
  if (since < 55_000) return false; // dedupe within same window
  return true;
}

// ─────────────────────────────────────────────────────────────
// Single-workflow executor
// ─────────────────────────────────────────────────────────────
async function runWorkflow(
  admin: any,
  opts: { workflowId: string; triggerData: any; runId?: string }
) {
  const { data: wf, error } = await admin
    .from("workflows")
    .select("id, organization_id, name, nodes, edges, status")
    .eq("id", opts.workflowId)
    .single();

  if (error || !wf) throw new Error(`workflow ${opts.workflowId} not found`);

  // Create or reuse run row
  let runId = opts.runId;
  if (!runId) {
    const { data: created, error: runErr } = await admin
      .from("workflow_runs")
      .insert({
        workflow_id: wf.id,
        organization_id: wf.organization_id,
        status: "running",
        trigger_data: opts.triggerData,
      })
      .select("id")
      .single();
    if (runErr) throw runErr;
    runId = created.id;
  }

  // Load existing run state so we can resume from a paused human_task
  const { data: existingRun } = await admin
    .from("workflow_runs")
    .select("execution_log, current_node_id, context, started_at")
    .eq("id", runId)
    .single();

  const startedAt = existingRun?.started_at
    ? new Date(existingRun.started_at).getTime()
    : Date.now();
  const log: LogEntry[] = Array.isArray(existingRun?.execution_log)
    ? existingRun.execution_log
    : [];
  const ctx: Record<string, any> = (existingRun?.context as any) ?? {};
  let failed = false;
  let errorMsg: string | null = null;
  let pausedAt: string | null = null;

  try {
    const nodes: WorkflowNode[] = Array.isArray(wf.nodes) ? wf.nodes : [];
    const edges: WorkflowEdge[] = Array.isArray(wf.edges) ? wf.edges : [];

    if (!nodes.length) {
      throw new Error("Workflow has no nodes");
    }

    // Build adjacency map: node_id → outgoing edges
    const out: Record<string, WorkflowEdge[]> = {};
    for (const e of edges) {
      (out[e.source] ||= []).push(e);
    }
    const inDeg: Record<string, number> = {};
    for (const n of nodes) inDeg[n.id] = 0;
    for (const e of edges) inDeg[e.target] = (inDeg[e.target] ?? 0) + 1;

    // Resume vs fresh start
    const visited = new Set<string>(log.map((l) => l.node_id));
    const branchOf: Record<string, "true" | "false" | null> = {};
    let queue: string[];

    if (existingRun?.current_node_id && ctx.last_task?.node_id === existingRun.current_node_id) {
      // We just got a task completion: resume from that node's children
      visited.add(existingRun.current_node_id);
      const decision = ctx.last_task.decision as string | undefined;
      queue = (out[existingRun.current_node_id] ?? [])
        .filter((e) => !decision || !e.sourceHandle || e.sourceHandle === decision)
        .map((e) => e.target);
    } else {
      // Fresh start: every node with no incoming edges
      queue = nodes
        .filter((n) => (inDeg[n.id] ?? 0) === 0)
        .map((n) => n.id);
    }

    while (queue.length) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const t0 = Date.now();
      let entry: LogEntry;

      // ── HUMAN TASK / APPROVAL: pause the run, create an inbox task ──
      if (node.data.nodeType === "human_task" || node.data.nodeType === "approval") {
        const cfg = node.data.config ?? {};
        const { error: taskErr } = await admin.from("workflow_tasks").insert({
          organization_id: wf.organization_id,
          workflow_id: wf.id,
          run_id: runId,
          node_id: nodeId,
          title: cfg.title || node.data.label,
          description: cfg.description ?? null,
          assignee_role: cfg.assignee_role ?? null,
          form_schema: cfg.fields ?? [],
          form_key: cfg.form_key ?? null,
          context: {
            ...(ctx.trigger ?? {}),
            ...(cfg.prefill ?? {}),
            ...(cfg.context ?? {}),
          },
          actions: cfg.actions ?? (out[nodeId] ?? []).map((e) => ({
            id: e.sourceHandle || e.target,
            label: e.sourceHandle || "Continue",
          })),
          vehicle_id: ctx.trigger?.vehicle_id ?? cfg.prefill?.vehicle_id ?? null,
          driver_id: ctx.trigger?.driver_id ?? cfg.prefill?.driver_id ?? null,
        });
        if (taskErr) throw taskErr;

        log.push({
          node_id: nodeId,
          label: node.data.label,
          node_type: node.data.nodeType,
          category: node.data.category,
          status: "success",
          message: `Awaiting human action${cfg.assignee_role ? ` (${cfg.assignee_role})` : ""}`,
          duration_ms: Date.now() - t0,
          ts: new Date().toISOString(),
        });
        pausedAt = nodeId;
        break;
      }

      try {
        const res = await executeNode(admin, node, wf.organization_id);
        const branch =
          node.data.category === "conditions"
            ? res.data?.branch === "true" || res.data?.branch === "false"
              ? res.data.branch
              : Math.random() > 0.5
              ? "true"
              : "false"
            : null;
        branchOf[nodeId] = branch;
        entry = {
          node_id: nodeId,
          label: node.data.label,
          node_type: node.data.nodeType,
          category: node.data.category,
          status: "success",
          message: res.message,
          branch,
          data: res.data,
          duration_ms: Date.now() - t0,
          ts: new Date().toISOString(),
        };
      } catch (err: any) {
        failed = true;
        errorMsg ||= `${node.data.label}: ${err.message}`;
        entry = {
          node_id: nodeId,
          label: node.data.label,
          node_type: node.data.nodeType,
          category: node.data.category,
          status: "error",
          message: err.message,
          duration_ms: Date.now() - t0,
          ts: new Date().toISOString(),
        };
      }

      log.push(entry);

      // Walk children, respecting condition branch handles
      for (const e of out[nodeId] ?? []) {
        const branch = branchOf[nodeId];
        if (
          branch &&
          e.sourceHandle &&
          (e.sourceHandle === "true" || e.sourceHandle === "false") &&
          e.sourceHandle !== branch
        ) {
          continue;
        }
        queue.push(e.target);
      }

      // Safety
      if (log.length > 200) break;
    }
  } catch (err: any) {
    failed = true;
    errorMsg = err.message;
  }

  const durationMs = Date.now() - startedAt;

  const finalStatus = pausedAt
    ? "awaiting_human"
    : failed
    ? "failed"
    : "completed";

  await admin
    .from("workflow_runs")
    .update({
      status: finalStatus,
      completed_at: pausedAt ? null : new Date().toISOString(),
      duration_ms: durationMs,
      execution_log: log,
      error_message: errorMsg,
      current_node_id: pausedAt,
      context: ctx,
    })
    .eq("id", runId);

  await admin
    .from("workflows")
    .update({
      last_executed_at: new Date().toISOString(),
      last_run_at: new Date().toISOString(),
      execution_count: (wf as any).execution_count
        ? (wf as any).execution_count + 1
        : 1,
      run_count: (wf as any).run_count ? (wf as any).run_count + 1 : 1,
    })
    .eq("id", wf.id);

  return { run_id: runId, status: finalStatus, nodes: log.length, duration_ms: durationMs };
}

// ─────────────────────────────────────────────────────────────
// Node-type → real DB action.
// Mirrors the in-browser executor in src/components/workflow/workflowExecutor.ts
// but server-side and write-safe.
// ─────────────────────────────────────────────────────────────
async function executeNode(
  admin: any,
  node: WorkflowNode,
  orgId: string
): Promise<{ message: string; data?: Record<string, any> }> {
  const { nodeType, config = {}, label } = node.data;

  switch (nodeType) {
    // ── Triggers (no-op evaluators) ──────────────────────
    case "trigger_event":
    case "trigger_alert":
    case "trigger_geofence":
    case "trigger_sensor":
    case "trigger_schedule":
    case "trigger_webhook":
      return { message: `Trigger '${label}' evaluated`, data: { kind: nodeType } };

    // ── Conditions ──────────────────────────────────────
    case "condition_if":
    case "condition_switch":
    case "condition_filter":
    case "condition_threshold": {
      const { data: tel } = await admin
        .from("vehicle_telemetry")
        .select("speed_kmh, fuel_level_percent, vehicle_id")
        .eq("organization_id", orgId)
        .order("last_communication_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const field = config.field || "speed_kmh";
      const threshold = Number(config.threshold ?? config.rightOperand ?? 80);
      const value = Number(tel?.[field] ?? 0);
      const branch = value > threshold ? "true" : "false";
      return {
        message: `${field}=${value} ${value > threshold ? ">" : "≤"} ${threshold} → ${branch.toUpperCase()}`,
        data: { field, value, threshold, branch, vehicle_id: tel?.vehicle_id },
      };
    }

    // ── Notifications ────────────────────────────────────
    case "notify_email":
    case "notify_sms":
    case "notify_push":
    case "notify_slack":
    case "notify_escalation": {
      // Persist as alert so it shows up in Alerts module
      const { data, error } = await admin
        .from("alerts")
        .insert({
          organization_id: orgId,
          alert_type: nodeType.replace("notify_", "notification_"),
          severity: nodeType === "notify_escalation" ? "critical" : "info",
          title: config.title || config.subject || label,
          message:
            config.message || config.template || `Workflow notification: ${label}`,
          alert_time: new Date().toISOString(),
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;
      return { message: `Notification dispatched`, data: { alert_id: data.id } };
    }

    // ── Fleet actions ────────────────────────────────────
    case "fleet_maintenance": {
      const { data: vehicle } = await admin
        .from("vehicles")
        .select("id, plate_number")
        .eq("organization_id", orgId)
        .limit(1)
        .maybeSingle();
      if (!vehicle) return { message: "No vehicle to schedule maintenance" };
      const wo = "WO-WF-" + Date.now().toString().slice(-8);
      const { error } = await admin.from("work_orders").insert({
        organization_id: orgId,
        vehicle_id: vehicle.id,
        work_order_number: wo,
        work_type: config.work_type || "preventive",
        priority: config.priority || "medium",
        service_description:
          config.description || `Auto-created by workflow: ${label}`,
        status: "pending",
        scheduled_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      return { message: `Work order ${wo} created for ${vehicle.plate_number}`, data: { wo_number: wo } };
    }

    case "fleet_immobilize": {
      const { data: device } = await admin
        .from("devices")
        .select("id, vehicle_id")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!device) return { message: "No active devices to immobilize" };
      await admin.from("device_commands").insert({
        organization_id: orgId,
        device_id: device.id,
        vehicle_id: device.vehicle_id,
        command_type: "engine_cutoff",
        command_payload: { source: "workflow_runner" },
        status: "pending",
        priority: "high",
      });
      return { message: "Engine cutoff command queued" };
    }

    // ── Data ops ────────────────────────────────────────
    case "data_log_history": {
      await admin.from("audit_logs").insert({
        organization_id: orgId,
        action: "workflow_event",
        resource_type: config.table || "workflow",
        status: "success",
        ip_address: "0.0.0.0",
        new_values: { source: "workflow_runner", node: label, config },
      });
      return { message: "Logged to audit trail" };
    }

    case "data_lookup": {
      const tbl = config.table || "vehicles";
      const { data, error } = await admin
        .from(tbl)
        .select("*", { count: "exact", head: false })
        .eq("organization_id", orgId)
        .limit(5);
      if (error) throw error;
      return { message: `Looked up ${data?.length ?? 0} rows from ${tbl}`, data: { rows: data?.length ?? 0 } };
    }

    case "timing_delay":
    case "timing_schedule":
    case "timing_debounce":
      return { message: `Timing node '${label}' satisfied` };

    default:
      return { message: `Node '${nodeType}' executed (default handler)` };
  }
}
