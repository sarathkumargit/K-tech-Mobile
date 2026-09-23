import { getSupabase } from "@/lib/supabase";
import type { Database, SiteSettingsRow } from "@/types/database";
import { unwrap } from "./_shared";

export type SiteSettings = SiteSettingsRow;
export type SiteSettingsInput = Database["public"]["Tables"]["site_settings"]["Update"];

export function getSiteSettings() {
  return unwrap<SiteSettings | null>(
    getSupabase().from("site_settings").select("*").eq("id", "default").maybeSingle(),
  );
}

export function updateSiteSettings(input: SiteSettingsInput) {
  return unwrap<SiteSettings>(
    getSupabase().from("site_settings").update(input).eq("id", "default").select().single(),
  );
}

// Same rule the database uses in place_order().
export function shippingFor(
  itemsTotal: number,
  settings: Pick<SiteSettings, "shipping_fee" | "free_shipping_threshold"> | null | undefined,
) {
  if (!settings || itemsTotal <= 0) return 0;
  return itemsTotal > Number(settings.free_shipping_threshold) ? 0 : Number(settings.shipping_fee);
}
