// The signed-in user's cart, stored in Supabase (carts + cart_items).
// Row Level Security makes sure a user can only ever see or change their own.
import { getSupabase } from "@/lib/supabase";
import type { CartItemRow } from "@/types/database";
import { getProductsByIds, type ProductListItem } from "./productService";
import { unwrap } from "./_shared";

// Only the columns a cart row draws.
export type CartProduct = Pick<
  ProductListItem,
  | "id"
  | "name"
  | "slug"
  | "price"
  | "compare_price"
  | "final_price"
  | "stock_quantity"
  | "image_url"
  | "is_active"
  | "offer_id"
  | "offer_title"
  | "offer_end_date"
>;

export type CartLine = {
  id: string; // cart_items.id
  quantity: number;
  product: CartProduct;
};

const CART_PRODUCT_COLUMNS =
  "id, name, slug, price, compare_price, final_price, stock_quantity, " +
  "image_url, is_active, offer_id, offer_title, offer_end_date";

// The cart is read on every page for a signed-in visitor (the header badge),
// so it is worth one round trip rather than two. The single-request version
// asks the database to join the catalog onto the cart rows; if that join
// isn't available it falls back to the original two-step fetch.
export async function getCart(): Promise<CartLine[]> {
  try {
    return await getCartJoined();
  } catch (error) {
    // PGRST200 = PostgREST couldn't work out the relationship.
    if ((error as { code?: string } | null)?.code !== "PGRST200") throw error;
    return getCartTwoStep();
  }
}

type JoinedCartRow = Pick<CartItemRow, "id" | "quantity"> & {
  product_catalog: CartProduct | null;
};

async function getCartJoined(): Promise<CartLine[]> {
  const rows = await unwrap<JoinedCartRow[]>(
    getSupabase()
      .from("cart_items")
      .select(`id, quantity, product_catalog(${CART_PRODUCT_COLUMNS})`)
      .order("created_at"),
  );
  return rows.flatMap((row) => {
    const product = row.product_catalog;
    // Products an admin switched off drop out of the cart view.
    return product && product.is_active ? [{ id: row.id, quantity: row.quantity, product }] : [];
  });
}

async function getCartTwoStep(): Promise<CartLine[]> {
  const items = await unwrap<CartItemRow[]>(
    getSupabase().from("cart_items").select("id, product_id, quantity").order("created_at"),
  );
  const products = await getProductsByIds(items.map((i) => i.product_id));
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.flatMap((item) => {
    const product = byId.get(item.product_id);
    return product && product.is_active ? [{ id: item.id, quantity: item.quantity, product }] : [];
  });
}

export async function addToCart(productId: string, quantity = 1) {
  const { error } = await getSupabase().rpc("add_to_cart", {
    p_product_id: productId,
    p_quantity: quantity,
  });
  if (error) throw error;
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { error } = await getSupabase().from("cart_items").update({ quantity }).eq("id", itemId);
  if (error) throw error;
}

export async function removeCartItem(itemId: string) {
  const { error } = await getSupabase().from("cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function clearCart(itemIds: string[]) {
  if (itemIds.length === 0) return;
  const { error } = await getSupabase().from("cart_items").delete().in("id", itemIds);
  if (error) throw error;
}

export type CartTotals = {
  count: number;
  subtotal: number; // list prices
  discount: number; // savings from running offers
  itemsTotal: number; // what the items cost after offers
};

export function cartTotals(lines: CartLine[]): CartTotals {
  let count = 0;
  let subtotal = 0;
  let itemsTotal = 0;
  for (const line of lines) {
    count += line.quantity;
    subtotal += Number(line.product.price) * line.quantity;
    itemsTotal += Number(line.product.final_price) * line.quantity;
  }
  return { count, subtotal, discount: subtotal - itemsTotal, itemsTotal };
}

// The largest quantity allowed for a product (its stock, capped at 999).
export function maxQuantity(product: Pick<CartProduct, "stock_quantity">) {
  return Math.max(0, Math.min(999, product.stock_quantity));
}
