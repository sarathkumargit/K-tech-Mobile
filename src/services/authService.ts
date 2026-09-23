import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

// Where Supabase sends people back after Google sign-in / email confirmation.
function callbackUrl(next?: string) {
  const url = new URL("/auth/callback", window.location.origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: callbackUrl() },
  });
  if (error) throw error;
  // No session means Supabase is waiting for the email to be confirmed.
  return { needsConfirmation: !data.session };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signInWithGoogle(next?: string) {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
}

// Which sign-in methods are switched on in Supabase (Authentication → Providers).
export async function getEnabledProviders(): Promise<{ google: boolean; email: boolean }> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!url || !key) return { google: false, email: false };
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!res.ok) throw new Error("Couldn't read sign-in settings.");
  const body = (await res.json()) as { external?: Record<string, boolean> };
  return { google: Boolean(body.external?.["google"]), email: body.external?.["email"] !== false };
}
