// The one Supabase client used by the whole app (browser + server rendering).
// Only the public anon/publishable key is used here. Every permission is
// enforced in the database by Row Level Security (see supabase/schema.sql).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);
// Origin of the Supabase project (for <link rel="preconnect">), or null.
export const supabaseOrigin = (() => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();

export type TypedSupabaseClient = SupabaseClient<Database>;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "The store isn't connected to Supabase yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (see SUPABASE_SETUP.md).",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

let browserClient: TypedSupabaseClient | null = null;

// In the browser: one shared client that remembers the signed-in session.
// On the server (page rendering): a fresh client with no session, so it only
// ever sees public data.
export function getSupabase(): TypedSupabaseClient {
  if (!url || !anonKey) throw new SupabaseNotConfiguredError();

  if (typeof window === "undefined") {
    return createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return browserClient;
}

// Turn a Supabase/Postgres error into a message people can read.
export function readableError(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  const e = error as { message?: string; code?: string; details?: string };
  if (e.code === "42501" && !e.message?.startsWith("Please")) {
    return "You don't have permission to do that.";
  }
  if (e.code === "23505") return "That already exists — use a different name, slug or SKU.";
  if (e.code === "23503") return "This is still used somewhere else, so it can't be removed.";
  if (e.code === "PGRST116") return "Not found.";
  return e.message || fallback;
}
