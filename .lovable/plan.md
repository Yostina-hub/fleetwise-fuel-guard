
## Enterprise Driver Management - P0 Implementation

Based on the gap analysis, here are the priority features to implement:

### Phase 1: Database Schema (Migration)
Add tables for:
1. **Driver Onboarding Checklists** - Track onboarding/offboarding workflow steps per driver
2. **Driver Documents Vault (DQF)** - Already have `documents` table, but need driver-specific views
3. **Driver Availability** - On-duty/off-duty/on-leave status board
4. **Driver Groups/Hierarchy** - Region, depot, supervisor assignments
5. **Driver License Tracking** - Automated expiry alerts (enhance existing `drivers` table)
6. **Driver Vehicle Assignment History** - Track which driver drove which vehicle and when

### Phase 2: UI Components
1. **Enhanced Driver Profile Page** - Comprehensive single-driver view with all data
2. **Driver Onboarding Wizard** - Step-by-step onboarding flow
3. **Availability Board** - Visual duty status dashboard
4. **Document Vault Tab** - Upload/manage driver qualification files
5. **License Expiry Dashboard** - Alerts for expiring licenses/certs
6. **Driver Hierarchy View** - Group drivers by region/depot/supervisor

### Phase 3: Navigation Updates
- Add new sub-pages under Driver Management module
- Update Driver Hub tabs to include new panels

### Files to create/modify:
- New migration for schema changes
- `src/components/drivers/DriverOnboardingChecklist.tsx`
- `src/components/drivers/DriverAvailabilityBoard.tsx`
- `src/components/drivers/DriverDocumentVault.tsx`
- `src/components/drivers/DriverLicenseTracker.tsx`
- `src/components/drivers/DriverHierarchyView.tsx`
- `src/components/drivers/DriverVehicleHistory.tsx`
- Update `src/pages/DriverManagement.tsx` with new tabs
- Update `src/components/Layout.tsx` navigation
