import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, FileText, Video, Image, Music, File, Trash2, Download,
  Loader2, Eye, Paperclip, FileSpreadsheet, FileArchive,
} from "lucide-react";

interface CourseMaterialsPanelProps {
  courseId: string;
  courseTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FILE_TYPE_MAP: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  "application/pdf": { icon: <FileText className="w-5 h-5" />, label: "PDF", color: "text-red-500" },
  "video/mp4": { icon: <Video className="w-5 h-5" />, label: "Video", color: "text-blue-500" },
  "video/webm": { icon: <Video className="w-5 h-5" />, label: "Video", color: "text-blue-500" },
  "video/quicktime": { icon: <Video className="w-5 h-5" />, label: "Video", color: "text-blue-500" },
  "image/png": { icon: <Image className="w-5 h-5" />, label: "Image", color: "text-green-500" },
  "image/jpeg": { icon: <Image className="w-5 h-5" />, label: "Image", color: "text-green-500" },
  "image/webp": { icon: <Image className="w-5 h-5" />, label: "Image", color: "text-green-500" },
  "audio/mpeg": { icon: <Music className="w-5 h-5" />, label: "Audio", color: "text-purple-500" },
  "audio/wav": { icon: <Music className="w-5 h-5" />, label: "Audio", color: "text-purple-500" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: <FileText className="w-5 h-5" />, label: "DOCX", color: "text-blue-600" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: <FileSpreadsheet className="w-5 h-5" />, label: "XLSX", color: "text-green-600" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { icon: <FileText className="w-5 h-5" />, label: "PPTX", color: "text-orange-500" },
  "application/zip": { icon: <FileArchive className="w-5 h-5" />, label: "Archive", color: "text-yellow-500" },
  "text/plain": { icon: <FileText className="w-5 h-5" />, label: "Text", color: "text-muted-foreground" },
};

const getFileInfo = (mime: string | null) => {
  if (!mime) return { icon: <File className="w-5 h-5" />, label: "File", color: "text-muted-foreground" };
  return FILE_TYPE_MAP[mime] || { icon: <File className="w-5 h-5" />, label: mime.split("/")[1]?.toUpperCase() || "File", color: "text-muted-foreground" };
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.webm,.mov,.mp3,.wav,.png,.jpg,.jpeg,.webp,.gif,.txt,.zip,.rar";

export const CourseMaterialsPanel = ({ courseId, courseTitle, open, onOpenChange }: CourseMaterialsPanelProps) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["course-materials", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_materials")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!courseId,
  });

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !organizationId) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const storagePath = `${organizationId}/${courseId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("training-materials")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("training-materials")
        .getPublicUrl(storagePath);

      const fileType = file.type.startsWith("video") ? "video"
        : file.type.startsWith("image") ? "image"
        : file.type.startsWith("audio") ? "audio"
        : file.type.includes("pdf") ? "pdf"
        : "document";

      const { error: dbError } = await (supabase as any).from("course_materials").insert({
        course_id: courseId,
        organization_id: organizationId,
        file_name: file.name,
        file_type: fileType,
        file_url: urlData.publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
        sort_order: materials.length,
      });

      if (dbError) {
        toast.error(`Failed to save ${file.name} metadata`);
      }
    }

    setUploading(false);
    toast.success("Materials uploaded successfully");
    queryClient.invalidateQueries({ queryKey: ["course-materials", courseId] });
    e.target.value = "";
  }, [organizationId, courseId, materials.length, queryClient]);

  const handleDelete = async (materialId: string, fileUrl: string) => {
    setDeleting(materialId);
    // Extract storage path from URL
    const pathMatch = fileUrl.match(/training-materials\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from("training-materials").remove([pathMatch[1]]);
    }
    await (supabase as any).from("course_materials").delete().eq("id", materialId);
    queryClient.invalidateQueries({ queryKey: ["course-materials", courseId] });
    toast.success("Material deleted");
    setDeleting(null);
  };

  const openPreview = (url: string, mime: string | null) => {
    setPreviewUrl(url);
    setPreviewMime(mime);
  };

  const isPreviewable = (mime: string | null) => {
    if (!mime) return false;
    return mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("video/") || mime.startsWith("audio/");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary" />
              Course Materials
            </DialogTitle>
            <DialogDescription>
              Manage materials for: <strong>{courseTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload area */}
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload PDFs, videos, images, documents, audio files
              </p>
              <Label htmlFor="material-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Choose Files"}
                  </span>
                </Button>
              </Label>
              <Input
                id="material-upload"
                type="file"
                multiple
                accept={ACCEPTED_TYPES}
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-2">Max 100MB per file</p>
            </div>

            {/* Materials list */}
            <ScrollArea className="h-[350px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <File className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No materials uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {materials.map((mat: any) => {
                    const info = getFileInfo(mat.mime_type);
                    return (
                      <div key={mat.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                        <div className={info.color}>{info.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mat.file_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{info.label}</Badge>
                            <span>{formatFileSize(mat.file_size_bytes)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isPreviewable(mat.mime_type) && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPreview(mat.file_url, mat.mime_type)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <a href={mat.file_url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(mat.id, mat.file_url)}
                            disabled={deleting === mat.id}
                          >
                            {deleting === mat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={open => !open && setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px]">
            {previewMime?.startsWith("image/") && (
              <img src={previewUrl!} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            )}
            {previewMime === "application/pdf" && (
              <iframe src={previewUrl!} className="w-full h-[70vh] rounded-lg border" title="PDF Preview" />
            )}
            {previewMime?.startsWith("video/") && (
              <video src={previewUrl!} controls className="max-w-full max-h-[70vh] rounded-lg">
                Your browser does not support the video tag.
              </video>
            )}
            {previewMime?.startsWith("audio/") && (
              <audio src={previewUrl!} controls className="w-full">
                Your browser does not support the audio tag.
              </audio>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
