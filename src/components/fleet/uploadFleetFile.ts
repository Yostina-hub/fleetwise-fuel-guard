import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to Supabase Storage and return the public URL path.
 */
export async function uploadFleetFile(
  bucket: "driver-documents" | "vehicle-attachments",
  entityId: string,
  fileName: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${entityId}/${fileName}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
