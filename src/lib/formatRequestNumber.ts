/**
 * formatRequestNumber
 * -------------------
 * Vehicle request numbers are stored as `VR-{TYPE_CODE}-{YYMMDD}-{SEQ}` where
 * TYPE_CODE is a 3-letter abbreviation (DLY, NGT, PRJ, FLD, GRP, MRG, GEN).
 * Older rows use the legacy `VR-{base36}` fallback.
 *
 * For UI surfaces we want the type spelled out so users immediately
 * understand what kind of trip the number represents — e.g.
 * "VR · Daily · 260424-0005".
 */
const TYPE_CODE_TO_LABEL: Record<string, string> = {
  DLY: "Daily",
  NGT: "Nighttime",
  PRJ: "Project",
  FLD: "Field",
  GRP: "Group",
  MRG: "Merged",
  GEN: "General",
};

const REQUEST_TYPE_TO_CODE: Record<string, string> = {
  daily_operation: "DLY",
  nighttime_operation: "NGT",
  project_operation: "PRJ",
  field_operation: "FLD",
  group_operation: "GRP",
};

export interface FormatRequestNumberOptions {
  /** Fallback request type when the number doesn't carry a type code. */
  requestType?: string | null;
  /** Use a single-line compact form ("VR · Daily 260424-0005"). */
  compact?: boolean;
}

export function formatRequestNumber(
  rawNumber: string | null | undefined,
  opts: FormatRequestNumberOptions = {},
): string {
  if (!rawNumber) return "—";
  const match = /^VR-([A-Z]{3})-(\d{6,8})-(.+)$/.exec(rawNumber);
  if (match) {
    const [, code, date, seq] = match;
    const label = TYPE_CODE_TO_LABEL[code] ?? code;
    return opts.compact
      ? `VR · ${label} ${date}-${seq}`
      : `VR · ${label} · ${date}-${seq}`;
  }
  // Legacy/fallback (`VR-{base36}`) — append type label if we have it.
  const fallbackCode = opts.requestType ? REQUEST_TYPE_TO_CODE[opts.requestType] : undefined;
  const label = fallbackCode ? TYPE_CODE_TO_LABEL[fallbackCode] : undefined;
  if (label) return opts.compact ? `${rawNumber} (${label})` : `${rawNumber} · ${label}`;
  return rawNumber;
}
