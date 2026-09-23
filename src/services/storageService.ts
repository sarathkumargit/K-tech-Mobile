import { getSupabase } from "@/lib/supabase";

export const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return `${file.name}: use JPG, PNG, WebP, AVIF or GIF.`;
  if (file.size > MAX_BYTES) return `${file.name}: images must be 5 MB or smaller.`;
  return null;
}

// Uploads to product-images/<productId>/<random>.<ext> and returns its public URL.
export async function uploadProductImage(productId: string, file: File) {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const storage = getSupabase().storage.from(PRODUCT_IMAGES_BUCKET);

  const { error } = await storage.upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  return { path, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}

export async function removeStorageFiles(paths: string[]) {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return;
  const { error } = await getSupabase().storage.from(PRODUCT_IMAGES_BUCKET).remove(clean);
  if (error) throw error;
}
