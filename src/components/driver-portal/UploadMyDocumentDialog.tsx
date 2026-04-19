/**
 * UploadMyDocumentDialog — lets a driver upload their own compliance document
 * (work permit, medical certificate, training certificate, etc.) directly from
 * the driver-facing My License hub. Files go to the `driver-documents` bucket
 * and a row is inserted into `documents` with entity_type='driver'.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export type UploadDocCategory = "work_permit" | "medical_certificate" | "training_certificate" | "other";

const CATEGORY_LABEL: Record<UploadDocCategory, string> = {
  work_permit: "work permit",
  medical_certificate: "medical certificate",
  training_certificate: "training certificate",
  other: "document",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId: string;
  category: UploadDocCategory;
  /** Called after a successful upload so parents can refetch. */
  onUploaded?: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function UploadMyDocumentDialog({ open, onOpenChange, driverId, category, onUploaded }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [file, setFile] = useState<File | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null); setDocNumber(""); setIssueDate(""); setExpiryDate("");
  };

  const handleSubmit = async () => {
    if (!file) { toast.error("Choose a file first"); return; }
    if (!organizationId || !driverId) { toast.error("Missing organization or driver"); return; }
    if (file.size > MAX_BYTES) { toast.error("File must be 10MB or smaller"); return; }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${organizationId}/${driverId}/${category}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("driver-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("driver-documents").getPublicUrl(path);

      const { error: insErr } = await supabase.from("documents").insert({
        organization_id: organizationId,
        entity_type: "driver",
        entity_id: driverId,
        document_type: category,
        file_name: file.name,
        file_url: urlData.publicUrl || path,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        document_number: docNumber || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        created_by: user?.id || null,
      });
      if (insErr) throw insErr;

      toast.success(`${CATEGORY_LABEL[category]} uploaded — pending verification`);
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (err: any) {
      console.error("[UploadMyDocumentDialog]", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">Upload {CATEGORY_LABEL[category]}</DialogTitle>
          <DialogDescription>
            Submit your {CATEGORY_LABEL[category]}. Fleet Operations will verify it after upload.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="upload-file">File (PDF or image, max 10MB)</Label>
            <Input
              id="upload-file"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="upload-doc-no">Document number (optional)</Label>
              <Input id="upload-doc-no" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upload-issue">Issue date</Label>
              <Input id="upload-issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upload-expiry">Expiry date</Label>
              <Input id="upload-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy || !file} className="gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
