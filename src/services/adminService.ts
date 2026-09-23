import { getSupabase } from "@/lib/supabase";
import type { DashboardStats } from "@/types/database";

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await getSupabase().rpc("admin_dashboard_stats");
  if (error) throw error;
  return data as DashboardStats;
}
