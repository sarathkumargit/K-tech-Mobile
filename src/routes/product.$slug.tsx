import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  ArrowLeft,
  Wrench,
  MessageCircle,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { ProductCard, ProductImage } from "@/components/product-card";
import { ProductPrice, discountPercent, wasPrice } from "@/components/product-price";
import { CountdownTimer } from "@/components/countdown-timer";
import { ErrorState, LoadingState } from "@/components/states";
import { useRepair } from "@/components/repair-context";
import { useCart } from "@/hooks/use-cart";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { qk } from "@/lib/query-keys";
import { formatPrice, whatsappLink } from "@/lib/site-config";
import { maxQuantity } from "@/services/cartService";
import {
  getProductBySlug,
  getRelatedProducts,
  type ProductWithImages,
} from "@/services/productService";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlug(params.slug);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => {
    const product = loaderData as ProductWithImages | undefined;
    if (!product) {
      return {
        meta: [{ title: "Product not found — K-Tech" }, { name: "robots", content: "noindex" }],
      };
    }
    const description = (product.short_description || product.description).slice(0, 155);
    return {
      meta: [
        { title: `${product.name} — K-Tech` },
        { name: "description", content: description },
        { property: "og:title", content: `${product.name} — K-Tech` },
        { property: "og:description", content: description },
        ...(product.image_url
          ? [
              { property: "og:image", content: product.image_url },
              { name: "twitter:image", content: product.image_url },
            ]
          : []),
      ],
    };
  },
  pendingComponent: () => <LoadingState label="Loading product…" className="py-32" />,
  errorComponent: ProductError,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl text-foreground">Product not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been removed or is no longer available.
      </p>
      <Link to="/shop" className="mt-6 inline-flex text-primary hover:text-cozy-burnt">
        Back to shop
      </Link>
    </div>
  ),
  // Remount per product so the selected image and quantity reset.
  component: function ProductRoute() {
    const product = Route.useLoaderData();
    return <ProductPage key={product.id} product={product} />;
  },
});

function ProductError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ErrorState
        error={error}
        title="Unable to load this product"
        onRetry={() => {
          router.invalidate();
          reset();
        }}
      />
    </div>
  );
}

function ProductPage({ product }: { product: ProductWithImages }) {
  const { add, isAdding } = useCart();
  const { open: openRepair } = useRepair();
  const { settings } = useSiteSettings();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const related = useQuery({
    queryKey: qk.related(product.id),
    queryFn: () => getRelatedProducts(product, 4),
  });

  const gallery =
    product.images.length > 0
      ? product.images.map((i) => i.image_url)
      : product.image_url
        ? [product.image_url]
        : [];
  const discount = discountPercent(product);
  const was = wasPrice(product);
  const max = maxQuantity(product);
  const inStock = max > 0;
  const isUsed = Boolean(product.condition && product.condition.toLowerCase() !== "new");
  const whatsapp = whatsappLink(
    settings?.whatsapp_number,
    `Hi ${settings?.shop_name ?? "K-Tech"}, I'm interested in the ${product.name} (${formatPrice(product.final_price)}). Is it available?`,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to="/shop"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Gallery (product_images) */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/40">
            <ProductImage
              src={gallery[activeImage] ?? null}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {discount > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-cozy-burnt px-3 py-1 text-xs font-bold uppercase text-primary-foreground">
                {discount}% OFF
              </span>
            )}
            {isUsed && (
              <span className="absolute right-3 top-3 rounded-full bg-foreground/80 px-3 py-1 text-xs font-bold uppercase text-background">
                {product.condition}
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    activeImage === i ? "border-accent" : "border-border"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {product.category_name && (
              <Link
                to="/shop"
                search={{ category: product.category_slug ?? undefined }}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-accent"
              >
                {product.category_name}
              </Link>
            )}
            {product.brand && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {product.brand}
              </span>
            )}
            {product.sku && (
              <span className="text-xs text-muted-foreground">SKU {product.sku}</span>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {product.name}
          </h1>
          {product.short_description && (
            <p className="mt-1.5 text-base text-muted-foreground">{product.short_description}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ProductPrice product={product} size="lg" />
            {was && (
              <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-cozy-burnt">
                Save {formatPrice(was - Number(product.final_price))}
              </span>
            )}
          </div>

          {product.offer_id && (
            <div className="mt-4 rounded-xl border border-cozy-orange/30 bg-cozy-peach/40 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-cozy-burnt">
                <Tag className="h-4 w-4" />
                {product.offer_title}
              </p>
              {product.offer_end_date && (
                <>
                  <p className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-cozy-burnt">
                    Offer ends in
                  </p>
                  <CountdownTimer end={product.offer_end_date} />
                </>
              )}
            </div>
          )}

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {product.description}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-accent" />
                <span className="font-medium text-foreground">
                  In stock
                  {product.stock_quantity <= 5 ? ` · only ${product.stock_quantity} left` : ""}
                </span>
              </>
            ) : (
              <>
                <span className="flex h-2 w-2 rounded-full bg-destructive" />
                <span className="font-medium text-destructive">Out of stock</span>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!inStock || quantity <= 1}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold" aria-live="polite">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                disabled={!inStock || quantity >= max}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => void add(product.id, quantity, product.name)}
              disabled={!inStock || isAdding}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-5 w-5" />
              {isAdding ? "Adding…" : "Add to Cart"}
            </button>
          </div>

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-6 py-3 font-semibold text-cozy-burnt transition-colors hover:bg-accent/20"
            >
              <MessageCircle className="h-5 w-5" />
              Ask on WhatsApp
            </a>
          )}

          {isUsed && (
            <button
              onClick={openRepair}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Wrench className="h-4 w-4" />
              Need a repair instead?
            </button>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
            {[
              { icon: Truck, label: "Fast Delivery" },
              { icon: ShieldCheck, label: "Genuine Warranty" },
              { icon: RotateCcw, label: "7-Day Returns" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {product.specifications.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl tracking-tight text-foreground">Specifications</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <dl className="divide-y divide-border">
              {product.specifications.map((spec, i) => (
                <div key={i} className="grid grid-cols-2 bg-card px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {product.features.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-tight text-foreground">Highlights</h2>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {product.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-foreground/80">
                <Check className="h-4 w-4 shrink-0 text-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.data && related.data.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl tracking-tight text-foreground">
            You Might Also Like
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
