// The home page hero picture.
//
// Put your own file at src/assets/hero.webp (or .jpg / .png) and it is used
// automatically: bundled, hashed, cached forever and served from Cloudflare's
// network — the same connection the page already has open.
//
// Until then the original hosted image is used, which lives on someone else's
// server. That costs the browser a fresh DNS lookup, TCP connection and TLS
// handshake before a single byte of the biggest image on the page arrives.
// The <link rel="preconnect"> in __root.tsx softens that, but replacing the
// file is the real fix.
const localHero = Object.values(
  import.meta.glob<string>("../assets/hero.{webp,jpg,jpeg,png}", {
    eager: true,
    import: "default",
  }),
)[0];

export const HERO_IMAGE =
  localHero ??
  "https://vibe.filesafe.space/1790084348979734783/assets/15d93eef-8043-4c34-bb25-ce6d12e12ba3.png";

/** Origin to open a connection to early, or null when the hero is bundled. */
export const heroOrigin = (() => {
  if (!HERO_IMAGE.startsWith("http")) return null;
  try {
    return new URL(HERO_IMAGE).origin;
  } catch {
    return null;
  }
})();
