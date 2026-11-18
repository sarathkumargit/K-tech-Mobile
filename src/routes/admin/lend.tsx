import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  HandCoins,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  ConfirmButton,
  Field,
  PageHeader,
  Pill,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "@/components/admin/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { readableError } from "@/lib/supabase";
import { formatDate, formatPrice, whatsappLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import {
  LEND_QUERY_KEY,
  PAYMENT_METHODS,
  addPayment,
  adminListLends,
  createLend,
  deleteLend,
  deletePayment,
  todayISO,
  updateLend,
  type LendAccount,
  type LendInput,
  type LendStatus,
  type PaymentMethod,
} from "@/services/lendService";

export const Route = createFileRoute("/admin/lend")({
  head: () => ({ meta: [{ title: "Lend book — K-Tech Admin" }] }),
  component: LendPage,
});

type Filter = "all" | "active" | "overdue" | "settled";

const STATUS: Record<LendStatus, { label: string; tone: "info" | "warn" | "good"; rank: number }> =
  {
    overdue: { label: "Overdue", tone: "warn", rank: 0 },
    owing: { label: "Owing", tone: "info", rank: 1 },
    settled: { label: "Settled", tone: "good", rank: 2 },
  };

// 16px text on phones so iOS doesn't zoom into the field on focus.
const fieldCls = cn(inputCls, "text-base sm:text-sm");

// Bottom sheet on phones, centred dialog from `sm` up.
const sheetCls =
  "bottom-0 top-auto grid-cols-[minmax(0,1fr)] max-h-[92dvh] translate-y-0 gap-5 overflow-y-auto rounded-t-2xl border-border p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-auto sm:top-[50%] sm:max-w-lg sm:translate-y-[-50%] sm:rounded-2xl sm:p-6";

// ---------- small helpers ----------
function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return formatDate(new Date(y, m - 1, d));
}

