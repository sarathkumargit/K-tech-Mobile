import { cloneElement, isValidElement, useId, useState, type ReactNode } from "react";
import { X, Wrench, Send, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { readableError } from "@/lib/supabase";
import { whatsappLink } from "@/lib/site-config";
import { submitRepairRequest } from "@/services/repairService";

import { useRepair } from "@/components/repair-context";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/use-site-settings";

const brands = [
  "Apple",
  "Samsung",
  "Aurora",
  "Xiaomi",
  "Oppo",
  "Vivo",
  "Realme",
  "Huawei",
  "Other",
];

export function RepairModal() {
  const { settings } = useSiteSettings();
  const { isOpen, close } = useRepair();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phoneNumber: "",
    phoneBrand: "",
    phoneModel: "",
    issue: "",
    message: "",
  });

  if (!isOpen) return null;

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid =
    form.customerName.trim().length >= 2 &&
    form.phoneNumber.trim().length >= 7 &&
    form.phoneBrand &&
    form.phoneModel.trim().length >= 1 &&
    form.issue.trim().length >= 3;

  const buildWhatsAppMessage = () => {
    const lines = [
      "*New Repair Request — K-Tech*",
      "",
      `Customer: ${form.customerName}`,
      `Phone: ${form.phoneNumber}`,
      `Brand: ${form.phoneBrand}`,
      `Model: ${form.phoneModel}`,
      `Issue: ${form.issue}`,
    ];
    if (form.message.trim()) lines.push(`Note: ${form.message.trim()}`);
    return lines.join("\n");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      await submitRepairRequest({
        customer_name: form.customerName.trim(),
        phone_number: form.phoneNumber.trim(),
        phone_brand: form.phoneBrand,
        phone_model: form.phoneModel.trim(),
        issue: form.issue.trim(),
        message: form.message.trim() || null,
      });
      setSaved(true);
      setDone(true);
      toast.success("Repair request submitted!");
    } catch (err) {
      toast.error(readableError(err, "Could not submit your request."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({
      customerName: "",
      phoneNumber: "",
      phoneBrand: "",
      phoneModel: "",
      issue: "",
      message: "",
    });
    setDone(false);
    setSaved(false);
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={reset} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cozy-orange to-cozy-burnt text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-foreground">Phone Repair Request</h2>
              <p className="text-xs text-muted-foreground">
                Tell us what's wrong — we'll get back to you fast.
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="mt-6 flex flex-col items-center text-center">
            <CheckCircle2 className="h-14 w-14 text-accent" />
            <h3 className="mt-4 font-display text-2xl text-foreground">Request Received!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {saved
                ? "We've saved your repair request and will contact you soon. For a faster reply, send the details to our shop on WhatsApp too."
                : "Tap below to send your repair details to our shop on WhatsApp."}
            </p>
            {whatsappLink(settings?.whatsapp_number) && (
              <a
                href={whatsappLink(settings?.whatsapp_number, buildWhatsAppMessage()) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground transition-transform hover:scale-[1.02]"
              >
                <Send className="h-4 w-4" />
                Send on WhatsApp
              </a>
            )}
            <button
              onClick={reset}
              className="mt-3 w-full rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Customer Name">
                <input
                  required
                  value={form.customerName}
                  onChange={set("customerName")}
                  placeholder="Your name"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  required
                  type="tel"
                  value={form.phoneNumber}
                  onChange={set("phoneNumber")}
                  placeholder="07x xxx xxxx"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Phone Brand">
                <select
                  required
                  value={form.phoneBrand}
                  onChange={set("phoneBrand")}
                  className={inputCls}
                >
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Phone Model">
                <input
                  required
                  value={form.phoneModel}
                  onChange={set("phoneModel")}
                  placeholder="e.g. iPhone 13 Pro"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="What is the issue?">
              <textarea
                required
                rows={3}
                value={form.issue}
                onChange={set("issue")}
                placeholder="Describe the problem…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
            <Field label="Additional message (optional)">
              <textarea
                rows={2}
                value={form.message}
                onChange={set("message")}
                placeholder="Anything else we should know?"
                className={cn(inputCls, "resize-none")}
              />
            </Field>

            <button
              type="submit"
              disabled={loading || !valid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Repair Request
                </>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              We'll save your request and follow up. You can also send it via WhatsApp after
              submitting.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25";

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="block">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
      </label>
      {isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children}
    </div>
  );
}
