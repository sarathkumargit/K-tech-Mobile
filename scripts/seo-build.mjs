// Runs after `vite build` (see the "build" script in package.json).
//
// The site is static files, and every address used to get the same
// index.html, so Google and WhatsApp/Facebook previews saw the home page's
// title on every page. This script:
//   1. writes a copy of index.html per public page and per product, each with
//      its own title, description, preview image and canonical address
//      (Cloudflare serves dist/client/about.html at /about, etc.);
//   2. writes noindex copies for private pages (cart, account, sign-in…);
//   3. writes sitemap.xml listing every page and product for Google;
//   4. points robots.txt at the sitemap.
// Products are read from Supabase with the public anon key (the same data any
// visitor sees). If Supabase can't be reached, products are skipped and the
// build still succeeds. Nothing in the app's behaviour changes: the page that
// loads in the browser is exactly the same app as before.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist", "client");
const PAGES = JSON.parse(readFileSync(join(ROOT, "src/lib/seo-pages.json"), "utf8"));

// Same .env files Vite reads for a production build; real env vars win.
const env = {
  ...loadEnvFiles([".env", ".env.local", ".env.production", ".env.production.local"]),
  ...process.env,
};
const SITE_URL = (env.VITE_SITE_URL || "https://k-tech-mobile.shoplk.workers.dev").replace(
  /\/+$/,
  "",
);
const SHARE_IMAGE = `${SITE_URL}/og-image.jpg`;

const PRIVATE_PAGES = {
  "/cart": "Your Cart — K-Tech",
  "/checkout": "Checkout — K-Tech",
  "/login": "Sign In — K-Tech",
  "/signup": "Create Account — K-Tech",
  "/account": "My Account — K-Tech",
  "/reset-password": "Set a New Password — K-Tech",
  "/auth/callback": "Signing in — K-Tech",
  "/admin": "Admin — K-Tech",
};

const shell = readFileSync(join(OUT, "index.html"), "utf8");

// ---------- helpers ----------
function loadEnvFiles(names) {
  const out = {};
  for (const name of names) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return out;
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Tags that differ per page; removed from the shell before the page's own are added.
const PAGE_TAGS = [
  /<title>[\s\S]*?<\/title>/g,
  /<meta name="(?:description|robots|twitter:title|twitter:description|twitter:image)"[^>]*>/g,
  /<meta property="og:(?:title|description|image|url|type)"[^>]*>/g,
  /<link rel="canonical"[^>]*>/g,
];

function stripPageTags(html) {
  return PAGE_TAGS.reduce((h, re) => h.replace(re, ""), html);
}

function withHead(tags) {
  const html = stripPageTags(shell);
  // Right after the charset tag, which must stay first in <head>.
  const charset = html.indexOf("<meta charSet");
  if (charset < 0) throw new Error("[seo] charset tag not found in index.html");
  const at = html.indexOf(">", charset) + 1;
  return html.slice(0, at) + tags.join("") + html.slice(at);
}

function publicPage({ title, description, path, image, type = "website" }) {
  const url = `${SITE_URL}${path}`;
  const img = image || SHARE_IMAGE;
  return withHead([
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}"/>`,
    `<link rel="canonical" href="${esc(url)}"/>`,
    `<meta property="og:title" content="${esc(title)}"/>`,
    `<meta property="og:description" content="${esc(description)}"/>`,
    `<meta property="og:url" content="${esc(url)}"/>`,
    `<meta property="og:type" content="${type}"/>`,
    `<meta property="og:image" content="${esc(img)}"/>`,
    `<meta name="twitter:title" content="${esc(title)}"/>`,
    `<meta name="twitter:description" content="${esc(description)}"/>`,
    `<meta name="twitter:image" content="${esc(img)}"/>`,
  ]);
}

function privatePage(title) {
  return withHead([
    `<title>${esc(title)}</title>`,
    `<meta name="robots" content="noindex, follow"/>`,
  ]);
}

function write(urlPath, html) {
  const file = join(OUT, `${urlPath.replace(/^\//, "")}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

async function fetchProducts() {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("[seo] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set: products skipped");
    return [];
  }
  const all = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(
      `${url.replace(/\/+$/, "")}/rest/v1/product_catalog?select=slug,name,short_description,description,image_url,updated_at&is_active=eq.true&order=updated_at.desc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + pageSize - 1}`,
        },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) throw new Error(`Supabase answered ${res.status}`);
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

// ---------- 1. the shell (home + any address without its own file) ----------
// Keep the home page's title and description, but drop its canonical address:
// this file is also what Cloudflare serves for addresses that have no file of
// their own, and those must not claim to be the home page.
writeFileSync(
  join(OUT, "index.html"),
  shell.replace(/<link rel="canonical"[^>]*>/g, "").replace(/<meta property="og:url"[^>]*>/g, ""),
);

// ---------- 2. public pages ----------
const sitemap = [{ loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" }];
for (const path of ["/shop", "/about", "/contact"]) {
  write(path, publicPage({ ...PAGES[path], path }));
  sitemap.push({
    loc: `${SITE_URL}${path}`,
    changefreq: path === "/shop" ? "daily" : "monthly",
    priority: path === "/shop" ? "0.9" : "0.5",
  });
}

// ---------- 3. private pages ----------
for (const [path, title] of Object.entries(PRIVATE_PAGES)) write(path, privatePage(title));

// ---------- 4. products ----------
let products = [];
try {
  products = await fetchProducts();
} catch (err) {
  console.warn(`[seo] couldn't load products, skipped: ${err.message}`);
}
let written = 0;
for (const p of products) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(p.slug ?? "")) continue;
  const path = `/product/${p.slug}`;
  const description = String(p.short_description || p.description || p.name).slice(0, 155);
  write(
    path,
    publicPage({
      title: `${p.name} — K-Tech`,
      description,
      path,
      image: p.image_url,
      type: "product",
    }),
  );
  sitemap.push({
    loc: `${SITE_URL}${path}`,
    lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined,
    changefreq: "weekly",
    priority: "0.8",
  });
  written++;
}

// ---------- 5. sitemap.xml + robots.txt ----------
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap
    .map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}` +
        `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(OUT, "sitemap.xml"), xml);

const robotsFile = join(OUT, "robots.txt");
const robots = readFileSync(robotsFile, "utf8").replace(
  /^Sitemap:.*$/m,
  `Sitemap: ${SITE_URL}/sitemap.xml`,
);
writeFileSync(robotsFile, robots);

console.log(`[seo] ${SITE_URL}: sitemap with ${sitemap.length} URLs, ${written} product pages`);
