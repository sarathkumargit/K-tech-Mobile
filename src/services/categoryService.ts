import { getSupabase } from "@/lib/supabase";
import type { CategoryRow, Database } from "@/types/database";
import { unwrap } from "./_shared";

export type Category = CategoryRow;
export type CategoryInput = Database["public"]["Tables"]["categories"]["Insert"];

// Categories customers see (active only), in display order.
export function getCategories() {
  return unwrap<Category[]>(
    getSupabase()
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  );
}

// ---------- admin ----------
export function adminListCategories() {
  return unwrap<Category[]>(
    getSupabase().from("categories").select("*").order("sort_order").order("name"),
  );
}

export function createCategory(input: CategoryInput) {
  return unwrap<Category>(getSupabase().from("categories").insert(input).select().single());
}

export function updateCategory(id: string, input: Partial<CategoryInput>) {
  return unwrap<Category>(
    getSupabase().from("categories").update(input).eq("id", id).select().single(),
  );
}

export async function deleteCategory(id: string) {
  const { error } = await getSupabase().from("categories").delete().eq("id", id);
  if (error) throw error;
}
