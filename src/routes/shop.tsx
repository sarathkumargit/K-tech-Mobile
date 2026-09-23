import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductCard, ProductGridSkeleton } from "@/components/product-card";
import { EmptyState, ErrorState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { getCategories } from "@/services/categoryService";
import { getProducts, type ProductSort } from "@/services/productService";

const SORTS: { key: ProductSort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: Low" },
  { key: "price_desc", label: "Price: High" },
];

export const Route = createFileRoute("/shop")({
  validateSearch: z.object({
    category: z.string().optional(), // category slug, or "offers"
    search: z.string().optional(),
    sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Shop — K-Tech" },
      {
        name: "description",
        content:
          "Browse brand new & used phones, accessories, chargers, and deals at K-Tech. Filter by category and find your next device.",
      },
      { property: "og:title", content: "Shop — K-Tech" },
      { property: "og:description", content: "Browse phones, accessories, and deals at K-Tech." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { category, search, sort = "newest" } = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [searchBox, setSearchBox] = useState(search ?? "");

  // Keep the box in sync when the header search changes ?search=.
  useEffect(() => setSearchBox(search ?? ""), [search]);

  // Update ?search= shortly after the user stops typing.
  useEffect(() => {
    const value = searchBox.trim();
    if (value === (search ?? "")) return;
    const t = setTimeout(() => {
      navigate({ search: (prev) => ({ ...prev, search: value || undefined }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [searchBox, search, navigate]);

  const categories = useQuery({ queryKey: qk.categories, queryFn: getCategories });
  const offersOnly = category === "offers";
  const filters = {
    ...(offersOnly ? { offersOnly: true } : category ? { categorySlug: category } : {}),
    ...(search ? { search } : {}),
    sort,
  };
  const products = useQuery({
    queryKey: qk.products(filters),
    queryFn: () => getProducts(filters),
    placeholderData: keepPreviousData,
  });

  const activeCategory = categories.data?.find((c) => c.slug === category);
  const heading = offersOnly ? "Offers & Deals" : (activeCategory?.name ?? "All Products");

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-cozy-peach to-cozy-light-peach">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="text-xs text-foreground/60">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/shop" className="hover:text-primary">
              Shop
            </Link>
            {category && (
              <>
                <span className="mx-2">/</span>
                <span className="text-foreground">{heading}</span>
              </>
            )}
          </nav>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground sm:text-5xl">
            {heading}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {products.data
              ? `${products.data.length} ${products.data.length === 1 ? "product" : "products"}${search ? ` matching “${search}”` : ""}`
              : "Loading products…"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchBox}
            onChange={(e) => setSearchBox(e.target.value)}
            placeholder="Search by name, brand, SKU…"
            aria-label="Search products"
            className="w-full rounded-full border border-input bg-card py-2.5 pl-9 pr-9 text-sm text-foreground outline-none focus:border-accent"
          />
          {searchBox && (
            <button
              onClick={() => setSearchBox("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category chips from the categories table */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={!category} to={undefined} label="All" />
          <Chip active={offersOnly} to="offers" label="Offers" />
          {categories.data?.map((cat) => (
            <Chip key={cat.id} active={category === cat.slug} to={cat.slug} label={cat.name} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Sort</span>
          </div>
          <div className="flex gap-2">
            {SORTS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() =>
                  navigate({
                    search: (prev) => ({ ...prev, sort: key === "newest" ? undefined : key }),
                  })
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  sort === key
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={cn("mt-6 transition-opacity", products.isPlaceholderData && "opacity-60")}>
          {products.isLoading ? (
            <ProductGridSkeleton />
          ) : products.error ? (
            <ErrorState
              error={products.error}
              title="Unable to load products"
              onRetry={() => products.refetch()}
            />
          ) : products.data && products.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={search || category ? "No products found" : "No products available"}
              description={
                search || category
                  ? "Try a different search or category."
                  : "Products added in the admin panel will appear here."
              }
              action={
                (search || category) && (
                  <Link
                    to="/shop"
                    className="text-sm font-semibold text-primary hover:text-cozy-burnt"
                  >
                    View all products
                  </Link>
                )
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Chip({ active, to, label }: { active: boolean; to: string | undefined; label: string }) {
  return (
    <Link
      to="/shop"
      search={(prev) => ({ ...prev, category: to })}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
