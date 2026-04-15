
## Phase 3: Module Enhancement & Gap Closure Plan

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
