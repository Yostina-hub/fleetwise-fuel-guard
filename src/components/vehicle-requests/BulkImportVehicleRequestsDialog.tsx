import { useState, useRef, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

// Hard cap on uploaded spreadsheet size to keep parsing snappy and stop
// runaway memory use on accidental huge files. 10 MB easily covers 200 rows.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 200;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const ALLOWED_TYPES = ["daily_operation", "project_operation", "field_operation", "group_operation"] as const;
const ALLOWED_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const ALLOWED_TRIP_TYPES = ["one_way", "round_trip", "multi_stop"] as const;

interface ParsedRequest {
  request_type: string;
  purpose: string;
  departure_place?: string | null;
  destination?: string | null;
  needed_from: string;          // ISO
  needed_until?: string | null; // ISO
  pool_name?: string | null;
  passengers?: number | null;
  num_vehicles?: number | null;
  vehicle_type?: string | null;
  priority?: string | null;
  trip_type?: string | null;
  project_number?: string | null;
  distance_estimate_km?: number | null;
  __row: number;                // original row number (for error display)
  __error?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const HEADERS = [
  "request_type",
  "purpose",
  "departure_place",
  "destination",
  "needed_from",
  "needed_until",
  "pool_name",
  "passengers",
  "num_vehicles",
  "vehicle_type",
  "priority",
  "trip_type",
  "project_number",
  "distance_estimate_km",
];

const TEMPLATE_EXAMPLE = [
  "daily_operation",
  "Site visit to client warehouse for monthly inspection",
  "Head Office",
  "Bole Industrial Park",
  "2026-05-01 08:00",
  "2026-05-01 17:00",
  "Pool A",
  "3",
  "1",
  "SUV",
  "normal",
  "round_trip",
  "",
  "45",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toIsoOrNull = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  // Excel sometimes parses dates as numbers
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const iso = new Date(
        Date.UTC(d.y, (d.m || 1) - 1, d.d || 1, d.H || 0, d.M || 0, Math.floor(d.S || 0)),
      ).toISOString();
      return iso;
    }
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function validateRow(r: ParsedRequest): string | null {
  if (!r.request_type) return "request_type is required";
  if (!ALLOWED_TYPES.includes(r.request_type as any))
    return `request_type must be one of: ${ALLOWED_TYPES.join(", ")}`;
  if (!r.purpose || r.purpose.trim().length < 10)
    return "purpose is required (min 10 characters)";
  if (r.purpose.length > 2000) return "purpose too long (max 2000)";
  if (!r.needed_from) return "needed_from is required (e.g. 2026-05-01 08:00)";
  if (r.priority && !ALLOWED_PRIORITIES.includes(r.priority as any))
    return `priority must be one of: ${ALLOWED_PRIORITIES.join(", ")}`;
  if (r.trip_type && !ALLOWED_TRIP_TYPES.includes(r.trip_type as any))
    return `trip_type must be one of: ${ALLOWED_TRIP_TYPES.join(", ")}`;
  if (r.passengers != null && (r.passengers < 0 || r.passengers > 200))
    return "passengers out of range (0-200)";
  if (r.num_vehicles != null && (r.num_vehicles < 1 || r.num_vehicles > 50))
    return "num_vehicles out of range (1-50)";
  return null;
}

function parseSheet(rows: any[]): ParsedRequest[] {
  return rows.map((raw, i) => {
    const get = (k: string) => {
      const key = Object.keys(raw).find((x) => x.toLowerCase().trim().replace(/\s+/g, "_") === k);
      return key ? raw[key] : "";
    };
    const r: ParsedRequest = {
      request_type: String(get("request_type") || "").trim().toLowerCase(),
      purpose: String(get("purpose") || "").trim(),
      departure_place: String(get("departure_place") || "").trim() || null,
      destination: String(get("destination") || "").trim() || null,
      needed_from: toIsoOrNull(get("needed_from")) || "",
      needed_until: toIsoOrNull(get("needed_until")),
      pool_name: String(get("pool_name") || "").trim() || null,
      passengers: num(get("passengers")),
      num_vehicles: num(get("num_vehicles")),
      vehicle_type: String(get("vehicle_type") || "").trim() || null,
      priority: String(get("priority") || "").trim().toLowerCase() || null,
      trip_type: String(get("trip_type") || "").trim().toLowerCase() || null,
      project_number: String(get("project_number") || "").trim() || null,
      distance_estimate_km: num(get("distance_estimate_km")),
      __row: i + 2, // header is row 1
    };
    r.__error = validateRow(r) || undefined;
    return r;
  });
}

async function readFile(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function BulkImportVehicleRequestsDialog({ open, onOpenChange }: Props) {
  const { organizationId } = useOrganization();
  const { user, profile } = useAuthContext();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRequest[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const valid = useMemo(() => parsed.filter((r) => !r.__error), [parsed]);
  const invalid = useMemo(() => parsed.filter((r) => r.__error), [parsed]);

  /* ----------- File handling --------------- */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null);
    setProgress(0);
    setParseError(null);

    if (f.size > MAX_FILE_BYTES) {
      const msg = `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
      setParseError(msg);
      toast.error(msg);
      setFile(null);
      setParsed([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(f);
    try {
      const rows = await readFile(f);
      if (rows.length > MAX_ROWS) {
        toast.warning(
          `File has ${rows.length} rows — only the first ${MAX_ROWS} will be considered.`,
        );
      }
      const items = parseSheet(rows.slice(0, MAX_ROWS));
      setParsed(items);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to parse file";
      setParseError(msg);
      toast.error(`Parse error: ${msg}`);
      setParsed([]);
    }
  };

  const downloadTemplate = (fmt: "csv" | "xlsx") => {
    const aoa = [HEADERS, TEMPLATE_EXAMPLE];
    if (fmt === "csv") {
      const csv = aoa
        .map((row) => row.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vehicle_requests_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Requests");
      XLSX.writeFile(wb, "vehicle_requests_template.xlsx");
    }
  };

  /* ----------- Import mutation --------------- */
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization context");
      if (!user?.id) throw new Error("Not authenticated");
      if (valid.length === 0) throw new Error("No valid rows to import");
      if (valid.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS} requests per import`);

      const requesterName =
        (profile as any)?.full_name ||
        [(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(" ") ||
        user.email ||
        "User";

      const out: ImportResult = { success: 0, failed: 0, errors: [] };
      for (let i = 0; i < valid.length; i++) {
        const r = valid[i];
        try {
          // Descriptive request # via DB helper. Fallback preserves bulk import
          // throughput if the RPC fails for a single row (errors don't cascade).
          let reqNum = `VR-${Date.now()}-${String(i + 1).padStart(3, "0")}`;
          try {
            const { data: rpcNum, error: rpcErr } = await (supabase as any).rpc(
              "generate_vehicle_request_number",
              { p_org_id: organizationId, p_request_type: r.request_type }
            );
            if (!rpcErr && typeof rpcNum === "string" && rpcNum.length > 0) {
              reqNum = rpcNum;
            }
          } catch { /* keep fallback */ }
          const { error } = await (supabase as any).from("vehicle_requests").insert({
            organization_id: organizationId,
            requester_id: user.id,
            requester_name: requesterName,
            request_number: reqNum,
            request_type: r.request_type,
            purpose: r.purpose,
            departure_place: r.departure_place,
            destination: r.destination,
            needed_from: r.needed_from,
            needed_until: r.needed_until,
            pool_name: r.pool_name,
            passengers: r.passengers,
            num_vehicles: r.num_vehicles ?? 1,
            vehicle_type: r.vehicle_type,
            priority: r.priority || "normal",
            trip_type: r.trip_type,
            project_number: r.project_number,
            distance_estimate_km: r.distance_estimate_km,
            status: "pending",
          });
          if (error) {
            out.failed++;
            out.errors.push({ row: r.__row, message: error.message });
          } else {
            out.success++;
          }
        } catch (err: any) {
          out.failed++;
          out.errors.push({ row: r.__row, message: err.message });
        }
        setProgress(Math.round(((i + 1) / valid.length) * 100));
      }
      return out;
    },
    onSuccess: (out) => {
      setResult(out);
      qc.invalidateQueries({ queryKey: ["vehicle-requests"] });
      const msg = `${out.success} created, ${out.failed} failed`;
      if (out.failed === 0) toast.success(`Import complete — ${msg}`);
      else if (out.success === 0) toast.error(`Import failed — ${msg}`);
      else toast.warning(`Import complete with errors — ${msg}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  const reset = () => {
    setFile(null);
    setParsed([]);
    setProgress(0);
    setResult(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Bulk Import Vehicle Requests
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file. Download the template below for the correct column format.
          </DialogDescription>
        </DialogHeader>

        {/* Top-of-dialog error summary: parse failures or row issues */}
        {(parseError || (invalid.length > 0 && !result)) && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {parseError
                ? parseError
                : `${invalid.length} row${invalid.length === 1 ? "" : "s"} have validation issues and will be skipped — see details below.`}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {/* Template downloads */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Templates:</span>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate("csv")}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate("xlsx")}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> XLSX
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              Max {MAX_ROWS} rows · {MAX_FILE_BYTES / 1024 / 1024} MB per import
            </span>
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <div className="flex items-center justify-center gap-3 mt-2 text-sm">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {valid.length} valid
                  </Badge>
                  {invalid.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {invalid.length} invalid
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to upload CSV / XLSX</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </div>
            )}
          </div>

          {/* Validation preview */}
          {invalid.length > 0 && !result && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">
                  {invalid.length} row{invalid.length === 1 ? "" : "s"} will be skipped
                </span>
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-1 text-xs font-mono">
                  {invalid.slice(0, 50).map((r) => (
                    <div key={r.__row} className="flex gap-2">
                      <span className="text-muted-foreground">Row {r.__row}:</span>
                      <span className="text-amber-700 dark:text-amber-300">{r.__error}</span>
                    </div>
                  ))}
                  {invalid.length > 50 && (
                    <div className="text-muted-foreground italic">
                      …and {invalid.length - 50} more
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing requests…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{result.success} created</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <X className="w-5 h-5" />
                    <span className="font-medium">{result.failed} failed</span>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <ScrollArea className="h-32 rounded border bg-background p-2">
                  <div className="space-y-1 text-xs font-mono">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-destructive">
                        Row {e.row}: {e.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={valid.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {valid.length} Request{valid.length === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
