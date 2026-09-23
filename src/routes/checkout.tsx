import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Lock } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ProductImage } from "@/components/product-card";
import { useCart } from "@/hooks/use-cart";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useAuth } from "@/lib/auth-context";
import { readableError } from "@/lib/supabase";
import { formatPrice } from "@/lib/site-config";
import {
  formatOrderNumber,
  getOrder,
  placeOrder,
  type OrderWithItems,
} from "@/services/orderService";
import { shippingFor } from "@/services/settingsService";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — K-Tech" },
      { name: "description", content: "Complete your K-Tech order." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CheckoutPage />
    </RequireAuth>
  ),
});

type AddressForm = {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  notes: string;
};

function CheckoutPage() {
  const { profile } = useAuth();
  const cart = useCart();
  const { settings } = useSiteSettings();
  const queryClient = useQueryClient();
  const [placed, setPlaced] = useState<OrderWithItems | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AddressForm>({
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    notes: "",
  });

  // Prefill from the profile once it loads.
  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      full_name: f.full_name || profile.full_name || "",
      phone: f.phone || profile.phone || "",
    }));
  }, [profile]);

  const set =
    (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid =
    form.full_name.trim().length >= 2 &&
    form.phone.trim().length >= 7 &&
    form.address_line1.trim().length >= 3 &&
    form.city.trim().length >= 2;

  if (placed) return <OrderPlaced order={placed} />;
  if (cart.isLoading) return <LoadingState label="Loading your cart…" className="py-32" />;
  if (cart.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          error={cart.error}
          title="Unable to load your cart"
          onRetry={() => cart.refetch()}
        />
      </div>
    );
  }
  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add some items before checking out."
          action={
            <Link
              to="/shop"
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt"
            >
              Start Shopping
            </Link>
          }
        />
      </div>
    );
  }

  const { lines, totals } = cart;
  const shipping = shippingFor(totals.itemsTotal, settings);
  const total = totals.itemsTotal + shipping;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Please fill in your name, phone, address and city.");
      return;
    }
    setSubmitting(true);
    try {
      const orderId = await placeOrder(
        {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address_line1: form.address_line1.trim(),
          city: form.city.trim(),
          ...(form.address_line2.trim() ? { address_line2: form.address_line2.trim() } : {}),
          ...(form.postal_code.trim() ? { postal_code: form.postal_code.trim() } : {}),
        },
        form.notes,
      );
      const order = await getOrder(orderId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }), // stock changed
      ]);
      if (order) setPlaced(order);
      toast.success("Order placed! We'll contact you to confirm.");
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(readableError(err, "Couldn't place your order. Please try again."));
      cart.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cart
      </Link>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form onSubmit={onSubmit} className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-tight text-foreground">
              Delivery Details
            </h2>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Field label="Full name" className="sm:col-span-2">
                <input
                  required
                  autoComplete="name"
                  value={form.full_name}
                  onChange={set("full_name")}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone number" className="sm:col-span-2">
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  className={inputCls}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <input
                  required
                  autoComplete="address-line1"
                  value={form.address_line1}
                  onChange={set("address_line1")}
                  placeholder="House / street"
                  className={inputCls}
                />
              </Field>
              <Field label="Address line 2 (optional)" className="sm:col-span-2">
                <input
                  autoComplete="address-line2"
                  value={form.address_line2}
                  onChange={set("address_line2")}
                  placeholder="Apartment, area, landmark"
                  className={inputCls}
                />
              </Field>
              <Field label="City">
                <input
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={set("city")}
                  className={inputCls}
                />
              </Field>
              <Field label="Postal code (optional)">
                <input
                  autoComplete="postal-code"
                  value={form.postal_code}
                  onChange={set("postal_code")}
                  className={inputCls}
                />
              </Field>
              <Field label="Notes (optional)" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="Delivery instructions…"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            Pay on delivery. We'll call to confirm your order before dispatch.
          </div>

          <button
            type="submit"
            disabled={!valid || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Placing order…" : `Place Order — ${formatPrice(total)}`}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Final prices, offers and stock are checked again when you place the order.
          </p>
        </form>

        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-tight text-foreground">Order Summary</h2>
            <ul className="mt-4 space-y-2.5">
              {lines.map(({ id, product, quantity }) => (
                <li key={id} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatPrice(Number(product.final_price) * quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(totals.subtotal)} />
              {totals.discount > 0 && (
                <SummaryRow label="Offer discount" value={`− ${formatPrice(totals.discount)}`} />
              )}
              <SummaryRow
                label="Shipping"
                value={shipping === 0 ? "Free" : formatPrice(shipping)}
              />
            </dl>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-display text-lg tracking-tight text-foreground">Total</span>
              <span className="font-display text-xl text-primary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderPlaced({ order }: { order: OrderWithItems }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6">
      <CheckCircle2 className="h-16 w-16 text-accent" />
      <h1 className="mt-6 font-display text-4xl tracking-tight text-foreground">
        Order Confirmed!
      </h1>
      <p className="mt-2 text-sm font-semibold text-foreground">Order {formatOrderNumber(order)}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        Thanks {order.shipping_address.full_name}! We'll call{" "}
        <strong className="text-foreground">{order.shipping_address.phone}</strong> to confirm
        delivery. Total to pay on delivery:{" "}
        <strong className="text-foreground">{formatPrice(order.total)}</strong>.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/account"
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt"
        >
          View My Orders
        </Link>
        <Link
          to="/shop"
          className="rounded-xl border border-border px-6 py-3 font-semibold text-foreground hover:bg-accent"
        >
          Keep Shopping
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25";
