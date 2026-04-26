/**
 * Generic file parser & validator for bulk imports (vehicles, drivers, …).
 *
 * Supports CSV (RFC 4180 quoted fields) and XLSX via SheetJS.
 * Returns a tabular intermediate form { rows, errors } — UI shows a
 * dry-run preview before any DB write.
 *
 * Pass a `ImportField[]` schema describing the columns; the parser is
 * otherwise schema-agnostic.
 */
import * as XLSX from "xlsx";
import {
  IMPORTABLE_FIELDS as VEHICLE_FIELDS,
  ImportField,
  resolveField as resolveVehicleField,
} from "./importSchema";

export interface ParsedRow {
  /** 1-based row number as it appears in the file (incl. header row) */
  rowNumber: number;
  /** Coerced values keyed by DB column */
  data: Record<string, any>;
  /** Per-row validation errors */
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  unmappedHeaders: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

/* ---------- CSV parser (RFC 4180) ---------- */

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      // handle CRLF
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // flush last cell/row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

/* ---------- Value coercion ---------- */

function coerceValue(field: ImportField, raw: any): { value: any; error?: string } {
  if (raw === null || raw === undefined || raw === "") {
    if (field.required) return { value: null, error: `${field.header} is required` };
    return { value: null };
  }

  switch (field.type) {
    case "string": {
      const s = String(raw).trim();
      if (field.maxLength && s.length > field.maxLength) {
        return { value: s, error: `${field.header} exceeds ${field.maxLength} characters` };
      }
      return { value: s };
    }
    case "number":
    case "int": {
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
      if (!Number.isFinite(n)) return { value: null, error: `${field.header} must be a number` };
      const v = field.type === "int" ? Math.trunc(n) : n;
      if (field.min != null && v < field.min) return { value: v, error: `${field.header} below minimum ${field.min}` };
      if (field.max != null && v > field.max) return { value: v, error: `${field.header} above maximum ${field.max}` };
      return { value: v };
    }
    case "bool": {
      const s = String(raw).trim().toLowerCase();
      if (["true", "yes", "y", "1"].includes(s)) return { value: true };
      if (["false", "no", "n", "0"].includes(s)) return { value: false };
      return { value: null, error: `${field.header} must be true/false` };
    }
    case "date": {
      // Excel can ship dates as numbers (serial) or as text
      let iso: string | null = null;
      if (typeof raw === "number") {
        const d = XLSX.SSF.parse_date_code(raw);
        if (d) {
          const mm = String(d.m).padStart(2, "0");
          const dd = String(d.d).padStart(2, "0");
          iso = `${d.y}-${mm}-${dd}`;
        }
      } else {
        const s = String(raw).trim();
        // Accept yyyy-mm-dd, mm/dd/yyyy, dd-mm-yyyy
        const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (isoMatch) {
          iso = `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
        } else if (slashMatch) {
          // assume MM/DD/YYYY
          iso = `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
        } else {
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) {
            iso = parsed.toISOString().slice(0, 10);
          }
        }
      }
      if (!iso) return { value: null, error: `${field.header} is not a valid date` };
      return { value: iso };
    }
    case "enum": {
      const s = String(raw).trim().toLowerCase();
      if (!field.enumValues?.includes(s)) {
        return { value: s, error: `${field.header} must be one of: ${field.enumValues?.join(", ")}` };
      }
      return { value: s };
    }
  }
}

/* ---------- Public entry point ---------- */

export async function parseImportFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  let matrix: any[][] = [];

  if (ext === "csv" || file.type === "text/csv") {
    const text = await file.text();
    matrix = parseCsv(text);
  } else if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: false });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", blankrows: false }) as any[][];
  } else {
    throw new Error("Unsupported file type. Please upload .csv, .xlsx or .xls");
  }

  if (matrix.length < 2) {
    return { rows: [], unmappedHeaders: [], totalRows: 0, validRows: 0, invalidRows: 0 };
  }

  const headerRow = matrix[0].map((h) => String(h ?? "").trim());
  const fieldMap: (ImportField | undefined)[] = headerRow.map((h) => resolveField(h));
  const unmappedHeaders = headerRow.filter((h, i) => h && !fieldMap[i]);

  const rows: ParsedRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i];
    const row: ParsedRow = { rowNumber: i + 1, data: {}, errors: [] };

    for (let c = 0; c < headerRow.length; c++) {
      const field = fieldMap[c];
      if (!field) continue;
      const { value, error } = coerceValue(field, raw[c]);
      if (error) row.errors.push(`Row ${i + 1}: ${error}`);
      if (value !== null && value !== undefined) row.data[field.dbKey] = value;
    }

    // Check missing required fields not present in headers at all
    for (const f of IMPORTABLE_FIELDS) {
      if (f.required && row.data[f.dbKey] == null) {
        const alreadyReported = row.errors.some((e) => e.includes(`${f.header} is required`));
        if (!alreadyReported) row.errors.push(`Row ${i + 1}: ${f.header} is required`);
      }
    }

    rows.push(row);
  }

  return {
    rows,
    unmappedHeaders,
    totalRows: rows.length,
    validRows: rows.filter((r) => r.errors.length === 0).length,
    invalidRows: rows.filter((r) => r.errors.length > 0).length,
  };
}

