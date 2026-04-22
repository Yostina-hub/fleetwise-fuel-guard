/**
 * Vehicle Request — visibility derivation
 * ---------------------------------------
 * Single source of truth for which sections / fields are visible based on
 * the current `request_type`. Keeps the JSX free of inline boolean spaghetti
 * and makes the rules trivially unit-testable.
 *
 * For value-driven visibility (e.g. show the upgrade-justification only when
 * the user picked an over-spec'd vehicle), use the generic visibility
 * evaluator at `@/lib/forms/visibility` — this file covers the stable,
 * structural rules tied to the operation type.
 */
export type RequestType =
  | "daily_operation"
  | "nighttime_operation"
  | "project_operation"
  | "field_operation"
  | "group_operation"
  | "delivery_operation";

export interface VRVisibility {
  /** Single-day layout (date + start/end time). True for Daily and Nighttime. */
  isDaily: boolean;
  /** Nighttime variant of Daily — adds the 02:00–12:00 window banner. */
  isNighttime: boolean;
  /** Multi-day, project-coded — requires end_date and project_number. */
  isProject: boolean;
  /** Field deployment — extended duration; multi-day layout. */
  isField: boolean;
  /** Group / shared trip — multi-day layout. */
  isGroup: boolean;
  /** Delivery — motorcycle-based courier trip; passengers field is N/A. */
  isDelivery: boolean;

  /** Show the Project Number field. */
  showProjectNumber: boolean;
  /** Allow more than 1 vehicle. Only Project today. */
  allowsMultipleVehicles: boolean;
  /** Show the working-hours policy banner (Project only). */
  showWorkingHoursBanner: boolean;
  /** Show the Nighttime window banner. */
  showNighttimeBanner: boolean;
  /** Show the Field operation note. */
  showFieldNote: boolean;
}

export function deriveVisibility(requestType: string | undefined): VRVisibility {
  const isDelivery = requestType === "delivery_operation";
  const isNighttime = requestType === "nighttime_operation";
  // Delivery uses the same single-day layout as Daily (date + start/end time).
  const isDaily = requestType === "daily_operation" || isNighttime || isDelivery;
  const isProject = requestType === "project_operation";
  const isField = requestType === "field_operation";
  const isGroup = requestType === "group_operation";

  return {
    isDaily,
    isNighttime,
    isProject,
    isField,
    isGroup,
    isDelivery,
    showProjectNumber: isProject,
    allowsMultipleVehicles: isProject,
    showWorkingHoursBanner: isProject,
    showNighttimeBanner: isNighttime,
    showFieldNote: isField,
  };
}
