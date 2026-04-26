/**
 * Generic duplicate detection for bulk imports.
 *
 * Takes a set of parsed rows + the unique key (e.g. plate_number,
 * license_number) and queries the target table to figure out which rows
 * already exist. Result feeds the duplicate-handling UI before any write.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ParsedRow } from "./importParser";

export type ConflictStrategy = "update" | "skip" | "reject";

export const CONFLICT_STRATEGY_LABELS: Record<ConflictStrategy, string> = {
  update: "Update existing records (upsert)",
  skip: "Skip duplicates, only insert new",
  reject: "Reject the whole import if any duplicates exist",
};

export const CONFLICT_STRATEGY_DESCRIPTIONS: Record<ConflictStrategy, string> = {
  update:
    "Existing rows matched by the key will be overwritten with values from the file.",
  skip:
    "Existing rows are left untouched. Only brand-new rows from the file are inserted.",
  reject:
    "Nothing is written if any row in the file matches an existing record. Useful for first-time imports.",
};

export interface DuplicateRowInfo {
  /** The 1-based row number from the file (matches ParsedRow.rowNumber) */
  rowNumber: number;
  /** Value of the duplicate key for that row (e.g. "AA-12345") */
  keyValue: string;
  /** PK of the existing DB record */
  existingId: string;
}

export interface DuplicateScan {
  /** Map of normalized key value → existing record id */
  existingByKey: Map<string, string>;
  /** Subset of the parsed rows that already exist in the DB */
  duplicates: DuplicateRowInfo[];
  /** Subset of the parsed rows that are new */
  newRows: ParsedRow[];
}

export interface ScanOptions {
  /** Table name in the public schema, e.g. "vehicles" or "drivers" */
  table: "vehicles" | "drivers";
  /** Column on the table that uniquely identifies a row, e.g. "plate_number" */
  keyColumn: string;
  /** Same column on the parsed row data — almost always identical to keyColumn */
  rowKey?: string;
  /** Optionally scope the lookup to a single organization */
  organizationId?: string | null;
}

const norm = (v: any) => String(v ?? "").trim().toLowerCase();

/**
 * Look up which of the parsed rows already exist in the target table.
 * Performs a single batched query (chunked to stay under URL limits).
 */
export async function scanForDuplicates(
  rows: ParsedRow[],
  options: ScanOptions,
): Promise<DuplicateScan> {
  const rowKey = options.rowKey ?? options.keyColumn;
  const candidateValues = Array.from(
    new Set(
      rows
        .map((r) => String(r.data[rowKey] ?? "").trim())
        .filter((v) => v.length > 0),
    ),
  );

  const existingByKey = new Map<string, string>();

  if (candidateValues.length === 0) {
    return { existingByKey, duplicates: [], newRows: [...rows] };
  }

  // Chunk to stay under PostgREST URL length limits.
  const CHUNK_SIZE = 200;
  for (let i = 0; i < candidateValues.length; i += CHUNK_SIZE) {
    const slice = candidateValues.slice(i, i + CHUNK_SIZE);
    let query = supabase
      .from(options.table)
      .select(`id, ${options.keyColumn}`)
      .in(options.keyColumn, slice);

    if (options.organizationId) {
      query = query.eq("organization_id", options.organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    for (const row of (data ?? []) as any[]) {
      const k = norm(row[options.keyColumn]);
      if (k) existingByKey.set(k, row.id);
    }
  }

  const duplicates: DuplicateRowInfo[] = [];
  const newRows: ParsedRow[] = [];

  for (const r of rows) {
    const k = norm(r.data[rowKey]);
    if (k && existingByKey.has(k)) {
      duplicates.push({
        rowNumber: r.rowNumber,
        keyValue: String(r.data[rowKey]),
        existingId: existingByKey.get(k)!,
      });
    } else {
      newRows.push(r);
    }
  }

  return { existingByKey, duplicates, newRows };
}
