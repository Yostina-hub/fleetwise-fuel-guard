import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  bucket?: string;
  pathPrefix: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
}

const PhotoUploader = ({
  bucket = "vehicle-attachments",
  pathPrefix,
  value,
  onChange,
  max = 5,
  label = "Add photos",
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (value.length + files.length > max) {
      toast.error(`Maximum ${max} photos allowed`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) uploaded.push(signed.signedUrl);
      }
      onChange([...value, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} photo(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || value.length >= max}
        onClick={() => inputRef.current?.click()}
        className="gap-1"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {label} ({value.length}/{max})
      </Button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`upload-${idx}`}
                className="w-16 h-16 object-cover rounded border border-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
