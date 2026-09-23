import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, LogIn } from "lucide-react";
import { ProductImage } from "@/components/product-card";
import { EmptyState, ErrorState, LoadingState, NotConnectedState } from "@/components/states";
import { useCart } from "@/hooks/use-cart";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/site-config";
import { maxQuantity } from "@/services/cartService";
import { shippingFor } from "@/services/settingsService";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — K-Tech" },
      { name: "description", content: "Review the items in your K-Tech shopping cart." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { configured } = useAuth();
  const cart = useCart();
  const { settings } = useSiteSettings();

  if (!configured) return <NotConnectedState className="mx-auto my-16 max-w-xl" />;
  if (cart.isLoading) return <LoadingState label="Loading your cart…" className="py-32" />;

  if (!cart.isSignedIn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={<LogIn className="h-10 w-10" />}
          title="Sign in to see your cart"
          description="Your cart is saved to your account, so it's there on any device."
          action={
            <Link
              to="/login"
              search={{ redirect: "/cart" }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt"
            >
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

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

  const { lines, totals } = cart;
  const shipping = shippingFor(totals.itemsTotal, settings);
  const total = totals.itemsTotal + shipping;
  const tooMany = lines.filter((l) => l.quantity > l.product.stock_quantity);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet."
          action={
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-cozy-burnt"
            >
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-foreground">Your Cart</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {totals.count} {totals.count === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          onClick={() => cart.clear()}
          className="text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          Clear cart
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {lines.map(({ id, product, quantity }) => {
            const max = maxQuantity(product);
            const lineWas = Number(product.price) * quantity;
            const linePaid = Number(product.final_price) * quantity;
            return (
              <li key={id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary/40"
                >
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to="/product/$slug"
                        params={{ slug: product.slug }}
                        className="font-display text-lg leading-tight text-foreground hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(product.final_price)} each
                        {product.offer_title ? ` · ${product.offer_title}` : ""}
                      </p>
                      {quantity > product.stock_quantity && (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          {product.stock_quantity === 0
                            ? "Out of stock — please remove it"
                            : `Only ${product.stock_quantity} left`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => cart.remove(id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        onClick={() => cart.setQuantity(id, quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
                      <button
                        onClick={() => cart.setQuantity(id, quantity + 1)}
                        disabled={quantity >= max}
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="font-display text-lg text-primary">
                        {formatPrice(linePaid)}
                      </span>
                      {lineWas > linePaid && (
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          {formatPrice(lineWas)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-tight text-foreground">Order Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
              {totals.discount > 0 && (
                <Row label="Offer discount" value={`− ${formatPrice(totals.discount)}`} highlight />
              )}
              <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
            </dl>

            {shipping > 0 && settings && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 shrink-0" />
                Spend over {formatPrice(settings.free_shipping_threshold)} for free shipping
              </div>
            )}

            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-display text-lg tracking-tight text-foreground">Total</span>
              <span className="font-display text-xl text-primary">{formatPrice(total)}</span>
            </div>

            {tooMany.length > 0 ? (
              <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Some items don't have enough stock. Lower the quantity to continue.
              </p>
            ) : (
              <Link
                to="/checkout"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt"
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/shop"
              className="mt-3 block text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={highlight ? "font-semibold text-cozy-burnt" : "font-semibold text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
