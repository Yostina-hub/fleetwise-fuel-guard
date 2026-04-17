# Workflow Builder as the System Brain — Migration Plan

> **Vision:** Move from 60+ hardcoded SOP screens / hooks / edge-functions to a **single declarative workflow runtime** where every business process is a versioned, auditable graph editable by ops people — not engineers.
> **Reference patterns:** Oracle EBS Workflow Engine, SAP Business Workflow, Camunda BPMN, ServiceNow Flow Designer, NetSuite SuiteFlow.

---

## 1 · Where we are today

| Layer | Status |
|---|---|
| Visual canvas (`@xyflow/react`) | ✅ done — 30 node types, 23 templates |
| Server runner (`workflow-runner` edge fn) | ✅ done — handles ~12 node types |
| Triggers: cron / DB events / webhook / manual | ✅ done — `pg_cron` + table triggers + tokenised endpoint |
| Run history + per-node logs | ✅ done — `workflow_runs` + `execution_log` |
| **Hardcoded SOP engine** (`src/lib/workflow-engine/`) | ⚠️ **parallel system** — 14 SOPs use it |
| **Hardcoded React pages** for every business process | ⚠️ ~60 pages contain stage logic in JSX |
| Approval / delegation matrix | ⚠️ separate table, not consulted by runner |

**Problem:** every policy change requires a developer. The workflow builder is a toy until the SOPs run *through* it.

---

## 2 · Target architecture (the "brain")

```
┌─────────────────────────────────────────────────────────┐
│                  WORKFLOW BUILDER (UI)                  │
│  Designer · Templates · Simulator · Runs · Versions    │
└───────────────────────┬─────────────────────────────────┘
                        │ saves graph
┌───────────────────────▼─────────────────────────────────┐
│            WORKFLOW DEFINITION (workflows table)        │
│   nodes · edges · trigger · version · status · roles   │
└───────────────────────┬─────────────────────────────────┘
       ┌────────────────┼────────────────────────┐
       ▼                ▼                        ▼
  ┌─────────┐    ┌─────────────┐         ┌──────────────┐
  │ Triggers│    │   Runtime    │         │  Form/Task   │
  │ cron/DB │───▶│ (edge func)  │◀────────│   Inbox      │
  │ webhook │    │  walks graph │         │ (human steps)│
  │ manual  │    └──────┬───────┘         └──────────────┘
  └─────────┘           ▼
              ┌─────────────────┐
              │   Node handlers │  (DB ops, AI, notify,
              │   (pluggable)   │   approval, hardware cmd)
              └─────────────────┘
```

Single source of truth: every business process = a row in `workflows` + child `workflow_runs`.

---

## 3 · Gaps to close

### 3.1 Runtime
- [ ] Implement remaining ~18 node handlers in `workflow-runner` (notifications, AI, sensors, safety hardware, resumable timing).
- [ ] **`human_task` node** — runner pauses, persists state, resumes when user submits a form.
- [ ] **Sub-workflow node** — call another workflow as a step.
- [ ] **Compensating actions** (saga pattern) for failed multi-step transactions.
- [ ] **Retry / dead-letter** queue per node.

### 3.2 Human-in-the-loop
- [ ] **Task Inbox** page (`/inbox`) — every paused workflow shows up as a task assigned by role/user, with the form fields the node declared.
- [ ] **Approval node** that reads the existing `authority_matrix` table — replaces 11 hardcoded approval flows.
- [ ] **Form Designer** inside the canvas — drag fields onto a node → stored in `node.config.fields`.

### 3.3 Data & integration
- [ ] **Variable / context** system — typed payload that flows through edges (`{{trigger.vehicle_id}}`, `{{step3.amount}}`).
- [ ] **Expression engine** (safe sandbox, e.g. `jsonata`) for conditions & mappers — replaces hardcoded `if (claim.amount > 50000)`.
- [ ] **Connector node** — generic outbound HTTP wrapping existing edge fns (ERPNext, e-money, SMS, WhatsApp).
- [ ] **CRUD nodes** with table/column picker (read schema from `information_schema`).

