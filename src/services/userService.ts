import { getSupabase } from "@/lib/supabase";
import type { AdminUserRow, ProfileRow } from "@/types/database";
import { unwrap } from "./_shared";

export type Profile = ProfileRow;
export type AdminUserListItem = Profile & { is_admin: boolean };

export function getProfile(userId: string) {
  return unwrap<Profile | null>(
    getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle(),
  );
}

export function updateProfile(
  userId: string,
  input: { full_name?: string | null; phone?: string | null },
) {
  return unwrap<Profile>(
    getSupabase().from("profiles").update(input).eq("id", userId).select().single(),
  );
}

// Asks the database whether the signed-in user is listed in admin_users.
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_admin");
  if (error) throw error;
  return data === true;
}

// ---------- admin ----------
export async function adminListUsers(): Promise<AdminUserListItem[]> {
  const supabase = getSupabase();
  const [profiles, admins] = await Promise.all([
    unwrap<Profile[]>(
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ),
    unwrap<AdminUserRow[]>(supabase.from("admin_users").select("*")),
  ]);
  const adminIds = new Set(admins.map((a) => a.user_id));
  return profiles.map((p) => ({ ...p, is_admin: adminIds.has(p.id) }));
}

export async function adminGetUser(userId: string): Promise<AdminUserListItem | null> {
  const supabase = getSupabase();
  const [profile, admin] = await Promise.all([
    getProfile(userId),
    unwrap<AdminUserRow | null>(
      supabase.from("admin_users").select("*").eq("user_id", userId).maybeSingle(),
    ),
  ]);
  return profile ? { ...profile, is_admin: Boolean(admin) } : null;
}

export async function setUserAdmin(userId: string, makeAdmin: boolean) {
  const supabase = getSupabase();
  if (makeAdmin) {
    const { error } = await supabase.from("admin_users").insert({ user_id: userId });
    if (error && error.code !== "23505") throw error; // already an admin is fine
  } else {
    const { data, error } = await supabase
      .from("admin_users")
      .delete()
      .eq("user_id", userId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("You can't remove your own admin access.");
    }
  }
}
