import { createFileRoute } from "@tanstack/react-router";
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
  inputCls,
} from "@/components/admin/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { slugify } from "@/lib/site-config";
import {
  adminListCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  type Category,
  type CategoryInput,
} from "@/services/categoryService";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: qk.admin.categories, queryFn: adminListCategories });
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: qk.categories });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CategoryInput }) =>
      id ? updateCategory(id, input) : createCategory(input),
    onSuccess: (_, vars) => {
      toast.success(vars.id ? "Category saved" : "Category created");
      setEditing(null);
      refresh();
    },
    onError: (err) => toast.error(readableError(err)),
  });

  const toggle = useMutation({
    mutationFn: (c: Category) => updateCategory(c.id, { is_active: !c.is_active }),
    onSuccess: refresh,
    onError: (err) => toast.error(readableError(err)),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Group products in the shop. Hidden categories disappear from the shop menus."
        actions={
          editing !== "new" && (
            <button onClick={() => setEditing("new")} className={btnPrimary}>
              <Plus className="h-4 w-4" /> Add category
            </button>
          )
        }
      />

      {editing === "new" && (
        <Panel title="New category">
          <CategoryForm
            saving={save.isPending}
            nextOrder={(categories.data?.length ?? 0) * 10 + 10}
            onCancel={() => setEditing(null)}
            onSave={(input) => save.mutate({ input })}
          />
        </Panel>
      )}

      {categories.isLoading ? (
        <LoadingState label="Loading categories…" />
      ) : categories.error ? (
        <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
      ) : !categories.data || categories.data.length === 0 ? (
        <EmptyState title="No categories yet" description="Add one to start organising products." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {categories.data.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="p-4">
                <CategoryForm
                  category={c}
                  saving={save.isPending}
                  nextOrder={c.sort_order}
                  onCancel={() => setEditing(null)}
                  onSave={(input) => save.mutate({ id: c.id, input })}
                />
              </li>
            ) : (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    {c.name} {!c.is_active && <Pill>Hidden</Pill>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{c.slug} · order {c.sort_order}
                    {c.description ? ` · ${c.description}` : ""}
                  </p>
                </div>
                <Toggle
                  checked={c.is_active}
                  onChange={() => toggle.mutate(c)}
                  label={c.is_active ? "Visible" : "Hidden"}
                  hideLabel
                  disabled={toggle.isPending}
                />
                <button
                  onClick={() => setEditing(c.id)}
                  aria-label={`Edit ${c.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  title={`Delete ${c.name}?`}
                  description="Products in this category are kept but will have no category. To just hide it, switch it off instead."
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
                  onConfirm={async () => {
                    try {
                      await deleteCategory(c.id);
                      toast.success("Category deleted");
                      refresh();
                    } catch (err) {
                      toast.error(readableError(err));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  saving,
  nextOrder,
  onSave,
  onCancel,
}: {
  category?: Category;
  saving: boolean;
  nextOrder: number;
  onSave: (input: CategoryInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [description, setDescription] = useState(category?.description ?? "");
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? nextOrder));
  const [active, setActive] = useState(category?.is_active ?? true);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !slug) {
          toast.error("Name and slug are required.");
          return;
        }
        onSave({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_active: active,
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={inputCls}
        />
      </Field>
      <Field label="Slug" hint={`/shop?category=${slug || "…"}`}>
        <input
          required
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugTouched(true);
          }}
          className={inputCls}
        />
      </Field>
      <Field label="Description (optional)" className="sm:col-span-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Image URL (optional)">
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Sort order" hint="Lower numbers show first.">
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={inputCls}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <Toggle checked={active} onChange={setActive} label="Visible in the shop" />
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : category ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </form>
  );
}