### 3.4 Governance
- [ ] **Versioning** — every save bumps `version`; runs are pinned to the version they started on.
- [ ] **Publish / draft** lifecycle.
- [ ] **Permissions per node** — only listed roles can execute that step.
- [ ] **Diff viewer** between two versions.
- [ ] **Audit trail** unified into `audit_logs`.

### 3.5 Observability
- [ ] **Heat-map** on canvas — success/failure/avg-duration per node (last 30d).
- [ ] **SLA timers** per node + breach alerts.
- [ ] **Replay** a past run with new logic.

---

## 4 · Migration strategy — 4 phases, ~10–14 weeks

### Phase 1 · Foundations (2 weeks) — *no user-visible change*
1. Add `human_task` + `approval` + `sub_workflow` node types.
2. Build **Task Inbox** page driven by paused `workflow_runs` (`status = awaiting_human`).
3. Add expression engine + variable context to runner.
4. Wire `authority_matrix` into the new `approval` node.
5. Add versioning UI (publish / draft / diff).

**Exit:** can build a 3-step "request → approve → notify" flow end-to-end without code.

### Phase 2 · Pilot (3 weeks) — *prove the model on 1 SOP*
Pick **Fuel Request workflow** (well-defined, medium complexity, high frequency).
1. Re-create as a graph template.
2. **Shadow mode** — both old SOP page and new workflow execute; diff outputs.
3. Cut over `/fuel-requests` to the generic Task Inbox view filtered by `workflow_type=fuel_request`.
4. Decommission the dedicated config + hook.

**Exit:** Fuel Request runs 100% through builder for 2 weeks, zero regressions.

### Phase 3 · Bulk migration (6–8 weeks)

| Wave | Workflows | Why this order |
|---|---|---|
| **A** | Vehicle request, driver leave, training enrolment | Simple linear approvals |
| **B** | Maintenance ticket→WO→PO→close, Outsourced maintenance (SOP 6.1) | Multi-actor, templated |
| **C** | Insurance renewal, accident claim, legal escalation | Long-running, document-heavy |
| **D** | Fuel anomaly→penalty, Geofence breach→escalation | Event-driven, real-time |
| **E** | Driver onboarding, vehicle disposal, annual inspection | Compliance-critical, low volume |

For each: build template → shadow → cutover → delete old code.
Tooling: codemod that scans `configs.ts` → starter graph JSON; regression suite that diffs old vs new side-effects.

### Phase 4 · Decommission (1–2 weeks)
- Delete `src/lib/workflow-engine/`.
- Delete 14 SOP-specific pages → one generic `<WorkflowProcessPage type="…" />`.
- Delete ~20 single-purpose edge functions → all become workflow templates.
- Move all `pg_cron` schedules into the workflow scheduler.
- Final RLS + node-level role enforcement review.

---

## 5 · What stays hardcoded

- **CRUD UIs** for master data (vehicles, drivers, orgs).
- **Real-time map / telemetry ingestion** — sub-second, not a business process.
- **Authentication** — security boundary.
- **Reports & dashboards** — read-only analytics.

Rule: *if a non-engineer might want to change the rule next quarter → workflow. If it's plumbing → code.*

---

## 6 · Risks & mitigations

| Risk | Mitigation |
|---|---|
| Graph interpretation slower than hardcoded TS | Pre-compile graphs to a flat instruction list on publish; cache. |
| Ops break critical flows | Mandatory `draft → simulate → publish` + role-gated publish. |
| Long-running workflows lose state on edge-fn timeout | Persist after every node; runner is stateless and resumable. |
| Old & new diverge during shadow | Feature flag per workflow type; one switch flips traffic. |
| Vendor lock-in to xyflow JSON | Internal `WorkflowSpec` type + adapter to/from xyflow. |

---

## 7 · Immediate next 3 PRs

