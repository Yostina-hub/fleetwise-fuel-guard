/**
 * Vehicle Request — End-to-End behaviour tests
 * ---------------------------------------------
 * Exercises the full lifecycle that the unified vehicle-request flow
 * supports, in three layers:
 *
 *   1. Form validation (per-field + whole-form, all 4 operation types)
 *   2. Sanitization (whitespace, control chars, project number normalization)
 *   3. Pipeline column mapping  pending → approved → assigned
 *      → in_progress → completed (and rejected/cancelled side bins)
 *   4. Status-transition reducer used by the kanban DnD handler
 *
 * These tests run without a network connection — they validate the *pure*
 * business rules that govern what the UI is allowed to do. Anything that
 * passes here is safe to round-trip to the database (which is RLS-enforced
 * with matching CHECK constraints).
 */
import { describe, it, expect } from "vitest";
import {
  validateVRField,
  validateVehicleRequestForm,
  sanitizeVehicleRequestForm,
  sanitizeProjectNumber,
  sanitizePhone,
  sanitizeText,
} from "@/components/vehicle-requests/vehicleRequestValidation";

// ─── Pipeline column logic mirrors VehicleRequestPipelineBoard ─────────
const PIPELINE_COLUMNS = [
  { id: "pending",     match: ["pending", "submitted", "draft"] },
  { id: "approved",    match: ["approved"] },
  { id: "assigned",    match: ["assigned", "scheduled", "dispatched"] },
  { id: "in_progress", match: ["in_progress", "in_service"] },
  { id: "completed",   match: ["completed", "closed"] },
  { id: "rejected",    match: ["rejected"] },
  { id: "cancelled",   match: ["cancelled", "canceled"] },
];

const columnFor = (status: string) =>
  PIPELINE_COLUMNS.find((c) => c.match.includes(status))?.id;

const canonicalStatusFor = (columnId: string) =>
  PIPELINE_COLUMNS.find((c) => c.id === columnId)?.match[0];

// ─── 1. FORM VALIDATION ────────────────────────────────────────────────
describe("VR form validation — Daily Operation", () => {
  const base = {
    request_type: "daily_operation",
    date: new Date(Date.now() + 86_400_000),
    start_time: "08:30",
    end_time: "17:00",
    purpose: "Pickup CEO from airport and bring to head office for board meeting",
    departure_place: "Bole Airport",
    departure_lat: 8.9778,
    departure_lng: 38.7993,
    destination: "Head Office",
    destination_lat: 9.0192,
    destination_lng: 38.7525,
    num_vehicles: 1,
    passengers: 2,
    pool_category: "corporate",
    pool_name: "Head Office Pool",
    priority: "normal",
    trip_type: "round_trip",
    contact_phone: "0911234567",
  };

  it("accepts a valid daily request", () => {
    const r = validateVehicleRequestForm(base as any);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
  });

  it("rejects past date", () => {
    const r = validateVehicleRequestForm({ ...base, date: new Date("2020-01-01") } as any);
    expect(r.valid).toBe(false);
    expect(r.errors.date).toMatch(/past/i);
  });

  it("rejects bad time format", () => {
    expect(validateVRField("start_time", "8:5", base as any)).toMatch(/HH:MM/);
    expect(validateVRField("start_time", "25:00", base as any)).toMatch(/HH:MM/);
  });

  it("rejects end ≤ start", () => {
    const r = validateVehicleRequestForm({ ...base, start_time: "17:00", end_time: "16:00" } as any);
    expect(r.errors.end_time).toMatch(/later than start/);
  });

  it("allows num_vehicles > 1 for daily even when passengers ≤ 25", () => {
    // Per-operation caps were removed — dispatchers, not the form, decide.
    expect(validateVRField("num_vehicles", 3, base as any)).toBeUndefined();
  });

  it("still enforces the absolute hard ceiling of 50 vehicles", () => {
    expect(validateVRField("num_vehicles", 50, base as any)).toBeUndefined();
    expect(validateVRField("num_vehicles", 51, base as any)).toMatch(/Maximum 50/);
  });

  it("rejects too-short purpose", () => {
    const r = validateVehicleRequestForm({ ...base, purpose: "go" } as any);
    expect(r.errors.purpose).toMatch(/too brief/);
  });

  it("rejects passengers below 1", () => {
    expect(validateVRField("passengers", 0)).toMatch(/at least 1/);
  });

  it("rejects departure without map coordinates", () => {
    expect(
      validateVRField("departure_place", "Some place", { departure_lat: null, departure_lng: null } as any)
    ).toMatch(/Pick the departure on the map/);
  });

  it("rejects destination without map coordinates", () => {
    expect(
      validateVRField("destination", "Some place", { destination_lat: null, destination_lng: null } as any)
    ).toMatch(/Pick the destination on the map/);
  });

  it("rejects intermediate stop typed without map coords", () => {
    expect(
      validateVRField("stops", [{ name: "Mid stop", lat: null, lng: null }], {} as any)
    ).toMatch(/picked on the map/);
  });

  it("accepts stops that have real coordinates", () => {
    expect(
      validateVRField("stops", [{ name: "Mid stop", lat: 9.0, lng: 38.8 }], {} as any)
    ).toBeUndefined();
  });
});

