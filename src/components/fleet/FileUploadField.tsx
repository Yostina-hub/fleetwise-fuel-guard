import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

interface FileUploadFieldProps {
  label: string;
  accept: string;
  currentUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  selectedFile?: File | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function FileUploadField({ label, accept, currentUrl, onFileSelect, selectedFile }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_SIZE) {
      alert("File size must be under 5MB");
      return;
    }
    onFileSelect(file);
  };

  const displayName = selectedFile?.name || (currentUrl ? currentUrl.split("/").pop() : null);
  const isImage = selectedFile?.type?.startsWith("image/") || currentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 justify-start text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          {displayName ? (
            <>
              {isImage ? <ImageIcon className="w-4 h-4 mr-2 shrink-0" /> : <FileText className="w-4 h-4 mr-2 shrink-0" />}
              <span className="truncate">{displayName}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Choose file...
            </>
          )}
        </Button>
        {(selectedFile || currentUrl) && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => onFileSelect(null)}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  );
}
