import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Field, Panel, Toggle, btnPrimary, btnSecondary, inputCls } from "@/components/admin/ui";
import { qk } from "@/lib/query-keys";
import { slugify } from "@/lib/site-config";
import { adminListCategories } from "@/services/categoryService";
import type { ProductInput } from "@/services/productService";
import type { ProductRow, Spec } from "@/types/database";

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  short_description: string;
  description: string;
  price: string;
  compare_price: string;
  stock_quantity: string;
  category_id: string;
  brand: string;
  sku: string;
  condition: string;
  specifications: Spec[];
  features: string;
  is_featured: boolean;
  is_active: boolean;
};

function initialState(p?: ProductRow | null): FormState {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    slugTouched: Boolean(p),
    short_description: p?.short_description ?? "",
    description: p?.description ?? "",
    price: p ? String(p.price) : "",
    compare_price: p?.compare_price != null ? String(p.compare_price) : "",
    stock_quantity: p ? String(p.stock_quantity) : "0",
    category_id: p?.category_id ?? "",
    brand: p?.brand ?? "",
    sku: p?.sku ?? "",
    condition: p?.condition ?? "",
    specifications: p?.specifications ?? [],
    features: (p?.features ?? []).join("\n"),
    is_featured: p?.is_featured ?? false,
    is_active: p?.is_active ?? true,
  };
}

// Validates the form; returns the row to save or a list of problems.
function toInput(f: FormState): { input?: ProductInput; errors: string[] } {
  const errors: string[] = [];
  const price = Number(f.price);
  const compare = f.compare_price.trim() === "" ? null : Number(f.compare_price);
  const stock = Number(f.stock_quantity);
  if (f.name.trim().length < 2) errors.push("Name is required.");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug))
    errors.push("Slug can only use lowercase letters, numbers and dashes.");
  if (f.price.trim() === "" || !Number.isFinite(price) || price < 0)
    errors.push("Price must be 0 or more.");
  if (compare !== null && (!Number.isFinite(compare) || compare < 0))
    errors.push("Compare price must be 0 or more.");
  if (!Number.isInteger(stock) || stock < 0)
    errors.push("Stock must be a whole number, 0 or more.");
  if (errors.length) return { errors };
  return {
    errors,
    input: {
      name: f.name.trim(),
      slug: f.slug,
      short_description: f.short_description.trim() || null,
      description: f.description.trim(),
      price,
      compare_price: compare,
      stock_quantity: stock,
      category_id: f.category_id || null,
      brand: f.brand.trim() || null,
      sku: f.sku.trim() || null,
      condition: f.condition.trim() || null,
      specifications: f.specifications
        .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
        .filter((s) => s.label && s.value),
      features: f.features
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      is_featured: f.is_featured,
      is_active: f.is_active,
    },
  };
}

export function ProductForm({
  product,
  submitLabel,
  saving,
  onSubmit,
}: {
  product?: ProductRow | null;
  submitLabel: string;
  saving: boolean;
  onSubmit: (input: ProductInput) => void;
}) {
  const [f, setF] = useState<FormState>(() => initialState(product));
  const [errors, setErrors] = useState<string[]>([]);
  const categories = useQuery({ queryKey: qk.admin.categories, queryFn: adminListCategories });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((s) => ({ ...s, [key]: value }));
  const onName = (name: string) =>
    setF((s) => ({ ...s, name, slug: s.slugTouched ? s.slug : slugify(name) }));

  const specs = f.specifications;
  const categoryOptions = useMemo(() => categories.data ?? [], [categories.data]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const { input, errors: errs } = toInput(f);
        setErrors(errs);
        if (input) onSubmit(input);
      }}
      className="space-y-5"
    >
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <Panel title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <input
              required
              value={f.name}
              onChange={(e) => onName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Slug (web address)" hint={`/product/${f.slug || "…"}`}>
            <input
              required
              value={f.slug}
              onChange={(e) =>
                setF((s) => ({ ...s, slug: slugify(e.target.value), slugTouched: true }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              value={f.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className={inputCls}
            >
              <option value="">No category</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_active ? "" : " (hidden)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <input
              value={f.brand}
              onChange={(e) => set("brand", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="SKU" hint="Your stock code. Must be unique.">
            <input
              value={f.sku}
              onChange={(e) => set("sku", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Condition" hint="e.g. New, Excellent, Good (for used phones)">
            <input
              value={f.condition}
              onChange={(e) => set("condition", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Short description"
            hint="One line shown on product cards."
            className="sm:col-span-2"
          >
            <input
              value={f.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Full description" className="sm:col-span-2">
            <textarea
              rows={5}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Price & stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price">
            <input
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={f.price}
              onChange={(e) => set("price", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Compare-at price" hint="Optional 'was' price shown crossed out.">
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={f.compare_price}
              onChange={(e) => set("compare_price", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Stock quantity">
            <input
              required
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={f.stock_quantity}
              onChange={(e) => set("stock_quantity", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Discounts with start and end dates are set up under <strong>Offers</strong>.
        </p>
      </Panel>

      <Panel title="Specifications & highlights">
        <div className="space-y-2">
          {specs.map((spec, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={spec.label}
                onChange={(e) =>
                  set(
                    "specifications",
                    specs.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)),
                  )
                }
                placeholder="e.g. RAM"
                aria-label="Specification name"
                className={inputCls}
              />
              <input
                value={spec.value}
                onChange={(e) =>
                  set(
                    "specifications",
                    specs.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)),
                  )
                }
                placeholder="e.g. 8GB"
                aria-label="Specification value"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    "specifications",
                    specs.filter((_, j) => j !== i),
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove specification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("specifications", [...specs, { label: "", value: "" }])}
            className={btnSecondary}
          >
            <Plus className="h-4 w-4" /> Add specification
          </button>
        </div>
        <Field label="Highlights" hint="One per line." className="mt-4">
          <textarea
            rows={4}
            value={f.features}
            onChange={(e) => set("features", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Panel>

      <Panel title="Visibility">
        <div className="flex flex-wrap gap-6">
          <Toggle
            checked={f.is_active}
            onChange={(v) => set("is_active", v)}
            label="Visible in the shop"
          />
          <Toggle
            checked={f.is_featured}
            onChange={(v) => set("is_featured", v)}
            label="Featured on the home page"
          />
        </div>
      </Panel>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
