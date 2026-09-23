import { getSupabase } from "@/lib/supabase";
import type {
  Database,
  ProductCatalogRow,
  ProductImageRow,
  ProductRow,
  Spec,
} from "@/types/database";
import { cleanSearch, unwrap } from "./_shared";
import { removeStorageFiles, uploadProductImage } from "./storageService";

export type Product = ProductCatalogRow;
export type ProductImage = ProductImageRow;
export type ProductWithImages = Product & { images: ProductImage[] };
export type ProductSort = "newest" | "price_asc" | "price_desc";

export type ProductFilters = {
  categorySlug?: string;
  search?: string;
  offersOnly?: boolean;
  sort?: ProductSort;
  limit?: number;
};

const CATALOG = "product_catalog";

function applySearch<Q extends { or: (filters: string) => Q }>(query: Q, search?: string): Q {
  const q = cleanSearch(search ?? "");
  if (!q) return query;
  const like = `"%${q}%"`;
  return query.or(
    [
      `name.ilike.${like}`,
      `brand.ilike.${like}`,
      `sku.ilike.${like}`,
      `short_description.ilike.${like}`,
      `category_name.ilike.${like}`,
    ].join(","),
  );
}

// ---------- customer-facing (active products only) ----------

export function getProducts(filters: ProductFilters = {}) {
  let query = getSupabase().from(CATALOG).select("*").eq("is_active", true);
  if (filters.categorySlug) query = query.eq("category_slug", filters.categorySlug);
  if (filters.offersOnly) query = query.not("offer_id", "is", null);
  query = applySearch(query, filters.search);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("final_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("final_price", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", {
        ascending: false,
      });
  }
  if (filters.limit) query = query.limit(filters.limit);
  return unwrap<Product[]>(query);
}

export async function getFeaturedProducts(limit = 8) {
  const featured = await unwrap<Product[]>(
    getSupabase()
      .from(CATALOG)
      .select("*")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  if (featured.length > 0) return featured;
  // Nothing marked as featured yet: show the newest products instead.
  return getProducts({ limit });
}

export function getOfferProducts(limit = 12) {
  return unwrap<Product[]>(
    getSupabase()
      .from(CATALOG)
      .select("*")
      .eq("is_active", true)
      .not("offer_id", "is", null)
      .order("offer_end_date", { ascending: true })
      .limit(limit),
  );
}

export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  const supabase = getSupabase();
  const product = await unwrap<Product | null>(
    supabase.from(CATALOG).select("*").eq("slug", slug).eq("is_active", true).maybeSingle(),
  );
  if (!product) return null;
  const images = await unwrap<ProductImage[]>(
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order")
      .order("created_at"),
  );
  return { ...product, images };
}

export function getRelatedProducts(product: Pick<Product, "id" | "category_id">, limit = 4) {
  if (!product.category_id) return Promise.resolve([] as Product[]);
  return unwrap<Product[]>(
    getSupabase()
      .from(CATALOG)
      .select("*")
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([] as Product[]);
  return unwrap<Product[]>(getSupabase().from(CATALOG).select("*").in("id", ids));
}

// ---------- admin ----------

export type ProductInput = {
  name: string;
  slug: string;
  short_description: string | null;
  description: string;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  brand: string | null;
  sku: string | null;
  condition: string | null;
  specifications: Spec[];
  features: string[];
  is_featured: boolean;
  is_active: boolean;
};

export function adminListProducts(search?: string) {
  let query = getSupabase().from(CATALOG).select("*");
  query = applySearch(query, search);
  return unwrap<Product[]>(query.order("created_at", { ascending: false }));
}

export async function adminGetProduct(id: string) {
  const supabase = getSupabase();
  const product = await unwrap<ProductRow | null>(
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
  );
  if (!product) return null;
  const images = await unwrap<ProductImage[]>(
    supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
  );
  return { ...product, images };
}

export function createProduct(input: ProductInput) {
  const row: Database["public"]["Tables"]["products"]["Insert"] = input;
  return unwrap<ProductRow>(getSupabase().from("products").insert(row).select().single());
}

export function updateProduct(id: string, input: Partial<ProductInput>) {
  return unwrap<ProductRow>(
    getSupabase().from("products").update(input).eq("id", id).select().single(),
  );
}

export async function deleteProduct(id: string) {
  const supabase = getSupabase();
  const images = await unwrap<ProductImage[]>(
    supabase.from("product_images").select("storage_path").eq("product_id", id),
  );
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  // Clean up the files after the rows are gone (best effort).
  await removeStorageFiles(images.map((i) => i.storage_path ?? "")).catch(() => undefined);
}

export async function addProductImages(productId: string, files: File[], startOrder: number) {
  const added: ProductImage[] = [];
  let order = startOrder;
  for (const file of files) {
    const { path, publicUrl } = await uploadProductImage(productId, file);
    const row = await unwrap<ProductImage>(
      getSupabase()
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: publicUrl,
          storage_path: path,
          sort_order: order,
        })
        .select()
        .single(),
    ).catch(async (err) => {
      await removeStorageFiles([path]).catch(() => undefined);
      throw err;
    });
    added.push(row);
    order += 1;
  }
  return added;
}

export async function deleteProductImage(image: ProductImage) {
  const { error } = await getSupabase().from("product_images").delete().eq("id", image.id);
  if (error) throw error;
  if (image.storage_path) await removeStorageFiles([image.storage_path]).catch(() => undefined);
}

// Save a new order for the images (first = main image).
export async function reorderProductImages(images: ProductImage[]) {
  const supabase = getSupabase();
  for (const [index, image] of images.entries()) {
    if (image.sort_order === index) continue;
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", image.id);
    if (error) throw error;
  }
}
