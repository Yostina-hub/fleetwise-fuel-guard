# Pro-Grade Workflow Suite Rebuild — UX Plan

Refining the existing dark Cyber theme. Inspired by **n8n + Temporal UI + Camunda + Linear**.
Companion to `.lovable/plan.md` (system-brain migration). This plan covers the **look & feel + assignee/builder UX**, not the runtime semantics.

---

## Phase 1 — Inbox UX (assignee experience) 🥇 *highest daily impact*

**New `/inbox` layout — 3 columns:**
1. **Left rail**: filters (workflow type, role, SLA status, assignee = me / my team / all), search, saved views
2. **Middle list**: tasks grouped by workflow → stage, with:
   - SLA timer chip (green / amber / red based on age vs. expected duration)
   - Role badge with semantic color
   - Stage number + title, vehicle/driver context
   - Bulk-select checkboxes
3. **Right context panel** (slides in on click — replaces the modal popup):
   - **Header**: workflow + stage + SLA + reference number
   - **Why am I seeing this?** — last 3 transitions (who, when, decision)
   - **Form** (if intake) or **Action buttons** (if decision) inline
   - **Linked entity** card: vehicle / driver / claim with quick actions
   - **Activity log** collapsible at bottom
4. **Bulk actions toolbar** appears when ≥1 selected — Reassign, Add note, Cancel
5. **Empty / zero state** with onboarding hint

**Files**: rewrite `src/pages/Inbox.tsx`, new `src/components/inbox/{TaskList,TaskFilters,TaskContextPanel,SlaChip,BulkActionBar}.tsx`

---

## Phase 2 — Builder canvas polish

**Visual upgrades on the same `@xyflow/react` canvas:**
- **Swimlanes** by role (horizontal bands with role label + icon on the left)
- **Distinct node shapes**: Trigger ⬭ (cyan glow), Action ▭, Decision ◆ (amber), Wait/Timer ⬢ (purple), End ⬮ (green)
- **Compact node card**: stage # · title · role chip · form/action indicator icon
- **Edge labels** on a pill background; styled arrowheads
- **Mini-map** + **auto-layout** (dagre) + zoom-to-fit + grid snap
- **Node hover**: tooltip with description + assignee count
- **Validation gutter**: red dot on nodes with config errors, list in a "Problems" tab

**Files**: refactor `src/components/workflow/WorkflowCanvas.tsx`, new `src/components/workflow/nodes/{TriggerNode,ActionNode,DecisionNode,WaitNode,EndNode}.tsx`, `src/components/workflow/SwimLaneBackground.tsx`, `src/components/workflow/CanvasToolbar.tsx`

---

## Phase 3 — Right-side Inspector + inline form builder

**Replace the modal node config with a slide-in inspector. Tabs:**
- **Config** — stage id, label, description, role, SLA hours, action buttons editor
- **Form** — drag-drop field builder (Text, Number, Date, Select, Vehicle picker, Driver picker, File, Checklist, Textarea) with live JSON preview
- **Permissions** — visible-to / actionable-by roles
- **Preview** — renders exactly what the assignee sees in the inbox (same component as Phase 1's panel — single source of truth)
- **History** — who edited this node, when, with diff

**Files**: new `src/components/workflow/inspector/{NodeInspector,ConfigTab,FormBuilderTab,PermissionsTab,PreviewTab,HistoryTab}.tsx`, `src/components/workflow/inspector/fields/*` per field type

---

## Phase 4 — Runtime overlay & observability

**Same canvas, two modes:**
- **Design mode** (current): edit
- **Runtime mode**: pick a run from a dropdown → canvas overlays its real state
  - Each node: status badge (pending/running/done/failed/skipped), elapsed time, assignee avatar
  - Active node pulses; completed nodes solid; failed red
  - Click a node → right panel shows that step's inputs, outputs, decision, performer, timestamps, linked task

**Workflow Analytics page** (`/workflows/:id/analytics`):
- KPI tiles: total runs, completion rate, avg cycle time, SLA breach rate
- **Bottleneck heatmap**: each stage colored by avg time spent
- **Funnel chart**: how many runs reach each stage
- **Run history table**: filterable, drill-into-runtime-view link

**Files**: `src/components/workflow/RuntimeOverlay.tsx`, `src/components/workflow/RunPicker.tsx`, `src/pages/WorkflowAnalytics.tsx`, `src/hooks/useWorkflowAnalytics.ts`, route in `src/App.tsx`

---

## Cross-cutting

- **Design tokens** in `index.css` (all HSL): `--status-pending/running/done/failed/skipped`, role accent palette, SLA traffic-light tokens
- **Reusable primitives**: `<StatusBadge>`, `<RoleChip>`, `<SlaChip>`, `<StagePill>` — consistent look across Inbox, Canvas, Inspector, Analytics
- **Motion**: 150ms transitions, pulsing dot for running, no jank
- **Performance**: virtualize long task lists with `@tanstack/react-virtual`; memoize node renderers
- **Accessibility**: keyboard nav on canvas (arrows pan, +/− zoom, Enter opens inspector), focus rings, ARIA labels
- **i18n**: every new string through `t()`

---

## Delivery order

1. **Phase 1 (Inbox)** — biggest UX win, smallest risk → ship first
2. **Phase 2 (Canvas polish)** — visual transformation, no breaking changes
3. **Phase 3 (Inspector)** — replaces dialogs, biggest builder UX leap
4. **Phase 4 (Runtime + analytics)** — operational insight

Each phase ships independently and won't break in-flight workflow runs.
