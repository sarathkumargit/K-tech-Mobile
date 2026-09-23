import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { readableError } from "@/lib/supabase";
import { createProduct, type ProductInput } from "@/services/productService";

export const Route = createFileRoute("/admin/products/create")({ component: CreateProduct });

function CreateProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created — now add some photos.");
      navigate({ to: "/admin/products/edit/$id", params: { id: product.id } });
    },
    onError: (err) => toast.error(readableError(err, "Couldn't create the product.")),
  });

  return (
    <div className="space-y-5">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Products
      </Link>
      <PageHeader title="Add product" description="You can upload photos after saving." />
      <ProductForm
        submitLabel="Create product"
        saving={create.isPending}
        onSubmit={(input) => create.mutate(input)}
      />
    </div>
  );
}
