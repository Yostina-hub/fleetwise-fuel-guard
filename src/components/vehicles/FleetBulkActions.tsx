import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  CheckSquare, 
  X, 
  MapPin, 
  Bell,
  Wrench,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FleetBulkActionsProps {
  selectedIds: Set<string>;
  vehicles: Array<{ id: string; plate: string; make: string; model: string; status: string; speed: number; fuel: number; lat?: number; lng?: number; lastUpdate?: string; branch?: string; }>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  allSelected: boolean;
}

const FleetBulkActions = ({ selectedIds, vehicles, onClearSelection, onSelectAll, allSelected }: FleetBulkActionsProps) => {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const exportVehicles = selectedIds.size > 0 
        ? vehicles.filter(v => selectedIds.has(v.id))
        : vehicles;

      const headers = ["Plate", "Make", "Model", "Status", "Speed (km/h)", "Fuel %", "Latitude", "Longitude", "Branch", "Last Update"];
      const rows = exportVehicles.map(v => [
        v.plate, v.make, v.model, v.status, v.speed, v.fuel,
        v.lat?.toFixed(5) || "", v.lng?.toFixed(5) || "",
        v.branch || "", v.lastUpdate || ""
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fleet-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportVehicles.length} vehicles`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Select All / Clear */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={allSelected ? onClearSelection : onSelectAll}
      >
        <CheckSquare className="w-3.5 h-3.5" />
        {allSelected ? "Deselect" : "Select All"}
      </Button>

      {/* Export */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8 border-success/50 text-success hover:bg-success/10"
        onClick={handleExportCSV}
        disabled={exporting}
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Export {selectedIds.size > 0 ? `(${selectedIds.size})` : "All"}
      </Button>

      {/* Bulk Actions Bar - appears when items selected */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 ml-2 pl-2 border-l border-border"
          >
            <Badge variant="secondary" className="gap-1 text-xs">
              {selectedIds.size} selected
            </Badge>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={onClearSelection}>
              <X className="w-3 h-3" /> Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetBulkActions;
