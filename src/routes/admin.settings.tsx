import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, PageHeader, Panel, btnPrimary, inputCls } from "@/components/admin/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import { getSiteSettings, updateSiteSettings, type SiteSettings } from "@/services/settingsService";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

type Form = Omit<SiteSettings, "id" | "updated_at" | "shipping_fee" | "free_shipping_threshold"> & {
  shipping_fee: string;
  free_shipping_threshold: string;
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: qk.settings, queryFn: getSiteSettings });
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (settings.data) {
      const {
        id: _id,
        updated_at: _u,
        shipping_fee,
        free_shipping_threshold,
        ...rest
      } = settings.data;
      setForm({
        ...rest,
        shipping_fee: String(shipping_fee),
        free_shipping_threshold: String(free_shipping_threshold),
      });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (f: Form) =>
      updateSiteSettings({
        shop_name: f.shop_name.trim(),
        whatsapp_number: f.whatsapp_number.replace(/[^0-9]/g, ""),
        phone: f.phone.trim(),
        email: f.email.trim(),
        address: f.address.trim(),
        currency: f.currency.trim() || "Rs.",
        shipping_fee: Number(f.shipping_fee) || 0,
        free_shipping_threshold: Number(f.free_shipping_threshold) || 0,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.settings, data);
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(readableError(err)),
  });

  if (settings.isLoading || (!form && !settings.error))
    return <LoadingState label="Loading settings…" />;
  if (settings.error || !form)
    return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(form);
      }}
      className="space-y-5"
    >
      <PageHeader
        title="Shop settings"
        description="Shown in the footer, contact page and WhatsApp buttons."
      />
      <Panel title="Contact details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name">
            <input
              required
              value={form.shop_name}
              onChange={set("shop_name")}
              className={inputCls}
            />
          </Field>
          <Field
            label="WhatsApp number"
            hint="Country code + number, digits only (e.g. 94725544428)."
          >
            <input
              value={form.whatsapp_number}
              onChange={set("whatsapp_number")}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={set("phone")} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input value={form.address} onChange={set("address")} className={inputCls} />
          </Field>
        </div>
      </Panel>
      <Panel title="Money & shipping">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Currency label" hint="e.g. Rs., LKR, $">
            <input value={form.currency} onChange={set("currency")} className={inputCls} />
          </Field>
          <Field label="Shipping fee">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.shipping_fee}
              onChange={set("shipping_fee")}
              className={inputCls}
            />
          </Field>
          <Field label="Free shipping over">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.free_shipping_threshold}
              onChange={set("free_shipping_threshold")}
              className={inputCls}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The database uses these same numbers when an order is placed.
        </p>
      </Panel>
      <div className="flex justify-end">
        <button type="submit" disabled={save.isPending} className={btnPrimary}>
          {save.isPending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
