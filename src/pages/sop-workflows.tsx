import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import Layout from "@/components/Layout";
import { WorkflowPage } from "@/lib/workflow-engine/WorkflowPage";
import {
  fleetInspectionConfig, vehicleRegistrationConfig, vehicleInsuranceRenewalConfig,
  preventiveMaintenanceConfig, breakdownMaintenanceConfig, vehicleDispatchConfig,
  driverOnboardingConfig, driverTrainingConfig, driverAllowanceConfig,
  vehicleDisposalConfig, roadsideAssistanceConfig, licenseRenewalConfig,
  outsourceRentalConfig, safetyComfortConfig, vehicleHandoverConfig,
} from "@/lib/workflow-engine/configs";

const wrap = (config: any, extraAction?: React.ReactNode) => () => (
  <Layout><WorkflowPage config={config} extraAction={extraAction} /></Layout>
);

export const FleetInspectionPage          = wrap(fleetInspectionConfig);
export const VehicleRegistrationPage      = wrap(vehicleRegistrationConfig);
export const VehicleInsuranceRenewalPage  = wrap(vehicleInsuranceRenewalConfig);
export const PreventiveMaintenancePage    = wrap(preventiveMaintenanceConfig);
export const BreakdownMaintenancePage     = wrap(breakdownMaintenanceConfig);
export const VehicleDispatchPage          = wrap(vehicleDispatchConfig);
export const DriverOnboardingPage         = wrap(driverOnboardingConfig);
export const DriverTrainingPage           = wrap(driverTrainingConfig);
export const DriverAllowancePage          = wrap(driverAllowanceConfig);
export const VehicleDisposalPage          = wrap(vehicleDisposalConfig);
export const RoadsideAssistancePage       = wrap(roadsideAssistanceConfig);
export const LicenseRenewalPage           = wrap(licenseRenewalConfig);
export const OutsourceRentalPage          = wrap(outsourceRentalConfig);
export const SafetyComfortPage            = wrap(safetyComfortConfig);
export const VehicleHandoverPage          = wrap(
  vehicleHandoverConfig,
  <Button asChild size="sm" variant="outline">
    <Link to="/sop/vehicle-handover/catalog">
      <Settings2 className="h-4 w-4 mr-1" /> Manage catalog
    </Link>
  </Button>,
);
