import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ConfirmButton,
  Field,
  PageHeader,
  Panel,
  Pill,
  Toggle,
  btnPrimary,
  btnSecondary,
  fromLocalInput,
  inputCls,
  toLocalInput,
} from "@/components/admin/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { formatDate, formatPrice } from "@/lib/site-config";
import {
  adminListOffers,
  createOffer,
  deleteOffer,
  discountedPrice,
  offerState,
  updateOffer,
  type OfferInput,
  type OfferState,
  type OfferWithProduct,
} from "@/services/offerService";
import { adminListProducts } from "@/services/productService";
import type { DiscountType } from "@/types/database";

export const Route = createFileRoute("/admin/offers")({ component: OffersPage });

const STATE_LABEL: Record<
  OfferState,
  { label: string; tone: "good" | "info" | "neutral" | "warn" }
> = {
  running: { label: "Running", tone: "good" },
  upcoming: { label: "Upcoming", tone: "info" },
  expired: { label: "Ended", tone: "neutral" },
  off: { label: "Switched off", tone: "warn" },
};

function OffersPage() {
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey: qk.admin.offers, queryFn: adminListOffers });
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: OfferInput }) =>
      id ? updateOffer(id, input) : createOffer(input),
    onSuccess: (_, vars) => {
      toast.success(vars.id ? "Offer saved" : "Offer created");
      setEditing(null);
      refresh();
    },
    onError: (err) => toast.error(readableError(err)),
  });

  const toggle = useMutation({
    mutationFn: (o: OfferWithProduct) => updateOffer(o.id, { is_active: !o.is_active }),
    onSuccess: refresh,
    onError: (err) => toast.error(readableError(err)),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Offers"
        description="Discounts on a product between two dates. If a product has several running offers, customers get the best one."
        actions={
          editing !== "new" && (
            <button onClick={() => setEditing("new")} className={btnPrimary}>
              <Plus className="h-4 w-4" /> New offer
            </button>
          )
        }
      />

      {editing === "new" && (
        <Panel title="New offer">
          <OfferForm
            saving={save.isPending}
            onCancel={() => setEditing(null)}
            onSave={(input) => save.mutate({ input })}
          />
        </Panel>
      )}

      {offers.isLoading ? (
        <LoadingState label="Loading offers…" />
      ) : offers.error ? (
        <ErrorState error={offers.error} onRetry={() => offers.refetch()} />
      ) : !offers.data || offers.data.length === 0 ? (
        <EmptyState
          title="No offers yet"
          description="Create one to show a discount and countdown in the shop."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {offers.data.map((o) => {
            const state = STATE_LABEL[offerState(o)];
            if (editing === o.id) {
              return (
                <li key={o.id} className="p-4">
                  <OfferForm
                    offer={o}
                    saving={save.isPending}
                    onCancel={() => setEditing(null)}
                    onSave={(input) => save.mutate({ id: o.id, input })}
                  />
                </li>
              );
            }
            const price = o.products ? Number(o.products.price) : null;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    {o.title} <Pill tone={state.tone}>{state.label}</Pill>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.products ? (
                      <Link
                        to="/admin/products/edit/$id"
                        params={{ id: o.products.id }}
                        className="hover:text-primary"
                      >
                        {o.products.name}
                      </Link>
                    ) : (
                      "Product removed"
                    )}{" "}
                    ·{" "}
                    {o.discount_type === "percentage"
                      ? `${Number(o.discount_value)}% off`
                      : `${formatPrice(o.discount_value)} off`}
                    {price != null &&
                      ` · ${formatPrice(price)} → ${formatPrice(discountedPrice(price, o.discount_type, Number(o.discount_value)))}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(o.start_date, true)} – {formatDate(o.end_date, true)}
                  </p>
                </div>
                <Toggle
                  checked={o.is_active}
                  onChange={() => toggle.mutate(o)}
                  label={o.is_active ? "Active" : "Switched off"}
                  hideLabel
                  disabled={toggle.isPending}
                />
                <button
                  onClick={() => setEditing(o.id)}
                  aria-label={`Edit ${o.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  title={`Delete “${o.title}”?`}
                  description="Past orders keep the price they were charged."
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
                  onConfirm={async () => {
                    try {
                      await deleteOffer(o.id);
                      toast.success("Offer deleted");
                      refresh();
                    } catch (err) {
                      toast.error(readableError(err));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OfferForm({
  offer,
  saving,
  onSave,
  onCancel,
}: {
  offer?: OfferWithProduct;
  saving: boolean;
  onSave: (input: OfferInput) => void;
  onCancel: () => void;
}) {
  const products = useQuery({
    queryKey: qk.admin.products(""),
    queryFn: () => adminListProducts(""),
  });
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 86_400_000);

  const [productId, setProductId] = useState(offer?.product_id ?? "");
  const [title, setTitle] = useState(offer?.title ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [type, setType] = useState<DiscountType>(offer?.discount_type ?? "percentage");
  const [value, setValue] = useState(offer ? String(offer.discount_value) : "");
  const [start, setStart] = useState(toLocalInput(offer?.start_date ?? now.toISOString()));
  const [end, setEnd] = useState(toLocalInput(offer?.end_date ?? weekLater.toISOString()));
  const [active, setActive] = useState(offer?.is_active ?? true);

  const product = products.data?.find((p) => p.id === productId);
  const numericValue = Number(value);
  const preview =
    product && numericValue > 0 ? discountedPrice(Number(product.price), type, numericValue) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!productId) return toastError("Choose a product.");
        if (!title.trim()) return toastError("Give the offer a title.");
        if (!(numericValue > 0)) return toastError("The discount must be more than 0.");
        if (type === "percentage" && numericValue > 100)
          return toastError("A percentage can't be more than 100.");
        if (!start || !end || new Date(end) <= new Date(start))
          return toastError("The end date must be after the start date.");
        onSave({
          product_id: productId,
          title: title.trim(),
          description: description.trim() || null,
          discount_type: type,
          discount_value: numericValue,
          start_date: fromLocalInput(start),
          end_date: fromLocalInput(end),
          is_active: active,
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Product" className="sm:col-span-2">
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className={inputCls}
        >
          <option value="">{products.isLoading ? "Loading products…" : "Choose a product"}</option>
          {products.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatPrice(p.price)}
              {p.is_active ? "" : " (hidden)"}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" hint="Shown to customers, e.g. “Eid Sale 20% off”.">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Description (optional)">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Discount type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DiscountType)}
          className={inputCls}
        >
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed amount</option>
        </select>
      </Field>
      <Field
        label={type === "percentage" ? "Discount (%)" : "Discount amount"}
        hint={
          preview != null && product
            ? `${formatPrice(product.price)} → ${formatPrice(preview)}`
            : undefined
        }
      >
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          max={type === "percentage" ? 100 : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Starts">
        <input
          required
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Ends">
        <input
          required
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className={inputCls}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <Toggle checked={active} onChange={setActive} label="Active" />
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : offer ? "Save offer" : "Create offer"}
          </button>
        </div>
      </div>
    </form>
  );
}

function toastError(message: string) {
  toast.error(message);
}