function parseAmount(value: string): number {
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

// Local numbers like 0771234567 → 94771234567 so the WhatsApp link opens.
function waNumber(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return digits.length === 10 && digits.startsWith("0") ? `94${digits.slice(1)}` : digits;
}

const emptyToNull = (v: string) => (v.trim() ? v.trim() : null);

// Show a validation message (used as `return fail(...)` in form handlers).
function fail(message: string): void {
  toast.error(message);
}

// =============================================================================
function LendPage() {
  const queryClient = useQueryClient();
  const lends = useQuery({ queryKey: LEND_QUERY_KEY, queryFn: adminListLends });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<"new" | LendAccount | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: LEND_QUERY_KEY });

  const all = useMemo(() => lends.data ?? [], [lends.data]);
  const selected = selectedId ? (all.find((a) => a.id === selectedId) ?? null) : null;

  const stats = useMemo(() => {
    const month = todayISO().slice(0, 7);
    let outstanding = 0;
    let collectedThisMonth = 0;
    const counts = { all: all.length, active: 0, overdue: 0, settled: 0 };
    for (const a of all) {
      outstanding += a.balance;
      if (a.status === "settled") counts.settled++;
      else counts.active++;
      if (a.status === "overdue") counts.overdue++;
      for (const p of a.payments) if (p.paid_on.startsWith(month)) collectedThisMonth += p.amount;
    }
    return { outstanding, collectedThisMonth, counts };
  }, [all]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/[^0-9]/g, "");
    return all
      .filter((a) =>
        filter === "all"
          ? true
          : filter === "active"
            ? a.status !== "settled"
            : a.status === filter,
      )
      .filter((a) => {
        if (!q) return true;
        if (
          [a.customer_name, a.item, a.nic, a.notes, a.phone].some((v) =>
            v?.toLowerCase().includes(q),
          )
        )
          return true;
        // "077 123 4567" matches "0771234567"
        return qDigits.length >= 3 && (a.phone ?? "").replace(/[^0-9]/g, "").includes(qDigits);
      })
      .sort(
        (a, b) =>
          STATUS[a.status].rank - STATUS[b.status].rank || b.created_at.localeCompare(a.created_at),
      );
  }, [all, filter, search]);

  const chips: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: stats.counts.all },
    { value: "active", label: "Still owing", count: stats.counts.active },
    { value: "overdue", label: "Overdue", count: stats.counts.overdue },
    { value: "settled", label: "Settled", count: stats.counts.settled },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lend book"
        description="Customers paying in parts. Record every payment and see what's still owed."
        actions={
          <button onClick={() => setForm("new")} className={btnPrimary}>
            <Plus className="h-4 w-4" /> New lend
          </button>
        }
      />

      {lends.isLoading ? (
        <LoadingState label="Loading lend book…" />
      ) : lends.error ? (
        <ErrorState
          error={lends.error}
          title="Couldn't load the lend book"
          onRetry={() => lends.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="Outstanding" value={formatPrice(stats.outstanding)} strong />
            <MiniStat
              label="Customers owing"
              value={String(stats.counts.active)}
              sub={stats.counts.overdue ? `${stats.counts.overdue} overdue` : undefined}
              warn={stats.counts.overdue > 0}
            />
            <MiniStat label="Collected this month" value={formatPrice(stats.collectedThisMonth)} />
            <MiniStat label="Settled" value={String(stats.counts.settled)} />
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, NIC, item…"
                aria-label="Search the lend book"
                className={cn(fieldCls, "pl-9 pr-9")}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {chips.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFilter(c.value)}
                  aria-pressed={filter === c.value}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    filter === c.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {c.label}
                  <span className="tabular-nums opacity-80">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="h-10 w-10" />}
              title={
                all.length === 0
                  ? "No lends yet"
                  : search
                    ? "Nobody matches your search"
                    : "Nothing in this list"
              }
              description={
                all.length === 0
                  ? "Add a customer who is paying in parts to start tracking their balance."
                  : undefined
              }
              action={
                all.length === 0 ? (
                  <button onClick={() => setForm("new")} className={btnPrimary}>
                    <Plus className="h-4 w-4" /> New lend
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visible.map((a) => (
                <li key={a.id} className="min-w-0">
                  <LendCard account={a} onOpen={() => setSelectedId(a.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Details + payments */}
      <Dialog
        open={!!selected && form === null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent className={sheetCls}>
          {selected && (
            <LendDetail
              account={selected}
              onEdit={() => setForm(selected)}
              onChanged={refresh}
              onDeleted={() => {
                setSelectedId(null);
                void refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* New / edit */}
      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className={sheetCls}>
          {form !== null && (
            <LendForm
              account={form === "new" ? null : form}
              onDone={(id) => {
                setForm(null);
                if (id) setSelectedId(id);
                void refresh();
              }}
              onCancel={() => setForm(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
function MiniStat({
  label,
  value,
  sub,
  warn,
  strong,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  warn?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card p-3.5 sm:p-4",
        strong && "border-primary/30 bg-primary/5",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 break-words font-display text-xl tabular-nums leading-tight text-foreground sm:text-2xl">
        {value}
      </p>
      {sub && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            warn ? "font-semibold text-amber-700" : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${pct}% paid`}
    >
      <div
        className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LendCard({ account: a, onOpen }: { account: LendAccount; onOpen: () => void }) {
  const s = STATUS[a.status];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60",
        a.status === "overdue" ? "border-amber-300" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{a.customer_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {a.item}
            {a.phone ? ` · ${a.phone}` : ""}
          </p>
        </div>
        <Pill tone={s.tone}>{s.label}</Pill>
      </div>
      <div className="mt-3">
        <ProgressBar paid={a.paid} total={a.total_amount} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          <span className="tabular-nums">{formatPrice(a.paid)}</span> of{" "}
          <span className="tabular-nums">{formatPrice(a.total_amount)}</span>
        </p>
        {a.status !== "settled" && (
          <p className="shrink-0 text-right">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
              Balance
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatPrice(a.balance)}
            </span>
          </p>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {a.lastPaidOn ? `Last paid ${fmtDay(a.lastPaidOn)}` : "No payments yet"}
        {a.due_date && a.status !== "settled" && (
          <span className={cn(a.status === "overdue" && "font-semibold text-amber-700")}>
            · Due {fmtDay(a.due_date)}
          </span>
        )}
      </p>
    </button>
  );
}

// =============================================================================
function LendDetail({
  account: a,
  onEdit,
  onChanged,
  onDeleted,
}: {
  account: LendAccount;
  onEdit: () => void;
  onChanged: () => Promise<unknown>;
  onDeleted: () => void;
}) {
  const { settings } = useSiteSettings();
  const s = STATUS[a.status];
  const wa = whatsappLink(
    waNumber(a.phone),
    `Hi ${a.customer_name}, this is ${settings?.shop_name ?? "K-Tech"}. ` +
      `Your remaining balance for ${a.item} is ${formatPrice(a.balance)}` +
      (a.due_date ? ` (due ${fmtDay(a.due_date)})` : "") +
      ". Thank you!",
  );

  return (
    <>
      <DialogHeader className="pr-8 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="font-display text-xl tracking-tight">
            {a.customer_name}
          </DialogTitle>
          <Pill tone={s.tone}>{s.label}</Pill>
        </div>
        <DialogDescription>{a.item}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Amount label="Total" value={a.total_amount} />
          <Amount label="Paid" value={a.paid} />
          <Amount label="Balance" value={a.balance} highlight={a.balance > 0} />
        </div>
        <ProgressBar paid={a.paid} total={a.total_amount} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-secondary/40 p-3 text-sm">
        <Info label="Phone" value={a.phone} />
        <Info label="NIC" value={a.nic} />
        <Info label="Started" value={fmtDay(a.start_date)} />
        <Info label="Due" value={a.due_date ? fmtDay(a.due_date) : null} />
        {a.notes && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap text-foreground">{a.notes}</dd>
          </div>
        )}
      </dl>

      {(a.phone || wa) && (
        <div className="grid grid-cols-2 gap-2">
          {a.phone && (
            <a href={`tel:${a.phone}`} className={btnSecondary}>
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          {wa && a.balance > 0 && (
            <a href={wa} target="_blank" rel="noreferrer" className={btnSecondary}>
              <MessageCircle className="h-4 w-4" /> Remind
            </a>
          )}
        </div>
      )}

      {a.balance > 0 && <PaymentForm account={a} onSaved={onChanged} />}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Payments <span className="font-normal text-muted-foreground">({a.payments.length})</span>
        </h3>
        {a.payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {a.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatPrice(p.amount)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {fmtDay(p.paid_on)} ·{" "}
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <ConfirmButton
                  title={`Delete the ${formatPrice(p.amount)} payment?`}
                  description="The balance goes back up by this amount."
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                  onConfirm={async () => {
                    try {
                      await deletePayment(p.id);
                      toast.success("Payment deleted");
                      await onChanged();
                    } catch (err) {
                      toast.error(readableError(err));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete payment</span>
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex gap-2 border-t border-border pt-4">
        <button type="button" onClick={onEdit} className={cn(btnSecondary, "flex-1")}>
          <Pencil className="h-4 w-4" /> Edit
        </button>
        <ConfirmButton
          title={`Delete ${a.customer_name}'s lend?`}
          description="This removes the account and all of its payments. It can't be undone."
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          onConfirm={async () => {
            try {
              await deleteLend(a.id);
              toast.success("Lend deleted");
              onDeleted();
            } catch (err) {
              toast.error(readableError(err));
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </ConfirmButton>
      </div>
    </>
  );
}

function Amount({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border p-2",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-semibold tabular-nums text-foreground sm:text-base">
        {formatPrice(value)}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-foreground">{value || "—"}</dd>
    </div>
  );
}

// =============================================================================
function PaymentForm({
  account,
  onSaved,
}: {
  account: LendAccount;
  onSaved: () => Promise<unknown>;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: addPayment,
    onSuccess: async (_, vars) => {
      toast.success(`${formatPrice(vars.amount)} recorded`);
      setAmount("");
      setNote("");
      await onSaved();
    },
    onError: (err) => toast.error(readableError(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!(value > 0)) return fail("Enter the amount the customer paid");
    if (value > account.balance + 0.001)
      return fail(`That's more than the balance (${formatPrice(account.balance)})`);
    if (!paidOn) return fail("Pick the payment date");
    save.mutate({
      account_id: account.id,
      amount: value,
      paid_on: paidOn,
      method,
      note: emptyToNull(note),
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Record a payment</h3>
        <button
          type="button"
          onClick={() => setAmount(String(account.balance))}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Full balance
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" className="col-span-2 sm:col-span-1">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={cn(fieldCls, "tabular-nums")}
          />
        </Field>
        <Field label="Date" className="col-span-2 sm:col-span-1">
          <input
            type="date"
            value={paidOn}
            max={todayISO()}
            onChange={(e) => setPaidOn(e.target.value)}
            className={fieldCls}
          />
        </Field>
        <Field label="Method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={fieldCls}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
            className={fieldCls}
          />
        </Field>
      </div>
      <button type="submit" disabled={save.isPending} className={cn(btnPrimary, "w-full")}>
        <HandCoins className="h-4 w-4" />
        {save.isPending ? "Saving…" : "Save payment"}
      </button>
    </form>
  );
}

// =============================================================================
function LendForm({
  account,
  onDone,
  onCancel,
}: {
  account: LendAccount | null;
  onDone: (id: string | null) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({
    customer_name: account?.customer_name ?? "",
    phone: account?.phone ?? "",
    nic: account?.nic ?? "",
    item: account?.item ?? "",
    total: account ? String(account.total_amount) : "",
    advance: "",
    method: "cash" as PaymentMethod,
    start_date: account?.start_date ?? todayISO(),
    due_date: account?.due_date ?? "",
    notes: account?.notes ?? "",
  });
  const set = (key: keyof typeof v) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: async ({
      input,
      advance,
    }: {
      input: LendInput;
      advance: number;
    }): Promise<string | null> => {
      if (account) {
        await updateLend(account.id, input);
        return null;
      }
      return createLend(input, { amount: advance, method: v.method });
    },
    onSuccess: (id) => {
      toast.success(account ? "Lend saved" : "Lend added");
      onDone(id);
    },
    onError: (err) => toast.error(readableError(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const total = parseAmount(v.total);
    const advance = v.advance.trim() ? parseAmount(v.advance) : 0;
    if (v.customer_name.trim().length < 2) return fail("Enter the customer's name");
    if (!v.item.trim()) return fail("Enter what the customer is paying for");
    if (!(total > 0)) return fail("Enter the total amount");
    if (Number.isNaN(advance) || advance < 0) return fail("Check the advance amount");
    if (advance > total) return fail("The advance can't be more than the total");
    if (account && total < account.paid)
      return fail(`Total can't be less than what's already paid (${formatPrice(account.paid)})`);
    if (!v.start_date) return fail("Pick the start date");
    if (v.due_date && v.due_date < v.start_date)
      return fail("The due date is before the start date");
    save.mutate({
      input: {
        customer_name: v.customer_name.trim(),
        phone: emptyToNull(v.phone),
        nic: emptyToNull(v.nic),
        item: v.item.trim(),
        total_amount: total,
        start_date: v.start_date,
        due_date: v.due_date || null,
        notes: emptyToNull(v.notes),
      },
      advance,
    });
  };

  return (
    <>
      <DialogHeader className="pr-8 text-left">
        <DialogTitle className="font-display text-xl tracking-tight">
          {account ? "Edit lend" : "New lend"}
        </DialogTitle>
        <DialogDescription>
          {account
            ? "Change the customer's details or the total. Payments stay as they are."
            : "A customer who is taking something now and paying for it in parts."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name *" className="sm:col-span-2">
            <input
              value={v.customer_name}
              onChange={set("customer_name")}
              autoComplete="off"
              className={fieldCls}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              inputMode="tel"
              value={v.phone}
              onChange={set("phone")}
              placeholder="077 123 4567"
              className={fieldCls}
            />
          </Field>
          <Field label="NIC">
            <input value={v.nic} onChange={set("nic")} autoComplete="off" className={fieldCls} />
          </Field>
          <Field label="Item / reason *" className="sm:col-span-2">
            <input
              value={v.item}
              onChange={set("item")}
              placeholder="e.g. Samsung A15 128GB"
              className={fieldCls}
            />
          </Field>
          <Field label="Total amount *">
            <input
              inputMode="decimal"
              value={v.total}
              onChange={set("total")}
              placeholder="0"
              className={cn(fieldCls, "tabular-nums")}
            />
          </Field>
          {!account && (
            <Field label="Paid now (advance)" hint="Saved as the first payment.">
              <input
                inputMode="decimal"
                value={v.advance}
                onChange={set("advance")}
                placeholder="0"
                className={cn(fieldCls, "tabular-nums")}
              />
            </Field>
          )}
          {!account && parseAmount(v.advance) > 0 && (
            <Field label="Advance paid by">
              <select value={v.method} onChange={set("method")} className={fieldCls}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Start date *">
            <input
              type="date"
              value={v.start_date}
              onChange={set("start_date")}
              className={fieldCls}
            />
          </Field>
          <Field label="Pay by (due date)">
            <input
              type="date"
              value={v.due_date}
              min={v.start_date || undefined}
              onChange={set("due_date")}
              className={fieldCls}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              value={v.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Monthly amount, guarantor, IMEI…"
              className={fieldCls}
            />
          </Field>
        </div>

        {(() => {
          const total = parseAmount(v.total);
          const advance = parseAmount(v.advance) || 0;
          if (account || !(total > 0)) return null;
          return (
            <p className="rounded-xl bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              Balance after advance:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatPrice(Math.max(0, total - advance))}
              </span>
            </p>
          );
        })()}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className={btnPrimary}>
            {save.isPending ? "Saving…" : account ? "Save changes" : "Add lend"}
          </button>
        </div>
      </form>
    </>
  );
}
