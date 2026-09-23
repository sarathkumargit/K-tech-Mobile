import { getSupabase } from "@/lib/supabase";
import type {
  OrderItemRow,
  OrderRow,
  OrderStatusRow,
  ProfileRow,
  ShippingAddress,
} from "@/types/database";
import { unwrap } from "./_shared";

export type Order = OrderRow;
export type OrderItem = OrderItemRow;
export type OrderWithItems = Order & { order_items: OrderItem[] };
export type OrderStatus = OrderStatusRow;

// Turns the signed-in user's cart into an order. The database works out the
// prices, offers, shipping and stock — see place_order() in schema.sql.
export async function placeOrder(address: ShippingAddress, notes?: string) {
  const { data, error } = await getSupabase().rpc("place_order", {
    p_shipping_address: address,
    p_notes: notes?.trim() ? notes.trim() : null,
  });
  if (error) throw error;
  return data as string; // new order id
}

export function getMyOrders() {
  return unwrap<OrderWithItems[]>(
    getSupabase()
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false }),
  );
}

export function getOrder(id: string) {
  return unwrap<OrderWithItems | null>(
    getSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
  );
}

export async function cancelMyOrder(orderId: string) {
  const { error } = await getSupabase().rpc("cancel_my_order", { p_order_id: orderId });
  if (error) throw error;
}

export function getOrderStatuses() {
  return unwrap<OrderStatus[]>(
    getSupabase().from("order_statuses").select("*").order("sort_order"),
  );
}

// ---------- admin ----------
export type AdminOrder = OrderWithItems & {
  customer: Pick<ProfileRow, "id" | "full_name" | "email" | "phone"> | null;
};

export function adminListOrders(
  filters: { status?: string; userId?: string; limit?: number } = {},
) {
  let query = getSupabase().from("orders").select("*, order_items(*)");
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  query = query.order("created_at", { ascending: false });
  if (filters.limit) query = query.limit(filters.limit);
  return unwrap<OrderWithItems[]>(query);
}

export async function adminGetOrder(id: string): Promise<AdminOrder | null> {
  const order = await getOrder(id);
  if (!order) return null;
  const customer = order.user_id
    ? await unwrap<AdminOrder["customer"]>(
        getSupabase()
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", order.user_id)
          .maybeSingle(),
      )
    : null;
  return { ...order, customer };
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await getSupabase().from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateOrderNotes(id: string, notes: string) {
  const { error } = await getSupabase()
    .from("orders")
    .update({ notes: notes.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export function formatOrderNumber(order: Pick<Order, "order_number">) {
  return `#${String(order.order_number).padStart(5, "0")}`;
}