/* ---------- Template generator ---------- */

export function downloadImportTemplate(format: "xlsx" | "csv" = "xlsx") {
  const headers = IMPORTABLE_FIELDS.map((f) => f.header);
  const hints = IMPORTABLE_FIELDS.map((f) => {
    const parts = [f.required ? "REQUIRED" : "optional"];
    if (f.type === "enum") parts.push(`one of: ${f.enumValues?.join(" | ")}`);
    if (f.type === "date") parts.push("YYYY-MM-DD");
    if (f.maxLength) parts.push(`max ${f.maxLength} chars`);
    if (f.hint) parts.push(f.hint);
    return parts.join(" — ");
  });

  // Fully populated sample row — gives users a concrete example for every column
  const SAMPLE_VALUES: Record<string, any> = {
    plate_number: "AA-12345",
    make: "Toyota",
    model: "Hilux",
    year: new Date().getFullYear() - 1,
    vehicle_type: "pickup",
    vehicle_group: "Operations",
    vehicle_category: "Light Duty",
    color: "White",
    vin: "JTFDE626X00012345",
    fuel_type: "diesel",
    transmission_type: "manual",
    drive_type: "4wd",
    engine_cc: 2800,
    engine_number: "1GD-FTV-9876543",
    model_code: "GUN125L",
    tank_capacity_liters: 80,
    seating_capacity: 5,
    loading_capacity_quintal: 10,
    capacity_kg: 1000,
    status: "active",
    ownership_type: "owned",
    assigned_location: "zone_eaaz_aa",
    specific_pool: "HQ Pool",
    specific_location: "Bole, Addis Ababa",
    purpose_for: "Field Operations",
    odometer_km: 45000,
    fuel_standard_km_per_liter: 12.5,
    purchasing_price: 2500000,
    current_market_price: 2100000,
    mfg_date: "2023-05-15",
    year_of_ownership: 2023,
    registration_cert_no: "REG-2023-00123",
    registration_expiry: "2026-05-14",
    insurance_policy_no: "INS-POL-998877",
    insurance_expiry: "2026-05-14",
    permit_expiry: "2026-12-31",
    owner_type: "Company",
    owner_full_name: "Acme Logistics PLC",
    owner_phone: "+251911234567",
    owner_email: "fleet@acme.example",
  };
  const sample = IMPORTABLE_FIELDS.map((f) => SAMPLE_VALUES[f.dbKey] ?? "");

  if (format === "csv") {
    const csvEscape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(csvEscape).join(","),
      hints.map(csvEscape).join(","),
      sample.map(csvEscape).join(","),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, "vehicle-import-template.csv");
    return;
  }

  // XLSX with two sheets: "Vehicles" + "Instructions"
  const wb = XLSX.utils.book_new();
  const wsData = [headers, sample];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, "Vehicles");

  const helpData = [
    ["Field", "Required", "Type", "Notes / Allowed values"],
    ...IMPORTABLE_FIELDS.map((f) => [
      f.header,
      f.required ? "Yes" : "No",
      f.type,
      [
        f.enumValues ? `Allowed: ${f.enumValues.join(" | ")}` : "",
        f.maxLength ? `Max ${f.maxLength} chars` : "",
        f.min != null ? `Min ${f.min}` : "",
        f.max != null ? `Max ${f.max}` : "",
        f.hint ?? "",
      ].filter(Boolean).join(" · "),
    ]),
  ];
  const help = XLSX.utils.aoa_to_sheet(helpData);
  help["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, help, "Instructions");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "vehicle-import-template.xlsx");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
