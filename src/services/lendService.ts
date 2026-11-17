// Lend book: customers paying for something in parts (admin only).
// Tables are created by supabase/lend_ledger.sql. They aren't listed in
// types/database.ts, so this file uses an untyped client and its own types.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { toNumber, unwrap } from "./_shared";

const db = () => getSupabase() as unknown as SupabaseClient;

export const LEND_QUERY_KEY = ["admin", "lend"] as const;

export type PaymentMethod = "cash" | "bank" | "card" | "other";
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export type LendPayment = {
  id: string;
  account_id: string;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  method: PaymentMethod;
  note: string | null;
  created_at: string;
};

type LendAccountRow = {
  id: string;
  customer_name: string;
  phone: string | null;
  nic: string | null;
  item: string;
  total_amount: number;
  start_date: string; // YYYY-MM-DD
  due_date: string | null; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// settled: nothing left to pay · overdue: past the due date with a balance · owing: the rest
export type LendStatus = "owing" | "overdue" | "settled";

export type LendAccount = LendAccountRow & {
  payments: LendPayment[]; // newest first
  paid: number;
  balance: number;
  status: LendStatus;
  lastPaidOn: string | null;
};

export type LendInput = {
  customer_name: string;
  phone: string | null;
  nic: string | null;
  item: string;
  total_amount: number;
  start_date: string;
  due_date: string | null;
  notes: string | null;
};

export type PaymentInput = {
  account_id: string;
  amount: number;
  paid_on: string;
  method: PaymentMethod;
  note: string | null;
};

// Today as YYYY-MM-DD in the shop's local time.
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function toAccount(row: LendAccountRow & { lend_payments: LendPayment[] | null }): LendAccount {
  const payments = (row.lend_payments ?? [])
    .map((p) => ({ ...p, amount: toNumber(p.amount) }))
    .sort((a, b) =>
      a.paid_on === b.paid_on
        ? b.created_at.localeCompare(a.created_at)
        : b.paid_on.localeCompare(a.paid_on),
    );
  const total = toNumber(row.total_amount);
  const paid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const balance = Math.max(0, round2(total - paid));
  const status: LendStatus =
    balance <= 0 ? "settled" : row.due_date && row.due_date < todayISO() ? "overdue" : "owing";
  const { lend_payments: _ignored, ...rest } = row;
  return {
    ...rest,
    total_amount: total,
    payments,
    paid,
    balance,
    status,
    lastPaidOn: payments[0]?.paid_on ?? null,
  };
}

export async function adminListLends(): Promise<LendAccount[]> {
  const rows = await unwrap<(LendAccountRow & { lend_payments: LendPayment[] | null })[]>(
    db()
      .from("lend_accounts")
      .select("*, lend_payments(*)")
      .order("created_at", { ascending: false }),
  );
  return rows.map(toAccount);
}

// Creates the account, then records the advance (if any) as its first payment.
export async function createLend(
  input: LendInput,
  advance?: { amount: number; method: PaymentMethod },
) {
  const created = await unwrap<{ id: string }>(
    db().from("lend_accounts").insert(input).select("id").single(),
  );
  if (advance && advance.amount > 0) {
    await addPayment({
      account_id: created.id,
      amount: advance.amount,
      paid_on: input.start_date,
      method: advance.method,
      note: "Advance",
    });
  }
  return created.id;
}

export async function updateLend(id: string, input: LendInput) {
  const { error } = await db().from("lend_accounts").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteLend(id: string) {
  const { error } = await db().from("lend_accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function addPayment(input: PaymentInput) {
  const { error } = await db().from("lend_payments").insert(input);
  if (error) throw error;
}

export async function deletePayment(id: string) {
  const { error } = await db().from("lend_payments").delete().eq("id", id);
  if (error) throw error;
}
