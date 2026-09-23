# K-Tech — Supabase database setup

This sets up the whole backend for the store: sign-in (email + Google), user
profiles, admins, categories, products, product images, offers, carts, orders
and the security rules that protect them.

Do these steps in order. It takes about 15 minutes.

The website reads and writes everything through these tables — there is no
product, offer or user data inside the code. Until step 5 is done the site
shows "The store isn't connected yet".

---

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in, and click **New project**.
2. Fill in the form:
   - **Project name:** `k-tech`
   - **Database password:** generate one and save it in your password manager.
   - **Region:** the one closest to your customers (Asia-Pacific).
   - **Security:** keep **Enable Data API** on, turn **Automatically expose new
     tables** off (the script grants access itself), and turn **Enable automatic
     RLS** on (a safety net for tables you add later).
3. When it's ready, open **Project Settings → API** and keep this page open. You need:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon / publishable key** (safe to use in the browser)

   You will _not_ need the `service_role` / secret key for the website. Never
   put it in frontend code.

## 2. Run the database script

1. Open **SQL Editor → New query**.
2. **Only if you ran the old `schema.sql` in this project before:** paste
   `supabase/reset_old_demo_schema.sql`, click **Run**. (This deletes the old
   demo tables. Skip it for a new project.)
3. Paste the whole of `supabase/schema.sql` and click **Run**.
   You should see _Success. No rows returned_.

The script is safe to run again later. If you run the new script on a project
that still has the old demo tables, it stops with a message telling you to run
the reset file first.

**Check it worked:** open **Table Editor**. You should see these tables:
`admin_users, cart_items, carts, categories, offers, order_items,
order_statuses, orders, product_images, products, profiles, repair_requests,
site_settings`, and **Storage** should show two buckets: `product-images` and
`avatars`.

## 3. Turn on sign-in methods

### Email + password

**Authentication → Sign In / Providers → Email**: make sure it is enabled.

- **Confirm email** on = users must click a link in their inbox before they can
  sign in (recommended for a live shop). You can turn it off while testing.

### Site address (needed for Google and for email links)

**Authentication → URL Configuration**

- **Site URL**: your live website address. While developing, use the address
  VS Code shows after `npm run dev` — for this project that is
  `http://localhost:8080`.
- **Redirect URLs**: add
  - `http://localhost:8080/**`
  - `https://your-live-domain.com/**` (when you have one)

  Sign-in links come back to `/auth/callback` on your site; the `/**` covers it.

### Google

1. Go to <https://console.cloud.google.com> → create or pick a project.
2. **APIs & Services → OAuth consent screen**: choose _External_, fill in the
   app name (K-Tech), support email and developer email, then save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:8080` (and your live domain later)
   - **Authorized redirect URIs**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (copy the exact value from Supabase → Authentication → Providers → Google → _Callback URL_)
4. Copy the **Client ID** and **Client secret**.
5. In Supabase: **Authentication → Sign In / Providers → Google** → enable,
   paste the Client ID and secret, **Save**.

When someone signs in with Google, their name and photo are copied into
`profiles` automatically.

## 4. Make yourself the first admin

Admins are the users listed in `admin_users`. Nobody can add themselves from
the website — the first admin must be added here:

1. Create your account on the website (or in **Authentication → Users → Add user**).
2. In **SQL Editor**, run (with your email):

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'you@example.com'
on conflict (user_id) do nothing;
```

After that you can add or remove other admins from the admin panel. An admin
can't remove their own access (so you can't lock yourself out).

## 5. Add the keys to the project

Create a file called `.env.local` in the `k-tech` folder (next to
`package.json`) with:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`.env.local` is already in `.gitignore`, so it won't be committed. Restart
`npm run dev` after creating it.

The anon/publishable key is designed to be public — what each visitor can do is
decided by the Row Level Security rules below. Never put the `service_role` /
secret key in this file or anywhere in the frontend.

## 6. Try it

1. Open the site, **Sign up** (or Continue with Google).
2. Make that account an admin (step 4), then reload — an **Admin** link appears
   in the header.
3. In **Admin → Products → Add product**, create a product, then upload photos
   on the page that opens.
4. **Admin → Offers → New offer** to put it on sale.
5. Sign in with a second account in another browser, add it to the cart and
   check out. The order appears under **My Account** and in **Admin → Orders**.

---

## What the script creates

