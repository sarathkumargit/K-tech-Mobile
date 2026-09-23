import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  ConfirmButton,
  PageHeader,
  Pill,
  Toggle,
  btnPrimary,
  inputCls,
} from "@/components/admin/ui";
import { ProductImage } from "@/components/product-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { formatPrice } from "@/lib/site-config";
import {
  adminListProducts,
  deleteProduct,
  updateProduct,
  type Product,
} from "@/services/productService";

export const Route = createFileRoute("/admin/products/")({ component: ProductsPage });

function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchBox, setSearchBox] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchBox.trim()), 300);
    return () => clearTimeout(t);
  }, [searchBox]);

  const products = useQuery({
    queryKey: qk.admin.products(search),
    queryFn: () => adminListProducts(search),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const toggleActive = useMutation({
    mutationFn: (p: Product) => updateProduct(p.id, { is_active: !p.is_active }),
    onSuccess: (p) => {
      toast.success(
        p.is_active ? `${p.name} is visible in the shop` : `${p.name} is hidden from the shop`,
      );
      refresh();
    },
    onError: (err) => toast.error(readableError(err)),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Everything customers can buy. Hidden products stay in the database but don't show in the shop."
        actions={
          <Link to="/admin/products/create" className={btnPrimary}>
            <Plus className="h-4 w-4" /> Add product
          </Link>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchBox}
          onChange={(e) => setSearchBox(e.target.value)}
          placeholder="Search name, brand, SKU…"
          className={`${inputCls} pl-9`}
        />
      </div>

      {products.isLoading ? (
        <LoadingState label="Loading products…" />
      ) : products.error ? (
        <ErrorState
          error={products.error}
          title="Unable to load products"
          onRetry={() => products.refetch()}
        />
      ) : !products.data || products.data.length === 0 ? (
        <EmptyState
          title={search ? "No products match your search" : "No products yet"}
          description={search ? undefined : "Add your first product to start selling."}
          action={
            !search && (
              <Link to="/admin/products/create" className={btnPrimary}>
                <Plus className="h-4 w-4" /> Add product
              </Link>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {products.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
                <ProductImage
                  src={p.image_url}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[p.category_name ?? "No category", p.brand, p.sku && `SKU ${p.sku}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {!p.is_active && <Pill>Hidden</Pill>}
                  {p.is_featured && <Pill tone="info">Featured</Pill>}
                  {p.offer_id && <Pill tone="good">Offer: {p.offer_title}</Pill>}
                  {p.stock_quantity === 0 ? (
                    <Pill tone="warn">Out of stock</Pill>
                  ) : p.stock_quantity <= 5 ? (
                    <Pill tone="warn">{p.stock_quantity} left</Pill>
                  ) : null}
                </div>
              </div>
              <div className="w-28 text-right text-sm">
                <p className="font-semibold tabular-nums text-foreground">
                  {formatPrice(p.final_price)}
                </p>
                {Number(p.final_price) < Number(p.price) && (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatPrice(p.price)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Stock {p.stock_quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  checked={p.is_active}
                  onChange={() => toggleActive.mutate(p)}
                  label={p.is_active ? "Visible in shop" : "Hidden from shop"}
                  hideLabel
                  disabled={toggleActive.isPending}
                />
                <Link
                  to="/admin/products/edit/$id"
                  params={{ id: p.id }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <ConfirmButton
                  title={`Delete ${p.name}?`}
                  description="This removes the product, its images and offers. Past orders keep their copy of the name and price. To keep it but stop selling it, switch it off instead."
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
                  onConfirm={async () => {
                    try {
                      await deleteProduct(p.id);
                      toast.success("Product deleted");
                      refresh();
                    } catch (err) {
                      toast.error(readableError(err));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
