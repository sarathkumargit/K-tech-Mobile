import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImagesManager } from "@/components/admin/product-images";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { adminGetProduct, updateProduct, type ProductInput } from "@/services/productService";

export const Route = createFileRoute("/admin/products/edit/$id")({ component: EditProduct });

function EditProduct() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: qk.admin.product(id), queryFn: () => adminGetProduct(id) });

  const save = useMutation({
    mutationFn: (input: ProductInput) => updateProduct(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product saved");
    },
    onError: (err) => toast.error(readableError(err, "Couldn't save the product.")),
  });

  const back = (
    <Link
      to="/admin/products"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Products
    </Link>
  );

  if (product.isLoading) return <LoadingState label="Loading product…" />;
  if (product.error) return <ErrorState error={product.error} onRetry={() => product.refetch()} />;
  if (!product.data)
    return (
      <div className="space-y-5">
        {back}
        <EmptyState title="Product not found" />
      </div>
    );

  const p = product.data;
  return (
    <div className="space-y-5">
      {back}
      <PageHeader
        title={p.name}
        description={p.is_active ? "Visible in the shop" : "Hidden from the shop"}
        actions={
          p.is_active && (
            <a
              href={`/product/${p.slug}`}
              target="_blank"
              rel="noreferrer"
              className={btnSecondary}
            >
              View in shop <ExternalLink className="h-4 w-4" />
            </a>
          )
        }
      />
      <ProductImagesManager productId={p.id} images={p.images} />
      <ProductForm
        product={p}
        submitLabel="Save changes"
        saving={save.isPending}
        onSubmit={(input) => save.mutate(input)}
      />
    </div>
  );
}
