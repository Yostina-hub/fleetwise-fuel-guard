import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useState } from "react";
import * as XLSX from "xlsx";
import { VEHICLE_COLUMNS } from "./vehicleTableColumns";
import { friendlyToastError } from "@/lib/errorMessages";

export type ExportFormat = "csv" | "xlsx";

interface ExportableVehicle {
  id: string;
  vehicleId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  status: string;
  fuel: number | null;
  odometer: number;
  vehicleType?: string;
  fuelType?: string;
  assignedDriver?: string;
  raw?: Record<string, any>;
}

const csvEscape = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) val = val.join("; ");
  else if (typeof val === "object") val = JSON.stringify(val);
  const s = String(val);
  // Always quote, escape inner quotes
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Build CSV including every registered vehicle column + every raw DB field
 * not already covered, so the export is truly exhaustive.
 */
const buildFullCsv = (rows: Array<Record<string, any>>): string => {
  // Start with curated columns from the registry (skip "actions")
  const registryCols = VEHICLE_COLUMNS
    .filter((c) => c.id !== "actions")
    .map((c) => ({ key: c.id, label: c.label }));

  // Add any DB column not yet represented
  const seen = new Set<string>(registryCols.map((c) => c.key as string));
  const extraKeys = new Set<string>();
  rows.forEach((r) => {
    Object.keys(r).forEach((k) => {
      if (!seen.has(k)) extraKeys.add(k);
    });
  });

  const allCols = [
    ...registryCols,
    ...Array.from(extraKeys)
      .sort()
      .map((k) => ({ key: k, label: k })),
  ];

  const header = allCols.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((r) => allCols.map((c) => csvEscape(r[c.key])).join(","))
    .join("\n");

  return `${header}\n${body}`;
};

const downloadCsv = (csv: string, filename: string) => {
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
};

const downloadXlsx = (rows: Array<Record<string, any>>, filename: string) => {
  // Build matrix with same column ordering as CSV path
  const registryCols = VEHICLE_COLUMNS
    .filter((c) => c.id !== "actions")
    .map((c) => ({ key: c.id, label: c.label }));
  const seen = new Set<string>(registryCols.map((c) => c.key as string));
  const extraKeys = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!seen.has(k)) extraKeys.add(k); }));
  const allCols = [
    ...registryCols,
    ...Array.from(extraKeys).sort().map((k) => ({ key: k, label: k })),
  ];

  const data = [
    allCols.map((c) => c.label),
    ...rows.map((r) => allCols.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) return "";
      if (Array.isArray(v)) return v.join("; ");
      if (typeof v === "object") return JSON.stringify(v);
      return v;
    })),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = allCols.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as any;
  XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`);
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Legacy export path used when callers pass already-loaded vehicles
 * (e.g. selected rows). Prefers `raw` DB row for full-column output.
 */
export function exportToCSV(vehicles: ExportableVehicle[], filename: string = "fleet-export", format: ExportFormat = "csv") {
  const rows = vehicles.map((v) =>
    v.raw && typeof v.raw === "object"
      ? v.raw
      : {
          plate_number: v.plate,
          make: v.make,
          model: v.model,
          year: v.year,
          status: v.status,
          vehicle_type: v.vehicleType,
          fuel_type: v.fuelType,
          odometer_km: v.odometer,
          assigned_driver: v.assignedDriver,
        },
  );
  if (format === "xlsx") downloadXlsx(rows, filename);
  else downloadCsv(buildFullCsv(rows), filename);
}

export function useFleetExport() {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const [exporting, setExporting] = useState(false);

  // Export selected (or currently-loaded) vehicles
  const handleExport = (
    vehicles: ExportableVehicle[],
    selectedOnly: boolean = false,
    format: ExportFormat = "csv",
  ) => {
    if (vehicles.length === 0) {
      toast({ title: "No Data", description: "No vehicles to export", variant: "destructive" });
      return;
    }
    try {
      exportToCSV(vehicles, selectedOnly ? "fleet-selected" : "fleet-all", format);
      toast({
        title: "Export Successful",
        description: `Exported ${vehicles.length} vehicle(s) as ${format.toUpperCase()}`,
      });
    } catch {
      toast({ title: "Export Failed", description: "Failed to export data", variant: "destructive" });
    }
  };

  // Export EVERY vehicle in the database with EVERY column (bypasses pagination)
  const handleExportAll = async (format: ExportFormat = "csv") => {
    if (!organizationId) {
      friendlyToastError(null, { title: "Organization not found" });
      return;
    }

    setExporting(true);
    try {
      const allRows: Record<string, any>[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("vehicles")
          .select(
            "*, assigned_driver:drivers!vehicles_assigned_driver_id_fkey(id, first_name, last_name, phone, license_number)",
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          data.forEach((v: any) => {
            const driverName = v.assigned_driver
              ? `${v.assigned_driver.first_name ?? ""} ${v.assigned_driver.last_name ?? ""}`.trim()
              : "";
            const flat: Record<string, any> = { ...v, driver: driverName };
            flat.plate = v.plate_number;
            flat.make_model = `${v.make ?? ""} ${v.model ?? ""}`.trim();
            flat.odometer = v.odometer_km;
            delete flat.assigned_driver;
            allRows.push(flat);
          });
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (allRows.length === 0) {
        toast({ title: "No Data", description: "No vehicles to export", variant: "destructive" });
        return;
      }

      if (format === "xlsx") {
        downloadXlsx(allRows, "fleet-complete");
      } else {
        downloadCsv(buildFullCsv(allRows), "fleet-complete");
      }
      toast({
        title: "Export Successful",
        description: `Exported all ${allRows.length} vehicle(s) as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export Failed", description: "Failed to export data", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return { handleExport, handleExportAll, exporting };
}
