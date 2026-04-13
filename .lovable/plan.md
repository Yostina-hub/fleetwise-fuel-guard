
## RFP Gap Closure — Mandatory Features Implementation Plan

### Phase 1: Database Schema (Migration)
Add tables for:
1. **ev_vehicles** — EV-specific data (battery capacity, charging type, SoC)
2. **ev_charging_sessions** — Charging session logs with cost, kW, duration
3. **ev_charging_stations** — Charging station locations and availability
4. **vehicle_requests** — Full request/assignment workflow with approval states
5. **vehicle_request_approvals** — Approval chain with delegation matrix
6. **vehicle_insurance** — Insurance policies, claims, third-party details
7. **accident_claims** — Claims history linked to incidents
8. **tire_inventory** — Tire tracking with km, cost, change history per vehicle
9. **tire_changes** — History of tire changes per vehicle
10. **route_plans** — Route planning with waypoints and optimization params
11. **cold_chain_readings** — Temperature sensor data for refrigerated vehicles
12. **rental_vehicles** — Own vs rental vehicle classification + 3rd party driver tracking

### Phase 2: UI Modules
- EV Charging Management Module
- Vehicle Request & Assignment Workflow
- Accident & Insurance Management
- Tire Management Module
- Enhanced Report Export (Excel/CSV/Word)
- Route Planning & Optimization
- Speed Limiter / Remote Control UI
- Cold Chain Monitoring
- Rental/Outsource Vehicle Management

### Implementation Order:
1. Database migration (all tables)
2. EV Charging Module
3. Vehicle Request & Assignment Workflow
4. Accident/Insurance Management
5. Tire Management
6. Report Export
7. Route Planning
8. Speed Limiter/Remote Control
9. Cold Chain Monitoring
10. Rental Vehicle Management
11. Navigation updates