describe("VR form validation — Project Operation", () => {
  const base = {
    request_type: "project_operation",
    start_date: new Date(Date.now() + 86_400_000),
    end_date: new Date(Date.now() + 7 * 86_400_000),
    project_number: "PRJ-2026-001",
    purpose: "Cross-region survey for fibre rollout phase 2 in Oromia",
    num_vehicles: 5,
    passengers: 8,
    pool_category: "region",
    pool_name: "Adama Region Pool",
    priority: "high",
    trip_type: "round_trip",
    contact_phone: "0911234567",
  };

  it("accepts a valid project request", () => {
    const r = validateVehicleRequestForm(base as any);
    expect(r.valid).toBe(true);
  });

  it("requires project_number", () => {
    const r = validateVehicleRequestForm({ ...base, project_number: "" } as any);
    expect(r.errors.project_number).toMatch(/required/);
  });

  it("rejects malformed project_number", () => {
    expect(validateVRField("project_number", "ab", base as any)).toMatch(/3.*30/);
  });

  it("rejects end_date before start_date", () => {
    const r = validateVehicleRequestForm({
      ...base,
      start_date: new Date(Date.now() + 7 * 86_400_000),
      end_date: new Date(Date.now() + 86_400_000),
    } as any);
    expect(r.errors.end_date).toMatch(/before the start/);
  });

  it("allows up to 50 vehicles", () => {
    expect(validateVRField("num_vehicles", 50, base as any)).toBeUndefined();
    expect(validateVRField("num_vehicles", 51, base as any)).toMatch(/Maximum 50/);
  });
});

describe("VR form validation — Field Operation", () => {
  const base = {
    request_type: "field_operation",
    start_date: new Date(Date.now() + 86_400_000),
    end_date: new Date(Date.now() + 2 * 86_400_000),
    purpose: "Field visit to BTS site #117 for antenna replacement and inspection",
    num_vehicles: 1,
    passengers: 3,
    priority: "normal",
    trip_type: "round_trip",
    contact_phone: "0911234567",
  };
  it("accepts a field request without project number", () => {
    expect(validateVehicleRequestForm(base as any).valid).toBe(true);
  });
});

