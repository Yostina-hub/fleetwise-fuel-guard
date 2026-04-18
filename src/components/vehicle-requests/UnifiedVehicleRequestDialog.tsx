/**
 * UnifiedVehicleRequestDialog
 * ============================
 * Single entry point for "Create New Vehicle Request" across the app.
 *
 * Always renders the legacy <VehicleRequestForm /> directly because it has
 * full feature parity (dynamic Daily / Field / Project date sections, pool
 * routing, approval RPC, SMS notifications, "on behalf of" picker, etc.).
 *
 * The JSON-schema rendered version is reserved for the Forms module's editor
 * preview only — keeping the user-facing dialog stable while the JSON form
 * shape evolves.
 */
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

export function UnifiedVehicleRequestDialog({ open, onOpenChange, source }: Props) {
  return <VehicleRequestForm open={open} onOpenChange={onOpenChange} source={source} />;
}

export default UnifiedVehicleRequestDialog;
