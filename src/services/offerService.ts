import { getSupabase } from "@/lib/supabase";
import type { Database, DiscountType, OfferRow } from "@/types/database";
import { unwrap } from "./_shared";

export type Offer = OfferRow;
export type OfferWithProduct = Offer & {
  products: { id: string; name: string; slug: string; price: number } | null;
};
export type OfferInput = Database["public"]["Tables"]["offers"]["Insert"];
export type OfferState = "running" | "upcoming" | "expired" | "off";

export function offerState(
  offer: Pick<Offer, "is_active" | "start_date" | "end_date">,
  now = Date.now(),
): OfferState {
  if (!offer.is_active) return "off";
  if (new Date(offer.start_date).getTime() > now) return "upcoming";
  if (new Date(offer.end_date).getTime() <= now) return "expired";
  return "running";
}

// Same rule as public.apply_discount() in the database.
export function discountedPrice(price: number, type: DiscountType, value: number) {
  const raw = type === "percentage" ? price - (price * value) / 100 : price - value;
  return Math.max(0, Math.round(raw * 100) / 100);
}

// ---------- admin ----------
export function adminListOffers() {
  return unwrap<OfferWithProduct[]>(
    getSupabase()
      .from("offers")
      .select("*, products(id, name, slug, price)")
      .order("end_date", { ascending: false }),
  );
}

export function createOffer(input: OfferInput) {
  return unwrap<Offer>(getSupabase().from("offers").insert(input).select().single());
}

export function updateOffer(id: string, input: Partial<OfferInput>) {
  return unwrap<Offer>(getSupabase().from("offers").update(input).eq("id", id).select().single());
}

export async function deleteOffer(id: string) {
  const { error } = await getSupabase().from("offers").delete().eq("id", id);
  if (error) throw error;
}