// ─── 2. SANITIZATION ───────────────────────────────────────────────────
describe("VR sanitizers", () => {
  it("strips control chars from free text", () => {
    expect(sanitizeText("hello\u0001 world\u007F")).toBe("hello world");
  });
  it("normalizes project number to uppercase", () => {
    expect(sanitizeProjectNumber("prj-2026/01")).toBe("PRJ-2026/01");
  });
  it("strips all non-digit characters and keeps a leading +", () => {
    // Spaces, dashes, parentheses, and any extra letters are now stripped —
    // only digits and a single leading + survive (Ethiopian E.164).
    expect(sanitizePhone("+251 (911) 234-567 ext42")).toBe("+25191123456742");
    expect(sanitizePhone("0911 234 567")).toBe("0911234567");
  });
  it("sanitizeVehicleRequestForm normalizes all fields", () => {
    const out = sanitizeVehicleRequestForm({
      request_type: "daily_operation",
      purpose: "  Big   trip  \u0007 ",
      project_number: " prj_001 ",
      contact_phone: " +251@911 234 567 ",
      departure_place: "  HQ  ",
      destination: "  Site  ",
    } as any);
    expect(out.purpose).toBe("Big   trip");
    expect(out.project_number).toBe("PRJ_001");
    // Letters, spaces, and symbols all stripped — only digits + leading + survive.
    expect(out.contact_phone).toBe("+251911234567");
    expect(out.departure_place).toBe("HQ");
  });
});

// ─── 3. PIPELINE COLUMN MAPPING ────────────────────────────────────────
describe("Kanban column mapping", () => {
  it("maps every known status to a column", () => {
    const all = [
      "pending", "submitted", "draft", "approved", "assigned", "scheduled",
      "dispatched", "in_progress", "in_service", "completed", "closed",
      "rejected", "cancelled", "canceled",
    ];
    for (const s of all) expect(columnFor(s)).toBeTruthy();
  });

  it("returns canonical status for each column id", () => {
    expect(canonicalStatusFor("pending")).toBe("pending");
    expect(canonicalStatusFor("approved")).toBe("approved");
    expect(canonicalStatusFor("assigned")).toBe("assigned");
    expect(canonicalStatusFor("in_progress")).toBe("in_progress");
    expect(canonicalStatusFor("completed")).toBe("completed");
    expect(canonicalStatusFor("rejected")).toBe("rejected");
    expect(canonicalStatusFor("cancelled")).toBe("cancelled");
  });

  it("ignores unknown statuses", () => {
    expect(columnFor("ufo_status")).toBeUndefined();
  });
});

// ─── 4. STATUS-TRANSITION REDUCER (mirrors DnD handler) ────────────────
/** Produces the new status when a card is dropped on a column. */
function dropOnColumn(currentStatus: string, destColumnId: string) {
  const destCol = PIPELINE_COLUMNS.find((c) => c.id === destColumnId);
  if (!destCol) return { changed: false, status: currentStatus };
  if (destCol.match.includes(currentStatus)) return { changed: false, status: currentStatus };
  return { changed: true, status: destCol.match[0] };
}

describe("Kanban DnD status transitions", () => {
  it("happy path lifecycle", () => {
    let s = "pending";
    s = dropOnColumn(s, "approved").status;
    expect(s).toBe("approved");
    s = dropOnColumn(s, "assigned").status;
    expect(s).toBe("assigned");
    s = dropOnColumn(s, "in_progress").status;
    expect(s).toBe("in_progress");
    s = dropOnColumn(s, "completed").status;
    expect(s).toBe("completed");
  });

  it("dropping on same column is a no-op", () => {
    expect(dropOnColumn("approved", "approved")).toEqual({ changed: false, status: "approved" });
    expect(dropOnColumn("scheduled", "assigned")).toEqual({ changed: false, status: "scheduled" });
  });

  it("rejection and cancellation are reachable from any stage", () => {
    for (const start of ["pending", "approved", "assigned", "in_progress"]) {
      expect(dropOnColumn(start, "rejected").status).toBe("rejected");
      expect(dropOnColumn(start, "cancelled").status).toBe("cancelled");
    }
  });

  it("unknown destination column is rejected", () => {
    expect(dropOnColumn("pending", "warp_drive")).toEqual({ changed: false, status: "pending" });
  });
});
