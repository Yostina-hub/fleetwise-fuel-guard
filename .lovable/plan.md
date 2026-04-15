
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
