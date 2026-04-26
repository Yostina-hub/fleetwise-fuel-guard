import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, FileText, Download, CheckCircle2, XCircle,
  AlertCircle, FileSpreadsheet, ChevronDown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  parseImportFile,
  downloadImportTemplate,
  type ParseResult,
} from "./import/importParser";
import {
  scanForDuplicates,
  type ConflictStrategy,
  type DuplicateScan,
} from "./import/duplicateDetection";
import ConflictStrategyPicker from "./import/ConflictStrategyPicker";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportOutcome {
  inserted: number;
  updated: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const MAX_ROWS = 500;

export default function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [dupScan, setDupScan] = useState<DuplicateScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [strategy, setStrategy] = useState<ConflictStrategy>("update");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setDupScan(null);
    setScanning(false);
    setStrategy("update");
    setResult(null);
    setProgress(0);
    setParsing(false);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSelectFile = useCallback(async (selected: File) => {
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast({
        title: "Unsupported file",
        description: "Please upload a .csv, .xlsx, or .xls file",
        variant: "destructive",
      });
      return;
    }
    setFile(selected);
    setResult(null);
    setDupScan(null);
    setParsing(true);
    try {
      const parsed = await parseImportFile(selected);
      setPreview(parsed);
      if (parsed.totalRows > MAX_ROWS) {
        toast({
          title: "Batch too large",
          description: `Maximum ${MAX_ROWS} vehicles per import. Found ${parsed.totalRows}.`,
          variant: "destructive",
        });
        return;
      }

      // Duplicate detection — scope to this organization
      const validRows = parsed.rows.filter((r) => r.errors.length === 0);
      if (validRows.length > 0 && organizationId) {
        setScanning(true);
        try {
          const scan = await scanForDuplicates(validRows, {
            table: "vehicles",
            keyColumn: "plate_number",
            organizationId,
          });
          setDupScan(scan);
        } catch (e: any) {
          toast({
            title: "Duplicate check failed",
            description: e.message ?? "Could not scan existing vehicles",
            variant: "destructive",
          });
        } finally {
          setScanning(false);
        }
      }
    } catch (err: any) {
      toast({
        title: "Failed to parse file",
        description: err.message ?? "Unknown error",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setParsing(false);
    }
  }, [toast, organizationId]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleSelectFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleSelectFile(f);
  };

  const handleImport = async () => {
    if (!preview || !organizationId) return;
    if (preview.totalRows > MAX_ROWS) return;

    const validRows = preview.rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast({
        title: "Nothing to import",
        description: "Fix the validation errors and try again",
        variant: "destructive",
      });
      return;
    }

    const dupCount = dupScan?.duplicates.length ?? 0;

    // Reject mode: bail out if ANY duplicate exists
    if (dupCount > 0 && strategy === "reject") {
      toast({
        title: "Import rejected",
        description: `${dupCount} duplicate ${dupCount === 1 ? "row matches" : "rows match"} existing vehicles. Change the duplicate strategy or remove them from the file.`,
        variant: "destructive",
      });
      return;
    }

    // Build the per-row plan: which rows actually go to the DB
    const dupKeys = new Set(
      (dupScan?.duplicates ?? []).map((d) => d.keyValue.trim().toLowerCase()),
    );
    const existingByKey = dupScan?.existingByKey ?? new Map<string, string>();

    const rowsToProcess =
      strategy === "skip"
        ? validRows.filter(
            (r) =>
              !dupKeys.has(
                String(r.data.plate_number ?? "").trim().toLowerCase(),
              ),
          )
        : validRows;

    if (rowsToProcess.length === 0) {
      toast({
        title: "Nothing to import",
        description:
          "All rows in the file are duplicates and your strategy is set to skip them.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    const outcome: ImportOutcome = { inserted: 0, updated: 0, failed: 0, errors: [] };

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      const plate = String(row.data.plate_number ?? "").trim();
      const plateKey = plate.toLowerCase();
      const payload: Record<string, any> = {
        ...row.data,
        organization_id: organizationId,
        fuel_type: row.data.fuel_type ?? "diesel",
        status: row.data.status ?? "active",
      };

      try {
        const existingId = existingByKey.get(plateKey);
        if (existingId) {
          // Only reachable when strategy === "update"
          const { error } = await supabase
            .from("vehicles")
            .update(payload)
            .eq("id", existingId);
          if (error) throw error;
          outcome.updated++;
        } else {
          const { error } = await supabase
            .from("vehicles")
            .insert(payload as any);
          if (error) throw error;
          outcome.inserted++;
        }
      } catch (err: any) {
        outcome.failed++;
        outcome.errors.push({ row: row.rowNumber, message: err.message ?? "Insert failed" });
      }
      setProgress(Math.round(((i + 1) / rowsToProcess.length) * 100));
    }

    setResult(outcome);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });

    const total = outcome.inserted + outcome.updated;
    const skippedCount =
      strategy === "skip" ? validRows.length - rowsToProcess.length : 0;
    if (total > 0) {
      toast({
        title: "Import complete",
        description: `${outcome.inserted} added · ${outcome.updated} updated${
          skippedCount ? ` · ${skippedCount} skipped` : ""
        }${outcome.failed ? ` · ${outcome.failed} failed` : ""}`,
      });
    } else {
      toast({
        title: "Import failed",
        description: "No vehicles were saved. See errors below.",
        variant: "destructive",
      });
    }
  };

  const allRowErrors = preview?.rows.flatMap((r) => r.errors) ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Bulk Import Vehicles
          </DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx) or CSV file. We'll preview, validate, and
            check for duplicates before saving. You decide what happens to
            existing vehicles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Need a template with all supported fields?</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadImportTemplate("xlsx")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (.xlsx) — recommended
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadImportTemplate("csv")}>
                  <FileText className="w-4 h-4 mr-2" /> CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Drag & drop zone */}
          {!result && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50",
                )}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <span className="font-medium">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file or drag &amp; drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports .xlsx, .xls, .csv · max {MAX_ROWS} rows
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parsing indicator */}
          {(parsing || scanning) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {parsing ? "Parsing file..." : "Checking for duplicates..."}
            </div>
          )}

          {/* Dry-run preview */}
          {preview && !importing && !result && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Total: {preview.totalRows}</Badge>
                <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid: {preview.validRows}
                </Badge>
                {preview.invalidRows > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" /> Errors: {preview.invalidRows}
                  </Badge>
                )}
                {dupScan && dupScan.duplicates.length > 0 && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/15">
                    <AlertCircle className="w-3 h-3 mr-1" /> Duplicates:{" "}
                    {dupScan.duplicates.length}
                  </Badge>
                )}
                {preview.unmappedHeaders.length > 0 && (
                  <Badge variant="secondary">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {preview.unmappedHeaders.length} unmapped column(s)
                  </Badge>
                )}
              </div>

              {preview.unmappedHeaders.length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  Ignored columns (not in schema): {preview.unmappedHeaders.join(", ")}
                </div>
              )}

              {/* Duplicate handling picker */}
              {dupScan && !scanning && preview.validRows > 0 && (
                <ConflictStrategyPicker
                  entityLabel="vehicle"
                  keyLabel="plate number"
                  duplicates={dupScan.duplicates}
                  newCount={dupScan.newRows.length}
                  strategy={strategy}
                  onStrategyChange={setStrategy}
                  disabled={importing}
                />
              )}

              {allRowErrors.length > 0 && (
                <ScrollArea className="h-40 border rounded-lg p-2">
                  <div className="space-y-1">
                    {allRowErrors.slice(0, 50).map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{e}</span>
                      </div>
                    ))}
                    {allRowErrors.length > 50 && (
                      <p className="text-xs text-muted-foreground italic">
                        ...and {allRowErrors.length - 50} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Saving to database...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Final result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-success">{result.inserted}</p>
                  <p className="text-xs text-muted-foreground">Added</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-primary">{result.updated}</p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold text-destructive">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <ScrollArea className="h-32 border rounded-lg p-2">
                  <div className="space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Row {e.row}: {e.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {file && !result && (
            <Button variant="ghost" onClick={reset} disabled={importing || parsing}>
              Choose another file
            </Button>
          )}
          {!result && (() => {
            const dupCount = dupScan?.duplicates.length ?? 0;
            const newCount = dupScan?.newRows.length ?? preview?.validRows ?? 0;
            const willProcess =
              strategy === "skip" ? newCount :
              strategy === "reject" && dupCount > 0 ? 0 :
              preview?.validRows ?? 0;
            const buttonLabel = preview
              ? strategy === "reject" && dupCount > 0
                ? `Cannot import — ${dupCount} duplicate(s)`
                : strategy === "skip"
                  ? `Import ${newCount} new ${newCount === 1 ? "row" : "rows"}`
                  : `Import ${preview.validRows} ${preview.validRows === 1 ? "row" : "rows"}`
              : "Import";
            return (
              <Button
                onClick={handleImport}
                disabled={
                  !preview ||
                  importing ||
                  parsing ||
                  scanning ||
                  preview.validRows === 0 ||
                  preview.totalRows > MAX_ROWS ||
                  willProcess === 0
                }
              >
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {buttonLabel}
              </Button>
            );
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
