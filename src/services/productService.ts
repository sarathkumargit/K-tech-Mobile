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

/**
 * What a product card actually draws. Everything a list never shows — the
 * long description, the specs and features JSON, the search_vector — is left
 * out on purpose.
 */
export type ProductListItem = Omit<
  Product,
  "description" | "specifications" | "features" | "offer_start_date" | "updated_at"
>;

export type ProductFilters = {
  categorySlug?: string;
  search?: string;
  offersOnly?: boolean;
  sort?: ProductSort;
  limit?: number;
};

const CATALOG = "product_catalog";

// Asking for these columns instead of "*" is the difference between a grid
// response of a few KB and one of a few hundred KB: `select("*")` on the
// catalog view also ships every product's full description, its specs and
// features JSON and its search_vector, none of which a card draws. Over a
// long-distance connection that payload is what the visitor waits for.
const CARD_COLUMNS = [
  "id",
  "name",
  "slug",
  "short_description",
  "price",
  "compare_price",
  "stock_quantity",
  "category_id",
  "category_name",
  "category_slug",
  "image_url",
  "brand",
  "sku",
  "condition",
  "is_featured",
  "is_active",
  "created_at",
  "offer_id",
  "offer_title",
  "offer_discount_type",
  "offer_discount_value",
  "offer_end_date",
  "final_price",
].join(",");

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
  let query = getSupabase().from(CATALOG).select(CARD_COLUMNS).eq("is_active", true);
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
  return unwrap<ProductListItem[]>(query);
}

export async function getFeaturedProducts(limit = 8) {
  const featured = await unwrap<ProductListItem[]>(
    getSupabase()
      .from(CATALOG)
      .select(CARD_COLUMNS)
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
  return unwrap<ProductListItem[]>(
    getSupabase()
      .from(CATALOG)
      .select(CARD_COLUMNS)
      .eq("is_active", true)
      .not("offer_id", "is", null)
      .order("offer_end_date", { ascending: true })
      .limit(limit),
  );
}

export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  const supabase = getSupabase();
  // The images are looked up by the product's slug through the foreign key
  // rather than by its id, so this query does not have to wait for the first
  // one to come back. Two requests leaving together cost one round trip;
  // fetching the product and then its images costs two, and on a product page
  // that wait happens before anything is drawn.
  const [product, images] = await Promise.all([
    unwrap<Product | null>(
      supabase.from(CATALOG).select("*").eq("slug", slug).eq("is_active", true).maybeSingle(),
    ),
    unwrap<(ProductImage & { products?: unknown })[]>(
      supabase
        .from("product_images")
        .select("*, products!inner(slug, is_active)")
        .eq("products.slug", slug)
        .eq("products.is_active", true)
        .order("sort_order")
        .order("created_at"),
    ),
  ]);
  if (!product) return null;
  // Drop the joined `products` object; only the image rows are wanted.
  return {
    ...product,
    images: images.map(({ products: _joined, ...image }) => image as ProductImage),
  };
}

export function getRelatedProducts(product: Pick<Product, "id" | "category_id">, limit = 4) {
  if (!product.category_id) return Promise.resolve([] as ProductListItem[]);
  return unwrap<ProductListItem[]>(
    getSupabase()
      .from(CATALOG)
      .select(CARD_COLUMNS)
      .eq("is_active", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([] as ProductListItem[]);
  return unwrap<ProductListItem[]>(getSupabase().from(CATALOG).select(CARD_COLUMNS).in("id", ids));
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
  let query = getSupabase().from(CATALOG).select(CARD_COLUMNS);
  query = applySearch(query, search);
  return unwrap<ProductListItem[]>(query.order("created_at", { ascending: false }));
}

export async function adminGetProduct(id: string) {
  const supabase = getSupabase();
  // Both queries key off the id we already have, so they go out together.
  const [product, images] = await Promise.all([
    unwrap<ProductRow | null>(supabase.from("products").select("*").eq("id", id).maybeSingle()),
    unwrap<ProductImage[]>(
      supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
    ),
  ]);
  if (!product) return null;
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
  // One file at a time meant every upload waited for the previous round trip
  // to finish. The files don't depend on each other, so they go up together
  // and sort_order is decided up front to keep the order stable.
  return Promise.all(
    files.map(async (file, index) => {
      const { path, publicUrl } = await uploadProductImage(productId, file);
      return unwrap<ProductImage>(
        getSupabase()
          .from("product_images")
          .insert({
            product_id: productId,
            image_url: publicUrl,
            storage_path: path,
            sort_order: startOrder + index,
          })
          .select()
          .single(),
      ).catch(async (err) => {
        await removeStorageFiles([path]).catch(() => undefined);
        throw err;
      });
    }),
  );
}

export async function deleteProductImage(image: ProductImage) {
  const { error } = await getSupabase().from("product_images").delete().eq("id", image.id);
  if (error) throw error;
  if (image.storage_path) await removeStorageFiles([image.storage_path]).catch(() => undefined);
}

// Save a new order for the images (first = main image).
export async function reorderProductImages(images: ProductImage[]) {
  const supabase = getSupabase();
  // Dragging five images used to cost five round trips one after another.
  // The updates are independent, so they all leave at once.
  const changed = images
    .map((image, index) => ({ image, index }))
    .filter(({ image, index }) => image.sort_order !== index);
  if (changed.length === 0) return;
  const results = await Promise.all(
    changed.map(({ image, index }) =>
      supabase.from("product_images").update({ sort_order: index }).eq("id", image.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
