import Layout from "@/components/Layout";
import { WorkflowPage } from "@/lib/workflow-engine/WorkflowPage";
import {
  fleetInspectionConfig, vehicleRegistrationConfig, vehicleInsuranceRenewalConfig,
  preventiveMaintenanceConfig, breakdownMaintenanceConfig, vehicleDispatchConfig,
  driverOnboardingConfig, driverTrainingConfig, driverAllowanceConfig,
  vehicleDisposalConfig, roadsideAssistanceConfig, licenseRenewalConfig,
  outsourceRentalConfig,
} from "@/lib/workflow-engine/configs";

const wrap = (config: any) => () => <Layout><WorkflowPage config={config} /></Layout>;

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
