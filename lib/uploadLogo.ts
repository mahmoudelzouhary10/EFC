import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Uploads an image file to the public "logos" storage bucket and returns
 * its public URL. Used for both the federation logo and clan logos.
 */
export async function uploadLogo(
  supabase: SupabaseClient,
  file: File,
  pathPrefix: string
): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${pathPrefix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("logos").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl;
}
