import { useState, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const SAMPLE_CSV = `plate_number,make,model,year,vehicle_type,fuel_type,status,odometer_km,ownership_type
AA-12345,Toyota,Hilux,2022,pickup,diesel,active,50000,owned
BB-67890,Isuzu,D-Max,2021,truck,diesel,active,75000,leased
CC-11111,Ford,Transit,2023,van,diesel,maintenance,25000,owned`;

export default function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }
    
    return rows;
  };

  const validateRow = (row: Record<string, string>, index: number): { valid: boolean; error?: string } => {
    if (!row.plate_number?.trim()) {
      return { valid: false, error: `Row ${index + 2}: Plate number is required` };
    }
    if (!row.make?.trim()) {
      return { valid: false, error: `Row ${index + 2}: Make is required` };
    }
    if (!row.model?.trim()) {
      return { valid: false, error: `Row ${index + 2}: Model is required` };
    }
    const year = parseInt(row.year);
    if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
      return { valid: false, error: `Row ${index + 2}: Invalid year` };
    }
    return { valid: true };
  };

  const handleImport = async () => {
    if (!file || !organizationId) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: "Error",
          description: "No valid data found in CSV file",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      const importResult: ImportResult = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const validation = validateRow(row, i);
        
        if (!validation.valid) {
          importResult.failed++;
          importResult.errors.push({ row: i + 2, message: validation.error! });
          continue;
        }

          try {
            const vehicleData: any = {
              organization_id: organizationId,
              plate_number: row.plate_number.trim(),
              make: row.make.trim(),
              model: row.model.trim(),
              year: parseInt(row.year),
              fuel_type: row.fuel_type?.trim() || 'diesel',
              status: ['active', 'maintenance', 'inactive'].includes(row.status?.trim()) 
                ? row.status.trim() 
                : 'active',
            };
            
            if (row.vehicle_type?.trim()) vehicleData.vehicle_type = row.vehicle_type.trim();
            if (row.odometer_km) vehicleData.odometer_km = parseFloat(row.odometer_km);
            if (row.ownership_type?.trim() && ['owned', 'leased', 'rented'].includes(row.ownership_type.trim())) {
              vehicleData.ownership_type = row.ownership_type.trim();
            }
            if (row.vin?.trim()) vehicleData.vin = row.vin.trim();
            if (row.color?.trim()) vehicleData.color = row.color.trim();
            if (row.tank_capacity_liters) vehicleData.tank_capacity_liters = parseFloat(row.tank_capacity_liters);

            const { error } = await supabase.from("vehicles").insert(vehicleData);

          if (error) {
            importResult.failed++;
            importResult.errors.push({ row: i + 2, message: error.message });
          } else {
            importResult.success++;
          }
        } catch (err: any) {
          importResult.failed++;
          importResult.errors.push({ row: i + 2, message: err.message });
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setResult(importResult);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });

      if (importResult.success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${importResult.success} vehicle(s)`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import vehicles",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicle-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialog();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Bulk Import Vehicles
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple vehicles at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Need a template?</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a CSV file or drag and drop
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{result.success} successful</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span>{result.failed} failed</span>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <ScrollArea className="h-32 border rounded-lg p-2">
                  <div className="space-y-1">
                    {result.errors.map((error, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{error.message}</span>
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
              onClick={handleImport} 
              disabled={!file || importing}
            >
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import Vehicles
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
