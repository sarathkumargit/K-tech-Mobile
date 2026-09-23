import { formatPrice } from "@/lib/site-config";
import type { Product } from "@/services/productService";
import { cn } from "@/lib/utils";

// What was it before? A running offer beats the manual compare price.
export function wasPrice(p: Pick<Product, "price" | "compare_price" | "final_price" | "offer_id">) {
  const final = Number(p.final_price);
  if (p.offer_id && final < Number(p.price)) return Number(p.price);
  if (p.compare_price != null && Number(p.compare_price) > final) return Number(p.compare_price);
  return null;
}

export function discountPercent(
  p: Pick<Product, "price" | "compare_price" | "final_price" | "offer_id">,
) {
  const was = wasPrice(p);
  if (!was) return 0;
  return Math.round(((was - Number(p.final_price)) / was) * 100);
}

export function ProductPrice({
  product,
  size = "md",
  className,
}: {
  product: Pick<Product, "price" | "compare_price" | "final_price" | "offer_id">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const was = wasPrice(product);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-display text-primary",
          size === "lg" ? "text-4xl" : size === "md" ? "text-lg" : "text-base",
        )}
      >
        {formatPrice(product.final_price)}
      </span>
      {was && (
        <span
          className={cn(
            "text-muted-foreground line-through",
            size === "lg" ? "text-lg" : "text-xs",
          )}
        >
          {formatPrice(was)}
        </span>
      )}
    </div>
  );
}
