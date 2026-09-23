// Small helpers shared by the services.
import type { PostgrestError } from "@supabase/supabase-js";

type Result<T> = { data: T | null; error: PostgrestError | null };

// Await a Supabase query, throw if it failed, return the data.
export async function unwrap<T>(query: PromiseLike<Result<unknown>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  return data as T;
}

// Remove characters that have a meaning in PostgREST filter syntax.
export function cleanSearch(q: string): string {
  return q
    .replace(/[%,()*"\\:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
