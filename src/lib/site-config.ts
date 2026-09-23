// Formatting helpers. Shop details (name, phone, WhatsApp, currency, shipping)
// come from the site_settings table — see hooks/use-site-settings.ts.

let currency = "Rs.";

// Called once the site settings have loaded.
export function setCurrency(value: string | null | undefined) {
  if (value) currency = value;
}

export function formatPrice(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `${currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | Date, withTime = false): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// "Galaxy S24 Ultra!" -> "galaxy-s24-ultra"
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function whatsappLink(number: string | null | undefined, text?: string) {
  const digits = (number ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
