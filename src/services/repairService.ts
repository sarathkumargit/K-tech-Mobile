import { getSupabase } from "@/lib/supabase";
import type { RepairRequestRow, RepairStatus } from "@/types/database";
import { unwrap } from "./_shared";

export type RepairRequest = RepairRequestRow;
export type RepairInput = {
  customer_name: string;
  phone_number: string;
  phone_brand: string;
  phone_model: string;
  issue: string;
  message?: string | null;
};

export const REPAIR_STATUSES: { value: RepairStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Anyone can submit (visitors too). The row isn't read back because only
// admins may read repair requests.
export async function submitRepairRequest(input: RepairInput) {
  const { error } = await getSupabase().from("repair_requests").insert(input);
  if (error) throw error;
}

// ---------- admin ----------
export function adminListRepairs() {
  return unwrap<RepairRequest[]>(
    getSupabase().from("repair_requests").select("*").order("created_at", { ascending: false }),
  );
}

export async function updateRepairStatus(id: string, status: RepairStatus) {
  const { error } = await getSupabase().from("repair_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteRepair(id: string) {
  const { error } = await getSupabase().from("repair_requests").delete().eq("id", id);
  if (error) throw error;
}
