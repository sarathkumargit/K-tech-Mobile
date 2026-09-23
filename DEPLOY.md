# Hosting — Cloudflare (free) + Supabase + your own domain

## How the site is served

`npm run build` turns the site into plain static files in `dist/client`
(HTML, JS, CSS, fonts). Cloudflare serves them from its worldwide network
(including a data centre in Colombo). No server code runs, so:

- **Free and unlimited** — Cloudflare doesn't count static file requests
  toward any limit.
- **Nothing to crash** — no server CPU limits, no cold starts.
- Products, orders, logins etc. load directly from Supabase in the browser.

Config: `wrangler.jsonc` (static assets, unknown paths fall back to
`index.html`) and `public/_headers` (long-term caching for `/assets/*`).

## 1. Connect GitHub to Cloudflare (one time)

1. Sign up (free) at <https://dash.cloudflare.com>.
2. **Workers & Pages → Create → Import a repository** → connect GitHub →
   pick `sarathkumargit/K-tech-Mobile`.
3. Settings:
   - Project name: `k-tech-mobile`
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
4. **Build variables** (Advanced settings → Variables and secrets):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon / publishable key
   - Never add the `service_role` / secret key.
5. **Deploy.** You get `https://k-tech-mobile.<your-name>.workers.dev`.

Every `git push` to `main` rebuilds and redeploys automatically. After
changing build variables, redeploy (push a commit, or Deployments → Retry).

## 2. Use your own domain (e.g. ktech.lk)

`.lk` names are sold by the LK Domain Registry (<https://www.domains.lk>)
and its accredited resellers — Cloudflare can't sell `.lk` names, but it
can run the site on one.

1. **Buy the name.** Check `ktech.lk` on domains.lk. If it's taken, try
   `ktech.com.lk`, `ktechmobile.lk`, `k-tech.lk`…
2. **Add it to Cloudflare:** dashboard → **Add a domain** → enter the name
   → choose the **Free** plan. Cloudflare shows two nameservers
   (like `xxx.ns.cloudflare.com`).
3. **Point the domain to Cloudflare:** in your .lk domain account (or by
   asking the registry/reseller), replace the nameservers with the two
   Cloudflare ones. This can take a few hours to a day; Cloudflare emails
   you when the domain is active.
4. **Attach it to the site:** Workers & Pages → `k-tech-mobile` →
   **Settings → Domains & Routes → Add → Custom domain** → `ktech.lk`.
   Add `www.ktech.lk` the same way. HTTPS certificates are automatic.
5. **Update Supabase:** Authentication → URL Configuration:
   - Site URL: `https://ktech.lk`
   - Redirect URLs: `https://ktech.lk/**`, `https://www.ktech.lk/**`,
     `https://k-tech-mobile.<your-name>.workers.dev/**`,
     `http://localhost:8080/**`

Without step 5, sign-up confirmation and password-reset emails point to
the wrong address.

## 3. Speed checklist

- **Supabase region** matters most for how fast products appear: every
  page asks Supabase for data. Check Supabase → Project Settings → General
  → Region. Best for Sri Lanka: **South Asia (Mumbai)** or **Southeast
  Asia (Singapore)**. A project can't be moved to another region; if yours
  is in the US or Europe, create a new project in Mumbai/Singapore now
  (while the shop is new), run `supabase/schema.sql` there, recreate the
  admin, and switch the two `VITE_` values.
- **Product photos** are shrunk automatically when uploaded in the admin
  panel (max 1600px, WebP) — usually 100–300 KB instead of several MB.
- **Home page picture:** save it as `src/assets/hero.webp` (or `.jpg` /
  `.png`) to serve it from your own domain instead of the old external link.
- Fonts are self-hosted (`public/fonts`), so pages don't wait for Google.

## Free-plan limits

- **Cloudflare:** static files are free and unlimited.
- **Supabase free:** a project with no activity for ~7 days is paused
  (you get an email first; data is kept; press **Resume project**). Daily
  visitors keep it awake. Free plan includes 500 MB database, 1 GB file
  storage and 5 GB/month download traffic (product photos count toward
  this — another reason photos are compressed on upload).
- **Domain:** the `.lk` name is the only yearly cost.
