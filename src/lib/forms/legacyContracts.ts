/**
 * Legacy Form Contracts
 * ======================
 * Some forms in the Forms module are bound to legacy systems (tables, RPCs,
 * KPIs, SMS, approval flows). For those forms, certain fields are part of a
 * binding contract — renaming, retyping, or removing them would break the
 * legacy submission adapter.
 *
 * The Forms editor uses this registry to:
 *   - lock the field `key`, `type`, and `options` for contract fields
 *   - leave `label`, `helpText`, `placeholder`, `required`, `visibleWhen`,
 *     `layout`, and ordering fully editable
 *
 * Add a new contract here whenever a legacy workflow is wired into the
 * unified renderer. The map is keyed by `forms.key` (organization-scoped key
 * used in the templates library).
 */
export interface LegacyFieldContract {
  /** Field keys that are locked (key/type/options not editable). */
  lockedKeys: string[];
  /** Human-readable label shown in the editor sidebar. */
  systemLabel: string;
  /** Optional explanation shown when the user hovers a locked field. */
  reason?: string;
}

export const LEGACY_FORM_CONTRACTS: Record<string, LegacyFieldContract> = {
  // Vehicle Request — bound to vehicle_requests table + route_vehicle_request_approval RPC
  vehicle_request: {
    systemLabel: "Fleet Request Form (legacy)",
    reason:
      "Bound to vehicle_requests + route_vehicle_request_approval. Renaming or retyping these fields will break pool routing, KPIs, SMS, and the approval flow.",
    lockedKeys: [
      "request_type",
      "date",
      "start_time",
      "end_time",
      "start_date",
      "start_date_time",
      "end_date",
      "end_date_time",
      "departure_place",
      "departure_lat",
      "departure_lng",
      "destination",
      "destination_lat",
      "destination_lng",
      "num_vehicles",
      "passengers",
      "vehicle_type",
      "trip_type",
      "pool_category",
      "pool_name",
      "purpose",
      "project_number",
    ],
  },

  // Fuel Request — bound to fuel_requests + approval routing
  fuel_request: {
    systemLabel: "Fuel Request (legacy)",
    reason:
      "Bound to the fuel request workflow. Renaming or retyping these fields will break approvals and work-order generation.",
    lockedKeys: [
      "request_type",
      "vehicle_id",
      "driver_id",
      "asset_id",
      "fuel_type",
      "liters_requested",
      "current_odometer",
      "price_per_liter",
      "estimated_cost",
      "cost_center",
      "purpose",
    ],
  },

  // Vehicle Inspection — bound to vehicle_inspections checklist contract
  vehicle_inspection: {
    systemLabel: "Vehicle Inspection (legacy)",
    reason:
      "Bound to the vehicle inspection checklist. Locked fields are part of the checklist contract.",
    lockedKeys: [
      "vehicle_id",
      "driver_id",
      "inspection_type",
      "odometer",
      "vehicle_safe_to_operate",
    ],
  },

  // Create Work Request — bound to maintenance work request intake
  create_work_request: {
    systemLabel: "Create Work Request (legacy)",
    reason: "Bound to the maintenance Work Request intake.",
    lockedKeys: [
      "request_type",
      "vehicle_id",
      "asset_id",
      "priority",
      "summary",
      "description",
    ],
  },

  // Safety & Comfort Report — bound to driver-portal report submitter
  safety_comfort_report: {
    systemLabel: "Safety & Comfort Report (legacy)",
    reason: "Bound to the driver-portal Safety & Comfort report flow.",
    lockedKeys: ["title", "vehicle_id", "severity", "category", "description"],
  },
};

/** Returns the contract for a form key, or null if none. */
export function getLegacyContract(formKey?: string | null): LegacyFieldContract | null {
  if (!formKey) return null;
  return LEGACY_FORM_CONTRACTS[formKey] ?? null;
}

/** Convenience: is a specific field key locked under the given form? */
export function isFieldLocked(formKey: string | null | undefined, fieldKey: string): boolean {
  const c = getLegacyContract(formKey);
  return !!c?.lockedKeys.includes(fieldKey);
}
