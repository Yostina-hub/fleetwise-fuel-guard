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
import { Loader2, Upload, FileText, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkImportDriversDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedDriver {
  first_name: string;
  last_name: string;
  license_number: string;
  license_class?: string;
  license_expiry?: string;
  email?: string;
  phone?: string;
  employee_id?: string;
  hire_date?: string;
  status?: string;
  rfid_tag?: string;
  ibutton_id?: string;
  bluetooth_id?: string;
  notes?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkImportDriversDialog({ open, onOpenChange }: BulkImportDriversDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedDrivers, setParsedDrivers] = useState<ParsedDriver[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = (text: string): ParsedDriver[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const drivers: ParsedDriver[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const driver: any = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          driver[header] = values[index];
        }
      });
      
      if (driver.first_name && driver.last_name && driver.license_number) {
        drivers.push({
          first_name: driver.first_name,
          last_name: driver.last_name,
          license_number: driver.license_number,
          license_class: driver.license_class || null,
          license_expiry: driver.license_expiry || null,
          email: driver.email || null,
          phone: driver.phone || null,
          employee_id: driver.employee_id || null,
          hire_date: driver.hire_date || null,
          status: driver.status || "active",
          rfid_tag: driver.rfid_tag || null,
          ibutton_id: driver.ibutton_id || null,
          bluetooth_id: driver.bluetooth_id || null,
          notes: driver.notes || null,
        });
      }
    }
    
    return drivers;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const drivers = parseCSV(text);
      setParsedDrivers(drivers);
    };
    reader.readAsText(selectedFile);
  };

  const importMutation = useMutation({
    mutationFn: async (drivers: ParsedDriver[]) => {
      const results: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (let i = 0; i < drivers.length; i++) {
        try {
          const { error } = await supabase.from("drivers").insert({
            ...drivers[i],
            organization_id: organizationId,
          });
          
          if (error) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${err.message}`);
        }
        
        setProgress(Math.round(((i + 1) / drivers.length) * 100));
      }
      
      return results;
    },
    onSuccess: (results) => {
      setResult(results);
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({
        title: "Import Complete",
        description: `${results.success} drivers imported, ${results.failed} failed`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (parsedDrivers.length === 0) return;
    setProgress(0);
    importMutation.mutate(parsedDrivers);
  };

  const downloadTemplate = () => {
    const headers = "first_name,last_name,license_number,license_class,license_expiry,email,phone,employee_id,hire_date,status,rfid_tag,ibutton_id,bluetooth_id,notes";
    const example = "John,Doe,DL-123456,B,2025-12-31,john@example.com,+251911123456,EMP-001,2023-01-15,active,RFID123,IBTN456,BT789,Experienced driver";
    const csv = `${headers}\n${example}`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "driver_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setFile(null);
    setParsedDrivers([]);
    setProgress(0);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetDialog();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Bulk Import Drivers
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple drivers at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{parsedDrivers.length} drivers ready to import</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </div>
            )}
          </div>

          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing drivers...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span>{result.success} imported</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{result.failed} failed</span>
                  </div>
                )}
              </div>
              
              {result.errors.length > 0 && (
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-1 text-sm">
                    {result.errors.map((error, i) => (
                      <p key={i} className="text-destructive">{error}</p>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedDrivers.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Import {parsedDrivers.length} Drivers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
