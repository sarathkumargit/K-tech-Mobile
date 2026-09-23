import { Link } from "@tanstack/react-router";
import { ImageOff, ShoppingBag } from "lucide-react";
import type { Product } from "@/services/productService";
import { useCart } from "@/hooks/use-cart";
import { CountdownTimer } from "@/components/countdown-timer";
import { ProductPrice, discountPercent } from "@/components/product-price";

export function ProductCard({ product }: { product: Product }) {
  const { add, isAdding } = useCart();
  const discount = discountPercent(product);
  const inStock = product.stock_quantity > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    void add(product.id, 1, product.name);
  };

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-cozy-orange/15"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        <ProductImage src={product.image_url} alt={product.name} />
        {/* Badges share one row and wrap on narrow cards instead of overlapping */}
        {(discount > 0 || (product.condition && product.condition.toLowerCase() !== "new")) && (
          <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1">
            {discount > 0 ? (
              <span className="rounded-full bg-cozy-burnt px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground sm:px-2.5 sm:py-1">
                {discount}% OFF
              </span>
            ) : (
              <span />
            )}
            {product.condition && product.condition.toLowerCase() !== "new" && (
              <span className="max-w-full truncate rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background sm:px-2.5 sm:py-1">
                {product.condition}
              </span>
            )}
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        {product.category_name && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {product.category_name}
          </span>
        )}
        <h3 className="mt-1 font-display text-base leading-tight text-foreground">
          {product.name}
        </h3>
        {(product.brand || product.short_description) && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {[product.brand, product.short_description].filter(Boolean).join(" · ")}
          </p>
        )}

        {product.offer_end_date && (
          <div className="mt-2">
            <CountdownTimer end={product.offer_end_date} compact />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <ProductPrice product={product} />
          <button
            onClick={handleAdd}
            disabled={!inStock || isAdding}
            aria-label={`Add ${product.name} to cart`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={
        className ??
        "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      }
    />
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="aspect-square animate-pulse bg-secondary/60" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}
