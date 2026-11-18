// Search-engine and link-preview tags, in one place.
//
// Every public page uses `seo()` in its route `head`, so Google and
// WhatsApp/Facebook previews get the same title, description, image and
// main address ("canonical") for the page. Private pages use `NOINDEX`.
//
// The site address comes from VITE_SITE_URL (set it when the site moves to its
// own domain); scripts/seo-build.mjs reads the same variable for sitemap.xml.

import pages from "./seo-pages.json";

const DEFAULT_SITE_URL = "https://k-tech-mobile.shoplk.workers.dev";

export const SITE_URL = (
  (import.meta.env["VITE_SITE_URL"] as string | undefined) || DEFAULT_SITE_URL
).replace(/\/+$/, "");

export const SITE_NAME = "K-Tech";

/** Shared preview picture (1200 × 630), in /public. */
export const DEFAULT_SHARE_IMAGE = "/og-image.jpg";

/** Title and description of each public page (also used by scripts/seo-build.mjs). */
export const PAGES: Record<
  "/" | "/shop" | "/about" | "/contact",
  { title: string; description: string }
> = pages;

/** Prices on the site are in Sri Lankan rupees. */
export const CURRENCY_CODE = "LKR";

/** "/shop" -> "https://…/shop"; full URLs are returned unchanged. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

type SeoInput = {
  title: string;
  description: string;
  /** The page's own path, e.g. "/shop" or "/product/iphone-15". */
  path: string;
  image?: string | null | undefined;
  type?: "website" | "product";
};

/** Title, description, canonical URL and link-preview tags for a public page. */
export function seo({ title, description, path, image, type = "website" }: SeoInput) {
  const url = absoluteUrl(path);
  const shareImage = absoluteUrl(image || DEFAULT_SHARE_IMAGE);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      { property: "og:image", content: shareImage },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: shareImage },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** For pages that shouldn't appear in search results (cart, sign-in, account…). */
export const NOINDEX = { name: "robots", content: "noindex, follow" };

/** A schema.org block for a route's `head().scripts` ("<" escaped so it can't end the tag). */
export function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