1. **`human_task` node + Task Inbox MVP** — the keystone.
2. **Expression engine + variable context** — unlocks real conditionals.
3. **Approval node wired to `authority_matrix`** — proves we can replace one hardcoded subsystem.

Once those land, Phase 2 pilot can start.

---

## Appendix — Legacy module enhancement notes (pre-migration backlog)



### 3.1 — Accident & Insurance Management Enhancement
- **Insurance Policy Management**: New tab — view/manage active policies per vehicle (vehicle_insurance table), expiry tracking
- **Accident Claims Workflow**: Use accident_claims table with full repair tracking (vendor, dates, costs)
- **Third-Party Details**: Structured third-party info (name, vehicle, insurance, contact)
- **Claims Timeline**: Visual lifecycle (filed → reviewed → approved → settled)

### 3.2 — Tire Management Enhancement
- **Tire Lifecycle Dashboard**: Wear indicator (km/max km), cost-per-km
- **Tire Change Workflow**: Rotation/replacement with position tracking (FL, FR, RL, RR, spare)
- **Vehicle Tire Map**: Visual tire position diagram

### 3.3 — Cold Chain Monitoring Enhancement
- **Compliance Report**: Temperature compliance % per vehicle over date range
- **Door Events**: Track door status alongside temperature
- **Threshold Configuration**: Per-vehicle min/max settings

### 3.4 — Rental/Outsource Vehicle Enhancement
- **Contract Management**: Start/end, auto-renew, cost breakdown
- **Cost Analytics**: Monthly trends, own vs rental cost-per-km
- **Expiry Alerts**: Visual warnings for expiring contracts

### 3.5 — Route Planning Module (NEW)
- DB: Create route_plans table
- Route Creator with origin, destination, waypoints
- Vehicle/Driver assignment to routes
- Distance & ETA estimation

### 3.6 — Enhanced Report Export
- Multi-format: XLSX, CSV, Word export across all data tables

### Execution Order:
1. Route Plans DB migration
2. Accident/Insurance UI enhancements
3. Tire Management UI enhancements
4. Cold Chain UI enhancements
5. Rental Vehicle UI enhancements
6. Route Planning page
7. Report Export utilities

---

## Phase 4: Enterprise Maintenance Management Suite

### 4.1 — Maintenance Ticket System
**Tables:** `maintenance_tickets`
- Ticket lifecycle: open → triaged → assigned → in_progress → pending_parts → resolved → closed
- Priority levels P1-P4 with auto-SLA deadlines
- Lead time tracking (response + resolution)
- Escalation workflows based on SLA breach
- UI: Kanban board with drag-drop status transitions

### 4.2 — Contractual & SLA Management
**Tables:** `maintenance_contracts`, `maintenance_cost_tracking`
- Service agreements with vendors (annual, per-service, warranty, fleet-wide)
- SLA terms in JSONB (response_hours, resolution_hours, uptime_guarantee)
- Cost breakdown per ticket: labor, parts, external, transport, disposal
- Budget vs actual tracking with variance alerts
- Warranty tracking per vehicle with expiry notifications

### 4.3 — Supplier Portal (iSupplier)
**Tables:** `supplier_profiles`, `purchase_orders`, `supplier_bids`
- Supplier directory with performance scoring (on-time %, quality, cost variance)
- RFQ → Bid Collection → Comparison Matrix → Award workflow
- PO lifecycle: draft → submitted → approved → sent → acknowledged → fulfilled → invoiced → paid
- Multi-level approval routing based on cost thresholds
- Invoice matching and payment tracking

### 4.4 — Work Order Portal (Dual)
**Tables:** `work_order_portal_access`
- Internal technician queue with time logging and parts requests
- External supplier view with status updates and completion photos
- Portal access management with role-based permissions
- Completion verification workflow

### 4.5 — ERP Integration Layer
- Internal approval chains via existing `approval_levels` table
- Export-ready data for SAP/Oracle/Odoo sync
- Webhook events for WO status changes (existing webhook infrastructure)
- Cost center mapping to existing `cost_centers` table
