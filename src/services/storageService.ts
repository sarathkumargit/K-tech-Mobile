import { getSupabase } from "@/lib/supabase";

export const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024; // after compression
const MAX_INPUT_BYTES = 25 * 1024 * 1024; // straight-from-camera photos
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_SIDE = 1600; // px — sharp on phones and laptops, small to download
const QUALITY = 0.82;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return `${file.name}: use JPG, PNG, WebP, AVIF or GIF.`;
  if (file.size > MAX_INPUT_BYTES) return `${file.name}: images must be 25 MB or smaller.`;
  return null;
}

// Shrinks big photos in the browser before upload (max 1600px, WebP), so
// customers download ~100–300 KB instead of multi-MB camera files.
// GIFs (may be animated) and already-small images are left as they are.
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // format the browser can't decode — upload as is
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 400 * 1024) {
    bitmap.close();
    return file;
  }
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  // Some browsers can't encode WebP and fall back to PNG — keep whichever is smaller.
  if (!blob || blob.size >= file.size) return file;
  const ext = blob.type === "image/webp" ? "webp" : "png";
  const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], name, { type: blob.type });
}

// Uploads to product-images/<productId>/<random>.<ext> and returns its public URL.
export async function uploadProductImage(productId: string, original: File) {
  const problem = validateImageFile(original);
  if (problem) throw new Error(problem);
  const file = await compressImage(original);
  if (file.size > MAX_BYTES) throw new Error(`${original.name}: image is too large (max 5 MB).`);

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