```
auth.users  (Supabase Auth — passwords live only here)
   │
   ├── profiles        1 per user: name, email, photo, phone
   ├── admin_users     who is an admin
   ├── carts ──── cart_items ──► products
   ├── orders ─── order_items ─► products (name + price copied at purchase)
   └── repair_requests (optional link to the user)

categories ──► products ──┬── product_images   (files in Storage: product-images/)
                          └── offers           (discounts with start/end dates)

order_statuses   pending → confirmed → processing → shipped → delivered / cancelled
site_settings    shop name, WhatsApp, phone, email, address, currency, shipping rule
```

| Table                 | What it holds                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`            | Name, email, photo, phone for each user. Created automatically at sign-up.                                                                                                                       |
| `admin_users`         | One row per administrator (`user_id` → `auth.users`).                                                                                                                                            |
| `categories`          | Name, slug, description, image, sort order, active flag. Starts with your 5 shop categories.                                                                                                     |
| `products`            | Name, slug, short + full description, price, compare price, stock, category, main image, brand, SKU, condition, specifications, features, featured flag, active flag, created by/at, updated at. |
| `product_images`      | Several images per product, in order. The first one becomes the product's main image automatically.                                                                                              |
| `offers`              | Product, title, description, % or fixed discount, start/end dates, active flag.                                                                                                                  |
| `carts`, `cart_items` | One cart per user; quantity per product.                                                                                                                                                         |
| `order_statuses`      | The list of order statuses. Add or rename statuses here, not in code.                                                                                                                            |
| `orders`              | Customer, status, subtotal, discount, shipping, total, delivery address, notes, order number.                                                                                                    |
| `order_items`         | Product name, SKU, image, list price, price paid, offer used, quantity, line total — frozen at purchase time.                                                                                    |
| `repair_requests`     | The existing "Book a Repair" form.                                                                                                                                                               |
| `site_settings`       | Shop contact details and the shipping fee / free-shipping amount.                                                                                                                                |

Also:

- **`product_catalog` view** — products joined with their category and best
  running offer, with a ready-made `final_price`. The shop pages read from this.
- **`place_order(address, notes)`** — turns the signed-in user's cart into an
  order. Prices, offers, shipping and stock are worked out in the database, so
  a customer can't change what they pay. It also reduces stock and empties the cart.
- **`add_to_cart(product_id, quantity)`** — adds to the user's cart (creating it if needed).
- **`cancel_my_order(order_id)`** — a customer can cancel their own _pending_ order.
- **`admin_dashboard_stats()`** — dashboard totals, admins only.
- Cancelling an order (by the customer or an admin) puts the stock back.
  A cancelled order can't be reopened.

## Security rules (Row Level Security)

| Data                         | Visitors          | Signed-in customers                         | Admins                                    |
| ---------------------------- | ----------------- | ------------------------------------------- | ----------------------------------------- |
| Categories, products, images | Read active ones  | Read active ones                            | Read + create + edit + delete all         |
| Offers                       | Read running ones | Read running ones                           | Read + create + edit + delete all         |
| Profiles                     | —                 | Read + edit **own** name/photo/phone        | Read all                                  |
| Admin list                   | —                 | See own row (to check "am I admin?")        | Add / remove others                       |
| Carts + items                | —                 | **Own** cart only                           | —                                         |
| Orders + items               | —                 | Read **own**; create via `place_order` only | Read all; change status / notes / address |
| Repair requests              | Submit            | Submit                                      | Read + manage                             |
| Shop settings                | Read              | Read                                        | Edit                                      |
| Storage `product-images`     | View              | View                                        | Upload / replace / delete                 |
| Storage `avatars`            | View              | Upload to own folder `avatars/<user-id>/`   | —                                         |

Admin checks use `is_admin()`, which looks up the signed-in user's ID in
`admin_users` inside the database. Nothing is decided by email address or by
the frontend.

## How it was tested

`supabase/tests/` runs the script on a local Postgres with stand-ins for
Supabase's `auth` and `storage` schemas, then checks 81 cases as a visitor, two
customers and an admin. For example: customers can't see each other's carts or
orders, can't change prices or order totals, can't make themselves admin, and
can't order more than is in stock. Order totals and offer prices were checked,
and cancelling puts stock back. All 81 pass. To run them yourself you need
PostgreSQL installed: `supabase/tests/run.sh`.
